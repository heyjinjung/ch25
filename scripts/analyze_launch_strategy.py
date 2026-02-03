import json
import pandas as pd
from collections import Counter
import argparse

def analyze_launch_strategy(json_path: str, output_csv: str):
    print("🚀 런칭 전략 분석 시작...")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chats = data.get('chats', {}).get('list', [])
    launch_metrics = {
        'pre_launch_teasers': 0,  # 사전 티저 (이벤트 예고)
        'beta_access_offers': 0,  # 베타 액세스 제안
        'full_launch_announcements': 0,  # 전체 공개 공지
        'owned_channel_usage': 0,  # Owned 채널 (텔레그램 채널)
        'borrowed_influencer': 0,  # Borrowed (인플루언서/협업)
        'post_launch_retention': 0  # 사후 유지 메시지
    }

    for chat in chats:
        if chat.get('type') != 'personal_chat':
            continue
        messages = chat.get('messages', [])
        for msg in messages:
            text = msg.get('text', '').lower()
            if '예고' in text or '오픈 예정' in text:
                launch_metrics['pre_launch_teasers'] += 1
            if '베타' in text or '얼리 액세스' in text:
                launch_metrics['beta_access_offers'] += 1
            if '오픈' in text or '공개' in text:
                launch_metrics['full_launch_announcements'] += 1
            if '채널' in text or '공식' in text:
                launch_metrics['owned_channel_usage'] += 1
            if '협업' in text or '인플루' in text:
                launch_metrics['borrowed_influencer'] += 1
            if '유지' in text or '재방문' in text:
                launch_metrics['post_launch_retention'] += 1

    # 단계별 추천 (ORB 프레임워크 기반)
    if launch_metrics['pre_launch_teasers'] > launch_metrics['full_launch_announcements']:
        recommendation = "Pre-Launch 단계 강화: 티저 마케팅 증가"
    elif launch_metrics['owned_channel_usage'] > 50:
        recommendation = "Owned 채널 집중: 텔레그램 채널 최적화"
    else:
        recommendation = "Borrowed 채널 추가: 인플루언서 협업 도입"

    df = pd.DataFrame([launch_metrics])
    df['recommendation'] = recommendation
    df.to_csv(output_csv, index=False)
    print(f"📄 런칭 전략 분석 결과 저장: {output_csv}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="런칭 전략 분석")
    parser.add_argument("--input", default="result.json", help="JSON 파일 경로")
    parser.add_argument("--output", default="launch_analysis.csv", help="출력 CSV")
    args = parser.parse_args()
    analyze_launch_strategy(args.input, args.output)