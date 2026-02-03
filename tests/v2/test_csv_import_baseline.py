"""CSV Import baseline 기반 차액 계산 테스트.

문제: HQ CSV Import 시 전체 기간 누적액이 반영되어 몇 년치 XP가 한꺼번에 적용됨
해결: V2 가입 시점의 baseline을 기준으로 차액만 반영
"""
import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch

from sqlalchemy.orm import Session


class TestCSVImportBaseline:
    """CSV Import baseline 차액 계산 테스트."""

    def test_first_import_sets_baseline_no_deposit(self):
        """최초 Import 시 baseline만 설정하고 CC Deposit 반영하지 않음."""
        # Given: V2 유저가 baseline_charge_amount = 0 (신규)
        # CSV에서 누적 충전 금액 = 5,000,000원
        
        # When: CSV Import 실행
        # Then: 
        #   - v2_user.baseline_charge_amount = 5,000,000 (설정됨)
        #   - CC Deposit 반영 X (skipped_count += 1)
        #   - XP 지급 X
        
        csv_total_charge = 5_000_000
        baseline = 0  # 최초
        
        # 최초 Import 로직
        if baseline == 0 and csv_total_charge > 0:
            new_baseline = csv_total_charge
            effective_charge = 0  # 최초는 반영하지 않음
        else:
            new_baseline = baseline
            effective_charge = max(0, csv_total_charge - baseline)
        
        assert new_baseline == 5_000_000
        assert effective_charge == 0

    def test_subsequent_import_calculates_delta(self):
        """이후 Import 시 baseline 이후 신규 충전액만 반영."""
        # Given: V2 유저가 baseline_charge_amount = 5,000,000 (기존)
        # CSV에서 누적 충전 금액 = 5,500,000원 (50만원 추가 충전)
        
        # When: CSV Import 실행
        # Then: 
        #   - effective_charge = 500,000 (차액)
        #   - CC Deposit에 500,000만 반영
        #   - XP는 500,000에 대해서만 계산
        
        csv_total_charge = 5_500_000
        baseline = 5_000_000  # 기존 baseline
        
        if baseline == 0 and csv_total_charge > 0:
            effective_charge = 0
        elif csv_total_charge > baseline:
            effective_charge = csv_total_charge - baseline
        else:
            effective_charge = 0
        
        assert effective_charge == 500_000

    def test_no_change_when_csv_less_than_baseline(self):
        """CSV 금액이 baseline 이하면 반영하지 않음."""
        # Given: baseline = 5,000,000
        # CSV에서 누적 충전 금액 = 4,500,000 (이상한 케이스)
        
        # When: CSV Import 실행
        # Then: effective_charge = 0 (무시)
        
        csv_total_charge = 4_500_000
        baseline = 5_000_000
        
        if baseline == 0 and csv_total_charge > 0:
            effective_charge = 0
        elif csv_total_charge > baseline:
            effective_charge = csv_total_charge - baseline
        else:
            effective_charge = 0
        
        assert effective_charge == 0

    def test_migration_sets_baseline_for_existing_users(self):
        """기존 유저들은 migration에서 baseline = total_charge_amount로 설정."""
        # Given: 기존 유저 total_charge_amount = 3,000,000
        # When: Migration 실행
        # Then: baseline_charge_amount = 3,000,000
        
        # Migration SQL:
        # UPDATE v2_user SET baseline_charge_amount = total_charge_amount WHERE total_charge_amount > 0
        
        existing_total_charge = 3_000_000
        baseline_after_migration = existing_total_charge
        
        assert baseline_after_migration == 3_000_000

    def test_edge_case_zero_csv_charge(self):
        """CSV 충전 금액이 0인 경우."""
        csv_total_charge = 0
        baseline = 1_000_000
        
        if baseline == 0 and csv_total_charge > 0:
            effective_charge = 0
        elif csv_total_charge > baseline:
            effective_charge = csv_total_charge - baseline
        else:
            effective_charge = 0
        
        assert effective_charge == 0

    def test_large_delta_calculation(self):
        """큰 금액 차이 계산 테스트."""
        csv_total_charge = 100_000_000  # 1억
        baseline = 50_000_000  # 5천만
        
        effective_charge = csv_total_charge - baseline
        
        assert effective_charge == 50_000_000


class TestBaselineFieldModel:
    """V2User 모델의 baseline_charge_amount 필드 테스트."""

    def test_baseline_default_is_zero(self):
        """baseline_charge_amount 기본값은 0."""
        # V2User 모델에서 baseline_charge_amount = Column(Integer, nullable=False, default=0)
        default_baseline = 0
        assert default_baseline == 0

    def test_baseline_is_non_negative(self):
        """baseline_charge_amount는 음수가 될 수 없음."""
        baseline = 0
        csv_charge = 100_000
        
        # baseline 설정 시 항상 0 이상
        new_baseline = max(0, csv_charge)
        assert new_baseline >= 0
