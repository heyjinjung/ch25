#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
텔레그램 마케팅 실패 분석 통합 스크립트
- 데이터 소스: 텔레그램 데이터 익스포트 JSON
- 총 293개 채팅, 25,820개 메시지 분석
"""

import json
import pandas as pd
import re
from collections import Counter, defaultdict
from datetime import datetime
import os

# ===== 분석 키워드 정의 =====
MARKETING_KEYWORDS = {
    # 심리학 기반
    'loss_aversion': ['놓치', '제한', '마감', '한정', '품절', '마지막', '종료', '빠지다', '손실', '못받', '기회'],
    'social_proof': ['참여', '후기', '인기', '베스트', '추천', '많은', '사용자', '회원', '명이'],
    'scarcity': ['선착순', '한정', '마감', '품절', '몇명', '남은'],
    'urgency': ['지금', '바로', '즉시', '오늘', '당장', '빨리'],
    
    # 리퍼럴/추천
    'referral': ['추천', '친구', '초대', '코드', '공유', '소개', '리퍼럴'],
    'incentive': ['보너스', '혜택', '리워드', '적립', '무료', '할인', '이벤트', '입플', '충전'],
    
    # 온보딩/CRO
    'welcome': ['환영', '가입', '신규', '첫', '웰컴', '입금'],
    'cta': ['클릭', '가입', '시작', '참여', '확인', '문의', '연락'],
    'value_prop': ['혜택', '특별', 'VIP', '골드', '프리미엄', '독점', '최고'],
    
    # 이탈 방지
    'churn': ['탈퇴', '해지', '떠나', '그만', '불만', '문제'],
    'retention': ['돌아', '다시', '재방문', '복귀', '유지'],
}

SENTIMENT_WORDS = {
    'positive': ['좋아', '감사', '행복', '대박', '좋다', '멋져', '최고', '기쁘다', '굿', '짱', '완벽', '만족', '사랑'],
    'negative': ['싫어', '화나', '짜증', '문제', '안돼', '탈퇴', '신고', '불만', '별로', '최악', '실망', '힘들', '어렵'],
}

def extract_text_from_message(msg):
    """메시지에서 텍스트 추출 (리스트/딕셔너리 처리)"""
    text = msg.get('text', '')
    if isinstance(text, list):
        parts = []
        for item in text:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                parts.append(item.get('text', ''))
        return ' '.join(parts)
    return str(text) if text else ''

def analyze_sentiment(text):
    """감정 분석"""
    text_lower = text.lower()
    pos = sum(1 for w in SENTIMENT_WORDS['positive'] if w in text_lower)
    neg = sum(1 for w in SENTIMENT_WORDS['negative'] if w in text_lower)
    if pos > neg:
        return 'positive'
    elif neg > pos:
        return 'negative'
    return 'neutral'

def count_keywords(text, category):
    """특정 카테고리 키워드 카운트"""
    keywords = MARKETING_KEYWORDS.get(category, [])
    return sum(1 for kw in keywords if kw in text)

def analyze_chat(chat):
    """개별 채팅 분석"""
    chat_name = chat.get('name', 'Unknown')
    chat_type = chat.get('type', 'unknown')
    messages = chat.get('messages', [])
    
    results = {
        'chat_name': chat_name,
        'chat_type': chat_type,
        'total_messages': len(messages),
        'my_messages': 0,
        'their_messages': 0,
        'sentiment_positive': 0,
        'sentiment_negative': 0,
        'sentiment_neutral': 0,
    }
    
    # 키워드 카운트 초기화
    for category in MARKETING_KEYWORDS:
        results[f'kw_{category}'] = 0
    
    message_texts = []
    
    for msg in messages:
        text = extract_text_from_message(msg)
        if not text.strip():
            continue
            
        message_texts.append(text)
        
        # 발신자 분류 (지민이공식 = 마케터)
        from_name = msg.get('from', '') or ''
        if '지민' in from_name or from_name == '지민이공식':
            results['my_messages'] += 1
        else:
            results['their_messages'] += 1
        
        # 감정 분석
        sentiment = analyze_sentiment(text)
        results[f'sentiment_{sentiment}'] += 1
        
        # 키워드 분석
        for category in MARKETING_KEYWORDS:
            results[f'kw_{category}'] += count_keywords(text, category)
    
    results['all_text'] = ' | '.join(message_texts[:10])  # 샘플 텍스트
    return results

def analyze_telegram_export(json_path: str, output_dir: str):
    """텔레그램 익스포트 전체 분석"""
    print(f"📊 텔레그램 마케팅 분석 시작: {json_path}")
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    chats = data.get('chats', {}).get('list', [])
    print(f"📁 총 채팅 수: {len(chats)}")
    
    # 모든 채팅 분석
    all_results = []
    all_messages = []
    
    for chat in chats:
        result = analyze_chat(chat)
        all_results.append(result)
        
        # 개별 메시지도 저장
        for msg in chat.get('messages', []):
            text = extract_text_from_message(msg)
            if text.strip():
                all_messages.append({
                    'chat_name': chat.get('name', 'Unknown'),
                    'from': msg.get('from', 'Unknown'),
                    'date': msg.get('date', ''),
                    'text': text,
                    'sentiment': analyze_sentiment(text),
                    'kw_loss_aversion': count_keywords(text, 'loss_aversion'),
                    'kw_social_proof': count_keywords(text, 'social_proof'),
                    'kw_referral': count_keywords(text, 'referral'),
                    'kw_incentive': count_keywords(text, 'incentive'),
                    'kw_welcome': count_keywords(text, 'welcome'),
                    'kw_cta': count_keywords(text, 'cta'),
                    'kw_value_prop': count_keywords(text, 'value_prop'),
                })
    
    # DataFrame 생성
    df_chats = pd.DataFrame(all_results)
    df_messages = pd.DataFrame(all_messages)
    
    # 결과 저장
    os.makedirs(output_dir, exist_ok=True)
    
    chat_csv = os.path.join(output_dir, 'chat_analysis.csv')
    msg_csv = os.path.join(output_dir, 'message_analysis.csv')
    summary_csv = os.path.join(output_dir, 'marketing_summary.csv')
    
    df_chats.to_csv(chat_csv, index=False, encoding='utf-8-sig')
    df_messages.to_csv(msg_csv, index=False, encoding='utf-8-sig')
    
    print(f"✅ 채팅 분석 저장: {chat_csv}")
    print(f"✅ 메시지 분석 저장: {msg_csv}")
    
    # 요약 통계
    summary = generate_summary(df_chats, df_messages)
    summary.to_csv(summary_csv, index=False, encoding='utf-8-sig')
    print(f"✅ 요약 저장: {summary_csv}")
    
    # 콘솔 출력
    print_summary(df_chats, df_messages)
    
    return df_chats, df_messages

def generate_summary(df_chats, df_messages):
    """마케팅 분석 요약 생성"""
    summary_data = []
    
    # 전체 통계
    total_chats = len(df_chats)
    total_messages = len(df_messages)
    
    summary_data.append({'metric': '총 채팅 수', 'value': total_chats})
    summary_data.append({'metric': '총 메시지 수', 'value': total_messages})
    
    # 감정 분석
    sentiment_counts = df_messages['sentiment'].value_counts()
    for s in ['positive', 'negative', 'neutral']:
        count = sentiment_counts.get(s, 0)
        pct = (count / total_messages * 100) if total_messages > 0 else 0
        summary_data.append({'metric': f'감정_{s}', 'value': count, 'percentage': f'{pct:.1f}%'})
    
    # 키워드 분석
    kw_cols = [c for c in df_messages.columns if c.startswith('kw_')]
    for col in kw_cols:
        total = df_messages[col].sum()
        avg = df_messages[col].mean()
        summary_data.append({
            'metric': col.replace('kw_', '키워드_'),
            'value': total,
            'avg_per_msg': f'{avg:.3f}'
        })
    
    return pd.DataFrame(summary_data)

def print_summary(df_chats, df_messages):
    """요약 출력"""
    print("\n" + "="*60)
    print("📈 마케팅 분석 요약")
    print("="*60)
    
    total_messages = len(df_messages)
    print(f"총 채팅: {len(df_chats)}개")
    print(f"총 메시지: {total_messages}개")
    
    # 감정 분석
    print("\n📊 감정 분석:")
    sentiment_counts = df_messages['sentiment'].value_counts()
    for s in ['positive', 'negative', 'neutral']:
        count = sentiment_counts.get(s, 0)
        pct = (count / total_messages * 100) if total_messages > 0 else 0
        print(f"  - {s}: {count}개 ({pct:.1f}%)")
    
    # 키워드 분석
    print("\n🔑 마케팅 키워드 사용 빈도:")
    kw_cols = [c for c in df_messages.columns if c.startswith('kw_')]
    kw_totals = [(col, df_messages[col].sum()) for col in kw_cols]
    kw_totals.sort(key=lambda x: x[1], reverse=True)
    for col, total in kw_totals:
        name = col.replace('kw_', '')
        avg = total / total_messages if total_messages > 0 else 0
        print(f"  - {name}: {total}회 (메시지당 평균 {avg:.3f})")
    
    # 마케팅 실패 진단
    print("\n⚠️ 마케팅 실패 진단:")
    
    loss_aversion_rate = df_messages['kw_loss_aversion'].sum() / total_messages if total_messages > 0 else 0
    social_proof_rate = df_messages['kw_social_proof'].sum() / total_messages if total_messages > 0 else 0
    referral_rate = df_messages['kw_referral'].sum() / total_messages if total_messages > 0 else 0
    
    if loss_aversion_rate < 0.05:
        print(f"  ❌ 손실 회피 심리 미적용 ({loss_aversion_rate:.1%})")
    if social_proof_rate < 0.05:
        print(f"  ❌ 사회적 증거 부족 ({social_proof_rate:.1%})")
    if referral_rate < 0.03:
        print(f"  ❌ 리퍼럴/추천 프로그램 미활용 ({referral_rate:.1%})")
    
    # 개선 권장사항
    print("\n💡 개선 권장사항:")
    print("  1. 손실 회피: '지금 참여 안 하면 혜택을 놓칠 수 있어요' 메시지 추가")
    print("  2. 사회적 증거: '현재 N명이 참여 중' 메시지 삽입")
    print("  3. 리퍼럴: 친구 추천 시 보너스 제공 프로그램 도입")
    print("  4. 긴급성: '오늘만 특별 혜택' 등 시간 제한 메시지 활용")
    print("="*60)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="텔레그램 마케팅 분석")
    parser.add_argument("--input", default=r"C:\Users\JAVIS\Documents\DataExport_2025-12-10\result.json", help="JSON 파일 경로")
    parser.add_argument("--output", default=r"C:\Users\JAVIS\ch\ch25\marketing_analysis_results", help="출력 디렉토리")
    args = parser.parse_args()
    
    analyze_telegram_export(args.input, args.output)
