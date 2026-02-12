#!/usr/bin/env python3
"""텔레그램 채널 비밀코드 공지 스크립트 (2026 Valentine & Seol Event).

Cron 설정 예시 (매일 10:00 KST):
    0 10 * * * /usr/bin/python3 /path/to/scripts/send_secret_code_announcement.py
"""

import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID")

# 일별 비밀코드 정의
SECRET_CODES = {
    "2026-02-14": {
        "code": "LOVE2026",
        "reward": "룰렛 티켓 2장",
    },
    "2026-02-15": {
        "code": "SEOL777",
        "reward": "복권 티켓 1장",
    },
    "2026-02-16": {
        "code": "LUCKY888",
        "reward": "주사위 티켓 2장",
    },
    "2026-02-17": {
        "code": "JACKPOT999",
        "reward": "포인트 10,000P",
    },
}


def send_telegram_message(message: str) -> dict:
    """텔레그램 채널에 메시지 발송."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        print("ERROR: TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHANNEL_ID 환경변수가 설정되지 않았습니다.")
        sys.exit(1)

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHANNEL_ID,
        "text": message,
        "parse_mode": "Markdown",
    }
    response = requests.post(url, json=payload, timeout=10)
    response.raise_for_status()
    return response.json()


if __name__ == "__main__":
    today = datetime.now(ZoneInfo("Asia/Seoul")).strftime("%Y-%m-%d")

    if today in SECRET_CODES:
        code_info = SECRET_CODES[today]
        message = (
            f"🎁 *오늘의 비밀코드 공개!* 🎁\n"
            f"\n"
            f"📢 비밀코드: `{code_info['code']}`\n"
            f"🎁 보상: {code_info['reward']}\n"
            f"\n"
            f"👉 씨씨카지노 앱 → 이벤트 페이지에서 입력하세요!\n"
            f"⏰ 오늘 자정까지만 유효합니다!\n"
            f"\n"
            f"💡 *입력 방법*\n"
            f"1. 앱 실행 → 이벤트 배너 클릭\n"
            f"2. 비밀코드 입력창에 위 코드 입력\n"
            f"3. 즉시 보상 받기!\n"
            f"\n"
            f"❗ 하루 1회만 입력 가능하니 놓치지 마세요!"
        )
        send_telegram_message(message)
        print(f"[OK] {today} 비밀코드 공지 발송 완료: {code_info['code']}")
    else:
        print(f"[SKIP] {today}는 이벤트 기간이 아닙니다.")
