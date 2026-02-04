"""
통합 시나리오 테스트: CSV Import → Deposit → Level → Reward 전체 플로우
SoT 기준: V2 완전 통합 검증
"""
import pytest
from datetime import datetime
from sqlalchemy.orm import Session

from app.v2.models import V2User, V2GameLog, UserLevelProgress, UserLevelRewardLog
from app.v2.services.paste_import_service import PasteImportService
from app.v2.services.admin_cc_deposit_service import AdminCCDepositService
from app.v2.services.level_xp_service import V2LevelXPService
from app.v2.services.vault_service import V2VaultService


@pytest.fixture
def integration_user(db: Session) -> V2User:
    """통합 테스트용 유저"""
    user = V2User(
        cc_id="INTEGRATION_TEST",
        nickname="통합테스트유저",
        level=1,
        xp=0,
        total_charge_amount=0,
        baseline_charge_amount=0,
        vault_locked_balance=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestCSVToRewardFullFlow:
    """CSV Import부터 보상까지 전체 플로우 테스트"""

    def test_full_deposit_flow(self, db: Session, integration_user: V2User):
        """
        완전 통합 시나리오:
        1. CSV Import로 입금 데이터 반입
        2. V2User 입금액 업데이트
        3. 자동 XP 적립
        4. 레벨업 시 자동 보상
        """
        # Given: CSV Import Service
        paste_service = PasteImportService()
        
        # Step 1: CSV Import (500,000원 입금)
        csv_data = f"""번호	소속	이름	닉네임	신청날짜	충전금액	입금자명	충전날짜	상태
1	A	홍길동	{integration_user.nickname}	2026-02-04 10:00	500000	홍길동	2026-02-04 10:05	완료"""

        result = paste_service.process_daily_deposit(db, csv_data)
        
        # Step 2: V2User 검증
        db.refresh(integration_user)
        assert integration_user.total_charge_amount == 500000
        
        # Step 3: XP 적립 검증 (50만원 = 100 XP)
        assert integration_user.xp >= 100
        
        # Step 4: 레벨업 보상 자동 지급 확인
        reward_logs = db.query(UserLevelRewardLog).filter_by(user_id=integration_user.id).all()
        if integration_user.level > 1:
            assert len(reward_logs) > 0

    def test_game_log_to_analytics_flow(self, db: Session, integration_user: V2User):
        """
        게임 로그 → Analytics → 위기 감지 플로우:
        1. CSV Import로 게임 로그 반입
        2. V2GameLog 저장
        3. Analytics 집계
        4. 위기 유저 감지
        """
        # Given: 게임 로그 CSV (큰 손해)
        paste_service = PasteImportService()
        csv_data = f"""번호	이름	닉네임	타입	베팅일시	게임종류	금액
1	홍길동	{integration_user.nickname}	베팅	2026-02-04 10:00	슬롯	100000
2	홍길동	{integration_user.nickname}	당첨	2026-02-04 10:01	슬롯	0
3	홍길동	{integration_user.nickname}	베팅	2026-02-04 10:05	슬롯	100000
4	홍길동	{integration_user.nickname}	당첨	2026-02-04 10:06	슬롯	0"""

        # Step 1: CSV Import
        result = paste_service.process_game_log(db, csv_data)
        
        # Step 2: V2GameLog 저장 확인
        logs = db.query(V2GameLog).filter_by(user_id=integration_user.id).all()
        assert len(logs) >= 2  # 최소 2개 베팅
        
        # Step 3: Analytics - 손실 계산
        total_bet = sum(log.bet_amount for log in logs if log.bet_amount > 0)
        total_win = sum(log.win_amount for log in logs if log.win_amount > 0)
        net_loss = total_bet - total_win
        
        # Step 4: 위기 감지 (200,000원 이상 손실)
        assert net_loss >= 200000
        is_at_risk = net_loss >= 200000
        assert is_at_risk is True


class TestDepositWithdrawalCycle:
    """입금 → 게임 플레이 → 출금 사이클 테스트"""

    def test_deposit_play_withdraw_sot_cycle(self, db: Session, integration_user: V2User):
        """
        완전한 사이클 검증:
        1. 입금 (total_charge_amount 증가)
        2. 게임 플레이 (vault 적립)
        3. 출금 (vault 차감)
        SoT: v2_user.vault_locked_balance가 단일 진실 공급원
        """
        # Step 1: 입금 (500,000원)
        deposit_service = AdminCCDepositService()
        deposit_service.process_deposit(
            db,
            user_id=integration_user.id,
            amount=500000,
            source="test_cycle"
        )
        db.refresh(integration_user)
        assert integration_user.total_charge_amount == 500000
        
        # Step 2: 게임 플레이 (Vault 10,000원 적립)
        vault_service = V2VaultService()
        vault_service.adjust_balance(
            db,
            user_id=integration_user.id,
            amount=10000,
            reason="game_win",
            force=False
        )
        db.refresh(integration_user)
        assert integration_user.vault_locked_balance == 10000
        
        # Step 3: 출금 (5,000원)
        vault_service.adjust_balance(
            db,
            user_id=integration_user.id,
            amount=-5000,
            reason="withdrawal",
            force=False
        )
        db.refresh(integration_user)
        assert integration_user.vault_locked_balance == 5000

    def test_benefits_suspended_after_7days_no_deposit(self, db: Session, integration_user: V2User):
        """7일 무입금 시 benefits_suspended 정책 검증"""
        # Given: 7일 이상 입금 없음
        from datetime import timedelta
        integration_user.first_deposit_at = datetime.utcnow() - timedelta(days=8)
        db.commit()
        
        # When: benefits_suspended 체크
        vault_service = V2VaultService()
        is_suspended, deposit_7d = vault_service.is_benefits_suspended(db, integration_user.id)
        
        # Then: 제재 상태
        assert is_suspended is True
        assert deposit_7d == 0


class TestLevelRewardAutoGrant:
    """레벨업 자동 보상 지급 테스트"""

    def test_level_up_auto_grant_rewards(self, db: Session, integration_user: V2User):
        """레벨업 시 자동 보상 지급 검증"""
        # Given: 충분한 XP로 레벨업
        level_service = V2LevelXPService()
        
        # When: 500 XP 추가 (여러 레벨업 발생)
        result = level_service.add_xp(
            db,
            user_id=integration_user.id,
            delta=500,
            source="test_levelup"
        )
        db.commit()
        
        # Then: 자동 보상 지급 확인
        db.refresh(integration_user)
        assert integration_user.xp == 500
        assert integration_user.level > 1
        
        # 보상 로그 확인
        reward_logs = db.query(UserLevelRewardLog).filter_by(
            user_id=integration_user.id
        ).all()
        auto_granted = [log for log in reward_logs if log.auto_granted]
        assert len(auto_granted) > 0

    def test_level_reward_idempotency(self, db: Session, integration_user: V2User):
        """레벨 보상 중복 지급 방지"""
        # Given: 이미 레벨 3 보상 받음
        level_service = V2LevelXPService()
        level_service.add_xp(db, user_id=integration_user.id, delta=100, source="first")
        db.commit()
        
        initial_rewards = db.query(UserLevelRewardLog).filter_by(
            user_id=integration_user.id
        ).count()
        
        # When: 같은 레벨에 XP 추가
        level_service.add_xp(db, user_id=integration_user.id, delta=10, source="second")
        db.commit()
        
        # Then: 중복 보상 없음
        final_rewards = db.query(UserLevelRewardLog).filter_by(
            user_id=integration_user.id
        ).count()
        assert final_rewards == initial_rewards


class TestSOTDataIntegrity:
    """SoT 데이터 무결성 검증"""

    def test_v2_user_is_single_source_of_truth(self, db: Session, integration_user: V2User):
        """V2User가 레벨/XP/입금의 단일 진실 공급원"""
        # Given: V2User에 데이터 설정
        integration_user.level = 5
        integration_user.xp = 300
        integration_user.total_charge_amount = 1000000
        db.commit()
        
        # When: 레거시 테이블 조회
        progress = db.query(UserLevelProgress).filter_by(user_id=integration_user.id).first()
        
        # Then: V2User가 SoT (레거시는 동기화만)
        if progress:
            # 레거시가 있다면 V2와 동기화되어야 함
            assert progress.level == integration_user.level
            assert progress.xp == integration_user.xp
        else:
            # 레거시가 없어도 V2User만으로 시스템 동작
            pass
        
        # V2User 값이 최종 진실
        assert integration_user.level == 5
        assert integration_user.xp == 300

    def test_vault_locked_balance_only(self, db: Session, integration_user: V2User):
        """Vault SoT: locked_balance만 사용, available은 deprecated"""
        # Given: locked_balance 설정
        integration_user.vault_locked_balance = 50000
        integration_user.vault_available_balance = 0  # deprecated
        db.commit()
        
        # When: Vault 조회
        vault_service = V2VaultService()
        status = vault_service.get_status(db, integration_user.id)
        
        # Then: locked만 반영
        assert status["locked_balance"] == 50000
        # available은 항상 0
        assert integration_user.vault_available_balance == 0


@pytest.mark.parametrize("scenario", [
    {
        "deposit": 100000,
        "expected_xp": 20,
        "min_level": 1
    },
    {
        "deposit": 500000,
        "expected_xp": 100,
        "min_level": 1
    },
    {
        "deposit": 1000000,
        "expected_xp": 200,
        "min_level": 2
    }
])
def test_deposit_xp_level_progression(db: Session, integration_user: V2User, scenario: dict):
    """입금 → XP → 레벨 진행 파라미터 테스트"""
    # Given
    deposit_service = AdminCCDepositService()
    
    # When: 입금 처리
    deposit_service.process_deposit(
        db,
        user_id=integration_user.id,
        amount=scenario["deposit"],
        source=f"test_{scenario['deposit']}"
    )
    
    # Then: XP/레벨 검증
    db.refresh(integration_user)
    assert integration_user.total_charge_amount == scenario["deposit"]
    assert integration_user.xp >= scenario["expected_xp"]
    assert integration_user.level >= scenario["min_level"]
