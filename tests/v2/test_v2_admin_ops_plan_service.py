"""
Unit tests for app/v2/services/v2_admin_ops_plan_service.py
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import date, datetime
from app.v2.services.v2_admin_ops_plan_service import V2AdminOpsPlanService
from app.v2.models import OpsCampaign, OpsPlan, OpsPlanTask

@pytest.fixture
def mock_db():
    return MagicMock()

class TestV2AdminOpsPlanService:
    
    def test_create_campaign(self, mock_db):
        payload = {"name": "Test", "owner_admin_id": 1}
        # mock add/flush
        
        campaign = V2AdminOpsPlanService.create_campaign(mock_db, payload=payload)
        
        assert isinstance(campaign, OpsCampaign)
        assert campaign.name == "Test"
        mock_db.add.assert_called_with(campaign)

    def test_ensure_plan_existing(self, mock_db):
        # Setup existing plan check
        mock_db.execute.return_value.scalar_one_or_none.return_value = OpsPlan(id=1, status="ACTIVE")
        
        plan = V2AdminOpsPlanService.ensure_plan(mock_db, campaign_id=1, plan_date=date(2026,1,1))
        
        assert plan.id == 1
        assert plan.status == "ACTIVE"
        mock_db.add.assert_not_called()

    def test_ensure_plan_new(self, mock_db):
        mock_db.execute.return_value.scalar_one_or_none.return_value = None
        
        plan = V2AdminOpsPlanService.ensure_plan(mock_db, campaign_id=1, plan_date=date(2026,1,1))
        
        assert plan.campaign_id == 1
        assert plan.status == "DRAFT"
        mock_db.add.assert_called()

    def test_execute_task(self, mock_db):
        task = OpsPlanTask(id=10, status="TODO", executed_at=None)
        mock_db.get.return_value = task
        
        executed_task = V2AdminOpsPlanService.execute_task(mock_db, task_id=10, status_value="DONE", actor_admin_id=5)
        
        assert executed_task.status == "DONE"
        assert executed_task.actor_admin_id == 5
        assert executed_task.executed_at is not None
