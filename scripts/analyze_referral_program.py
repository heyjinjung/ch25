import json
import pandas as pd
from collections import Counter
import argparse

def analyze_referral_program(json_path: str, output_csv: str):
    print("🔗 리퍼럴 프로그램 분석 시작...")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chats = data.get('chats', {}).get('list', [])
    referral_metrics = {
        'referral_mentions': 0,  # 추천 코드/링크 언급
        'incentive_offers': 0,   # 인센티브 제안 (양면 보상)
        'viral_triggers': 0,     # 바이럴 유도 (공유 유도)
        'k_factor_estimates': [],  # K-팩터 추정 (추천당 신규 유저)
        'success_rate': 0        # 성공률 (추천 후 전환)
    }

    for chat in chats:
        if chat.get('type') != 'personal_chat':
            continue
        messages = chat.get('messages', [])
        for msg in messages:
            text = msg.get('text', '').lower()
            if '추천' in text or '코드' in text or '링크' in text:
                referral_metrics['referral_mentions'] += 1
            if '보상' in text and ('양면' in text or '추천인' in text):
                referral_metrics['incentive_offers'] += 1
            if '공유' in text or '초대' in text:
                referral_metrics['viral_triggers'] += 1
            # K-팩터: 간단 추정 (추천 언급당 0.5 신규 유저 가정)
            if '추천' in text:
                referral_metrics['k_factor_estimates'].append(0.5)

    # 평균 K-팩터
    avg_k = sum(referral_metrics['k_factor_estimates']) / len(referral_metrics['k_factor_estimates']) if referral_metrics['k_factor_estimates'] else 0
    referral_metrics['avg_k_factor'] = avg_k

    # 설계 추천
    if referral_metrics['referral_mentions'] > 10:
        recommendation = "양면 보상 리퍼럴 프로그램 즉시 도입"
    elif referral_metrics['incentive_offers'] > 5:
        recommendation = "티어드 인센티브 테스트"
    else:
        recommendation = "기본 추천 코드 추가"

    df = pd.DataFrame([referral_metrics])
    df['recommendation'] = recommendation
    df.to_csv(output_csv, index=False)
    print(f"📄 리퍼럴 분석 결과 저장: {output_csv}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="리퍼럴 프로그램 분석")
    parser.add_argument("--input", default="result.json", help="JSON 파일 경로")
    parser.add_argument("--output", default="referral_analysis.csv", help="출력 CSV")
    args = parser.parse_args()
    analyze_referral_program(args.input, args.output)