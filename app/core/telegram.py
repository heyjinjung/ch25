import hmac
import hashlib
import json
from urllib.parse import parse_qsl
from app.core.config import get_settings

settings = get_settings()

def validate_init_data(init_data: str) -> dict:
    """
    Validate Telegram Mini App initData signature.
    Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    if not settings.telegram_bot_token:
        # In development, if token is missing, we might want to skip validation 
        # but for safety let's assume it's mandatory or handle test mode.
        if settings.test_mode:
             # Mock data for testing if no token provided
             return {"user": json.dumps({"id": 1234567, "username": "test_user"})}
        raise ValueError("TELEGRAM_BOT_TOKEN not configured")

    vals = dict(parse_qsl(init_data))
    hash_val = vals.pop('hash', None)
    if not hash_val:
        raise ValueError("Missing hash in initData")

    # The data-check-string is a chain of all received fields, 
    # sorted alphabetically, in the format key=<value> with a line feed character ('\n', 0x0A) used as separator
    data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(vals.items())])
    
    # secret_key = HMAC-SHA256("WebAppData", bot_token)
    secret_key = hmac.new(b"WebAppData", settings.telegram_bot_token.encode(), hashlib.sha256).digest()
    
    # calculated_hash = HMAC-SHA256(secret_key, data_check_string)
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    if calculated_hash != hash_val:
        raise ValueError("Invalid Telegram initData signature")
        
    # Parse the 'user' field if exists
    if 'user' in vals:
        vals['user'] = json.loads(vals['user'])
        
    return vals
