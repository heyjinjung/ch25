"""Tests for OPS Plan Actions (Playbook Executor)."""

import pytest
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.ops_plan import OpsCampaign, OpsPlan, OpsPlanTask
from app.models.ops_target import OpsTargetList, OpsTargetMember
from app.services.ops_plan_service import OpsPlanService
from app.services.inventory_service import InventoryService


@pytest.fixture
def ops_service():
    return OpsPlanService()


@pytest.fixture
def db(session_factory):
    """Create a database session for tests."""
    session = session_factory()
    try:
        yield session
        session.commit()
    finally:
        session.close()


@pytest.fixture
def test_campaign(db: Session):
    """Create a test campaign."""
    campaign = OpsCampaign(
        name="Test Campaign",
        start_date=datetime.utcnow(),
        end_date=None,
        status="ACTIVE",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@pytest.fixture
def test_plan(db: Session, test_campaign):
    """Create a test plan."""
    plan = OpsPlan(
        campaign_id=test_campaign.id,
        plan_date=datetime.utcnow().date(),
        theme_title="Test Plan",
        key_message="Test plan description",
        status="ACTIVE",
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@pytest.fixture
def test_users(db: Session):
    """Create test users."""
    users = []
    for i in range(5):
        user = User(
            external_id=f"test_user_{i}",
            nickname=f"TestUser{i}",
            level=1,
            xp=0,
            status="ACTIVE",
        )
        db.add(user)
        users.append(user)
    db.commit()
    for user in users:
        db.refresh(user)
    return users


@pytest.fixture
def test_target_list(db: Session, test_plan, test_users):
    """Create a target list with test users."""
    target_list = OpsTargetList(
        plan_id=test_plan.id,
        name="Test Target List",
        source_type="MANUAL",
        count_snapshot=len(test_users),
    )
    db.add(target_list)
    db.commit()
    db.refresh(target_list)

    for user in test_users:
        member = OpsTargetMember(
            target_list_id=target_list.id,
            user_id=user.id,
            status="PENDING",
        )
        db.add(member)
    db.commit()

    return target_list


class TestTargetedItemGrant:
    """Test TARGETED_ITEM_GRANT action."""

    def test_single_item_grant(self, db: Session, ops_service, test_plan, test_target_list, test_users):
        """Test granting a single item to target list members."""
        task = OpsPlanTask(
            plan_id=test_plan.id,
            title="Grant Single Item",
            type="GRANT",
            status="PENDING",
            payload_json={
                "target_list_id": test_target_list.id,
                "items": [
                    {"item_type": "POINT", "amount": 1000}
                ],
                "reason": "TEST_GRANT",
            },
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        # Execute task
        result = ops_service.execute_task(db, task_id=task.id, status_value="DONE", actor_admin_id=1)

        # Verify execution result
        assert result.payload_json is not None
        execution_result = result.payload_json.get("execution_result", {})
        assert execution_result["kind"] == "TARGETED_ITEM_GRANT"
        assert execution_result["granted_users"] == len(test_users)
        assert len(execution_result["items"]) == 1
        assert execution_result["items"][0]["item_type"] == "POINT"
        assert execution_result["items"][0]["amount"] == 1000

        # Verify inventory grants
        for user in test_users:
            inventory = InventoryService.get_user_inventory(db, user_id=user.id)
            point_item = next((item for item in inventory if item.item_type == "POINT"), None)
            assert point_item is not None
            assert point_item.amount >= 1000

    def test_multiple_items_grant(self, db: Session, ops_service, test_plan, test_target_list, test_users):
        """Test granting multiple items to target list members."""
        task = OpsPlanTask(
            plan_id=test_plan.id,
            title="Grant Multiple Items",
            type="GRANT",
            status="PENDING",
            payload_json={
                "kind": "TARGETED_ITEM_GRANT",
                "target_list_id": test_target_list.id,
                "items": [
                    {"item_type": "POINT", "amount": 500},
                    {"item_type": "TICKET_ROULETTE", "amount": 3},
                    {"item_type": "TICKET_DICE", "amount": 2},
                ],
                "reason": "TEST_MULTI_GRANT",
            },
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        # Execute task
        result = ops_service.execute_task(db, task_id=task.id, status_value="DONE", actor_admin_id=1)

        # Verify execution result
        execution_result = result.payload_json.get("execution_result", {})
        assert execution_result["kind"] == "TARGETED_ITEM_GRANT"
        assert execution_result["granted_users"] == len(test_users)
        assert len(execution_result["items"]) == 3

        # Verify all items granted to all users
        for user in test_users:
            inventory = InventoryService.get_user_inventory(db, user_id=user.id)
            point_item = next((item for item in inventory if item.item_type == "POINT"), None)
            roulette_item = next((item for item in inventory if item.item_type == "TICKET_ROULETTE"), None)
            dice_item = next((item for item in inventory if item.item_type == "TICKET_DICE"), None)

            assert point_item is not None and point_item.amount >= 500
            assert roulette_item is not None and roulette_item.amount >= 3
            assert dice_item is not None and dice_item.amount >= 2

    def test_no_target_list_no_op(self, db: Session, ops_service, test_plan, test_users):
        """Test that grant without target list is a no-op (safety)."""
        task = OpsPlanTask(
            plan_id=test_plan.id,
            title="Grant Without Target",
            type="GRANT",
            status="PENDING",
            payload_json={
                "kind": "TARGETED_ITEM_GRANT",
                "items": [
                    {"item_type": "POINT", "amount": 9999}
                ],
                "reason": "TEST_NO_TARGET",
            },
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        # Execute task
        result = ops_service.execute_task(db, task_id=task.id, status_value="DONE", actor_admin_id=1)

        # Verify no grants occurred
        execution_result = result.payload_json.get("execution_result", {})
        assert execution_result["kind"] == "TARGETED_ITEM_GRANT"
        assert execution_result["granted_users"] == 0


class TestTargetListBroadcast:
    """Test TARGETLIST_BROADCAST action."""

    def test_broadcast_marks_members_sent(self, db: Session, ops_service, test_plan, test_target_list, test_users):
        """Test that broadcast marks target list members as SENT."""
        task = OpsPlanTask(
            plan_id=test_plan.id,
            title="Broadcast Message",
            type="ANNOUNCE",
            status="PENDING",
            payload_json={
                "kind": "TARGETLIST_BROADCAST",
                "target_list_id": test_target_list.id,
                "message": "Test broadcast message",
                "channel": "CHANNEL",
            },
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        # Execute task
        result = ops_service.execute_task(db, task_id=task.id, status_value="DONE", actor_admin_id=1)

        # Verify execution result
        execution_result = result.payload_json.get("execution_result", {})
        assert execution_result["kind"] == "TARGETLIST_BROADCAST"
        assert execution_result["sent_count"] == len(test_users)

        # Verify all members marked as SENT
        db.refresh(test_target_list)
        members = db.query(OpsTargetMember).filter(
            OpsTargetMember.target_list_id == test_target_list.id
        ).all()
        for member in members:
            assert member.status == "SENT"


class TestGoldenHourToggle:
    """Test GOLDEN_HOUR toggle actions."""

    def test_force_on(self, db: Session, ops_service, test_plan):
        """Test forcing golden hour ON."""
        task = OpsPlanTask(
            plan_id=test_plan.id,
            title="Force Golden Hour ON",
            type="TOGGLE",
            status="PENDING",
            payload_json={
                "kind": "GOLDEN_HOUR",
                "action": "FORCE_ON",
            },
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        # Execute task
        result = ops_service.execute_task(db, task_id=task.id, status_value="DONE", actor_admin_id=1)

        # Verify execution result
        execution_result = result.payload_json.get("execution_result", {})
        assert execution_result["kind"] == "GOLDEN_HOUR"
        assert execution_result["action"] == "FORCE_ON"
        assert execution_result["result"]["enabled"] is True
        assert execution_result["result"]["manual_override"] == "FORCE_ON"

    def test_force_off(self, db: Session, ops_service, test_plan):
        """Test forcing golden hour OFF."""
        task = OpsPlanTask(
            plan_id=test_plan.id,
            title="Force Golden Hour OFF",
            type="TOGGLE",
            status="PENDING",
            payload_json={
                "kind": "GOLDEN_HOUR",
                "action": "FORCE_OFF",
            },
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        # Execute task
        result = ops_service.execute_task(db, task_id=task.id, status_value="DONE", actor_admin_id=1)

        # Verify execution result
        execution_result = result.payload_json.get("execution_result", {})
        assert execution_result["kind"] == "GOLDEN_HOUR"
        assert execution_result["action"] == "FORCE_OFF"
        assert execution_result["result"]["enabled"] is False
        assert execution_result["result"]["manual_override"] == "FORCE_OFF"

    def test_multiplier_set(self, db: Session, ops_service, test_plan):
        """Test setting golden hour multiplier."""
        task = OpsPlanTask(
            plan_id=test_plan.id,
            title="Set Golden Hour Multiplier",
            type="TOGGLE",
            status="PENDING",
            payload_json={
                "kind": "GOLDEN_HOUR",
                "action": "MULTIPLIER_SET",
                "multiplier": 3.5,
            },
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        # Execute task
        result = ops_service.execute_task(db, task_id=task.id, status_value="DONE", actor_admin_id=1)

        # Verify execution result
        execution_result = result.payload_json.get("execution_result", {})
        assert execution_result["kind"] == "GOLDEN_HOUR"
        assert execution_result["action"] == "MULTIPLIER_SET"
        assert execution_result["result"]["multiplier"] == 3.5


class TestInventoryGrantAll:
    """Test INVENTORY_GRANT_ALL action (legacy all-users grant)."""

    def test_grant_all_users(self, db: Session, ops_service, test_plan, test_users):
        """Test granting items to all users."""
        task = OpsPlanTask(
            plan_id=test_plan.id,
            title="Grant All Users",
            type="GRANT",
            status="PENDING",
            payload_json={
                "kind": "INVENTORY_GRANT_ALL",
                "items": [
                    {"item_type": "POINT", "amount": 100}
                ],
                "reason": "TEST_GRANT_ALL",
            },
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        # Execute task
        result = ops_service.execute_task(db, task_id=task.id, status_value="DONE", actor_admin_id=1)

        # Verify execution result
        execution_result = result.payload_json.get("execution_result", {})
        assert execution_result["kind"] == "INVENTORY_GRANT_ALL"
        assert execution_result["granted_users"] >= len(test_users)
        assert execution_result["target"] == "ALL_USERS"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
