import json
import pandas as pd
import os
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

def extract_nouns(text):
    words = re.findall(r'\b\w+\b', text)
    return [word for word in words if len(word) > 1]

def expanded_data_simple(json_paths: list, output_csv: str):
    print("📊 간단 확장 데이터 분석 시작...")

    all_results = []

    for json_path in json_paths:
        if not os.path.exists(json_path):
            print(f"⚠️ 파일 없음: {json_path}")
            continue
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        chats = data.get('chats', {}).get('list', [])
        for chat in chats:
            if chat.get('type') != 'personal_chat':
                continue
            messages = chat.get('messages', [])
            for msg in messages:
                text = msg.get('text', '')
                if not text:
                    continue
                nouns = extract_nouns(text)
                sentiment = analyze_sentiment(text)
                all_results.append({
                    'file': os.path.basename(json_path),
                    'text': text,
                    'sentiment': sentiment,
                    'nouns': ', '.join(nouns)
                })

    df = pd.DataFrame(all_results)
    df.to_csv(output_csv, index=False)
    print(f"📄 확장 분석 결과 저장: {output_csv}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="간단 확장 데이터 분석")
    parser.add_argument("--inputs", nargs='+', default=["result.json"], help="JSON 파일 경로들")
    parser.add_argument("--output", default="simple_expanded_analysis.csv", help="출력 CSV")
    args = parser.parse_args()
    expanded_data_simple(args.inputs, args.output)