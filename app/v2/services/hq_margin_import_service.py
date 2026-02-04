import csv
import logging
import chardet
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pathlib import Path

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.v2.models import V2User, V2UserSegment, HQProspectiveUser, ExternalRankingData
from app.v2.services import V2AdminAuditService
from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService
from app.v2.services.unmatched_deposit_log_service import UnmatchedDepositLogService
from app.v2.schemas.v2_cc_deposit import CCDepositCreate
from app.v2.models.v2_external_deposit_unmatched import UnmatchedStatus, UnmatchedReason

logger = logging.getLogger(__name__)


class HQMarginImportService:
    """본사 충전/환전 마진 데이터를 V2 세그먼트로 임포트 + CC Deposit 자동 반영"""

    @staticmethod
    def _match_v2_user(
        db: Session,
        user_key: str,
        nickname: Optional[str],
    ) -> Tuple[Optional[V2User], str]:
        """
        V2User 매칭 시도.
        
        설계 문서 섹션 5.2 매칭 우선순위:
        1. V2User.cc_id (case-insensitive exact)
        2. V2User.external_nickname (case-insensitive exact)
        3. V2User.nickname (case-insensitive exact)
        4. V2User.telegram_username (case-insensitive exact, @ 제거)
        
        Returns:
            (V2User or None, match_status)
            match_status: "MATCHED", "USER_NOT_FOUND", "AMBIGUOUS"
        """
        candidates = []
        
        # 1. cc_id 매칭 (최우선)
        users_by_ccid = db.query(V2User).filter(
            func.lower(V2User.cc_id) == user_key.lower()
        ).all()
        if users_by_ccid:
            if len(users_by_ccid) == 1:
                return users_by_ccid[0], "MATCHED"
            candidates.extend(users_by_ccid)
        
        # 2. external_nickname 매칭
        if nickname:
            users_by_ext_nick = db.query(V2User).filter(
                func.lower(V2User.external_nickname) == nickname.lower()
            ).all()
            if users_by_ext_nick and len(users_by_ext_nick) == 1:
                return users_by_ext_nick[0], "MATCHED"
            candidates.extend(users_by_ext_nick)
        
        # 3. nickname 매칭
        if nickname:
            users_by_nick = db.query(V2User).filter(
                func.lower(V2User.nickname) == nickname.lower()
            ).all()
            if users_by_nick and len(users_by_nick) == 1 and not candidates:
                return users_by_nick[0], "MATCHED"
            candidates.extend(users_by_nick)
        
        # 4. telegram_username 매칭 (@ 제거)
        clean_key = user_key.lstrip("@")
        users_by_tg = db.query(V2User).filter(
            func.lower(V2User.telegram_username) == clean_key.lower()
        ).all()
        if users_by_tg and len(users_by_tg) == 1 and not candidates:
            return users_by_tg[0], "MATCHED"
        candidates.extend(users_by_tg)
        
        # 중복 제거
        unique_candidates = {u.id: u for u in candidates}
        
        if len(unique_candidates) == 0:
            return None, "USER_NOT_FOUND"
        elif len(unique_candidates) == 1:
            return list(unique_candidates.values())[0], "MATCHED"
        else:
            return None, "AMBIGUOUS"

    @staticmethod
    async def import_hq_margin_csv(
        db: Session,
        file_path: str,
        admin_id: str,
    ) -> Dict:
        """
        본사 마진 CSV 파일을 읽어서 user_segment 테이블 업데이트

        Args:
            db: DB 세션
            file_path: CSV 파일 경로
            admin_id: 어드민 사용자 ID

        Returns:
            {
                "success": bool,
                "total_rows": int,
                "updated_count": int,
                "created_count": int,
                "prospective_count": int,
                "skipped_count": int,
                "errors": List[str],
                "warnings": List[str]
            }

        CSV Format:
            이름 (아이디), 닉네임, 누적 충전 금액, 누적 환전 금액,
            총 운영 마진, 미접속 경과일, 세그먼트(선택)
        """
        try:
            # 1. 인코딩 감지
            raw_data = Path(file_path).read_bytes()
            result = chardet.detect(raw_data)
            encoding = result['encoding'] or 'utf-8-sig'
            
            if encoding.lower() == 'ascii' or result['confidence'] < 0.8:
                encoding = 'cp949'

            logger.info(f"Detected encoding: {encoding} (confidence: {result['confidence']})")

            # 2. 필수 컬럼 매핑 정의
            required_map = {
                '이름 (아이디)': ['이름 (아이디)', '아이디', 'user_id', 'cc_id'],
                '총 운영 마진': ['총 운영 마진', '마진', 'margin'],
                '미접속 경과일': ['미접속 경과일', '접속 경과일', 'inactive_days']
            }

            # 3. CSV 읽기 및 처리
            import io
            text_data = raw_data.decode(encoding, errors='ignore')
            f = io.StringIO(text_data)
            reader = csv.DictReader(f)
            
            # 헤더 정리 (공백 제거)
            reader.fieldnames = [name.strip() for name in reader.fieldnames] if reader.fieldnames else []
            
            # 실제 컬럼 매핑 찾기
            final_columns = {}
            for target_col, aliases in required_map.items():
                found = False
                for alias in aliases:
                    if alias in reader.fieldnames:
                        final_columns[target_col] = alias
                        found = True
                        break
                if not found:
                    raise ValueError(f"필수 컬럼 누락: {target_col} (검색한 별칭: {aliases})")

            # 통계 초기화
            total_rows = 0
            updated_count = 0
            created_count = 0
            prospective_count = 0
            skipped_count = 0
            cc_deposit_count = 0  # CC Deposit 반영 건수
            unmatched_count = 0   # 미매칭 로그 저장 건수
            errors = []
            warnings = []

            # 서비스 초기화
            unmatched_log_service = UnmatchedDepositLogService(db)
            
            # CC Deposit 일괄 처리용 버퍼
            cc_deposit_payloads: List[CCDepositCreate] = []

            # 행별 처리
            for idx, row in enumerate(reader):
                total_rows += 1
                try:
                    user_key = str(row.get(final_columns['이름 (아이디)'], '')).strip()
                    if not user_key:
                        continue

                    nickname_raw = str(row.get('닉네임', '')).strip() if '닉네임' in row and row['닉네임'] else None
                    nickname = nickname_raw.lower() if nickname_raw else None

                    # V2User 매칭 (향상된 매칭 로직)
                    v2_user, match_status = HQMarginImportService._match_v2_user(
                        db, user_key, nickname
                    )

                    # 세그먼트 분류용 row 데이터 변환 (parse_int 적용)
                    classifier_row = {k: v for k, v in row.items()}
                    # 정규화된 키로도 접근 가능하게 추가
                    for target, actual in final_columns.items():
                        classifier_row[target] = row.get(actual)

                    # 누적 충전 금액 파싱
                    total_charge = HQMarginImportService._parse_int(classifier_row.get('누적 충전 금액', 0))

                    if match_status == "MATCHED" and v2_user:
                        # ========== 매칭 성공: CC Deposit 반영 ==========
                        segment = HQMarginImportService._classify_segment(classifier_row)
                        
                        # 세그먼트 업데이트
                        user_segment = db.query(V2UserSegment).filter(
                            V2UserSegment.user_id == v2_user.id
                        ).first()
                        
                        if user_segment:
                            user_segment.segment = segment
                            user_segment.updated_at = datetime.utcnow()
                            updated_count += 1
                        else:
                            user_segment = V2UserSegment(user_id=v2_user.id, segment=segment)
                            db.add(user_segment)
                            created_count += 1
                        
                        # ========== V2 가입일 기준 충전액 계산 (baseline 차액) ==========
                        # baseline_charge_amount: V2 가입 시점의 기준 누적액
                        # - 최초 Import: baseline = 0 → 현재 CSV 누적액을 baseline으로 설정
                        # - 이후 Import: 유효 충전액 = CSV 누적액 - baseline
                        baseline = int(v2_user.baseline_charge_amount or 0)
                        
                        if baseline == 0 and total_charge > 0:
                            # 최초 Import: baseline 설정 (기존 충전 내역은 무시)
                            v2_user.baseline_charge_amount = total_charge
                            logger.info(
                                f"[CSV Import] Set baseline for user_id={v2_user.id}: {total_charge}"
                            )
                            # 최초 Import는 CC Deposit 반영하지 않음 (baseline 설정만)
                            skipped_count += 1
                        elif total_charge > baseline:
                            # 이후 Import: baseline 이후 신규 충전액만 반영
                            effective_charge = total_charge - baseline
                            
                            # FIX: upsert_many는 절대값으로 덮어쓰기하므로
                            # 기존 deposit_amount + effective_charge를 전달해야 함
                            existing_erd = db.query(ExternalRankingData).filter(
                                ExternalRankingData.user_id == v2_user.id
                            ).first()
                            current_deposit = existing_erd.deposit_amount if existing_erd else 0
                            new_deposit_total = current_deposit + effective_charge
                            
                            cc_deposit_payloads.append(CCDepositCreate(
                                user_id=v2_user.id,
                                deposit_amount=new_deposit_total,  # 누적 총액으로 전달
                                play_count=existing_erd.play_count if existing_erd else 0,
                            ))
                            cc_deposit_count += 1
                            logger.info(
                                f"[CSV Import] Effective charge for user_id={v2_user.id}: "
                                f"CSV={total_charge}, baseline={baseline}, effective={effective_charge}, "
                                f"prev_deposit={current_deposit}, new_total={new_deposit_total}"
                            )
                        else:
                            # 충전액 변동 없음 (baseline 이하)
                            skipped_count += 1
                    
                    elif match_status == "AMBIGUOUS":
                        # ========== 동명이인: 미매칭 로그 저장 ==========
                        unmatched_log_service.save_unmatched(
                            raw_cc_id=user_key,
                            raw_nickname=nickname_raw,
                            total_charge=total_charge,
                            prev_total=0,
                            status=UnmatchedStatus.AMBIGUOUS.value,
                            reason=UnmatchedReason.AMBIGUOUS.value,
                        )
                        unmatched_count += 1
                        warnings.append(f"Row {idx+2}: Ambiguous match for '{nickname_raw or user_key}'")
                    
                    else:
                        # ========== 매칭 실패: 잠재 고객 + 미매칭 로그 ==========
                        segment = HQMarginImportService._classify_segment(classifier_row)
                        
                        # 기존 잠재 고객 로직 유지
                        prospect = db.query(HQProspectiveUser).filter(
                            (HQProspectiveUser.cc_id == user_key) | 
                            (func.lower(HQProspectiveUser.nickname) == (nickname or ""))
                        ).first()

                        if prospect:
                            prospect.total_margin = HQMarginImportService._parse_int(classifier_row.get('총 운영 마진', 0))
                            prospect.total_charge = HQMarginImportService._parse_int(classifier_row.get('누적 충전 금액', 0))
                            prospect.inactive_days = HQMarginImportService._parse_int(classifier_row.get('미접속 경과일', 0))
                            prospect.segment = segment
                            prospect.is_joined = False
                        else:
                            prospect = HQProspectiveUser(
                                cc_id=user_key,
                                nickname=nickname_raw or user_key,
                                total_margin=HQMarginImportService._parse_int(classifier_row.get('총 운영 마진', 0)),
                                total_charge=HQMarginImportService._parse_int(classifier_row.get('누적 충전 금액', 0)),
                                inactive_days=HQMarginImportService._parse_int(classifier_row.get('미접속 경과일', 0)),
                                segment=segment,
                                is_joined=False
                            )
                            db.add(prospect)
                        
                        prospective_count += 1
                        
                        # 미매칭 로그 저장 (충전 금액이 있을 때만)
                        if total_charge > 0:
                            unmatched_log_service.save_unmatched(
                                raw_cc_id=user_key,
                                raw_nickname=nickname_raw,
                                total_charge=total_charge,
                                prev_total=0,
                                status=UnmatchedStatus.UNMATCHED.value,
                                reason=UnmatchedReason.USER_NOT_FOUND.value,
                            )
                            unmatched_count += 1

                except Exception as e:
                    errors.append(f"Row {idx+2}: {str(e)}")

            # CC Deposit 일괄 처리 (청크 단위)
            if cc_deposit_payloads:
                CHUNK_SIZE = 250
                for i in range(0, len(cc_deposit_payloads), CHUNK_SIZE):
                    chunk = cc_deposit_payloads[i:i + CHUNK_SIZE]
                    try:
                        V2AdminCCDepositService.upsert_many(db, chunk)
                        logger.info(f"CC Deposit chunk processed: {len(chunk)} items")
                    except Exception as e:
                        logger.error(f"CC Deposit chunk failed: {e}")
                        errors.append(f"CC Deposit batch error: {str(e)}")

            # ========== 미매칭 유저 자동 재동기화 (방안 1) ==========
            # external_nickname은 있지만 hq_segment 없는 유저들을 HQ 데이터와 재매칭
            try:
                resync_result = HQMarginImportService.sync_pending_external_users(db)
                logger.info(f"[ReSync] Auto-sync result: {resync_result}")
            except Exception as e:
                logger.error(f"[ReSync] Auto-sync failed: {e}")
                warnings.append(f"Auto-resync failed: {str(e)}")
                resync_result = {"synced": 0, "skipped": 0, "total_pending": 0}

            db.commit()

            V2AdminAuditService.log(
                db,
                admin_id=admin_id,
                action="HQ_MARGIN_IMPORT",
                target_type="SEGMENT",
                target_id=None,
                after={
                    "category": "GOLDEN",
                    "reason": "HQ margin CSV import with CC Deposit auto-reflection",
                    "stats": {
                        "total_rows": total_rows,
                        "updated": updated_count,
                        "created": created_count,
                        "prospective": prospective_count,
                        "skipped": skipped_count,
                        "cc_deposit_reflected": cc_deposit_count,
                        "unmatched_logged": unmatched_count,
                        "resync_synced": resync_result.get("synced", 0),
                        "resync_skipped": resync_result.get("skipped", 0),
                    }
                },
            )

            logger.info(
                "HQ Margin CSV import completed: total=%d, updated=%d, created=%d, "
                "prospective=%d, cc_deposit=%d, unmatched=%d, resync_synced=%d",
                total_rows, updated_count, created_count, 
                prospective_count, cc_deposit_count, unmatched_count,
                resync_result.get("synced", 0)
            )

            return {
                "success": True,
                "total_rows": total_rows,
                "updated_count": updated_count,
                "created_count": created_count,
                "prospective_count": prospective_count,
                "skipped_count": skipped_count,
                "cc_deposit_count": cc_deposit_count,
                "unmatched_count": unmatched_count,
                "resync_result": resync_result,
                "errors": errors[:50],
                "warnings": warnings[:50],
            }

        except Exception as e:
            logger.error(f"HQ Margin CSV import failed: {e}")
            db.rollback()
            raise

    @staticmethod
    def validate_hq_margin_csv(file_path: str) -> tuple[bool, str]:
        """
        HQ Margin CSV 파일의 구조 및 필수 컬럼 검증

        Returns:
            (성공여부, 에러메시지)
        """
        path = Path(file_path)
        if not path.exists():
            return False, f"File not found: {file_path}"
        
        try:
            # 1. 인코딩 감지 및 읽기
            raw_data = path.read_bytes()
            result = chardet.detect(raw_data)
            encoding = result['encoding'] or 'utf-8-sig'
            if encoding.lower() == 'ascii' or result['confidence'] < 0.8:
                encoding = 'cp949'

            import io
            text_data = raw_data.decode(encoding, errors='ignore')
            f = io.StringIO(text_data)
            reader = csv.DictReader(f)
            
            # 헤더 정리 (공백 제거)
            fieldnames = [name.strip() for name in reader.fieldnames] if reader.fieldnames else []

            # 2. 필수 컬럼 체크
            required_map = {
                '이름 (아이디)': ['이름 (아이디)', '아이디', 'user_id', 'cc_id'],
                '총 운영 마진': ['총 운영 마진', '마진', 'margin'],
                '미접속 경과일': ['미접속 경과일', '접속 경과일', 'inactive_days']
            }

            for target_col, aliases in required_map.items():
                if not any(alias in fieldnames for alias in aliases):
                    return False, f"필수 컬럼 누락: {target_col} (검색한 별칭: {aliases})"

            # 빈 파일 체크
            first_row = next(reader, None)
            if first_row is None:
                return False, "CSV 파일에 데이터가 없습니다."

            return True, "CSV file is valid"

        except Exception as e:
            return False, f"CSV 검증 중 오류 발생: {str(e)}"

    @staticmethod
    def _parse_int(value) -> int:
        """Parse string with commas to int."""
        if isinstance(value, str):
            value = value.replace(',', '').strip()
            if not value or value == '-': return 0
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return 0

    @staticmethod
    def _classify_segment(row: Dict) -> str:
        """
        본사 마진 데이터 기반 세그먼트 분류

        우선순위:
        1. CSV에 명시적 세그먼트가 있으면 우선 사용
        2. 마진 100만원+ → VIP
        3. 미접속 7일+ & 마진 양수 → AT_RISK
        4. 충전 금액 500만원+ → WHALE
        5. 기본 → COMMON

        Args:
            row: Dict (CSV 한 행)

        Returns:
            세그먼트 코드 (VIP/WHALE/AT_RISK/COMMON)
        """
        # CSV에 세그먼트가 명시되어 있으면 우선 사용
        segment_val = row.get('세그먼트')
        if segment_val and str(segment_val).strip():
            explicit_segment = str(segment_val).strip().upper()
            if explicit_segment in {'VIP', 'WHALE', 'AT_RISK', 'COMMON'}:
                return explicit_segment

        # 자동 분류
        margin = HQMarginImportService._parse_int(row.get('총 운영 마진', 0))
        inactive_days = HQMarginImportService._parse_int(row.get('접속 경과일', row.get('미접속 경과일', 0))) # Column name variation support
        charge_amount = HQMarginImportService._parse_int(row.get('누적 충전 금액', 0))

        # 분류 로직
        if margin > 1_000_000:
            return 'VIP'
        elif inactive_days > 7 and margin > 0:
            return 'AT_RISK'
        elif charge_amount > 5_000_000:
            return 'WHALE'
        else:
            return 'COMMON'

    @staticmethod
    def sync_pending_external_users(db: Session) -> Dict:
        """
        external_nickname은 있지만 hq_segment가 없는 유저들을
        HQ 데이터(HQProspectiveUser)와 자동 재매칭 시도.
        
        케이스 A 해결: CSV Import 후 유저 연동 시점 차이
        
        중복 방지:
        - HQ 중복 연결 방지: prospect.linked_user_id가 이미 있으면 스킵
        - V2User 중복 연결 방지: user.hq_segment가 이미 있으면 스킵
        - 델타 중복 계산 방지: upsert_many 내부에서 prev_deposit 비교
        
        Returns:
            {
                "synced": int,
                "skipped": int, 
                "total_pending": int,
                "details": [{"user_id": int, "nickname": str, "segment": str, "total_charge": int}]
            }
        """
        from app.v2.models import V2UserSegment
        
        now = datetime.utcnow()
        synced_count = 0
        skipped_count = 0
        details = []
        
        # 1. 미매칭 V2User 조회 (external_nickname 있고, hq_segment 없음)
        pending_users = db.query(V2User).filter(
            V2User.external_nickname.isnot(None),
            V2User.hq_segment.is_(None)
        ).all()
        
        total_pending = len(pending_users)
        logger.info(f"[ReSync] Found {total_pending} pending users with external_nickname but no hq_segment")
        
        # CC Deposit 일괄 처리용 버퍼
        cc_deposit_payloads: List[CCDepositCreate] = []
        
        for user in pending_users:
            # 2. HQ 데이터에서 닉네임 매칭 (정확 일치, 대소문자 무시)
            prospect = db.query(HQProspectiveUser).filter(
                func.lower(HQProspectiveUser.nickname) == user.external_nickname.lower(),
                HQProspectiveUser.linked_user_id.is_(None)  # 아직 연결 안 된 것만
            ).first()
            
            if not prospect:
                logger.debug(f"[ReSync] No HQ match for user {user.id} ({user.external_nickname})")
                skipped_count += 1
                continue
            
            # 3. 이미 다른 유저에 연결되어 있으면 스킵 (중복 방지 - 이중 체크)
            if prospect.linked_user_id and prospect.linked_user_id != user.id:
                logger.warning(
                    f"[ReSync] Prospect {prospect.id} already linked to user {prospect.linked_user_id}, "
                    f"skip user {user.id}"
                )
                skipped_count += 1
                continue
            
            # 4. 양방향 연결 수행
            prospect.is_joined = True
            prospect.linked_user_id = user.id
            prospect.linked_at = now
            
            user.hq_segment = prospect.segment
            
            # 5. V2UserSegment 업데이트
            segment = db.query(V2UserSegment).filter_by(user_id=user.id).first()
            if segment:
                segment.segment = prospect.segment
                segment.is_synced_from_hq = True
                segment.last_synced_at = now
            else:
                db.add(V2UserSegment(
                    user_id=user.id,
                    segment=prospect.segment,
                    is_synced_from_hq=True,
                    last_synced_at=now
                ))
            
            # 6. CC Deposit 반영 - baseline 기반 delta 계산 + 기존 deposit 누적
            if prospect.total_charge and prospect.total_charge > 0:
                # baseline 설정 or delta 계산
                baseline = int(user.baseline_charge_amount or 0)
                
                if baseline == 0:
                    # 최초 연결: baseline 설정만, CC Deposit 반영 안함
                    user.baseline_charge_amount = prospect.total_charge
                    logger.info(
                        f"[ReSync] Set baseline for user {user.id}: {prospect.total_charge}"
                    )
                elif prospect.total_charge > baseline:
                    # 이후: baseline 초과분만 반영
                    effective_charge = prospect.total_charge - baseline
                    
                    # 기존 deposit_amount 조회 후 누적
                    existing_erd = db.query(ExternalRankingData).filter(
                        ExternalRankingData.user_id == user.id
                    ).first()
                    current_deposit = existing_erd.deposit_amount if existing_erd else 0
                    new_deposit_total = current_deposit + effective_charge
                    
                    cc_deposit_payloads.append(CCDepositCreate(
                        user_id=user.id,
                        deposit_amount=new_deposit_total,  # 누적 총액
                        play_count=existing_erd.play_count if existing_erd else 0
                    ))
                    logger.info(
                        f"[ReSync] CC Deposit for user {user.id}: "
                        f"HQ_total={prospect.total_charge}, baseline={baseline}, "
                        f"effective={effective_charge}, prev={current_deposit}, new_total={new_deposit_total}"
                    )
            
            synced_count += 1
            details.append({
                "user_id": user.id,
                "nickname": user.external_nickname,
                "segment": prospect.segment,
                "total_charge": prospect.total_charge or 0
            })
            logger.info(
                f"[ReSync] Auto-linked user {user.id} ({user.external_nickname}) "
                f"to prospect {prospect.id}, segment={prospect.segment}"
            )
        
        # 7. CC Deposit 일괄 처리 (청크 단위)
        if cc_deposit_payloads:
            CHUNK_SIZE = 250
            for i in range(0, len(cc_deposit_payloads), CHUNK_SIZE):
                chunk = cc_deposit_payloads[i:i + CHUNK_SIZE]
                try:
                    V2AdminCCDepositService.upsert_many(db, chunk)
                    logger.info(f"[ReSync] CC Deposit chunk processed: {len(chunk)} items")
                except Exception as e:
                    logger.error(f"[ReSync] CC Deposit chunk failed: {e}")
        
        db.commit()
        
        logger.info(f"[ReSync] Completed: synced={synced_count}, skipped={skipped_count}, total={total_pending}")
        
        return {
            "synced": synced_count,
            "skipped": skipped_count,
            "total_pending": total_pending,
            "details": details
        }