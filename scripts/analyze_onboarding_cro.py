import json
import pandas as pd
from collections import Counter
import argparse

def analyze_onboarding_cro(json_path: str, output_csv: str):
    print("🎯 온보딩 CRO 분석 시작...")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chats = data.get('chats', {}).get('list', [])
    onboarding_metrics = {
        'welcome_messages': 0,  # 환영 메시지
        'guided_steps': 0,      # 가이드 단계 (체크리스트)
        'value_demonstrations': 0,  # 가치 시연 (샘플/데모)
        'progress_indicators': 0,  # 진행도 표시
        'retention_triggers': 0,  # 유지 트리거 (이메일/푸시)
        'churn_prevention': 0   # 이탈 방지 메시지
    }

    for chat in chats:
        if chat.get('type') != 'personal_chat':
            continue
        messages = chat.get('messages', [])
        for msg in messages:
            text = msg.get('text', '').lower()
            if '환영' in text or '안녕' in text:
                onboarding_metrics['welcome_messages'] += 1
            if '단계' in text or '체크' in text:
                onboarding_metrics['guided_steps'] += 1
            if '샘플' in text or '데모' in text:
                onboarding_metrics['value_demonstrations'] += 1
            if '진행' in text or '완료' in text:
                onboarding_metrics['progress_indicators'] += 1
            if '리마인드' in text or '푸시' in text:
                onboarding_metrics['retention_triggers'] += 1
            if '이탈' in text or '복귀' in text:
                onboarding_metrics['churn_prevention'] += 1

    # 활성화율 추정 (간단: 가이드 단계 / 총 채팅)
    activation_rate = onboarding_metrics['guided_steps'] / len(chats) if chats else 0

    # 추천
    if activation_rate < 0.5:
        recommendation = "온보딩 플로우 강화: 체크리스트 추가, 가치 시연 우선"
    else:
        recommendation = "유지 트리거 최적화: 이메일/푸시 빈도 조정"

    df = pd.DataFrame([onboarding_metrics])
    df['activation_rate'] = activation_rate
    df['recommendation'] = recommendation
    df.to_csv(output_csv, index=False)
    print(f"📄 온보딩 CRO 분석 결과 저장: {output_csv}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="온보딩 CRO 분석")
    parser.add_argument("--input", default="result.json", help="JSON 파일 경로")
    parser.add_argument("--output", default="onboarding_analysis.csv", help="출력 CSV")
    args = parser.parse_args()
    analyze_onboarding_cro(args.input, args.output)