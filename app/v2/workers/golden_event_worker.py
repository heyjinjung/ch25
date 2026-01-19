"""Golden V2 event worker wrapper (reuses ch25 event worker)."""
from __future__ import annotations

import asyncio

from app.workers.ch25_event_worker import run_ch25_event_worker


async def main() -> None:
    stop_event = asyncio.Event()
    try:
        await run_ch25_event_worker(stop_event=stop_event)
    except KeyboardInterrupt:  # pragma: no cover - manual stop
        stop_event.set()


if __name__ == "__main__":
    asyncio.run(main())
