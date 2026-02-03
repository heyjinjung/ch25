#!/usr/bin/env python3
"""운영서버에서 Prospect 매칭 테스트용 스크립트."""
import re
from difflib import SequenceMatcher

def normalize_nickname(nickname: str) -> str:
    """닉네임 정규화 (소문자, 숫자/특수문자 제거)."""
    if not nickname:
        return ""
    normalized = nickname.lower()
    normalized = re.sub(r'[^a-z가-힣]', '', normalized)
    return normalized

def calculate_similarity(str1: str, str2: str) -> float:
    if not str1 or not str2:
        return 0.0
    return SequenceMatcher(None, str1, str2).ratio()

# HQProspectiveUser 닉네임들
hq_nicknames = ['영하19도', '내가왔다', '배곧재우', '힙합중', '룰렛왕', '고고천사', '비엠따블유', '거누핑', '아그네스', '초보베터', '케바케', '기므또', '공공이', 'ppoodd', '일등당첨', '민보이', '김민저이', '마이럽', '키미2', '성주니야', '진심펀치', '오냄새', '찬스올인', '달려링', '미소1031', '알레리노', '허거덩', '해조다요', '도라희', '유유이', '바카라신', '나참동', '물렁콩', '춘식익', '휴식시간', '걸리면다이', '키네', '참새참새', '고구마파이', '파즐리', '킴대리임', '기프트', '후두암', '민아가자', '다따보자', '남상헌 (tkd**)', '지수꺼', '빡빡이', '접시접시', '상욘이당당']

# V2User 닉네임들
v2_nicknames = ['Admin', 'jm9567', '참새참새', '까리한별', '민똘이']

print("=== 정규화 테스트 ===")
for nick in ['민똘이', '참새참새', '민보이']:
    print(f"  {nick} -> {normalize_nickname(nick)}")

print("\n=== V2User '민똘이'와 HQ 유사도 ===")
v2_nick = '민똘이'
v2_norm = normalize_nickname(v2_nick)
for hq in hq_nicknames:
    hq_norm = normalize_nickname(hq)
    sim1 = calculate_similarity(v2_norm, hq_norm)
    sim2 = calculate_similarity(v2_nick.lower(), hq.lower())
    max_sim = max(sim1, sim2)
    if max_sim >= 0.5:
        print(f"  HQ '{hq}' -> sim={max_sim:.2f} (norm: {hq_norm})")

print("\n=== V2User '참새참새'와 HQ 유사도 ===")
v2_nick2 = '참새참새'
v2_norm2 = normalize_nickname(v2_nick2)
for hq in hq_nicknames:
    hq_norm = normalize_nickname(hq)
    sim1 = calculate_similarity(v2_norm2, hq_norm)
    sim2 = calculate_similarity(v2_nick2.lower(), hq.lower())
    max_sim = max(sim1, sim2)
    if max_sim >= 0.5:
        print(f"  HQ '{hq}' -> sim={max_sim:.2f} (norm: {hq_norm})")

print("\n=== 핵심 비교: 민똘이 vs 민보이 ===")
n1 = normalize_nickname('민똘이')
n2 = normalize_nickname('민보이')
print(f"  민똘이 normalized: '{n1}'")
print(f"  민보이 normalized: '{n2}'")
print(f"  유사도: {calculate_similarity(n1, n2):.2f}")

print("\n=== 핵심 비교: 참새참새 (V2) vs 참새참새 (HQ) ===")
# HQ에 '참새참새'가 있는지 확인
if '참새참새' in hq_nicknames:
    print("  HQ에 '참새참새' 존재함!")
    n1 = normalize_nickname('참새참새')
    n2 = normalize_nickname('참새참새')
    print(f"  유사도: {calculate_similarity(n1, n2):.2f} (100% 일치해야 함)")
else:
    print("  HQ에 '참새참새' 없음")
