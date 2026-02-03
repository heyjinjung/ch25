import json
import pandas as pd
from collections import Counter
import argparse

def analyze_paywall_cro(json_path: str, output_csv: str):
    print("💳 페이월 CRO 분석 시작...")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chats = data.get('chats', {}).get('list', [])
    paywall_metrics = {
        'feature_lock_triggers': 0,  # 기능 잠금 트리거
        'value_previews': 0,         # 가치 프리뷰
        'pricing_clarity': 0,        # 가격 명확성
        'social_proof': 0,           # 소셜 프루프 (사용자 후기)
        'easy_dismiss': 0,           # 쉬운 닫기
        'upgrade_flows': 0           # 업그레이드 플로우
    }

    for chat in chats:
        if chat.get('type') != 'personal_chat':
            continue
        messages = chat.get('messages', [])
        for msg in messages:
            text = msg.get('text', '').lower()
            if '잠금' in text or '제한' in text:
                paywall_metrics['feature_lock_triggers'] += 1
            if '프리뷰' in text or '미리보기' in text:
                paywall_metrics['value_previews'] += 1
            if '가격' in text or '요금' in text:
                paywall_metrics['pricing_clarity'] += 1
            if '후기' in text or '사용자' in text:
                paywall_metrics['social_proof'] += 1
            if '닫기' in text or '취소' in text:
                paywall_metrics['easy_dismiss'] += 1
            if '업그레이드' in text or '유료' in text:
                paywall_metrics['upgrade_flows'] += 1

    # 전환율 추정
    conversion_rate = paywall_metrics['upgrade_flows'] / sum(paywall_metrics.values()) if sum(paywall_metrics.values()) > 0 else 0

    # 추천
    if conversion_rate < 0.05:
        recommendation = "페이월 재설계: 가치 프리뷰 추가, 가격 투명화"
    else:
        recommendation = "업그레이드 플로우 최적화: 소셜 프루프 강화"

    df = pd.DataFrame([paywall_metrics])
    df['conversion_rate'] = conversion_rate
    df['recommendation'] = recommendation
    df.to_csv(output_csv, index=False)
    print(f"📄 페이월 CRO 분석 결과 저장: {output_csv}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="페이월 CRO 분석")
    parser.add_argument("--input", default="result.json", help="JSON 파일 경로")
    parser.add_argument("--output", default="paywall_cro_analysis.csv", help="출력 CSV")
    args = parser.parse_args()
    analyze_paywall_cro(args.input, args.output)