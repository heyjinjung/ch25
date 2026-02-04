"""HQ Daily Deposit Import Service

일별 개별 입금 내역 CSV를 import하여 CC Deposit에 반영.
기존 HQ Margin(누적 데이터)과 달리, 각 행이 개별 입금 건으로 처리됨.

CSV 포맷:
- 닉네임 (필수): V2User.nickname으로 매칭
- 충전 금액 (필수): 해당 입금 금액
- 충전 날짜 (필수): 입금 일시 - 중복 방지 키로 사용

중복 방지:
- (닉네임, 금액, 충전날짜+시각) 조합으로 중복 체크
- 이미 처리된 건은 스킵

설계: 2026-02-04
"""
import csv
import logging
import chardet
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Set
from pathlib import Path
import io
import re

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.v2.models import V2User, ExternalRankingData
from app.v2.services import V2AdminAuditService
from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService
from app.v2.schemas.v2_cc_deposit import CCDepositCreate

logger = logging.getLogger(__name__)


class HQDailyDepositImportService:
    """일별 HQ 입금 내역 Import 서비스
    
    각 CSV 행 = 개별 입금 건
    닉네임으로 V2User 매칭 후 CC Deposit에 누적 반영
    """

    # CSV 컬럼 매핑 (여러 별칭 지원)
    COLUMN_ALIASES = {
        '닉네임': ['닉네임', 'nickname', '닉넴', '별명'],
        '충전 금액': ['충전 금액', '충전금액', 'amount', '금액', '입금액'],
        '충전 날짜': ['충전 날짜', '충전날짜', 'date', '날짜', '신청 날짜', '신청날짜'],
    }

    @staticmethod
    def _find_column(fieldnames: List[str], target: str) -> Optional[str]:
        """컬럼 별칭 매칭"""
        aliases = HQDailyDepositImportService.COLUMN_ALIASES.get(target, [target])
        for alias in aliases:
            # 정확히 일치하거나 포함되는 경우
            for field in fieldnames:
                if alias.lower() == field.strip().lower():
                    return field
                if alias.lower() in field.strip().lower():
                    return field
        return None

    @staticmethod
    def _parse_amount(value) -> int:
        """금액 파싱 (콤마, 공백 제거)"""
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str):
            # 콤마, 공백, 원 기호 등 제거
            cleaned = value.replace(',', '').replace(' ', '').replace('원', '').strip()
            if not cleaned or cleaned == '-':
                return 0
            try:
                return int(float(cleaned))
            except (ValueError, TypeError):
                return 0
        return 0

    @staticmethod
    def _parse_datetime(value: str) -> Optional[datetime]:
        """
        다양한 날짜/시각 포맷 파싱
        
        지원 포맷:
        - 26/02/04 10:07 (YY/MM/DD HH:MM)
        - 2026-02-04 10:07:00
        - 2026/02/04 10:07
        - 26-02-04 10:07
        """
        if not value or not isinstance(value, str):
            return None
        
        value = value.strip()
        
        # 다양한 포맷 시도
        formats = [
            "%y/%m/%d %H:%M",      # 26/02/04 10:07
            "%y/%m/%d %H:%M:%S",   # 26/02/04 10:07:00
            "%Y-%m-%d %H:%M:%S",   # 2026-02-04 10:07:00
            "%Y-%m-%d %H:%M",      # 2026-02-04 10:07
            "%Y/%m/%d %H:%M:%S",   # 2026/02/04 10:07:00
            "%Y/%m/%d %H:%M",      # 2026/02/04 10:07
            "%y-%m-%d %H:%M",      # 26-02-04 10:07
            "%y-%m-%d %H:%M:%S",   # 26-02-04 10:07:00
            "%y/%m/%d",            # 26/02/04 (시간 없음)
            "%Y-%m-%d",            # 2026-02-04 (시간 없음)
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
        
        return None

    @staticmethod
    def _generate_dedup_key(nickname: str, amount: int, deposit_datetime: Optional[datetime]) -> str:
        """
        중복 방지 키 생성
        
        (닉네임, 금액, 날짜시각) 조합의 해시
        """
        dt_str = deposit_datetime.strftime("%Y%m%d%H%M") if deposit_datetime else "no_time"
        raw_key = f"{nickname.lower().strip()}|{amount}|{dt_str}"
        return hashlib.md5(raw_key.encode()).hexdigest()[:16]

    @staticmethod
    def _match_user_by_nickname(db: Session, nickname: str) -> Tuple[Optional[V2User], str]:
        """
        닉네임으로 V2User 매칭
        
        Returns:
            (V2User or None, match_status)
            match_status: "MATCHED", "NOT_FOUND", "AMBIGUOUS"
        """
        if not nickname:
            return None, "NOT_FOUND"
        
        nickname_lower = nickname.strip().lower()
        
        # 1. V2User.nickname (정확 일치, 대소문자 무시)
        users = db.query(V2User).filter(
            func.lower(V2User.nickname) == nickname_lower
        ).all()
        
        if len(users) == 1:
            return users[0], "MATCHED"
        elif len(users) > 1:
            return None, "AMBIGUOUS"
        
        # 2. V2User.external_nickname (HQ에서 설정된 닉네임)
        users = db.query(V2User).filter(
            func.lower(V2User.external_nickname) == nickname_lower
        ).all()
        
        if len(users) == 1:
            return users[0], "MATCHED"
        elif len(users) > 1:
            return None, "AMBIGUOUS"
        
        return None, "NOT_FOUND"

    @staticmethod
    async def import_hq_daily_deposit_csv(
        db: Session,
        file_path: str,
        admin_id: str,
    ) -> Dict:
        """
        HQ 일별 입금 CSV Import
        
        각 행을 개별 입금 건으로 처리하여 CC Deposit에 누적.
        중복 방지: (닉네임, 금액, 시각) 조합으로 이미 처리된 건 스킵.
        
        Args:
            db: Database session
            file_path: CSV file path
            admin_id: Admin user ID for audit
            
        Returns:
            Import result dictionary
        """
        from app.v2.models import HQDailyDepositLog
        import uuid
        
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # 배치 ID 생성 (같은 import 건 구분)
        batch_id = str(uuid.uuid4())[:8]

        try:
            # 1. 인코딩 감지
            raw_data = path.read_bytes()
            result = chardet.detect(raw_data)
            encoding = result['encoding'] or 'utf-8-sig'
            if encoding.lower() == 'ascii' or result['confidence'] < 0.8:
                encoding = 'cp949'  # 한글 CSV 대비

            # 2. CSV 파싱
            text_data = raw_data.decode(encoding, errors='ignore')
            f = io.StringIO(text_data)
            reader = csv.DictReader(f)
            
            fieldnames = [name.strip() for name in reader.fieldnames] if reader.fieldnames else []
            
            # 3. 필수 컬럼 찾기
            nickname_col = HQDailyDepositImportService._find_column(fieldnames, '닉네임')
            amount_col = HQDailyDepositImportService._find_column(fieldnames, '충전 금액')
            date_col = HQDailyDepositImportService._find_column(fieldnames, '충전 날짜')
            
            if not nickname_col:
                raise ValueError(f"필수 컬럼 누락: 닉네임 (검색한 필드: {fieldnames})")
            if not amount_col:
                raise ValueError(f"필수 컬럼 누락: 충전 금액 (검색한 필드: {fieldnames})")

            logger.info(f"[HQ Daily Import] Columns: nickname={nickname_col}, amount={amount_col}, date={date_col}")

            # 4. 기존 처리된 dedup_key 조회 (중복 체크용)
            existing_keys: Set[str] = set(
                row[0] for row in db.query(HQDailyDepositLog.dedup_key).all()
            )
            logger.info(f"[HQ Daily Import] Existing dedup keys: {len(existing_keys)}")
            
            # 4-1. 서버에 기록된 최신 deposit_at 조회 (이 시간 이후만 처리)
            latest_deposit_at = db.query(func.max(HQDailyDepositLog.deposit_at)).scalar()
            if latest_deposit_at:
                logger.info(f"[HQ Daily Import] Latest deposit_at in DB: {latest_deposit_at}")
            else:
                logger.info("[HQ Daily Import] No existing deposits, processing all")

            # 5. 통계 초기화
            total_rows = 0
            processed_count = 0
            skipped_count = 0
            skipped_old_count = 0  # 기존 시간 이전 건 스킵
            duplicate_count = 0
            not_found_count = 0
            ambiguous_count = 0
            total_amount = 0
            errors = []
            warnings = []
            
            # 6. 유저별 입금액 집계 (동일 유저 여러 건 합산)
            user_deposits: Dict[int, int] = {}  # user_id -> total_amount
            user_play_counts: Dict[int, int] = {}  # user_id -> play_count (기존값 유지용)
            matched_details = []
            unmatched_details = []
            deposit_logs_to_add = []  # 새로 추가할 로그

            # 7. 행별 처리
            for idx, row in enumerate(reader):
                total_rows += 1
                try:
                    nickname = str(row.get(nickname_col, '')).strip()
                    amount = HQDailyDepositImportService._parse_amount(row.get(amount_col, 0))
                    deposit_date_str = str(row.get(date_col, '')).strip() if date_col else ''
                    deposit_datetime = HQDailyDepositImportService._parse_datetime(deposit_date_str)
                    
                    if not nickname:
                        warnings.append(f"Row {idx+2}: 닉네임 없음")
                        skipped_count += 1
                        continue
                    
                    if amount <= 0:
                        warnings.append(f"Row {idx+2}: 금액 0 이하 ({nickname})")
                        skipped_count += 1
                        continue
                    
                    # ★ 핵심: 기존 기록된 최신 시간 이후의 것만 처리
                    if latest_deposit_at and deposit_datetime:
                        if deposit_datetime <= latest_deposit_at:
                            skipped_old_count += 1
                            continue  # 이미 처리된 시간대의 입금은 무시

                    # 중복 체크
                    dedup_key = HQDailyDepositImportService._generate_dedup_key(
                        nickname, amount, deposit_datetime
                    )
                    
                    if dedup_key in existing_keys:
                        duplicate_count += 1
                        warnings.append(f"Row {idx+2}: 중복 건 스킵 ({nickname}, {amount:,}원, {deposit_date_str})")
                        continue
                    
                    # 이번 배치에서 이미 처리한 건도 체크
                    existing_keys.add(dedup_key)

                    # V2User 매칭
                    user, status = HQDailyDepositImportService._match_user_by_nickname(db, nickname)
                    
                    # 로그 기록 (성공/실패 모두)
                    deposit_logs_to_add.append(HQDailyDepositLog(
                        dedup_key=dedup_key,
                        nickname=nickname,
                        amount=amount,
                        deposit_at=deposit_datetime,
                        user_id=user.id if user else None,
                        status=status,
                        import_batch_id=batch_id,
                    ))
                    
                    if status == "MATCHED" and user:
                        # 기존 deposit 조회
                        existing = db.query(ExternalRankingData).filter(
                            ExternalRankingData.user_id == user.id
                        ).first()
                        
                        current_deposit = existing.deposit_amount if existing else 0
                        current_play = existing.play_count if existing else 0
                        
                        # 누적
                        if user.id not in user_deposits:
                            user_deposits[user.id] = current_deposit
                            user_play_counts[user.id] = current_play
                        
                        user_deposits[user.id] += amount
                        total_amount += amount
                        processed_count += 1
                        
                        matched_details.append({
                            "row": idx + 2,
                            "nickname": nickname,
                            "user_id": user.id,
                            "amount": amount,
                            "date": deposit_date_str,
                            "deposit_at": deposit_datetime.isoformat() if deposit_datetime else None,
                        })
                        
                        logger.info(
                            f"[HQ Daily Import] Row {idx+2}: {nickname} -> user_id={user.id}, "
                            f"amount={amount:,}, deposit_at={deposit_datetime}, new_total={user_deposits[user.id]:,}"
                        )
                    
                    elif status == "AMBIGUOUS":
                        ambiguous_count += 1
                        unmatched_details.append({
                            "row": idx + 2,
                            "nickname": nickname,
                            "amount": amount,
                            "reason": "동명이인",
                        })
                        warnings.append(f"Row {idx+2}: 동명이인 ({nickname})")
                    
                    else:
                        not_found_count += 1
                        unmatched_details.append({
                            "row": idx + 2,
                            "nickname": nickname,
                            "amount": amount,
                            "reason": "유저 없음",
                        })

                except Exception as e:
                    errors.append(f"Row {idx+2}: {str(e)}")

            # 8. 로그 저장
            if deposit_logs_to_add:
                db.bulk_save_objects(deposit_logs_to_add)
                logger.info(f"[HQ Daily Import] Saved {len(deposit_logs_to_add)} deposit logs")

            # 9. CC Deposit 일괄 반영
            if user_deposits:
                cc_deposit_payloads = [
                    CCDepositCreate(
                        user_id=user_id,
                        deposit_amount=total_deposit,
                        play_count=user_play_counts.get(user_id, 0),
                    )
                    for user_id, total_deposit in user_deposits.items()
                ]
                
                CHUNK_SIZE = 250
                for i in range(0, len(cc_deposit_payloads), CHUNK_SIZE):
                    chunk = cc_deposit_payloads[i:i + CHUNK_SIZE]
                    try:
                        V2AdminCCDepositService.upsert_many(db, chunk)
                        logger.info(f"[HQ Daily Import] CC Deposit chunk: {len(chunk)} users")
                    except Exception as e:
                        logger.error(f"[HQ Daily Import] CC Deposit failed: {e}")
                        errors.append(f"CC Deposit batch error: {str(e)}")

            db.commit()

            # 10. 감사 로그
            V2AdminAuditService.log(
                db,
                admin_id=admin_id,
                action="HQ_DAILY_DEPOSIT_IMPORT",
                target_type="CC_DEPOSIT",
                target_id=None,
                after={
                    "category": "DEPOSIT",
                    "reason": "HQ daily deposit CSV import",
                    "batch_id": batch_id,
                    "latest_deposit_at": latest_deposit_at.isoformat() if latest_deposit_at else None,
                    "stats": {
                        "total_rows": total_rows,
                        "processed": processed_count,
                        "skipped": skipped_count,
                        "skipped_old": skipped_old_count,
                        "duplicate": duplicate_count,
                        "not_found": not_found_count,
                        "ambiguous": ambiguous_count,
                        "total_amount": total_amount,
                        "unique_users": len(user_deposits),
                    }
                },
            )

            logger.info(
                f"[HQ Daily Import] Completed: rows={total_rows}, processed={processed_count}, "
                f"skipped_old={skipped_old_count}, duplicate={duplicate_count}, amount={total_amount:,}, users={len(user_deposits)}"
            )

            return {
                "success": True,
                "batch_id": batch_id,
                "total_rows": total_rows,
                "processed_count": processed_count,
                "skipped_count": skipped_count,
                "skipped_old_count": skipped_old_count,
                "duplicate_count": duplicate_count,
                "not_found_count": not_found_count,
                "ambiguous_count": ambiguous_count,
                "total_amount": total_amount,
                "unique_users": len(user_deposits),
                "latest_deposit_at_in_db": latest_deposit_at.isoformat() if latest_deposit_at else None,
                "matched_details": matched_details[:50],  # 상위 50건만
                "unmatched_details": unmatched_details[:50],
                "errors": errors[:20],
                "warnings": warnings[:20],
            }

        except Exception as e:
            logger.error(f"[HQ Daily Import] Failed: {e}")
            db.rollback()
            raise

    @staticmethod
    def validate_hq_daily_csv(file_path: str) -> Tuple[bool, str]:
        """CSV 파일 검증"""
        path = Path(file_path)
        if not path.exists():
            return False, f"File not found: {file_path}"
        
        try:
            raw_data = path.read_bytes()
            result = chardet.detect(raw_data)
            encoding = result['encoding'] or 'utf-8-sig'
            if encoding.lower() == 'ascii' or result['confidence'] < 0.8:
                encoding = 'cp949'

            text_data = raw_data.decode(encoding, errors='ignore')
            f = io.StringIO(text_data)
            reader = csv.DictReader(f)
            
            fieldnames = [name.strip() for name in reader.fieldnames] if reader.fieldnames else []
            
            # 필수 컬럼 체크
            nickname_col = HQDailyDepositImportService._find_column(fieldnames, '닉네임')
            amount_col = HQDailyDepositImportService._find_column(fieldnames, '충전 금액')
            
            if not nickname_col:
                return False, f"필수 컬럼 누락: 닉네임 (발견된 컬럼: {fieldnames})"
            if not amount_col:
                return False, f"필수 컬럼 누락: 충전 금액 (발견된 컬럼: {fieldnames})"

            # 데이터 존재 체크
            first_row = next(reader, None)
            if first_row is None:
                return False, "CSV 파일에 데이터가 없습니다."

            return True, "Valid"

        except Exception as e:
            return False, f"CSV 검증 실패: {str(e)}"
