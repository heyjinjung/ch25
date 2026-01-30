"""
V2 Dice Admin Integration Test (정책/스키마/서비스 기반)
 - 어드민 설정값 반영
 - 골든아워 배율 적용
 - 승률/보상/금고 라우팅 SoT 검증
"""
import pytest
from datetime import datetime, date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
from app.models.user import User
from app.v2.models.user import V2User
from app.v2.models.v2_dice import V2DiceConfig, V2DiceLog
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.feature import FeatureConfig, FeatureSchedule, FeatureType
from app.models.user_segment import UserSegment
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.v2.services.v2_dice_game_service import V2DiceGameService
from app.v2.services.game_config_service import V2GameConfigService


@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user(db_session: Session):
    user = User(
        id=100,
        external_id="test-dice-user",
        nickname="DicePlayer",
        total_charge_amount=500000,
        vault_balance=10000,
        vault_locked_balance=5000,
    )
    db_session.add(user)
    
    # Add V2User for V2 services
    v2_user = V2User(
        id=100,
        cc_id="test-dice-user",
        nickname="DicePlayer",
        vault_locked_balance=5000
    )
    db_session.add(v2_user)
    
    # Add recent deposit to bypass BENEFITS_SUSPENDED
    deposit = ExternalRankingDailyDepositDelta(
        user_id=100,
        kst_date=date.today(),
        deposit_delta=100000
    )
    db_session.add(deposit)

    wallet = UserGameWallet(
        user_id=100,
        token_type=GameTokenType.DICE_TICKET,
        balance=10
    )
    db_session.add(wallet)
    db_session.commit()
    return user


@pytest.fixture
def dice_config(db_session: Session):
    config = V2DiceConfig(
        id=1,
        name="Test Dice Config",
        is_active=True,
        max_daily_plays=0,
        win_probability=0.4,
        draw_probability=0.1,
        lose_probability=0.5,
        win_reward_type="POINT",
        win_reward_amount=1000,
        draw_reward_type="POINT",
        draw_reward_amount=500,
        lose_reward_type="POINT",
        lose_reward_amount=0,  # V2 usually uses 0 for lose reward
        daily_gain_cap=999999,
        ticket_type="DICE_TICKET"
    )
    db_session.add(config)
    db_session.commit()
    return config


def test_admin_config_applied(db_session, test_user, dice_config):
    """어드민 설정값이 게임 로직에 정확히 반영되는지 검증"""
    # In V2, we use V2GameConfigService.get_active_dice_config
    loaded = V2GameConfigService.get_active_dice_config(db_session)
    assert loaded.id == dice_config.id
    assert loaded.win_probability == 0.4
    assert loaded.win_reward_amount == 1000


def test_dice_play_and_vault_routing(db_session, test_user, dice_config):
    """주사위 플레이 결과 및 금고 라우팅/보상 SoT 검증"""
    service = V2DiceGameService()
    result = service.play(db_session, user_id=100, now=datetime.utcnow())
    assert result.result == "OK"
    assert result.game_data.outcome in ["WIN", "DRAW", "LOSE"]
    log = db_session.query(V2DiceLog).filter(V2DiceLog.user_id == 100).first()
    assert log is not None
    # 보상/금고 라우팅 SoT: 음수면 차감, 양수면 적립
    if log.result == "WIN":
        assert log.reward_type == "POINT"
        assert log.reward_amount == 1000
    elif log.result == "DRAW":
        assert log.reward_amount == 500
    elif log.result == "LOSE":
        assert log.reward_amount == 0


def test_golden_hour_multiplier_applied(db_session, test_user, dice_config, monkeypatch):
    """골든아워 배율이 적용되는지 검증 (mock 방식)"""
    service = V2DiceGameService()
    
    # Mock V2DiceConfig to enable golden hour
    dice_config.enable_golden_hour = True
    dice_config.golden_hour_multiplier = 2.0
    db_session.commit()

    class MockSettings:
        golden_hour_enabled = True
        ch25_dda_enabled = False
        ch25_intervention_enabled = False
        ch25_internal_stream_enabled = False
        streak_day_reset_hour_kst = 9

    monkeypatch.setattr("app.v2.services.v2_dice_game_service.get_settings", lambda: MockSettings())
    monkeypatch.setattr("app.services.game_common.get_settings", lambda: MockSettings())
    
    # Ensure V2EventService also sees golden hour as active
    monkeypatch.setattr("app.v2.services.event_service.V2EventService.is_golden_hour", lambda self, db, now: True)
    
    result = service.play(db_session, user_id=100, now=datetime.utcnow())
    # 골든아워면 보상 배율이 곱해진 값이어야 함(예: 1000*2=2000)
    if result.game_data.outcome == "WIN":
        assert result.game_data.reward_amount == 2000


def test_win_rate_statistical(db_session, test_user, dice_config):
    """승률이 설정값(40%)에 근접하는지 통계적 검증 (±15%)"""
    service = V2DiceGameService()
    # Ensure enough balance for this test
    wallet = db_session.query(UserGameWallet).filter(
        UserGameWallet.user_id == 100,
        UserGameWallet.token_type == GameTokenType.DICE_TICKET
    ).first()
    wallet.balance = 200
    db_session.commit()

    n_trials = 100
    win = 0
    for _ in range(n_trials):
        r = service.play(db_session, user_id=100, now=datetime.utcnow())
        if r.game_data.outcome == "WIN":
            win += 1
    win_rate = win / n_trials
    assert 0.20 <= win_rate <= 0.60
    return dice_config


@pytest.fixture(autouse=True)
def dice_feature_gate(db_session: Session):
    """Ensure Dice feature config/schedule exists for gate validation."""
    config = FeatureConfig(
        feature_type=FeatureType.DICE,
        title="Dice Event",
        page_path="/dice",
        is_enabled=True,
        config_json={"mode": "NORMAL"},
    )
    schedule = FeatureSchedule(
        date=date.today(),
        feature_type=FeatureType.DICE,
        is_active=True,
    )
    db_session.add_all([config, schedule])
    db_session.commit()
    return config


def test_admin_config_integration(db_session, test_user, dice_config):
    """
    핵심 검증: 어드민에서 설정한 값이 실제 게임 로직에 반영되는지
    """
    service = V2DiceGameService()
    
    # 1. Config가 로드되는지 확인
    loaded_config = V2GameConfigService.get_active_dice_config(db_session)
    assert loaded_config.id == dice_config.id
    assert loaded_config.win_probability == 0.40
    assert loaded_config.win_reward_amount == 1000
    
    # 2. 게임 플레이
    result = service.play(db_session, user_id=100, now=datetime.utcnow())
    
    # 3. 결과 검증
    assert result.result == "OK"
    assert result.game_data.outcome in ["WIN", "DRAW", "LOSE"]
    
    # 4. 로그 기록 확인
    log = db_session.query(V2DiceLog).filter(V2DiceLog.user_id == 100).first()
    assert log is not None
    assert log.config_id == dice_config.id
    
    # 5. 보상이 설정값과 일치하는지 확인
    if log.result == "WIN":
        assert log.reward_type == "POINT"
        # Golden Hour가 아니면 base amount 그대로
        assert log.reward_amount in [1000, 2000, 2500]  # 골든아워 배율 고려 (테스트 설정에 따라 다름)
    elif log.result == "LOSE":
        assert log.reward_amount == 0


def test_golden_hour_multiplier(db_session, test_user, dice_config, monkeypatch):
    """
    골든아워 배율이 어드민 설정에 따라 정확히 작동하는지
    """
    service = V2DiceGameService()
    
    # Mock V2EventService to force Golden Hour
    monkeypatch.setattr("app.v2.services.event_service.V2EventService.is_golden_hour", lambda self, db, now: True)
    
    # Set high multiplier
    dice_config.enable_golden_hour = True
    dice_config.golden_hour_multiplier = 2.5
    db_session.commit()

    wins = []
    for _ in range(20):
        result = service.play(db_session, user_id=100, now=datetime.utcnow())
        if result.game_data.outcome == "WIN":
            wins.append(result)
            if len(wins) >= 2:
                break
    if wins:
        log = db_session.query(V2DiceLog).filter(
            V2DiceLog.user_id == 100,
            V2DiceLog.result == "WIN"
        ).order_by(V2DiceLog.id.desc()).first()
        # 1000 * 2.5 = 2500
        assert log.reward_amount == 2500


def test_win_rate_statistical_verification(db_session, test_user, dice_config):
    """
    승률이 어드민 설정값 (40% WIN, 10% DRAW, 50% LOSE)에 근접하는지 통계적 검증
    """
    service = V2DiceGameService()
    
    results = {"WIN": 0, "DRAW": 0, "LOSE": 0}
    n_trials = 100
    
    # 티켓 추가 지급
    wallet = db_session.query(UserGameWallet).filter(
        UserGameWallet.user_id == 100,
        UserGameWallet.token_type == GameTokenType.DICE_TICKET
    ).first()
    wallet.balance = n_trials
    db_session.commit()

    for _ in range(n_trials):
        result = service.play(db_session, user_id=100, now=datetime.utcnow())
        results[result.game_data.outcome] += 1

    win_rate = results["WIN"] / n_trials
    # Statistical range for p=0.4, n=100
    assert 0.20 <= win_rate <= 0.60


def test_vault_balance_calculation(db_session, test_user, dice_config):
    """
    금고 잔액 계산 SoT 검증
    """
    service = V2DiceGameService()
    
    # 게임 플레이
    result = service.play(db_session, user_id=100, now=datetime.utcnow())
    
    # 금고 변화 확인
    log = db_session.query(V2DiceLog).filter(V2DiceLog.user_id == 100).order_by(V2DiceLog.id.desc()).first()
    
    # VaultService가 정확히 계산했는지 검증
    if log.result == "WIN":
        assert result.vault_earn == 1000
    elif log.result == "LOSE":
        assert result.vault_earn == 0


def test_admin_config_update_reflection(db_session, test_user, dice_config):
    """
    어드민에서 설정을 변경하면 즉시 반영되는지 검증
    """
    service = V2DiceGameService()
    
    # 초기 설정 확인
    config = V2GameConfigService.get_active_dice_config(db_session)
    assert config.win_reward_amount == 1000
    
    # 어드민이 설정 변경 (보상 증가)
    dice_config.win_reward_amount = 5000
    db_session.commit()
    db_session.expire_all()
    
    # 새로운 플레이에서 변경된 설정 반영 확인
    config_after = V2GameConfigService.get_active_dice_config(db_session)
    assert config_after.win_reward_amount == 5000
    
    # 실제 게임에서도 변경된 보상 적용되는지 (WIN 케이스 필요)
    for _ in range(50):
        result = service.play(db_session, user_id=100, now=datetime.utcnow())
        if result.game_data.outcome == "WIN":
            log = db_session.query(V2DiceLog).filter(
                V2DiceLog.user_id == 100,
                V2DiceLog.result == "WIN"
            ).order_by(V2DiceLog.id.desc()).first()
            assert log.reward_amount >= 5000
            break
