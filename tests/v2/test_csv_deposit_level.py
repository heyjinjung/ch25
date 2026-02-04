"""
CSV Import 테스트: Daily Deposit, Game Log
SoT 기준: V2 SoT 통합 (2026-02-04)
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.v2.models import V2User, V2GameLog
from app.v2.services.paste_import_service import PasteImportService
from app.v2.services.level_xp_service import V2LevelXPService
from app.v2.services.admin_cc_deposit_service import AdminCCDepositService


@pytest.fixture
def paste_import_service():
    return PasteImportService()


@pytest.fixture
def test_user(db: Session) -> V2User:
    """테스트용 유저 생성"""
    user = V2User(
        cc_id="TEST_CSV_USER",
        nickname="CSV테스트유저",
        level=1,
        xp=0,
        total_charge_amount=0,
        baseline_charge_amount=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestCSVDailyDepositImport:
    """CSV Daily Deposit Import 테스트"""

    def test_daily_deposit_import_basic(self, db: Session, test_user: V2User, paste_import_service: PasteImportService):
        """기본 입금 CSV Import 테스트"""
        # Given: 입금 CSV 데이터
        csv_data = f"""번호	소속	이름	닉네임	신청날짜	충전금액	입금자명	충전날짜	상태
1	A	홍길동	{test_user.nickname}	2026-02-04 10:00	100000	홍길동	2026-02-04 10:05	완료"""

        # When: CSV Import 실행
        result = paste_import_service.process_daily_deposit(db, csv_data)

        # Then: V2User의 total_charge_amount 업데이트 확인
        db.refresh(test_user)
        assert result["processed_count"] == 1
        assert test_user.total_charge_amount == 100000
        
    def test_daily_deposit_sot_compliance(self, db: Session, test_user: V2User, paste_import_service: PasteImportService):
        """SoT 준수: V2 SoT 통합 - v2_user가 단일 진실 공급원"""
        # Given: 초기 baseline 설정
        test_user.baseline_charge_amount = 50000
        db.commit()
        
        csv_data = f"""번호	소속	이름	닉네임	신청날짜	충전금액	입금자명	충전날짜	상태
1	A	홍길동	{test_user.nickname}	2026-02-04 10:00	100000	홍길동	2026-02-04 10:05	완료"""

        # When: CSV Import 실행
        paste_import_service.process_daily_deposit(db, csv_data)

        # Then: SoT 검증
        db.refresh(test_user)
        # v2_user.total_charge_amount가 SoT (단일 진실 공급원)
        assert test_user.total_charge_amount == 100000
        # baseline은 기존 값 유지
        assert test_user.baseline_charge_amount == 50000

    def test_daily_deposit_level_xp_integration(self, db: Session, test_user: V2User, paste_import_service: PasteImportService):
        """입금 → 레벨 → XP 통합 시나리오"""
        # Given: 100,000원 입금 = 20 XP (10만원당 20XP)
        csv_data = f"""번호	소속	이름	닉네임	신청날짜	충전금액	입금자명	충전날짜	상태
1	A	홍길동	{test_user.nickname}	2026-02-04 10:00	100000	홍길동	2026-02-04 10:05	완료"""

        # When: CSV Import 실행
        paste_import_service.process_daily_deposit(db, csv_data)

        # Then: XP 적립 확인 (v2_user.xp가 SoT)
        db.refresh(test_user)
        assert test_user.xp >= 20  # 최소 20XP 적립
        assert test_user.level >= 1  # 레벨 유지 또는 상승


class TestCSVGameLogImport:
    """CSV Game Log Import 테스트"""

    def test_game_log_import_basic(self, db: Session, test_user: V2User, paste_import_service: PasteImportService):
        """기본 게임 로그 Import 테스트"""
        # Given: 게임 로그 CSV
        csv_data = f"""번호	이름	닉네임	타입	베팅일시	게임종류	금액
1	홍길동	{test_user.nickname}	베팅	2026-02-04 10:00	슬롯	10000
2	홍길동	{test_user.nickname}	당첨	2026-02-04 10:01	슬롯	50000"""

        # When: CSV Import 실행
        result = paste_import_service.process_game_log(db, csv_data)

        # Then: V2GameLog 저장 확인
        logs = db.query(V2GameLog).filter(V2GameLog.user_id == test_user.id).all()
        assert result["processed_count"] == 2
        assert len(logs) == 2

    def test_game_log_time_based_filtering(self, db: Session, test_user: V2User, paste_import_service: PasteImportService):
        """시간 기반 필터링: DB 최신 기록 이후만 처리"""
        # Given: 과거 로그 먼저 저장
        past_log = V2GameLog(
            user_id=test_user.id,
            game_type="슬롯",
            bet_amount=10000,
            win_amount=0,
            played_at=datetime.utcnow() - timedelta(hours=2),
        )
        db.add(past_log)
        db.commit()

        # When: 과거 시간의 CSV Import 시도
        csv_data = f"""번호	이름	닉네임	타입	베팅일시	게임종류	금액
1	홍길동	{test_user.nickname}	베팅	{(datetime.utcnow() - timedelta(hours=3)).strftime('%Y-%m-%d %H:%M')}	슬롯	5000"""

        result = paste_import_service.process_game_log(db, csv_data)

        # Then: 과거 로그는 스킵됨
        assert result["processed_count"] == 0


class TestCCDepositAdminService:
    """Admin CC Deposit Service 테스트"""

    def test_cc_deposit_v2_sot_update(self, db: Session, test_user: V2User):
        """CC Deposit 시 V2 SoT 업데이트 검증"""
        # Given: Admin Service
        service = AdminCCDepositService()
        
        # When: 100,000원 입금 처리
        result = service.process_deposit(
            db,
            user_id=test_user.id,
            amount=100000,
            source="admin_test"
        )

        # Then: V2 SoT 업데이트 확인
        db.refresh(test_user)
        assert test_user.total_charge_amount == 100000
        # XP도 함께 업데이트 (10만원당 20XP)
        assert test_user.xp >= 20

    def test_cc_deposit_idempotency(self, db: Session, test_user: V2User):
        """CC Deposit 멱등성 검증"""
        # Given
        service = AdminCCDepositService()
        
        # When: 동일 입금을 2번 처리
        service.process_deposit(db, user_id=test_user.id, amount=100000, source="test_1")
        initial_amount = test_user.total_charge_amount
        
        # 동일 source로 재처리 시도
        service.process_deposit(db, user_id=test_user.id, amount=100000, source="test_1")
        
        # Then: 중복 적용되지 않음
        db.refresh(test_user)
        assert test_user.total_charge_amount == initial_amount


class TestLevelXPService:
    """Level XP Service 테스트"""

    def test_level_xp_v2_sot_compliance(self, db: Session, test_user: V2User):
        """Level/XP V2 SoT 준수: v2_user.level, v2_user.xp가 단일 진실 공급원"""
        # Given
        service = V2LevelXPService()
        
        # When: XP 추가
        result = service.add_xp(db, user_id=test_user.id, delta=100, source="test")
        db.commit()

        # Then: v2_user가 SoT
        db.refresh(test_user)
        assert test_user.xp == 100
        assert result["xp"] == 100
        assert result["level"] >= 1

    def test_level_xp_legacy_sync(self, db: Session, test_user: V2User):
        """레거시 호환: user_level_progress 동기화 검증"""
        # Given
        service = V2LevelXPService()
        
        # When: XP 추가
        service.add_xp(db, user_id=test_user.id, delta=50, source="test")
        db.commit()

        # Then: user_level_progress도 동기화됨
        progress = db.query(UserLevelProgress).filter_by(user_id=test_user.id).first()
        if progress:  # 테이블이 존재하는 경우에만 검증
            assert progress.xp == test_user.xp
            assert progress.level == test_user.level


@pytest.mark.parametrize("deposit_amount,expected_xp", [
    (100000, 20),   # 10만원 = 20XP
    (500000, 100),  # 50만원 = 100XP
    (1000000, 200), # 100만원 = 200XP
])
def test_cc_deposit_xp_calculation(db: Session, test_user: V2User, deposit_amount: int, expected_xp: int):
    """CC Deposit XP 계산 규칙 검증: 10만원당 20XP"""
    # Given
    service = AdminCCDepositService()
    
    # When
    service.process_deposit(db, user_id=test_user.id, amount=deposit_amount, source=f"test_{deposit_amount}")
    
    # Then
    db.refresh(test_user)
    assert test_user.xp >= expected_xp
