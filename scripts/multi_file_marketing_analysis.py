import json
import pandas as pd
import os
import re

def analyze_sentiment(text):
    tokens = re.findall(r'\b\w+\b', text.lower())
    pos_count = sum(1 for word in tokens if word in ['좋아', '감사', '행복', '대박', '좋다', '멋져', '최고', '기쁘다'])
    neg_count = sum(1 for word in tokens if word in ['싫어', '화나', '짜증', '문제', '안돼', '탈퇴', '신고', '불만'])
    if pos_count > neg_count:
        return 'positive'
    elif neg_count > pos_count:
        return 'negative'
    else:
        return 'neutral'

def extract_nouns(text):
    words = re.findall(r'[가-힣]+', text)
    return [word for word in words if len(word) > 1]

def multi_file_analysis(json_paths: list, output_csv: str):
    print("📊 다중 파일 마케팅 분석 시작...")

    all_results = []

    for json_path in json_paths:
        if not os.path.exists(json_path):
            print(f"⚠️ 파일 없음: {json_path}")
            continue
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # 다양한 구조 처리
            if 'chats' in data and 'list' in data['chats']:
                chats = data['chats']['list']
                for chat in chats:
                    chat_name = chat.get('name', 'Unknown')
                    messages = chat.get('messages', [])
                    for msg in messages:
                        text = msg.get('text', '')
                        if not text:
                            continue
                        sentiment = analyze_sentiment(text)
                        nouns = extract_nouns(text)
                        loss_aversion = 1 if any(word in text for word in ['놓치', '제한', '손실', '빠지다']) else 0
                        social_proof = 1 if any(word in text for word in ['참여', '후기', '사용자']) else 0
                        all_results.append({
                            'file': os.path.basename(json_path),
                            'chat_name': chat_name,
                            'text': text,
                            'sentiment': sentiment,
                            'nouns': ', '.join(nouns),
                            'loss_aversion': loss_aversion,
                            'social_proof': social_proof
                        })
            elif 'messages' in data:
                chat_name = data.get('name', 'Unknown')
                messages = data.get('messages', [])
                for msg in messages:
                    text = msg.get('text', '')
                    if not text:
                        continue
                    sentiment = analyze_sentiment(text)
                    nouns = extract_nouns(text)
                    loss_aversion = 1 if any(word in text for word in ['놓치', '제한', '손실', '빠지다']) else 0
                    social_proof = 1 if any(word in text for word in ['참여', '후기', '사용자']) else 0
                    all_results.append({
                        'file': os.path.basename(json_path),
                        'chat_name': chat_name,
                        'text': text,
                        'sentiment': sentiment,
                        'nouns': ', '.join(nouns),
                        'loss_aversion': loss_aversion,
                        'social_proof': social_proof
                    })
            else:
                print(f"⚠️ 지원되지 않는 구조: {json_path}")
        except Exception as e:
            print(f"⚠️ 파일 처리 오류: {json_path} - {e}")

    df = pd.DataFrame(all_results)
    df.to_csv(output_csv, index=False)
    print(f"📄 다중 파일 분석 결과 저장: {output_csv} (총 {len(all_results)}개 메시지)")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="다중 파일 마케팅 분석")
    parser.add_argument("--inputs", nargs='+', default=["result.json"], help="JSON 파일 경로들")
    parser.add_argument("--output", default="multi_file_analysis.csv", help="출력 CSV")
    args = parser.parse_args()
    multi_file_analysis(args.inputs, args.output)