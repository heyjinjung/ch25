from sqlalchemy.orm import Session
import httpx
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.settings = get_settings()
        self.bot_token = self.settings.TELEGRAM_BOT_TOKEN
        self.api_base = f"https://api.telegram.org/bot{self.bot_token}"

    async def send_telegram_message(self, chat_id: int, text: str):
        if not self.bot_token or not chat_id:
            logger.warning("Bot token or Chat ID missing. Skipping notification.")
            return

        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML"
                }
                response = await client.post(f"{self.api_base}/sendMessage", json=payload)
                if response.status_code != 200:
                    logger.error(f"Failed to send Telegram message: {response.text}")
        except Exception as e:
            logger.error(f"Error sending Telegram message: {e}")

    def send_nudge_sync(self, chat_id: int, mission_title: str, remaining: int):
        """
        Synchronous wrapper for firing-and-forgetting (best effort) via separate thread or just running sync if acceptable.
        For simplicity/compatibility with synchronous MissionService, we might use httpx.post directly (sync).
        """
        if not self.bot_token or not chat_id:
            return

        import threading
        def _send():
            try:
                import requests
                url = f"{self.api_base}/sendMessage"
                text = f"👀 <b>Keep it up!</b>\n\nYou are just <b>{remaining}</b> step{'s' if remaining > 1 else ''} away from completing <b>{mission_title}</b>!\n\nPlay now to claim your reward! 💎"
                requests.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}, timeout=5)
            except Exception as e:
                logger.error(f"Nudge failed: {e}")
        
        # Fire and forget thread to not block game play
        threading.Thread(target=_send).start()

    def check_chat_member(self, channel_username: str, user_id: int) -> bool:
        """
        Verifies if a user is a member of a specific Telegram channel.
        :param channel_username: e.g. "@my_channel" or "-10012345678"
        :param user_id: Telegram User ID
        :return: True if member/admin/creator, False otherwise
        """
        if not self.bot_token:
            logger.error("Bot token missing for check_chat_member")
            return False

        try:
            import requests
            url = f"{self.api_base}/getChatMember"
            resp = requests.get(url, params={"chat_id": channel_username, "user_id": user_id}, timeout=5)
            data = resp.json()
            
            if not data.get("ok"):
                logger.warning(f"getChatMember failed: {data.get('description')}")
                return False
            
            status = data.get("result", {}).get("status")
            # Member statuses: creator, administrator, member, restricted (if has access)
            # Not member: left, kicked
            if status in ["creator", "administrator", "member", "restricted"]:
                return True
            return False

        except Exception as e:
            logger.error(f"Error checking chat member: {e}")
            return False
