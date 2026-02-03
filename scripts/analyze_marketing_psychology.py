import json
import pandas as pd
from collections import Counter
import argparse

def analyze_marketing_psychology(json_path: str, output_csv: str):
    print("🧠 마케팅 심리 분석 시작...")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chats = data.get('chats', {}).get('list', [])
    psychology_counts = {
        'Loss_Aversion': 0,  # 손실 강조 (놓치면, 제한 등)
        'Social_Proof': 0,   # 사회적 증거 (참여자 수, 후기 등)
        'Paradox_of_Choice': 0,  # 선택지 과다 (복잡한 옵션)
        'Anchoring': 0,      # 앵커링 (기준 가격/보상)
        'Scarcity': 0,       # 희소성 (한정 이벤트)
        'Authority': 0,      # 권위 (VIP, 전문가 언급)
        'Reciprocity': 0,    # 호혜성 (보상 제공)
        'Consistency': 0     # 일관성 (반복 메시지)
    }

    for chat in chats:
        if chat.get('type') != 'personal_chat':
            continue
        messages = chat.get('messages', [])
        for msg in messages:
            text = msg.get('text', '').lower()
            # 한국어 키워드 추가
            if '놓치' in text or '제한' in text or '손실' in text or '빠지' in text:
                psychology_counts['Loss_Aversion'] += 1
            if '참여' in text or '명' in text or '후기' in text or '사용자' in text:
                psychology_counts['Social_Proof'] += 1
            if '선택' in text or '옵션' in text or len(text.split()) > 15:  # 긴 메시지
                psychology_counts['Paradox_of_Choice'] += 1
            if '기준' in text or '원래' in text or '가격' in text:
                psychology_counts['Anchoring'] += 1
            if '한정' in text or '마감' in text or '빠르게' in text:
                psychology_counts['Scarcity'] += 1
            if 'vip' in text or '전문' in text or '실장' in text:
                psychology_counts['Authority'] += 1
            if '보상' in text or '지급' in text or '크레딧' in text:
                psychology_counts['Reciprocity'] += 1
            if '항상' in text or '계속' in text or '매일' in text:
                psychology_counts['Consistency'] += 1

    # PLFS 점수 계산 (간단화: Leverage + Fit + Speed + Ethics - Cost)
    plfs_scores = {}
    for model, count in psychology_counts.items():
        leverage = count * 2  # 빈도 기반
        fit = 5 if count > 0 else 0  # 적용 여부
        speed = 3  # 빠른 적용 가능
        ethics = 4  # 윤리적
        cost = 2  # 구현 비용
        plfs = (leverage + fit + speed + ethics) - cost
        plfs_scores[model] = {'count': count, 'plfs': plfs, 'recommendation': '즉시 적용' if plfs >= 12 else '상황별 테스트' if plfs >= 8 else '보류'}

    df = pd.DataFrame.from_dict(plfs_scores, orient='index')
    df.to_csv(output_csv)
    print(f"📄 심리 분석 결과 저장: {output_csv}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="마케팅 심리 분석")
    parser.add_argument("--input", default="result.json", help="JSON 파일 경로")
    parser.add_argument("--output", default="psychology_analysis.csv", help="출력 CSV")
    args = parser.parse_args()
    analyze_marketing_psychology(args.input, args.output)