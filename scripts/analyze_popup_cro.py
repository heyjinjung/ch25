import json
import pandas as pd
from collections import Counter
import argparse

def analyze_popup_cro(json_path: str, output_csv: str):
    print("💬 팝업 CRO 분석 시작...")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chats = data.get('chats', {}).get('list', [])
    popup_metrics = {
        'exit_intent_triggers': 0,  # Exit Intent 트리거 (이탈 시 팝업)
        'timed_popups': 0,          # 시간 기반 팝업
        'value_offers': 0,           # 가치 제안 팝업 (할인, 리워드)
        'easy_close_options': 0,     # 쉬운 닫기 옵션
        'frequency_limits': 0,       # 빈도 제한 (과도 노출 방지)
        'mobile_friendly': 0         # 모바일 친화적
    }

    for chat in chats:
        if chat.get('type') != 'personal_chat':
            continue
        messages = chat.get('messages', [])
        for msg in messages:
            text = msg.get('text', '').lower()
            if '이탈' in text or '나가' in text:
                popup_metrics['exit_intent_triggers'] += 1
            if '시간' in text or '기다리' in text:
                popup_metrics['timed_popups'] += 1
            if '할인' in text or '리워드' in text:
                popup_metrics['value_offers'] += 1
            if '닫기' in text or '취소' in text:
                popup_metrics['easy_close_options'] += 1
            if '한 번만' in text or '제한' in text:
                popup_metrics['frequency_limits'] += 1
            if '모바일' in text or '앱' in text:
                popup_metrics['mobile_friendly'] += 1

    # 전환율 추정 (팝업 노출당 참여)
    conversion_rate = popup_metrics['value_offers'] / sum(popup_metrics.values()) if sum(popup_metrics.values()) > 0 else 0

    # 추천
    if conversion_rate < 0.1:
        recommendation = "팝업 최적화: 가치 제안 강화, 빈도 제한"
    else:
        recommendation = "Exit Intent 팝업 추가: 이탈 방지"

    df = pd.DataFrame([popup_metrics])
    df['conversion_rate'] = conversion_rate
    df['recommendation'] = recommendation
    df.to_csv(output_csv, index=False)
    print(f"📄 팝업 CRO 분석 결과 저장: {output_csv}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="팝업 CRO 분석")
    parser.add_argument("--input", default="result.json", help="JSON 파일 경로")
    parser.add_argument("--output", default="popup_cro_analysis.csv", help="출력 CSV")
    args = parser.parse_args()
    analyze_popup_cro(args.input, args.output)