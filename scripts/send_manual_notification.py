import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from app.services.notification_service import NotificationService

async def main():
    notifier = NotificationService()
    target_ids = [5626594744, 5721857928, 6310828178]
    message = (
        "<b>[주사위 배틀 이벤트 안내]</b>\n\n"
        "안녕하세요! 서비스 이용에 감사드립니다.\n"
        "방금 시스템 업데이트를 통해 <b>골든아워 2배 적립</b> 혜택이 활성화되었습니다! 🎲✨\n\n"
        "지금 바로 접속해서 행운의 주인공이 되어보세요.\n"
        "감사합니다."
    )
    
    for tid in target_ids:
        print(f"Sending message to {tid}...")
        await notifier.send_telegram_message(tid, message)
    
    print("All messages sent.")

if __name__ == "__main__":
    asyncio.run(main())
