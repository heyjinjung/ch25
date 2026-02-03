import json
import pandas as pd
from konlpy.tag import Okt
import re
from collections import Counter

# 간단 감정 사전 (확장 가능)
POSITIVE_WORDS = ['좋아', '감사', '행복', '대박', '좋다', '멋져', '최고', '기쁘다']
NEGATIVE_WORDS = ['싫어', '화나', '짜증', '문제', '안돼', '탈퇴', '신고', '불만']

def analyze_sentiment(text, okt):
    tokens = okt.morphs(text)
    pos_count = sum(1 for word in tokens if word in POSITIVE_WORDS)
    neg_count = sum(1 for word in tokens if word in NEGATIVE_WORDS)
    if pos_count > neg_count:
        return 'positive'
    elif neg_count > pos_count:
        return 'negative'
    else:
        return 'neutral'

def advanced_marketing_psychology(json_path: str, output_csv: str):
    print("🧠 고급 마케팅 심리 분석 (NLP + 감정) 시작...")

    okt = Okt()
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chats = data.get('chats', {}).get('list', [])
    results = []

    for chat in chats:
        if chat.get('type') != 'personal_chat':
            continue
        chat_name = chat.get('name', 'Unknown')
        messages = chat.get('messages', [])
        for msg in messages:
            text = msg.get('text', '')
            if not text:
                continue
            sentiment = analyze_sentiment(text, okt)
            # 형태소 분석으로 키워드 추출
            nouns = okt.nouns(text)
            # 심리 모델 매핑 (NLP 기반)
            loss_aversion = 1 if any(word in text for word in ['놓치', '제한', '손실', '빠지다']) else 0
            social_proof = 1 if any(word in text for word in ['참여', '후기', '사용자']) else 0
            # 추가 메트릭
            results.append({
                'chat_name': chat_name,
                'text': text,
                'sentiment': sentiment,
                'nouns': ', '.join(nouns),
                'loss_aversion': loss_aversion,
                'social_proof': social_proof
            })

    df = pd.DataFrame(results)
    df.to_csv(output_csv, index=False)
    print(f"📄 고급 심리 분석 결과 저장: {output_csv}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="고급 마케팅 심리 분석")
    parser.add_argument("--input", default="result.json", help="JSON 파일 경로")
    parser.add_argument("--output", default="advanced_psychology_analysis.csv", help="출력 CSV")
    args = parser.parse_args()
    advanced_marketing_psychology(args.input, args.output)