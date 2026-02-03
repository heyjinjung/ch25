import json
import pandas as pd
import os
from konlpy.tag import Okt

def expanded_data_analysis(json_paths: list, output_csv: str):
    print("📊 확장 데이터 분석 (다중 파일) 시작...")

    okt = Okt()
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
                nouns = okt.nouns(text)
                sentiment = 'positive' if any(word in text for word in ['좋아', '감사']) else 'negative' if any(word in text for word in ['신고', '탈퇴']) else 'neutral'
                all_results.append({
                    'file': os.path.basename(json_path),
                    'text': text,
                    'sentiment': sentiment,
                    'nouns': ', '.join(nouns)
                })

    df = pd.DataFrame(all_results)
    df.to_csv(output_csv, index=False)
    print(f"📄 확장 데이터 분석 결과 저장: {output_csv}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="확장 데이터 분석")
    parser.add_argument("--inputs", nargs='+', default=["result.json"], help="JSON 파일 경로들")
    parser.add_argument("--output", default="expanded_data_analysis.csv", help="출력 CSV")
    args = parser.parse_args()
    expanded_data_analysis(args.inputs, args.output)