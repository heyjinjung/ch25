from __future__ import annotations
import csv
import logging
import chardet
from datetime import datetime
from typing import Dict, List
from pathlib import Path

from sqlalchemy.orm import Session

from app.v2.models import V2User, V2UserSegment, HQProspectiveUser
from app.v2.services import V2AdminAuditService

logger = logging.getLogger(__name__)


class HQMarginImportService:
    """본사 충전/환전 마진 데이터를 V2 세그먼트로 임포트"""

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
            errors = []

            from sqlalchemy import func

            # 행별 처리
            for idx, row in enumerate(reader):
                total_rows += 1
                try:
                    user_key = str(row.get(final_columns['이름 (아이디)'], '')).strip()
                    if not user_key:
                        continue

                    nickname_raw = str(row.get('닉네임', '')).strip() if '닉네임' in row and row['닉네임'] else None
                    nickname = nickname_raw.lower() if nickname_raw else None

                    # V2User 매칭
                    query = db.query(V2User)
                    if nickname:
                        v2_user = query.filter(
                            (V2User.cc_id == user_key) | (func.lower(V2User.nickname) == nickname)
                        ).first()
                    else:
                        v2_user = query.filter(V2User.cc_id == user_key).first()

                    # 세그먼트 분류용 row 데이터 변환 (parse_int 적용)
                    classifier_row = {k: v for k, v in row.items()}
                    # 정규화된 키로도 접근 가능하게 추가
                    for target, actual in final_columns.items():
                        classifier_row[target] = row.get(actual)

                    if not v2_user:
                        segment = HQMarginImportService._classify_segment(classifier_row)
                        
                        if nickname:
                            existing_v2_users = db.query(V2User).filter(func.lower(V2User.nickname) == nickname).all()
                            if len(existing_v2_users) > 1:
                                skipped_count += 1
                                error_msg = f"Row {idx+2}: Ambiguous nickname '{nickname_raw}'"
                                errors.append(error_msg)
                                continue

                        prospect = db.query(HQProspectiveUser).filter(
                            (HQProspectiveUser.cc_id == user_key) | (func.lower(HQProspectiveUser.nickname) == nickname)
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
                        continue

                    segment = HQMarginImportService._classify_segment(classifier_row)
                    user_segment = db.query(V2UserSegment).filter(V2UserSegment.user_id == v2_user.id).first()

                    if user_segment:
                        user_segment.segment = segment
                        user_segment.updated_at = datetime.utcnow()
                        updated_count += 1
                    else:
                        user_segment = V2UserSegment(user_id=v2_user.id, segment=segment)
                        db.add(user_segment)
                        created_count += 1

                except Exception as e:
                    errors.append(f"Row {idx+2}: {str(e)}")

            db.commit()

            V2AdminAuditService.log(
                db,
                admin_id=admin_id,
                action="HQ_MARGIN_IMPORT",
                target_type="SEGMENT",
                target_id=None,
                after={
                    "category": "GOLDEN",
                    "reason": "HQ margin CSV import",
                    "stats": {
                        "total_rows": total_rows,
                        "updated": updated_count,
                        "created": created_count,
                        "prospective": prospective_count,
                        "skipped": skipped_count,
                    }
                },
            )

            return {
                "success": True,
                "total_rows": total_rows,
                "updated_count": updated_count,
                "created_count": created_count,
                "prospective_count": prospective_count,
                "skipped_count": skipped_count,
                "errors": errors[:50],
                "warnings": [],
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
    def _classify_segment(row: dict) -> str:
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
