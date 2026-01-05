import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.admin_message import AdminMessage
from app.services.admin_crm_service import fan_out_message # Wait, it might be in admin_crm route file

# Actually fan_out_message is in app.api.admin.routes.admin_crm
from app.api.admin.routes.admin_crm import fan_out_message
from sqlalchemy import select

async def run_test():
    db = SessionLocal()
    try:
        # 1. Find a test user with telegram_id
        test_user = db.execute(select(User).where(User.telegram_id.isnot(None))).scalars().first()
        if not test_user:
            print("No users with telegram_id found in DB.")
            return

        print(f"Testing with User ID: {test_user.id}, Nickname: {test_user.nickname}, TG ID: {test_user.telegram_id}")

        # 2. Create a dummy AdminMessage
        msg = AdminMessage(
            title="백엔드 발송 로직 테스트",
            content="본 메시지는 백엔드 라우터 연결 및 텔레그램 발송 로직을 직접 검증하기 위해 생성되었습니다.",
            target_type="USER",
            target_value=str(test_user.id),
            channels=["INBOX", "TELEGRAM"],
            is_active=True
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        print(f"Created AdminMessage ID: {msg.id}")

        # 3. Trigger Fan-out
        print("Starting fan-out...")
        # fan_out_message handles its own async loop for TG if needed
        fan_out_message(
            message_id=msg.id,
            target_type="USER",
            target_value=str(test_user.id),
            db=db
        )
        
        # Give some time for background task if any (though fan_out_message in admin_crm is sync but creates async task)
        await asyncio.sleep(5)
        print("Test completed. Please check the Telegram bot or logs.")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_test())
