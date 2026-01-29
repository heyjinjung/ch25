"""Circuit Breaker Service Tests"""
import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session

from app.v2.services.circuit_breaker_service import CircuitBreakerService
from app.v2.core.exceptions import CircuitBreakerError
from app.v2.models.v2_server_config import V2ServerConfig


class TestCircuitBreakerService:
    """Test suite for CircuitBreakerService"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        db = MagicMock(spec=Session)
        return db

    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client"""
        with patch('app.v2.services.circuit_breaker_service.redis_client') as mock:
            # Setup mock pipeline
            pipeline_mock = MagicMock()
            pipeline_mock.execute.return_value = [100, True, 50, True]  # Default safe values
            mock.pipeline.return_value = pipeline_mock
            yield mock

    def test_check_and_incr_within_limit(self, mock_db, mock_redis):
        """Test that check_and_incr allows operation within limits"""
        # Setup: No config in DB, use defaults
        mock_db.query().filter().first.return_value = None
        
        # Execute: Try to deposit 10,000 (well within default 20M limit)
        CircuitBreakerService.check_and_incr(mock_db, "VAULT", 10_000, user_id=123)
        
        # Verify: No exception raised, Redis was called
        assert mock_redis.pipeline.called

    def test_check_and_incr_global_limit_exceeded(self, mock_db, mock_redis):
        """Test that global limit breach raises CircuitBreakerError"""
        # Setup: Mock Redis to return value exceeding limit
        pipeline_mock = MagicMock()
        pipeline_mock.execute.return_value = [21_000_000, True, 50, True]  # Global exceeds 20M
        mock_redis.pipeline.return_value = pipeline_mock
        
        mock_db.query().filter().first.return_value = None
        
        # Execute & Assert
        with pytest.raises(CircuitBreakerError, match="Global Circuit Breaker"):
            CircuitBreakerService.check_and_incr(mock_db, "VAULT", 1_000_000, user_id=123)

    def test_check_and_incr_user_limit_exceeded(self, mock_db, mock_redis):
        """Test that user limit breach raises CircuitBreakerError"""
        # Setup: Mock Redis to return user value exceeding limit
        pipeline_mock = MagicMock()
        pipeline_mock.execute.return_value = [100_000, True, 2_100_000, True]  # User exceeds 2M
        mock_redis.pipeline.return_value = pipeline_mock
        
        mock_db.query().filter().first.return_value = None
        
        # Execute & Assert
        with pytest.raises(CircuitBreakerError, match="User Circuit Breaker"):
            CircuitBreakerService.check_and_incr(mock_db, "VAULT", 100_000, user_id=123)

    def test_check_and_incr_custom_config(self, mock_db, mock_redis):
        """Test that custom config from DB is respected"""
        # Setup: Mock DB config with very low limit
        custom_config = V2ServerConfig(
            key="circuit_breaker_thresholds",
            value={
                "VAULT": {
                    "global_max": 100,  # Very low for testing
                    "user_max": 50
                }
            }
        )
        mock_db.query().filter().first.return_value = custom_config
        
        pipeline_mock = MagicMock()
        pipeline_mock.execute.return_value = [150, True, 30, True]  # Global exceeds custom 100
        mock_redis.pipeline.return_value = pipeline_mock
        
        # Execute & Assert
        with pytest.raises(CircuitBreakerError, match="Global Circuit Breaker"):
            CircuitBreakerService.check_and_incr(mock_db, "VAULT", 50, user_id=123)

    def test_reset_limit_global(self, mock_db, mock_redis):
        """Test reset_limit for global scope"""
        CircuitBreakerService.reset_limit("VAULT", "GLOBAL")
        
        # Verify Redis delete was called with correct key
        expected_key = "golden:v2:cb:global:VAULT:1h"
        mock_redis.delete.assert_called_once_with(expected_key)

    def test_reset_limit_user(self, mock_db, mock_redis):
        """Test reset_limit for user scope"""
        CircuitBreakerService.reset_limit("VAULT", "USER", user_id=123)
        
        # Verify Redis delete was called with correct key
        expected_key = "golden:v2:cb:user:123:VAULT:1h"
        mock_redis.delete.assert_called_once_with(expected_key)

    def test_zero_amount_no_check(self, mock_db, mock_redis):
        """Test that zero or negative amounts skip check"""
        CircuitBreakerService.check_and_incr(mock_db, "VAULT", 0, user_id=123)
        
        # Verify: Redis should NOT be called
        assert not mock_redis.pipeline.called
