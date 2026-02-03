import json
import pandas as pd
from collections import Counter
import argparse

def analyze_page_cro(json_path: str, output_csv: str):
    print("📄 페이지 CRO 분석 시작...")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chats = data.get('chats', {}).get('list', [])
    page_metrics = {
        'value_proposition_clarity': 0,  # 가치 제안 명확성 (승률, 혜택 강조)
        'cta_effectiveness': 0,          # CTA 효과 (참여 유도)
        'trust_building': 0,             # 신뢰 구축 (후기, 인증)
        'friction_reduction': 0,         # 마찰 감소 (간단 안내)
        'objection_handling': 0          # 이의 제기 처리 (FAQ, 보증)
    }

    for chat in chats:
        if chat.get('type') != 'personal_chat':
            continue
        messages = chat.get('messages', [])
        for msg in messages:
            text = msg.get('text', '').lower()
            if '승률' in text or '혜택' in text:
                page_metrics['value_proposition_clarity'] += 1
            if '참여' in text or '클릭' in text:
                page_metrics['cta_effectiveness'] += 1
            if '후기' in text or '인증' in text:
                page_metrics['trust_building'] += 1
            if '간단' in text or '쉽게' in text:
                page_metrics['friction_reduction'] += 1
            if 'faq' in text or '보증' in text:
                page_metrics['objection_handling'] += 1

    # Page Conversion Readiness 점수 (0-100)
    clarity = min(page_metrics['value_proposition_clarity'] / 10 * 25, 25)
    cta = min(page_metrics['cta_effectiveness'] / 10 * 20, 20)
    trust = min(page_metrics['trust_building'] / 10 * 15, 15)
    friction = min(page_metrics['friction_reduction'] / 10 * 15, 15)
    objection = min(page_metrics['objection_handling'] / 10 * 10, 10)
    readiness_score = clarity + cta + trust + friction + objection

    # 추천
    if readiness_score >= 85:
        recommendation = "High: 즉시 최적화 실험 진행"
    elif readiness_score >= 70:
        recommendation = "Moderate: 가치 제안 강화 우선"
    else:
        recommendation = "Low: 근본 개선 후 실험"

    df = pd.DataFrame([page_metrics])
    df['readiness_score'] = readiness_score
    df['recommendation'] = recommendation
    df.to_csv(output_csv, index=False)
    print(f"📄 페이지 CRO 분석 결과 저장: {output_csv}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="페이지 CRO 분석")
    parser.add_argument("--input", default="result.json", help="JSON 파일 경로")
    parser.add_argument("--output", default="page_cro_analysis.csv", help="출력 CSV")
    args = parser.parse_args()
    analyze_page_cro(args.input, args.output)