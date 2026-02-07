"""
Unit tests for app/v2/services/admin_cc_deposit_service.py
"""
import pytest
from unittest.mock import MagicMock
from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService
from app.v2.models import ExternalRankingData
from app.v2.schemas.shared.cc_deposit import CCDepositCreate, CCDepositUpdate

class TestV2AdminCCDepositService:
    
    def test_list_all(self):
        db = MagicMock()
        # Mock query result
        db.execute.return_value.scalars.return_value.all.return_value = []
        
        result = V2AdminCCDepositService.list_all(db)
        assert result == []
        db.execute.assert_called()

    @pytest.mark.skip(reason="Needs complex mocking of dependencies") 
    def test_upsert_many(self):
        # Skipping for now as upsert_many has heavy dependencies (Vault, LevelXP, Settings)
        pass

    def test_update(self):
        db = MagicMock()
        # Mock existing record
        existing = ExternalRankingData(user_id=1, deposit_amount=100)
        # Service calls get_by_user -> execute -> scalars -> first
        db.execute.return_value.scalars.return_value.first.return_value = existing
        
        payload = CCDepositUpdate(deposit_amount=200)
        updated = V2AdminCCDepositService.update(db, user_id=1, payload=payload)
        
        assert updated.deposit_amount == 200
        assert existing.deposit_amount == 200
        db.add.assert_called_with(existing)
        
    def test_delete(self):
        db = MagicMock()
        # Mock delete result
        mock_result = MagicMock()
        mock_result.rowcount = 1
        db.execute.return_value = mock_result
        
        V2AdminCCDepositService.delete(db, user_id=1)
        
        db.execute.assert_called()
