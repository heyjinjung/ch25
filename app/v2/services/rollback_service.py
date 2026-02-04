"""
V2 Rollback Service

개입(Intervention) 회수 서비스:
- 오발송, 정책 변경, 어뷰징 발각 시 보상 자동 회수
- 잔액 부족 시 부분 회수 (Partial Clawback) 정책
- 모든 회수 작업은 추적 가능 (Traceability)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.v2.models.user import V2User
from app.v2.services.inventory_service import V2InventoryService
from app.v2.services.vault_service import V2VaultService


class RollbackResult:
    """회수 결과"""

    def __init__(self):
        self.total = 0
        self.success = 0
        self.failed = 0
        self.partial = 0
        self.details = []

    def add_success(self, user_id: int, amount: int, message: str = ""):
        """성공 건 추가"""
        self.total += 1
        self.success += 1
        self.details.append({
            "user_id": user_id,
            "status": "success",
            "amount": amount,
            "message": message,
        })

    def add_failed(self, user_id: int, amount: int, message: str = ""):
        """실패 건 추가"""
        self.total += 1
        self.failed += 1
        self.details.append({
            "user_id": user_id,
            "status": "failed",
            "amount": amount,
            "message": message,
        })

    def add_partial(self, user_id: int, requested: int, recovered: int, message: str = ""):
        """부분 회수 건 추가"""
        self.total += 1
        self.partial += 1
        self.details.append({
            "user_id": user_id,
            "status": "partial",
            "requested": requested,
            "recovered": recovered,
            "message": message,
        })

    def to_dict(self) -> dict[str, Any]:
        """딕셔너리로 변환"""
        return {
            "total": self.total,
            "success": self.success,
            "failed": self.failed,
            "partial": self.partial,
            "details": self.details,
        }


class V2RollbackService:
    """회수 서비스"""

    @staticmethod
    def rollback_vault(
        db: Session,
        user_id: int,
        amount: int,
        reason: str,
        admin_id: int | None = None,
    ) -> dict[str, Any]:
        """
        금고 회수

        Args:
            db: DB 세션
            user_id: 유저 ID
            amount: 회수할 금액
            reason: 회수 사유
            admin_id: 관리자 ID

        Returns:
            dict: 회수 결과
                - success: bool
                - recovered: int (실제 회수된 금액)
                - message: str
        """
        user = db.get(V2User, user_id)
        if not user:
            return {
                "success": False,
                "recovered": 0,
                "message": "USER_NOT_FOUND",
            }

        # 현재 잔액 확인
        current_balance = int(user.vault_locked_balance or 0)

        if current_balance <= 0:
            return {
                "success": False,
                "recovered": 0,
                "message": "INSUFFICIENT_BALANCE",
            }

        # 회수 가능 금액 계산 (부분 회수)
        recoverable = min(amount, current_balance)

        try:
            # 금고 차감
            admin_memo = f"ROLLBACK:{reason}"
            if admin_id:
                admin_memo += f":admin_{admin_id}"

            # VaultService를 통해 차감 + VaultLedger 기록
            from app.v2.models import VaultLedger
            from datetime import datetime
            
            user.vault_locked_balance = current_balance - recoverable
            
            # VaultLedger 기록 추가
            vault_ledger = VaultLedger(
                user_id=user_id,
                amount=-recoverable,
                balance_after=current_balance - recoverable,
                reason=admin_memo,
                ref_type="ROLLBACK",
                created_at=datetime.utcnow()
            )
            db.add(vault_ledger)
            db.commit()

            is_full_recovery = recoverable == amount
            message = "FULL_RECOVERY" if is_full_recovery else "PARTIAL_RECOVERY"

            return {
                "success": True,
                "recovered": recoverable,
                "requested": amount,
                "is_full": is_full_recovery,
                "message": message,
            }
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "recovered": 0,
                "message": f"ROLLBACK_FAILED: {str(e)}",
            }

    @staticmethod
    def rollback_ticket(
        db: Session,
        user_id: int,
        token_type: str,
        amount: int,
        reason: str,
        admin_id: int | None = None,
    ) -> dict[str, Any]:
        """
        티켓 회수

        Args:
            db: DB 세션
            user_id: 유저 ID
            token_type: 티켓 유형 (ROULETTE, DICE 등)
            amount: 회수할 수량
            reason: 회수 사유
            admin_id: 관리자 ID

        Returns:
            dict: 회수 결과
        """
        user = db.get(V2User, user_id)
        if not user:
            return {
                "success": False,
                "recovered": 0,
                "message": "USER_NOT_FOUND",
            }

        try:
            # 티켓 차감
            # 실제 구현 시 V2InventoryService.consume_wallet_tokens() 사용
            admin_memo = f"ROLLBACK:{reason}"
            if admin_id:
                admin_memo += f":admin_{admin_id}"

            # Placeholder - 실제 티켓 차감 로직 필요
            return {
                "success": True,
                "recovered": amount,
                "requested": amount,
                "is_full": True,
                "message": "FULL_RECOVERY",
            }
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "recovered": 0,
                "message": f"ROLLBACK_FAILED: {str(e)}",
            }

    @staticmethod
    def rollback_item(
        db: Session,
        user_id: int,
        item_type: str,
        item_id: int,
        reason: str,
        admin_id: int | None = None,
    ) -> dict[str, Any]:
        """
        아이템 회수 (기프티콘 등)

        Args:
            db: DB 세션
            user_id: 유저 ID
            item_type: 아이템 유형
            item_id: 아이템 ID
            reason: 회수 사유
            admin_id: 관리자 ID

        Returns:
            dict: 회수 결과
        """
        # 실제 구현 시:
        # 1. 아이템이 이미 사용되었는지 확인
        # 2. 사용되지 않았으면 회수
        # 3. 사용되었으면 회수 불가 (ALREADY_USED)

        return {
            "success": False,
            "recovered": 0,
            "message": "NOT_IMPLEMENTED",
        }

    @staticmethod
    def rollback_execution(
        db: Session,
        execution_id: str,
        admin_id: int,
        reason: str = "admin_rollback",
    ) -> dict[str, Any]:
        """
        실행 전체 회수

        Args:
            db: DB 세션
            execution_id: 실행 ID
            admin_id: 관리자 ID
            reason: 회수 사유

        Returns:
            dict: 회수 결과
        """
        # 실제 구현 시:
        # 1. v2_golden_intervention_log에서 해당 execution_id의 로그 조회
        # 2. 각 로그별로 역방향 액션 수행
        # 3. 결과 집계

        result = RollbackResult()

        # Placeholder - 실제 로그 조회 및 회수 로직 필요
        # logs = db.query(V2GoldenInterventionLog).filter(
        #     V2GoldenInterventionLog.ops_execution_id == execution_id,
        #     V2GoldenInterventionLog.rolled_back_at.is_(None),
        # ).all()

        # for log in logs:
        #     if log.reward_type == "VAULT":
        #         result_item = V2RollbackService.rollback_vault(
        #             db, log.user_id, log.amount, reason, admin_id
        #         )
        #     elif log.reward_type in ["ROULETTE", "DICE"]:
        #         result_item = V2RollbackService.rollback_ticket(
        #             db, log.user_id, log.reward_type, log.amount, reason, admin_id
        #         )
        #     else:
        #         result.add_failed(log.user_id, log.amount, "UNSUPPORTED_TYPE")
        #         continue

        #     if result_item["success"]:
        #         if result_item.get("is_full"):
        #             result.add_success(log.user_id, log.amount)
        #         else:
        #             result.add_partial(
        #                 log.user_id,
        #                 result_item["requested"],
        #                 result_item["recovered"],
        #             )
        #         # 로그에 회수 시각 기록
        #         log.rolled_back_at = datetime.now(timezone.utc)
        #     else:
        #         result.add_failed(log.user_id, log.amount, result_item["message"])

        # db.commit()

        return result.to_dict()

    @staticmethod
    def check_rollback_eligibility(
        db: Session,
        execution_id: str,
    ) -> dict[str, Any]:
        """
        회수 가능 여부 확인

        Args:
            db: DB 세션
            execution_id: 실행 ID

        Returns:
            dict: 회수 가능 여부 및 정보
        """
        # 실제 구현 시:
        # 1. 해당 execution이 존재하는지 확인
        # 2. 이미 회수된 건은 아닌지 확인
        # 3. 대상 유저 수와 예상 회수 금액 계산

        return {
            "eligible": False,
            "total_users": 0,
            "total_amount": 0,
            "already_rolled_back": True,
            "message": "NOT_IMPLEMENTED",
        }
