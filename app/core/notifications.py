import logging
import requests
from datetime import datetime
from app.core.config import get_settings

logger = logging.getLogger(__name__)

def send_ops_notification(message: str, channel: str = "general"):
    """Send an operational notification to Discord/Slack if configured."""
    settings = get_settings()
    webhook_url = getattr(settings, f"ops_webhook_url_{channel}", None) or getattr(settings, "ops_webhook_url", None)
    
    if not webhook_url:
        logger.info(f"[OPS-NOTIFY] {message}")
        return

    try:
        payload = {
            "content": f"**[CH25-OPS]** {message}\n*Time: {datetime.now().isoformat()}*",
            "username": "CH25 Vault Monitor"
        }
        res = requests.post(webhook_url, json=payload, timeout=5)
        res.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to send ops notification: {e}")

def notify_vault_skip_error(source: str, reward_id: str, reason: str):
    """Notify when a trial reward accrual is skipped due to missing valuation."""
    msg = f"🔥 **Vault Accrual Skip** (Valuation Error)\n- Source: `{source}`\n- RewardID: `{reward_id}`\n- Reason: `{reason}`\n- Action: 운영팀 `trial_reward_valuation` 설정 확인 필요"
    send_ops_notification(msg, channel="error")

def notify_admin_action(admin_id: int, action: str, details: str):
    """Notify when an admin changes sensitive configurations."""
    msg = f"⚙️ **Admin Action**\n- AdminID: `{admin_id}`\n- Action: `{action}`\n- Details: `{details}`"
    send_ops_notification(msg, channel="admin")
