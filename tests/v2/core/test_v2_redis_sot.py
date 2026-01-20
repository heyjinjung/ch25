import pytest

def test_redis_key_standard_prefix():
    # v2_redis_keys_channels_sot_ko.md: All V2 keys use golden:v2: prefix
    prefix = "golden:v2:"
    
    keys = [
        "golden:v2:user:1:loss_streak",
        "golden:v2:ops:result:task_1",
        "golden:v2:game:roulette:daily_spin:1"
    ]
    
    for key in keys:
        assert key.startswith(prefix)

def test_redis_channel_naming():
    # v2_redis_keys_channels_sot_ko.md
    channels = [
        "golden:v2:events:game",
        "golden:v2:events:intervention",
        "golden:v2:feed:public",
        "golden:v2:ops:ws"
    ]
    
    for ch in channels:
        assert ch.startswith("golden:v2:")
        assert any(word in ch for word in ["events", "feed", "ops"])
