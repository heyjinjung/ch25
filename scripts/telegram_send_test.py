import csv
import os
import requests
import time

CSV_PATH = os.path.join(os.path.dirname(__file__), '../docs/v1_telegram_id_list.csv')
BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')  # 환경변수로 봇 토큰 입력
MESSAGE = '🎉 [2월오픈안내] 🎉\n\n안녕하세요!\n\n지금 CC지민 2월 이벤트 오픈했습니다.\n\n✅ 다양한 혜택 누리실수 있습니다! \n\n감사합니다 😊'
API_URL = 'https://api.telegram.org/bot{}/sendMessage'

if not BOT_TOKEN:
    print('환경변수 TELEGRAM_BOT_TOKEN을 설정하세요.')
    exit(1)

def send_message(telegram_id, text):
    url = API_URL.format(BOT_TOKEN)
    payload = {'chat_id': telegram_id, 'text': text}
    try:
        resp = requests.post(url, data=payload, timeout=5)
        if resp.status_code == 200:
            return True, None
        else:
            return False, f'HTTP {resp.status_code}: {resp.text}'
    except Exception as e:
        return False, str(e)

def main():
    with open(CSV_PATH, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            telegram_id = row['telegram_id']
            real_name = row.get('real_name', '')
            if not telegram_id or not telegram_id.isdigit():
                continue
            ok, err = send_message(telegram_id, MESSAGE)
            if ok:
                print(f'[성공] {telegram_id} ({real_name})')
            else:
                print(f'[실패] {telegram_id} ({real_name}) - {err}')
            time.sleep(0.5)  # rate limit 방지

if __name__ == '__main__':
    main()
