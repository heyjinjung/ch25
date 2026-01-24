"""Event processor for ch25_events based on Redis Streams.

Consumes messages from Redis stream `stream:raw_logs`, normalizes raw log lines,
detects LOSS_STREAK / ASSET_DEPLETION / SESSION_END signals, and publishes
to ch25_events via Ch25EventService.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

STREAM_KEY = "stream:raw_logs"
GROUP_NAME = "group:retention_workers"
CONSUMER_NAME = "ch25_event_worker"

SESSION_END_GAP_SECONDS = 30 * 60
STATE_TTL_SECONDS = 24 * 60 * 60
PSYCH_STATE_TTL_SECONDS = 24 * 60 * 60

# Thresholds (SoT 1차 확정)
SLOT_LOSS_STREAK_THRESHOLD = 8
SLOT_BET_SUM_30M_THRESHOLD = 20_000
SLOT_LOSS_SUM_60M_THRESHOLD = 50_000

CASINO_LOSS_STREAK_THRESHOLD = 5
CASINO_BET_SUM_30M_THRESHOLD = 50_000
CASINO_LOSS_SUM_60M_THRESHOLD = 120_000
CASINO_SESSION_LOSS_THRESHOLD = 200_000

SPORTS_LOSS_STREAK_THRESHOLD = 3
SPORTS_BET_SUM_DAY_THRESHOLD = 100_000
SPORTS_LOSS_SUM_DAY_THRESHOLD = 150_000

DAILY_AMOUNT_REPEAT_THRESHOLD = 12
DAILY_PERIODIC_REPEAT_THRESHOLD = 8
PERIODIC_TOLERANCE_SECONDS = 1


async def _get_redis_client():
    try:
        import redis.asyncio as aioredis
    except ImportError:  # pragma: no cover - optional dependency
        logger.warning("redis async not installed; ch25 event worker disabled")
        return None

    from app.core.config import get_settings

    settings = get_settings()
    if not settings.redis_url:
        logger.warning("redis_url not configured; ch25 event worker disabled")
        return None
    return aioredis.from_url(settings.redis_url, decode_responses=True)


def _parse_amount(value: str | None) -> Optional[int]:
    if not value:
        return None
    cleaned = value.replace("원", "").replace(",", "").replace("\u00a0", " ").strip()
    if not cleaned:
        return None
    try:
        return int(float(cleaned))
    except ValueError:
        return None


def _parse_datetime_kst(value: str | None) -> Optional[int]:
    if not value:
        return None
    value = value.strip()
    fmt = "%Y/%m/%d %H:%M:%S" if len(value.split(":")) == 3 else "%Y/%m/%d %H:%M"
    try:
        dt = datetime.strptime(value, fmt)
    except ValueError:
        return None
    kst = dt.replace(tzinfo=timezone(timedelta(hours=9)))
    return int(kst.timestamp())


def _kst_day_key(event_ts: int) -> str:
    kst = datetime.fromtimestamp(event_ts, tz=timezone(timedelta(hours=9)))
    return kst.strftime("%Y%m%d")


def _seconds_until_kst_day_end(event_ts: int) -> int:
    kst = datetime.fromtimestamp(event_ts, tz=timezone(timedelta(hours=9)))
    end = datetime(
        kst.year,
        kst.month,
        kst.day,
        23,
        59,
        59,
        tzinfo=timezone(timedelta(hours=9)),
    )
    return max(int((end - kst).total_seconds()), 60)


def _extract_external_id(name_value: str | None) -> Optional[str]:
    if not name_value:
        return None
    match = re.search(r"\(([^)]+)\)", name_value)
    if not match:
        return None
    candidate = match.group(1).strip()
    return candidate or None


def _is_masked_external_id(external_id: str | None) -> bool:
    return bool(external_id and "*" in external_id)


def _build_user_key(parsed: dict[str, Any], external_id: str | None) -> Optional[str]:
    if external_id and not _is_masked_external_id(external_id):
        return external_id
    name = (parsed.get("name") or "").strip()
    nickname = (parsed.get("nickname") or "").strip()
    raw = "|".join([name, nickname]).strip("|")
    if not raw:
        return None
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]
    return f"masked:{digest}"


def _split_columns(line: str) -> list[str]:
    if "\t" in line:
        return [col.strip() for col in line.split("\t") if col.strip()]
    parts = re.split(r"\s{2,}", line.strip())
    return [col.strip() for col in parts if col.strip()]


def _classify_game_type(game_type: str | None) -> str:
    if not game_type:
        return "casino"
    lowered = game_type.lower()
    if lowered.startswith("sports:"):
        return "sports"
    if "슬롯" in game_type or "부운" in game_type:
        return "slot"
    return "casino"


def _parse_casino_line(cols: list[str]) -> Optional[dict[str, Any]]:
    if len(cols) < 7:
        return None
    bet_type = cols[3]
    if bet_type not in ("베팅", "결과"):
        return None
    return {
        "name": cols[1],
        "nickname": cols[2],
        "bet_type": bet_type,
        "bet_at": cols[4],
        "game_type": cols[5],
        "amount": _parse_amount(cols[6]),
    }


def _parse_sports_line(cols: list[str]) -> Optional[dict[str, Any]]:
    if len(cols) < 10:
        return None
    bet_at = cols[4]
    bet_type = cols[6] if len(cols) > 6 else "스포츠"
    bet_game = cols[7] if len(cols) > 7 else ""
    bet_amount = _parse_amount(cols[8] if len(cols) > 8 else None)
    payout_amount = _parse_amount(cols[10] if len(cols) > 10 else None)
    result_text = cols[11] if len(cols) > 11 else None
    return {
        "name": cols[2] if len(cols) > 2 else None,
        "nickname": cols[3] if len(cols) > 3 else None,
        "bet_type": "결과" if payout_amount is not None else "베팅",
        "bet_at": bet_at,
        "game_type": f"sports:{bet_type}:{bet_game}".strip(":"),
        "amount": bet_amount,
        "payout": payout_amount,
        "result_text": result_text,
    }


def _parse_line(line: str) -> Optional[dict[str, Any]]:
    if not line:
        return None
    if line.strip().startswith("번호"):
        return None

    cols = _split_columns(line)
    if len(cols) >= 7 and cols[3] in ("베팅", "결과"):
        return _parse_casino_line(cols)
    if len(cols) >= 10:
        return _parse_sports_line(cols)

    casino_pattern = re.compile(
        r"^\s*(\d+)\s+(.+?)\s+(.+?)\s+(베팅|결과)\s+(\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\s+(.+?)\s+([\d,]+)\s*원"
    )
    match = casino_pattern.search(line)
    if match:
        return {
            "name": match.group(2),
            "nickname": match.group(3),
            "bet_type": match.group(4),
            "bet_at": match.group(5),
            "game_type": match.group(6),
            "amount": _parse_amount(match.group(7)),
        }

    return None


def _extract_lines_from_fields(fields: dict[str, Any]) -> list[str]:
    raw_lines: list[str] = []
    if "raw_lines" in fields:
        value = fields.get("raw_lines")
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    raw_lines.extend([str(item) for item in parsed])
            except json.JSONDecodeError:
                raw_lines.append(value)
        elif isinstance(value, list):
            raw_lines.extend([str(item) for item in value])
    if not raw_lines:
        for key in ("raw_text", "text", "message", "line"):
            value = fields.get(key)
            if value:
                raw_lines.extend([ln for ln in str(value).splitlines() if ln.strip()])
                break
    return raw_lines


async def _resolve_user_id(external_id: str, cache: dict[str, int | None]) -> Optional[int]:
    if external_id in cache:
        return cache[external_id]

    def _lookup() -> Optional[int]:
        from app.db.session import SessionLocal
        from app.models.user import User

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.external_id == external_id).first()
            return user.id if user else None
        finally:
            db.close()

    user_id = await asyncio.to_thread(_lookup)
    cache[external_id] = user_id
    return user_id


async def _record_amount_window(client, key: str, event_ts: int, amount: int, window_seconds: int) -> int:
    value = f"{event_ts}:{amount}"
    await client.zadd(key, {value: event_ts})
    await client.zremrangebyscore(key, 0, event_ts - window_seconds)
    entries = await client.zrangebyscore(key, event_ts - window_seconds, event_ts)
    total = 0
    for item in entries:
        try:
            _, amt_str = item.split(":", 1)
            total += int(amt_str)
        except Exception:
            continue
    return total


async def _publish_event(event_type: str, data: dict[str, Any]) -> None:
    from app.services.ch25_event_service import Ch25EventService

    service = Ch25EventService()
    service.publish_event(event_type, data)


async def _set_psych_state(client, key: str, state: str) -> None:
    await client.set(key, state, ex=PSYCH_STATE_TTL_SECONDS)


async def _handle_normalized_event(fields: dict[str, Any]) -> bool:
    if "event_type" not in fields:
        return False
    if fields.get("event_type") not in {"LOSS_STREAK", "ASSET_DEPLETION", "SESSION_END"}:
        return False
    try:
        data = fields.get("data")
        if isinstance(data, str):
            data = json.loads(data)
        elif data is None:
            data = {}
        await _publish_event(fields["event_type"], data)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("ch25_event_worker_publish_failed", exc_info=exc)
        return True


def _extract_internal_event(fields: dict[str, Any]) -> Optional[dict[str, Any]]:
    if fields.get("event_type") != "INTERNAL_GAME_RESULT":
        return None
    data = fields.get("data")
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            return None
    if not isinstance(data, dict):
        return None
    if data.get("user_id") is None:
        return None
    event_ts = data.get("timestamp")
    if event_ts is None:
        return None
    return {
        "_internal": True,
        "user_id": int(data.get("user_id")),
        "event_ts": int(event_ts),
        "game_type": data.get("game_type"),
        "bet_amount": int(data.get("bet_amount") or 0),
        "payout_amount": int(data.get("payout_amount") or 0),
        "nickname": data.get("nickname"),
    }


async def run_ch25_event_worker(stop_event: Optional[asyncio.Event] = None) -> None:
    client = await _get_redis_client()
    if client is None:
        logger.info("ch25_event_worker_disabled", extra={"reason": "no_redis"})
        return

    try:
        try:
            await client.xgroup_create(STREAM_KEY, GROUP_NAME, id="0-0", mkstream=True)
        except Exception as exc:  # noqa: BLE001
            if "BUSYGROUP" not in str(exc):
                logger.error("ch25_event_worker_group_create_failed", exc_info=exc)

        logger.info(
            "ch25_event_worker_started",
            extra={"stream": STREAM_KEY, "group": GROUP_NAME, "consumer": CONSUMER_NAME},
        )

        user_cache: dict[str, Optional[int]] = {}
        while True:
            if stop_event is not None and stop_event.is_set():
                break
            try:
                response = await client.xreadgroup(
                    GROUP_NAME,
                    CONSUMER_NAME,
                    streams={STREAM_KEY: ">"},
                    count=20,
                    block=1000,
                )
                if not response:
                    continue

                for _, messages in response:
                    for message_id, fields in messages:
                        try:
                            if await _handle_normalized_event(fields):
                                await client.xack(STREAM_KEY, GROUP_NAME, message_id)
                                continue

                            internal_event = _extract_internal_event(fields)
                            parsed_events: list[dict[str, Any]] = []
                            if internal_event:
                                logger.info("Worker extracted internal_event", extra={"internal_event": internal_event})
                                parsed_events.append(internal_event)
                            else:
                                raw_lines = _extract_lines_from_fields(fields)
                                if not raw_lines:
                                    await client.xack(STREAM_KEY, GROUP_NAME, message_id)
                                    continue

                                for line in raw_lines:
                                    parsed = _parse_line(line)
                                    if parsed:
                                        parsed_events.append(parsed)

                            for parsed in parsed_events:
                                if parsed.get("_internal"):
                                    user_id = parsed.get("user_id")
                                    if user_id is None:
                                        continue
                                    external_id = None
                                    user_key = f"internal:{user_id}"
                                    event_ts = parsed.get("event_ts")
                                    if not event_ts:
                                        continue
                                    state_user_key = user_id
                                else:
                                    external_id = _extract_external_id(parsed.get("name"))
                                    user_key = _build_user_key(parsed, external_id)
                                    if not user_key:
                                        continue
                                    user_id = None
                                    if external_id and not _is_masked_external_id(external_id):
                                        user_id = await _resolve_user_id(external_id, user_cache)

                                    event_ts = _parse_datetime_kst(parsed.get("bet_at"))
                                    if not event_ts:
                                        continue

                                    state_user_key = user_id if user_id is not None else user_key
                                state_prefix = f"ch25:state:{state_user_key}"
                                last_event_key = f"{state_prefix}:last_event_ts"
                                last_bet_key = f"{state_prefix}:last_bet"
                                loss_streak_key = f"{state_prefix}:loss_streak"
                                session_loss_key = f"{state_prefix}:session_loss"
                                psych_state_key = f"{state_prefix}:psych_state"

                                day_key = _kst_day_key(event_ts)
                                day_ttl = _seconds_until_kst_day_end(event_ts)
                                abuse_prefix = f"ch25:abuse:{day_key}:{state_user_key}"
                                abuse_exclude_key = f"{abuse_prefix}:exclude"
                                abuse_reason_key = f"{abuse_prefix}:exclude_reason"

                                previous_ts = await client.get(last_event_key)
                                if previous_ts and event_ts - int(previous_ts) >= SESSION_END_GAP_SECONDS:
                                    await _set_psych_state(client, psych_state_key, "BORED")
                                    await _publish_event(
                                        "SESSION_END",
                                        {
                                            "user_id": state_user_key,
                                            "timestamp": int(previous_ts),
                                            "user_external_id": external_id,
                                            "nickname": parsed.get("nickname"),
                                            "psychological_state": "BORED",
                                        },
                                    )
                                    await client.set(loss_streak_key, 0, ex=STATE_TTL_SECONDS)
                                    await client.set(session_loss_key, 0, ex=STATE_TTL_SECONDS)

                                await client.set(last_event_key, event_ts, ex=STATE_TTL_SECONDS)
                                game_class = _classify_game_type(parsed.get("game_type"))

                                if parsed.get("_internal"):
                                    bet_amount = parsed.get("bet_amount") or 0
                                    if bet_amount > 0:
                                        if await client.get(abuse_exclude_key):
                                            continue
                                        amount_key = f"{abuse_prefix}:amount:{bet_amount}"
                                        amount_count = await client.incr(amount_key)
                                        await client.expire(amount_key, day_ttl)
                                        if amount_count >= DAILY_AMOUNT_REPEAT_THRESHOLD:
                                            await client.set(abuse_exclude_key, "1", ex=day_ttl)
                                            await client.set(abuse_reason_key, "amount_repeat", ex=day_ttl)
                                            continue

                                        last_delta_key = f"{abuse_prefix}:last_delta"
                                        periodic_count_key = f"{abuse_prefix}:periodic"
                                        if previous_ts:
                                            delta = int(event_ts) - int(previous_ts)
                                            last_delta = await client.get(last_delta_key)
                                            if last_delta is not None and abs(delta - int(last_delta)) <= PERIODIC_TOLERANCE_SECONDS:
                                                periodic_count = await client.incr(periodic_count_key)
                                                await client.expire(periodic_count_key, day_ttl)
                                                if periodic_count >= DAILY_PERIODIC_REPEAT_THRESHOLD:
                                                    await client.set(abuse_exclude_key, "1", ex=day_ttl)
                                                    await client.set(abuse_reason_key, "periodic_repeat", ex=day_ttl)
                                                    continue
                                            else:
                                                await client.set(periodic_count_key, 0, ex=day_ttl)
                                            await client.set(last_delta_key, delta, ex=day_ttl)

                                    await client.hset(last_bet_key, mapping={"amount": bet_amount, "ts": event_ts})
                                    await client.expire(last_bet_key, STATE_TTL_SECONDS)
                                    bet_sum_day_key = f"{abuse_prefix}:bet_sum_day"
                                    await client.incrby(bet_sum_day_key, bet_amount)
                                    await client.expire(bet_sum_day_key, day_ttl)
                                    bet_sum_30m_key = f"{state_prefix}:bet_sum_30m"
                                    await _record_amount_window(client, bet_sum_30m_key, event_ts, bet_amount, 30 * 60)

                                    bet_amount = parsed.get("bet_amount") or 0
                                    payout_amount = parsed.get("payout_amount")
                                elif parsed.get("bet_type") == "베팅":
                                    bet_amount = parsed.get("amount") or 0
                                    if bet_amount > 0:
                                        if await client.get(abuse_exclude_key):
                                            continue
                                        amount_key = f"{abuse_prefix}:amount:{bet_amount}"
                                        amount_count = await client.incr(amount_key)
                                        await client.expire(amount_key, day_ttl)
                                        if amount_count >= DAILY_AMOUNT_REPEAT_THRESHOLD:
                                            await client.set(abuse_exclude_key, "1", ex=day_ttl)
                                            await client.set(abuse_reason_key, "amount_repeat", ex=day_ttl)
                                            continue

                                        last_delta_key = f"{abuse_prefix}:last_delta"
                                        periodic_count_key = f"{abuse_prefix}:periodic"
                                        if previous_ts:
                                            delta = int(event_ts) - int(previous_ts)
                                            last_delta = await client.get(last_delta_key)
                                            if last_delta is not None and abs(delta - int(last_delta)) <= PERIODIC_TOLERANCE_SECONDS:
                                                periodic_count = await client.incr(periodic_count_key)
                                                await client.expire(periodic_count_key, day_ttl)
                                                if periodic_count >= DAILY_PERIODIC_REPEAT_THRESHOLD:
                                                    await client.set(abuse_exclude_key, "1", ex=day_ttl)
                                                    await client.set(abuse_reason_key, "periodic_repeat", ex=day_ttl)
                                                    continue
                                            else:
                                                await client.set(periodic_count_key, 0, ex=day_ttl)
                                            await client.set(last_delta_key, delta, ex=day_ttl)

                                    await client.hset(last_bet_key, mapping={"amount": bet_amount, "ts": event_ts})
                                    await client.expire(last_bet_key, STATE_TTL_SECONDS)
                                    bet_sum_day_key = f"{abuse_prefix}:bet_sum_day"
                                    await client.incrby(bet_sum_day_key, bet_amount)
                                    await client.expire(bet_sum_day_key, day_ttl)
                                    bet_sum_30m_key = f"{state_prefix}:bet_sum_30m"
                                    await _record_amount_window(client, bet_sum_30m_key, event_ts, bet_amount, 30 * 60)
                                    continue

                                if not parsed.get("_internal"):
                                    bet_amount = parsed.get("amount") or 0
                                    if await client.get(abuse_exclude_key):
                                        continue
                                    payout_amount = parsed.get("payout")
                                    if payout_amount is None:
                                        last_bet = await client.hgetall(last_bet_key)
                                        last_amount = _parse_amount(last_bet.get("amount")) if last_bet else None
                                        payout_amount = bet_amount
                                        bet_amount = last_amount or bet_amount

                                net = (payout_amount or 0) - (bet_amount or 0)
                                loss_amount = abs(min(net, 0))
                                if loss_amount > 0:
                                    loss_sum_60m_key = f"{state_prefix}:loss_sum_60m"
                                    loss_sum_60m = await _record_amount_window(client, loss_sum_60m_key, event_ts, loss_amount, 60 * 60)
                                else:
                                    loss_sum_60m = 0

                                loss_sum_day_key = f"{abuse_prefix}:loss_sum_day"
                                if loss_amount > 0:
                                    await client.incrby(loss_sum_day_key, loss_amount)
                                    await client.expire(loss_sum_day_key, day_ttl)
                                bet_sum_day_key = f"{abuse_prefix}:bet_sum_day"
                                bet_sum_day = int(await client.get(bet_sum_day_key) or 0)
                                if net < 0:
                                    new_streak = await client.incr(loss_streak_key)
                                    await client.expire(loss_streak_key, STATE_TTL_SECONDS)
                                else:
                                    new_streak = 0
                                    await client.set(loss_streak_key, 0, ex=STATE_TTL_SECONDS)

                                loss_total = await client.incrby(session_loss_key, loss_amount)
                                await client.expire(session_loss_key, STATE_TTL_SECONDS)

                                if game_class == "slot":
                                    bet_sum_30m = await _record_amount_window(
                                        client, f"{state_prefix}:bet_sum_30m", event_ts, 0, 30 * 60
                                    )
                                    if new_streak >= SLOT_LOSS_STREAK_THRESHOLD and bet_sum_30m >= SLOT_BET_SUM_30M_THRESHOLD:
                                        await _set_psych_state(client, psych_state_key, "FRUSTRATED")
                                        await _publish_event(
                                            "LOSS_STREAK",
                                            {
                                                "user_id": state_user_key,
                                                "timestamp": event_ts,
                                                "game_type": parsed.get("game_type"),
                                                "current_streak": new_streak,
                                                "bet_amount": bet_amount,
                                                "payout_amount": payout_amount,
                                                "user_external_id": external_id,
                                                "nickname": parsed.get("nickname"),
                                                "psychological_state": "FRUSTRATED",
                                            },
                                        )
                                    if loss_sum_60m >= SLOT_LOSS_SUM_60M_THRESHOLD:
                                        await _set_psych_state(client, psych_state_key, "FRUSTRATED")
                                        await _publish_event(
                                            "ASSET_DEPLETION",
                                            {
                                                "user_id": state_user_key,
                                                "timestamp": event_ts,
                                                "game_type": parsed.get("game_type"),
                                                "loss_total": loss_sum_60m,
                                                "user_external_id": external_id,
                                                "nickname": parsed.get("nickname"),
                                                "psychological_state": "FRUSTRATED",
                                            },
                                        )
                                elif game_class == "sports":
                                    miss = False
                                    if parsed.get("result_text"):
                                        miss = "미적중" in parsed.get("result_text")
                                    if payout_amount is not None and payout_amount <= 0:
                                        miss = True
                                    if miss:
                                        if new_streak >= SPORTS_LOSS_STREAK_THRESHOLD and bet_sum_day >= SPORTS_BET_SUM_DAY_THRESHOLD:
                                            await _set_psych_state(client, psych_state_key, "FRUSTRATED")
                                            await _publish_event(
                                                "LOSS_STREAK",
                                                {
                                                    "user_id": state_user_key,
                                                    "timestamp": event_ts,
                                                    "game_type": parsed.get("game_type"),
                                                    "current_streak": new_streak,
                                                    "bet_amount": bet_amount,
                                                    "payout_amount": payout_amount,
                                                    "user_external_id": external_id,
                                                    "nickname": parsed.get("nickname"),
                                                    "psychological_state": "FRUSTRATED",
                                                },
                                            )
                                    loss_sum_day = int(await client.get(loss_sum_day_key) or 0)
                                    if loss_sum_day >= SPORTS_LOSS_SUM_DAY_THRESHOLD:
                                        await _set_psych_state(client, psych_state_key, "FRUSTRATED")
                                        await _publish_event(
                                            "ASSET_DEPLETION",
                                            {
                                                "user_id": state_user_key,
                                                "timestamp": event_ts,
                                                "game_type": parsed.get("game_type"),
                                                "loss_total": loss_sum_day,
                                                "user_external_id": external_id,
                                                "nickname": parsed.get("nickname"),
                                                "psychological_state": "FRUSTRATED",
                                            },
                                        )
                                else:
                                    bet_sum_30m = await _record_amount_window(
                                        client, f"{state_prefix}:bet_sum_30m", event_ts, 0, 30 * 60
                                    )
                                    if new_streak >= CASINO_LOSS_STREAK_THRESHOLD and bet_sum_30m >= CASINO_BET_SUM_30M_THRESHOLD:
                                        await _set_psych_state(client, psych_state_key, "FRUSTRATED")
                                        await _publish_event(
                                            "LOSS_STREAK",
                                            {
                                                "user_id": state_user_key,
                                                "timestamp": event_ts,
                                                "game_type": parsed.get("game_type"),
                                                "current_streak": new_streak,
                                                "bet_amount": bet_amount,
                                                "payout_amount": payout_amount,
                                                "user_external_id": external_id,
                                                "nickname": parsed.get("nickname"),
                                                "psychological_state": "FRUSTRATED",
                                            },
                                        )
                                    if loss_total >= CASINO_SESSION_LOSS_THRESHOLD or loss_sum_60m >= CASINO_LOSS_SUM_60M_THRESHOLD:
                                        await _set_psych_state(client, psych_state_key, "FRUSTRATED")
                                        await _publish_event(
                                            "ASSET_DEPLETION",
                                            {
                                                "user_id": state_user_key,
                                                "timestamp": event_ts,
                                                "game_type": parsed.get("game_type"),
                                                "loss_total": max(loss_total, loss_sum_60m),
                                                "user_external_id": external_id,
                                                "nickname": parsed.get("nickname"),
                                                "psychological_state": "FRUSTRATED",
                                            },
                                        )
                                        await client.set(session_loss_key, 0, ex=STATE_TTL_SECONDS)

                            await client.xack(STREAM_KEY, GROUP_NAME, message_id)
                        except Exception as exc:  # noqa: BLE001
                            logger.error("ch25_event_worker_message_failed", exc_info=exc)
                            from app.services.ch25_event_service import normalize_stream_payload
                            payload = {"source": "ch25_event_worker", "payload": json.dumps(fields, ensure_ascii=False)}
                            normalized = normalize_stream_payload(payload)
                            logger.info("Normalized payload for dead_letters xadd", extra={"payload_types": {k: type(v).__name__ for k, v in normalized.items()}})
                            await client.xadd("stream:dead_letters", normalized)
                            await client.xack(STREAM_KEY, GROUP_NAME, message_id)
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001
                logger.error("ch25_event_worker_loop_error", exc_info=exc)
                await asyncio.sleep(1)
    finally:
        try:
            await client.close()
        except Exception:
            pass
        logger.info("ch25_event_worker_stopped")


async def main():
    stop_event = asyncio.Event()
    try:
        await run_ch25_event_worker(stop_event=stop_event)
    except KeyboardInterrupt:  # pragma: no cover - manual stop
        stop_event.set()


if __name__ == "__main__":
    asyncio.run(main())