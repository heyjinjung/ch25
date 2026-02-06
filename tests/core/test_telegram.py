"""
Unit tests for app/core/telegram.py
"""
import pytest
import hmac
import hashlib
import json
from unittest.mock import patch, MagicMock
from app.core import telegram
from app.core.config import Settings

@pytest.fixture
def mock_settings():
    with patch("app.core.telegram.settings", autospec=True) as mock:
        mock.telegram_bot_token = "TEST_TOKEN_12345"
        mock.test_mode = False
        yield mock

def test_validate_init_data_success(mock_settings):
    """Verify validation passes with correct signature."""
    token = mock_settings.telegram_bot_token
    
    # Construct init data
    data_dict = {"auth_date": "12345678", "query_id": "AAB", "user": '{"id":123,"first_name":"Test"}'}
    # Sort and create check string
    data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(data_dict.items())])
    
    # Calculate hash
    secret_key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    hash_val = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    # Add hash to input
    init_data = f"auth_date=12345678&query_id=AAB&user=%7B%22id%22%3A123%2C%22first_name%22%3A%22Test%22%7D&hash={hash_val}"
    
    result = telegram.validate_init_data(init_data)
    assert result['query_id'] == "AAB"
    assert result['user']['id'] == 123

def test_validate_init_data_missing_token():
    """Verify error when token is not configured."""
    with patch("app.core.telegram.settings", autospec=True) as mock:
        mock.telegram_bot_token = None
        mock.test_mode = False
        
        with pytest.raises(ValueError, match="TELEGRAM_BOT_TOKEN not configured"):
            telegram.validate_init_data("query_id=AAB&hash=123")

def test_validate_init_data_missing_hash(mock_settings):
    """Verify error when hash is missing."""
    with pytest.raises(ValueError, match="Missing hash in initData"):
        telegram.validate_init_data("query_id=AAB&auth_date=123")

def test_validate_init_data_invalid_signature(mock_settings):
    """Verify error when calculation doesn't match hash."""
    # Use invalid hash
    init_data = "query_id=AAB&hash=invalidhash123"
    
    with pytest.raises(ValueError, match="Invalid initData signature"):
        telegram.validate_init_data(init_data)

def test_validate_init_data_test_mode_bypass():
    """Verify test mode returns mock data."""
    with patch("app.core.telegram.settings", autospec=True) as mock:
        mock.telegram_bot_token = None
        mock.test_mode = True
        
        result = telegram.validate_init_data("any_data")
        assert "user" in result
        user = json.loads(result["user"])
        assert user["username"] == "test_user"
