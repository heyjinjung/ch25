"""HQ Margin CSV Import Service

본사 충전/환전 마진 데이터를 V2 세그먼트로 임포트하는 서비스
"""
import pandas as pd
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, List
import logging

from app.v2.models.user import V2User
from app.models.user_segment import UserSegment
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
                "skipped_count": int,
                "errors": List[str],
                "warnings": List[str]
            }

        CSV Format:
            이름 (아이디), 닉네임, 누적 충전 금액, 누적 환전 금액,
            총 운영 마진, 미접속 경과일, 세그먼트(선택)
        """
        try:
            # CSV 읽기
            df = pd.read_csv(file_path, encoding='utf-8-sig')

            # 필수 컬럼 검증
            required_cols = ['이름 (아이디)', '총 운영 마진', '미접속 경과일']
            missing = [c for c in required_cols if c not in df.columns]
            if missing:
                raise ValueError(f"필수 컬럼 누락: {missing}")

            # 통계 초기화
            total_rows = len(df)
            updated_count = 0
            created_count = 0
            skipped_count = 0
            errors = []

            logger.info(f"HQ Margin CSV import started: {total_rows} rows")

            # 행별 처리
            for idx, row in df.iterrows():
                try:
                    user_key = str(row['이름 (아이디)']).strip()
                    nickname = str(row.get('닉네임', '')).strip() if '닉네임' in row and pd.notna(row['닉네임']) else None

                    # V2User 매칭 (cc_id 또는 nickname)
                    query = db.query(V2User)
                    if nickname:
                        v2_user = query.filter(
                            (V2User.cc_id == user_key) | (V2User.nickname == nickname)
                        ).first()
                    else:
                        v2_user = query.filter(V2User.cc_id == user_key).first()

                    if not v2_user:
                        skipped_count += 1
                        error_msg = f"Row {idx+2}: V2User not found ({user_key})"
                        errors.append(error_msg)
                        logger.warning(error_msg)
                        continue

                    # 세그먼트 분류
                    segment = HQMarginImportService._classify_segment(row)

                    # UserSegment 업데이트 또는 생성
                    user_segment = db.query(UserSegment).filter(
                        UserSegment.user_id == v2_user.id
                    ).first()

                    if user_segment:
                        old_segment = user_segment.segment
                        user_segment.segment = segment
                        user_segment.updated_at = datetime.utcnow()
                        updated_count += 1

                        logger.info(
                            f"HQ Margin Update: user_id={v2_user.id} cc_id={user_key} "
                            f"{old_segment} → {segment}"
                        )
                    else:
                        user_segment = UserSegment(
                            user_id=v2_user.id,
                            segment=segment,
                        )
                        db.add(user_segment)
                        created_count += 1

                        logger.info(
                            f"HQ Margin Create: user_id={v2_user.id} cc_id={user_key} → {segment}"
                        )

                except Exception as e:
                    error_msg = f"Row {idx+2}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(f"HQ Margin import error: {error_msg}")

            # 커밋
            db.commit()

            # 감사 로그
            V2AdminAuditService.log(
                db,
                admin_id=admin_id,
                action="HQ_MARGIN_IMPORT",
                category="GOLDEN",
                target_type="SEGMENT",
                target_id=None,
                changes={
                    "total_rows": total_rows,
                    "updated": updated_count,
                    "created": created_count,
                    "skipped": skipped_count,
                },
                reason="HQ margin CSV import",
            )

            logger.info(
                f"HQ Margin CSV import completed: "
                f"total={total_rows}, updated={updated_count}, "
                f"created={created_count}, skipped={skipped_count}"
            )

            return {
                "success": True,
                "total_rows": total_rows,
                "updated_count": updated_count,
                "created_count": created_count,
                "skipped_count": skipped_count,
                "errors": errors[:50],  # 최대 50개만 반환
                "warnings": [],
            }

        except Exception as e:
            logger.error(f"HQ Margin CSV import failed: {e}")
            db.rollback()
            raise

    @staticmethod
    def _classify_segment(row: pd.Series) -> str:
        """
        본사 마진 데이터 기반 세그먼트 분류

        우선순위:
        1. CSV에 명시적 세그먼트가 있으면 우선 사용
        2. 마진 100만원+ → VIP
        3. 미접속 7일+ & 마진 양수 → AT_RISK
        4. 충전 금액 500만원+ → WHALE
        5. 기본 → COMMON

        Args:
            row: pandas Series (CSV 한 행)

        Returns:
            세그먼트 코드 (VIP/WHALE/AT_RISK/COMMON)
        """
        # CSV에 세그먼트가 명시되어 있으면 우선 사용
        if '세그먼트' in row and pd.notna(row['세그먼트']):
            explicit_segment = str(row['세그먼트']).strip().upper()
            if explicit_segment in {'VIP', 'WHALE', 'AT_RISK', 'COMMON'}:
                return explicit_segment

        # 자동 분류
        try:
            margin = float(row.get('총 운영 마진', 0))
            inactive_days = int(row.get('미접속 경과일', 0))
            charge_amount = float(row.get('누적 충전 금액', 0))
        except (ValueError, TypeError):
            # 데이터 파싱 실패 시 기본값
            margin = 0
            inactive_days = 0
            charge_amount = 0

        # 분류 로직
        if margin > 1_000_000:
            return 'VIP'
        elif inactive_days > 7 and margin > 0:
            return 'AT_RISK'
        elif charge_amount > 5_000_000:
            return 'WHALE'
        else:
            return 'COMMON'
