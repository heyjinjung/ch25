import json
import pandas as pd
import re

def analyze_sentiment(text):
    tokens = re.findall(r'\b\w+\b', text.lower())
    pos_count = sum(1 for word in tokens if word in ['좋아', '감사'])
    neg_count = sum(1 for word in tokens if word in ['신고', '탈퇴'])
    if pos_count > neg_count:
        return 'positive'
    elif neg_count > pos_count:
        return 'negative'
    else:
        return 'neutral'

def ab_test_simple(json_path: str, output_csv: str):
    print("🧪 간단 A/B 분석 시작...")

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
            version = 'version_a' if len(text) % 2 == 0 else 'version_b'
            sentiment = analyze_sentiment(text)
            engagement = 1 if '참여' in text else 0
            ab_results[version].append({
                'text': text,
                'sentiment': sentiment,
                'engagement': engagement
            })

    a_df = pd.DataFrame(ab_results['version_a'])
    b_df = pd.DataFrame(ab_results['version_b'])
    a_engagement = a_df['engagement'].mean() if not a_df.empty else 0
    b_engagement = b_df['engagement'].mean() if not b_df.empty else 0

    summary = {
        'version_a_engagement': a_engagement,
        'version_b_engagement': b_engagement,
        'winner': 'A' if a_engagement > b_engagement else 'B'
    }

    df = pd.DataFrame([summary])
    df.to_csv(output_csv, index=False)
    print(f"📄 A/B 분석 결과 저장: {output_csv}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="간단 A/B 분석")
    parser.add_argument("--input", default="result.json", help="JSON 파일 경로")
    parser.add_argument("--output", default="simple_ab_analysis.csv", help="출력 CSV")
    args = parser.parse_args()
    ab_test_simple(args.input, args.output)