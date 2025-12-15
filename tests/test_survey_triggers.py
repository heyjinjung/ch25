from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.services.survey_trigger_service import SurveyTriggerService
from app.models.survey import Survey, SurveyStatus, SurveyTriggerRule, SurveyTriggerType
from app.models.user import User


def test_level_up_triggers_create_pending(session_factory) -> None:
    session: Session = session_factory()
    user = User(id=1, external_id="tester", status="ACTIVE", level=1)
    survey = Survey(
        title="Level Survey",
        status=SurveyStatus.ACTIVE,
        channel="GLOBAL",
        start_at=datetime.utcnow() - timedelta(days=1),
        end_at=datetime.utcnow() + timedelta(days=1),
    )
    rule = SurveyTriggerRule(
        survey=survey,
        trigger_type=SurveyTriggerType.LEVEL_UP,
        trigger_config_json={"min_level": 2},
        cooldown_hours=1,
        max_per_user=1,
    )
    session.add_all([user, survey, rule])
    session.commit()

    svc = SurveyTriggerService()
    ids = svc.handle_level_up(session, user_id=1, new_level=3)
    assert ids, "Pending response should be created"

    # second call within cooldown should not create new
    ids2 = svc.handle_level_up(session, user_id=1, new_level=4)
    assert ids2 == []
    session.close()
