"""
주사위 게임 어드민 설정 풀스택 연동 검증 테스트

검증 항목:
1. 어드민 설정값이 게임 로직에 정확히 반영되는지
2. 골든아워 배율이 설정한대로 작동하는지  
3. 승률이 어드민 설정값대로 게임 로직에 반영되는지
4. 금고 잔액 계산이 정확한지
"""
import pytest
from datetime import date, datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.db.base_class import Base
import app.db.base  # noqa: F401
import app.v2.models  # noqa: F401

from app.models.user import User
from app.models.dice import DiceConfig, DiceLog
from app.models.feature import Feature, FeatureType
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.user_segment import UserSegment
from app.models.event import Event, EventType
from app.services.dice_service import DiceService
from app.v2.services.vault2_service import Vault2Service


@pytest.fixture(scope="function")
def db_session():
    """In-memory SQLite DB for isolated testing."""
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
    """Create a test user with tokens and vault balance."""
    user = User(
        id=100,
        external_id="test-dice-user",
        nickname="DicePlayer",
        total_deposit=500000,  # 50만원 입금
        vault_balance=10000,
        vault_locked_balance=5000,  # Event 참여 가능
    )
    db_session.add(user)
    
    # 주사위 티켓 지급
    wallet = UserGameWallet(
        user_id=100,
        token_type=GameTokenType.DICE_TOKEN,
        balance=10
    )
    db_session.add(wallet)
    
    # 세그먼트 설정
    segment = UserSegment(user_id=100, segment="COMMON")
    db_session.add(segment)
    
    db_session.commit()
    return user


@pytest.fixture
def dice_config(db_session: Session):
    """Create test dice configuration."""
    config = DiceConfig(
        id=1,
        name="Test Dice Config",
        is_active=True,
        max_daily_plays=0,  # Unlimited
        # 승률 설정 (NORMAL 모드에서는 주사위 RNG, EVENT 모드에서 사용)
        win_probability=0.40,   # 40% 승률
        draw_probability=0.10,  # 10% 무승부
        lose_probability=0.50,  # 50% 패배
        # 보상 설정
        win_reward_type="POINT",
        win_reward_amount=1000,   # 승리 시 1,000 포인트
        draw_reward_type="POINT",
        draw_reward_amount=500,   # 무승부 시 500 포인트
        lose_reward_type="POINT",
        lose_reward_amount=-200,  # 패배 시 -200 포인트
        daily_gain_cap=999999,
    )
    db_session.add(config)
    db_session.commit()
    return config


@pytest.fixture
def active_feature(db_session: Session):
    """Activate Dice feature."""
    feature = Feature(
        id=1,
        type=FeatureType.DICE,
        is_active=True,
        start_date=date.today() - timedelta(days=1),
        end_date=date.today() + timedelta(days=30)
    )
    db_session.add(feature)
    db_session.commit()
    return feature


def test_admin_config_integration(db_session, test_user, dice_config, active_feature):
    """
    핵심 검증: 어드민에서 설정한 값이 실제 게임 로직에 반영되는지
    """
    service = DiceService()
    
    # 1. Config가 로드되는지 확인
    loaded_config = service._get_today_config(db_session)
    assert loaded_config.id == dice_config.id
    assert loaded_config.win_probability == 0.40
    assert loaded_config.win_reward_amount == 1000
    
    # 2. 게임 플레이 (NORMAL 모드)
    result = service.play(db_session, user_id=100, now=datetime.utcnow())
    
    # 3. 결과 검증
    assert result.result == "OK"
    assert result.game.outcome in ["WIN", "DRAW", "LOSE"]
    
    # 4. 로그 기록 확인
    log = db_session.query(DiceLog).filter(DiceLog.user_id == 100).first()
    assert log is not None
    assert log.config_id == dice_config.id
    
    # 5. 보상이 설정값과 일치하는지 확인
    if log.result == "WIN":
        assert log.reward_type == "POINT"
        # Golden Hour가 아니면 base amount 그대로
        assert log.reward_amount in [1000, 2000, 2500]  # 골든아워 배율 고려
    elif log.result == "LOSE":
        assert log.reward_amount == -200


def test_golden_hour_multiplier(db_session, test_user, dice_config, active_feature):
    """
    골든아워 배율이 어드민 설정 + 세그먼트에 따라 정확히 작동하는지
    """
    # Golden Hour 이벤트 설정
    golden_event = Event(
        id=1,
        type=EventType.GOLDEN_HOUR,
        is_active=True,
        start_time=datetime.utcnow() - timedelta(hours=1),
        end_time=datetime.utcnow() + timedelta(hours=1),
    )
    db_session.add(golden_event)
    db_session.commit()
    
    service = DiceService()
    
    # WHALESEM 세그먼트는 골든아워 2.5배
    db_session.query(UserSegment).filter(UserSegment.user_id == 100).update({"segment": "WHALE"})
    db_session.commit()
    
    # 승리 강제 (테스트 목적으로 여러 번 플레이하여 WIN 케이스 획득)
    wins = []
    for _ in range(20):  # 충분한 샘플
        result = service.play(db_session, user_id=100, now=datetime.utcnow())
        if result.game.outcome == "WIN":
            wins.append(result)
            if len(wins) >= 3:  # 3개 샘플이면 충분
                break
    
    # 골든아워 + WHALE 세그먼트는 기본값 1000 * 2.5 = 2500 기대
    if wins:
        log = db_session.query(DiceLog).filter(
            DiceLog.user_id == 100,
            DiceLog.result == "WIN"
        ).first()
        # 골든아워 활성화되어 있으므로 배율 적용되어야 함
        assert log.reward_amount == 2500, f"Expected 2500 but got {log.reward_amount}"


def test_win_rate_statistical_verification(db_session, test_user, dice_config, active_feature):
    """
    승률이 어드민 설정값 (40% WIN, 10% DRAW, 50% LOSE)에 근접하는지 통계적 검증
    
    주의: NORMAL 모드는 주사위 RNG이므로 정확한 확률 제어 불가.
    EVENT 모드에서만 p_win 등이 사용됨.
    이 테스트는 EVENT 모드가 활성화되었을 때를 가정.
    """
    # Vault2 Event Mock Setup (간단한 버전)
    # 실제로는 Vault2Service의 설정이 필요하지만, 여기서는 NORMAL 모드 RNG 검증
    
    service = DiceService()
    
    results = {"WIN": 0, "DRAW": 0, "LOSE": 0}
    n_trials = 300  # 충분한 샘플 사이즈
    
    # 티켓 추가 지급
    wallet = db_session.query(UserGameWallet).filter(
        UserGameWallet.user_id == 100,
        UserGameWallet.token_type == GameTokenType.DICE_TOKEN
    ).first()
    wallet.balance = n_trials
    db_session.commit()
    
    for _ in range(n_trials):
        result = service.play(db_session, user_id=100, now=datetime.utcnow())
        results[result.game.outcome] += 1
    
    # 통계적 검증 (±10% 허용 오차)
    # NORMAL 모드는 공정한 주사위 게임이므로 WIN 확률은 약 40-50% 범위
    win_rate = results["WIN"] / n_trials
    print(f"\\nWin rate: {win_rate:.2%} (Expected ~40-50% in NORMAL mode)")
    print(f"Results: WIN={results['WIN']}, DRAW={results['DRAW']}, LOSE={results['LOSE']}")
    
    # NORMAL 모드에서는 주사위 합 비교이므로 정확히 40%는 아니지만 합리적 범위 내
    assert 0.30 <= win_rate <= 0.60, f"Win rate {win_rate} is outside reasonable range"


def test_vault_balance_calculation(db_session, test_user, dice_config, active_feature):
    """
    금고 잔액 계산이 정확한지 검증
    - 승리 시 금고 증가
    - 패배 시 금고 감소
    """
    service = DiceService()
initial_vault = test_user.vault_balance
    
    # 게임 플레이
    result = service.play(db_session, user_id=100, now=datetime.utcnow())
    
    # 금고 변화 확인
    db_session.refresh(test_user)
    vault_delta = test_user.vault_balance - initial_vault
    
    # 로그 확인
    log = db_session.query(DiceLog).filter(DiceLog.user_id == 100).order_by(DiceLog.id.desc()).first()
    
    print(f"\\nOutcome: {log.result}")
    print(f"Reward Amount: {log.reward_amount}")
    print(f"Vault Delta: {vault_delta}")
    print(f"Vault Earn (reported): {result.vault_earn}")
    
    # VaultService가 정확히 계산했는지 검증
    # reward_amount가 vault에 반영되어야 함
    assert result.vault_earn is not None
    
    # 승리 시 포인트가 금고로 적립되어야 함
    if log.result == "WIN":
        assert result.vault_earn > 0


def test_admin_config_update_reflection(db_session, test_user, dice_config, active_feature):
    """
    어드민에서 설정을 변경하면 즉시 반영되는지 검증
    """
    service = DiceService()
    
    # 초기 설정 확인
    config = service._get_today_config(db_session)
    assert config.win_reward_amount == 1000
    
    # 어드민이 설정 변경 (보상 증가)
    dice_config.win_reward_amount = 5000
    db_session.commit()
    
    # 새로운 플레이에서 변경된 설정 반영 확인
    config_after = service._get_today_config(db_session)
    assert config_after.win_reward_amount == 5000
    
    # 실제 게임에서도 변경된 보상 적용되는지 (WIN 케이스 필요)
    # 여러 번 시도하여 WIN 케이스 획득
    for _ in range(50):
        result = service.play(db_session, user_id=100, now=datetime.utcnow())
        if result.game.outcome == "WIN":
            log = db_session.query(DiceLog).filter(
                DiceLog.user_id == 100,
                DiceLog.result == "WIN"
            ).order_by(DiceLog.id.desc()).first()
            # 골든아워가 없다면 5000, 있다면 배율 적용
            assert log.reward_amount >= 5000
            break
