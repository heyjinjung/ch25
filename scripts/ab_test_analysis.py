import json
import pandas as pd
from konlpy.tag import Okt
import re

def ab_test_analysis(json_path: str, output_csv: str):
    print("🧪 A/B 메시지 실험 분석 시작...")

    okt = Okt()
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chats = data.get('chats', {}).get('list', [])
    ab_results = {'version_a': [], 'version_b': []}

    for chat in chats:
        if chat.get('type') != 'personal_chat':
            continue
        messages = chat.get('messages', [])
        for msg in messages:
            text = msg.get('text', '')
            # A/B 버전 시뮬레이션 (실제로는 메시지 ID나 타임스탬프 기반 분할)
            version = 'version_a' if len(text) % 2 == 0 else 'version_b'
            sentiment = 'positive' if '감사' in text else 'negative' if '신고' in text else 'neutral'
            ab_results[version].append({
                'text': text,
                'sentiment': sentiment,
                'engagement': 1 if '참여' in text else 0
            })

    # A/B 비교
    a_df = pd.DataFrame(ab_results['version_a'])
    b_df = pd.DataFrame(ab_results['version_b'])
    a_engagement = a_df['engagement'].mean() if not a_df.empty else 0
    b_engagement = b_df['engagement'].mean() if not b_df.empty else 0

    summary = {
        'version_a_engagement': a_engagement,
        'version_b_engagement': b_engagement,
        'winner': 'A' if a_engagement > b_engagement else 'B' if b_engagement > a_engagement else 'Tie'
    }

    df = pd.DataFrame([summary])
    df.to_csv(output_csv, index=False)
    print(f"📄 A/B 분석 결과 저장: {output_csv}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="A/B 메시지 실험 분석")
    parser.add_argument("--input", default="result.json", help="JSON 파일 경로")
    parser.add_argument("--output", default="ab_test_analysis.csv", help="출력 CSV")
    args = parser.parse_args()
    ab_test_analysis(args.input, args.output)