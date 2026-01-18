import json
import os
import re
import csv
from datetime import datetime

def analyze_retention_flow(json_path: str, output_csv: str):
    print(f"📂 Loading JSON: {json_path}...")
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Identify Admin (Me) - Robust Logic
    chats_list = data.get('chats', {}).get('list', [])
    my_id_marker = "user_unknown"
    user_id = data.get('personal_information', {}).get('user_id')
    if not user_id:
        for c in chats_list:
            if c.get('type') == 'saved_messages':
                user_id = c.get('id')
                break
    if user_id: my_id_marker = f"user{user_id}"
    print(f"😎 Admin ID identified as: {my_id_marker}")

    # 2. Analysis Container
    retention_log = []

    print("🧠 Analyzing Conversation Flow & Drop-offs...")

    for chat in chats_list:
        if chat.get('type') != 'personal_chat': continue
        
        # Metadata
        chat_id = chat.get('id', '')
        chat_name = chat.get('name', 'Unknown')
        messages = chat.get('messages', [])
        
        if not messages: continue

        # --- FLow Analysis Variables ---
        last_msg_time = None
        last_sender = "Unknown"
        last_text = ""
        
        user_msg_count = 0
        admin_msg_count = 0
        
        # Interaction History
        interaction_gaps = []
        last_timestamp = None

        conversation_snippet = []

        for msg in messages:
            if msg.get('type') != 'message': continue
            
            # Timestamp parsing
            ts_str = msg.get('date')
            ts = datetime.fromisoformat(ts_str)
            last_msg_time = ts
            
            # Content Parsing
            raw_text = msg.get('text', '')
            if isinstance(raw_text, list):
                raw_text = "".join([t['text'] if isinstance(t, dict) else str(t) for t in raw_text])
            text_str = str(raw_text)
            last_text = text_str
            
            # Sender Identification
            from_id = msg.get('from_id', '')
            # Strict Admin Check
            is_admin = (from_id == my_id_marker)
            # Fallback for old/weird exports where from_id is missing but 'out' is true
            if not is_admin and msg.get('out') is True: is_admin = True

            sender = "ADMIN" if is_admin else "USER"
            last_sender = sender
            
            if is_admin: admin_msg_count += 1
            else: user_msg_count += 1

            conversation_snippet.append(f"[{sender}] {text_str}")

        # --- 🧠 Expert Retention Marketing Analysis ---
        
        # --- 🧠 Expert Retention Marketing Analysis (Psychographic Upgrade) ---

        # 0. Time Validation (Restored)
        if not last_msg_time: continue
        now = datetime.now()
        hours_since = (now - last_msg_time).total_seconds() / 3600
        days_since = hours_since / 24
        
        # 1. Detect Exit Context
        user_msgs_list = [m for m in messages if not (m.get('from_id') == my_id_marker or (msg.get('out') is True))]
        user_text_blob = " ".join([m.get('text', '') if isinstance(m.get('text'), str) else "" for m in user_msgs_list])
        recent_blob = " ".join([m.get('text', '') if isinstance(m.get('text'), str) else "" for m in user_msgs_list[-5:]]) # Look at last 5 for exit context
        
        exit_context = "Natural Fade (자연 소멸)"
        if re.search(r"오링|죽겠|망했|다 잃|재입|살려|거지|없어|힘들", recent_blob):
            exit_context = "😖 LOSS_PAIN (손실 고통)"
        elif re.search(r"출금|환전|감사|ㅅㅅ|치킨|벌었|이득|수익|나이스", recent_blob):
            exit_context = "🤑 WIN_SATISFACTION (익절/만족)"
        elif re.search(r"오류|안돼|왜|느려|팅김|접속|점검|버그", recent_blob):
            exit_context = "😡 TECH_FRICTION (기능 불편)"
        elif re.search(r"얼마|코드|쿠폰|이벤트|체험|가입", recent_blob):
            exit_context = "🧐 SHOPPING (간보기/쇼핑)"

        # 2. Psychographic Profiling (Advanced Persona)
        
        # --- MULTI-DIMENSIONAL PROFILING (3-Layer Analysis) ---
        
        # 1. Core Persona (Gambling Style)
        persona_score = {"WHALE":0, "GRINDER":0, "GAMBLER":0, "BULLY":0, "CHATTER":0}
        if re.search(r"천만|장|보내|처리|바로|최대|VIP", user_text_blob): persona_score["WHALE"] += 3
        if re.search(r"포인트|짜투리|천원|만원|치킨|국밥|소액|입플", user_text_blob): persona_score["GRINDER"] += 2
        if re.search(r"올인|맥스|박아|죽네|가자|한강|복구", user_text_blob): persona_score["GAMBLER"] += 3
        if re.search(r"알아서|빨리|새끼|확인해라|장난하냐|형|마", user_text_blob): persona_score["BULLY"] += 2
        if user_msg_count > 30 and len(user_text_blob) > 500: persona_score["CHATTER"] += 2
        
        core_persona = max(persona_score, key=persona_score.get)
        if persona_score[core_persona] == 0: core_persona = "NORMAL"

        # 2. Demographic Tone (Age/Culture)
        age_tone = "UNCLE" # Default (3050 Worker)
        if re.search(r"ㅋㅋ|ㅇㅇ|존나|개|꿀|각|누나|형", user_text_blob): age_tone = "MZ"
        if re.search(r"형님|사장님|실장님|수고|고생|퇴근", user_text_blob): age_tone = "UNCLE" 
        if re.search(r"\.\.|요망|하게|자네|..|감사", user_text_blob) and "형" not in user_text_blob: age_tone = "SENIOR"

        # 3. Cognitive Trigger (MBTI)
        t_score = len(re.findall(r"얼마|프로|배당|규정|롤링|시간|입금|출금", user_text_blob))
        f_score = len(re.findall(r"형님|감사|축하|대박|사랑|죄송|ㅠㅠ|ㅋㅋ|화이팅", user_text_blob))
        mbti_type = "T" if t_score >= f_score else "F"

        # 4. Golden Time Analysis (Active Hours)
        active_hours = []
        for m in user_msgs_list:
            if m.get('date'):
                 try:
                    dt = datetime.fromisoformat(m.get('date'))
                    active_hours.append(dt.hour)
                 except: pass
        
        best_send_time = "Random"
        if active_hours:
            from collections import Counter
            hour_counts = Counter(active_hours)
            peak_hour = hour_counts.most_common(1)[0][0]
            
            if 0 <= peak_hour < 6: best_send_time = f"새벽반 ({peak_hour}시)"
            elif 6 <= peak_hour < 12: best_send_time = f"아침반 ({peak_hour}시)"
            elif 12 <= peak_hour < 18: best_send_time = f"오후반 ({peak_hour}시)"
            elif 18 <= peak_hour < 24: best_send_time = f"저녁반 ({peak_hour}시)"

        # 5. Wallet Size Estimate (Economic Capability)
        wallet_size = "Medium"
        if re.search(r"대출|빌려|빚|학생|알바|급여|월급", user_text_blob):
            wallet_size = "Low (서민)"
        if re.search(r"사업|골프|차|부동산|천만|억|회장", user_text_blob):
            wallet_size = "High (부유층)"
        if core_persona == "WHALE":
            wallet_size = "VIP (최상위)"
            user_dna = f"{core_persona} | {age_tone} | {mbti_type} | {wallet_size}"

        # 6. Sentiment Score (simple positive/negative heuristic)
        pos_keywords = r"감사|축하|대박|행복|좋아|고마|감동|👍|😊"
        neg_keywords = r"화|짜증|불만|실망|힘들|고통|ㅠㅠ|ㅈㄹ|노답|😞|👎"
        pos_cnt = len(re.findall(pos_keywords, user_text_blob))
        neg_cnt = len(re.findall(neg_keywords, user_text_blob))
        sentiment_score = (pos_cnt - neg_cnt) / max(1, (pos_cnt + neg_cnt))  # -1..1

        # 7. Interest Tags (detect marketing interest keywords)
        interest_map = {
            "투자": "Invest",
            "배당": "Dividend",
            "골프": "Golf",
            "부동산": "RealEstate",
            "차": "Car",
            "게임": "Game",
            "쇼핑": "Shopping",
            "쿠폰": "Coupon",
            "이벤트": "Event"
        }
        interest_tags = []
        for kw, tag in interest_map.items():
            if re.search(kw, user_text_blob):
                interest_tags.append(tag)
        interest_tags_str = ",".join(interest_tags) if interest_tags else "None"

        # 8. Complaint Tracking (last complaint snippet)
        complaint_keywords = r"불편|버그|오류|느려|안돼|왜|문제|불만|고장"
        complaint_snippets = []
        for m in user_msgs_list:
            txt = m.get('text', '')
            if isinstance(txt, list):
                txt = "".join([t['text'] if isinstance(t, dict) else str(t) for t in txt])
            if re.search(complaint_keywords, txt):
                complaint_snippets.append(txt)
        last_complaint = complaint_snippets[-1] if complaint_snippets else ""

        # 9. Risk Score (combine multiple signals)
        # Ensure display_status is defined before risk calculation
        display_status = exit_context
        risk_score = 0
        # urgency based on status
        if display_status.startswith("🚨"):
            risk_score += 30
        elif display_status.startswith("⚠️"):
            risk_score += 20
        # sentiment
        if sentiment_score < -0.3:
            risk_score += 20
        # wallet size
        if wallet_size.startswith("Low"):
            risk_score += 15
        elif wallet_size.startswith("High") or wallet_size.startswith("VIP"):
            risk_score += 5
        # exit context severity
        if "LOSS_PAIN" in exit_context:
            risk_score += 25
        elif "TECH_FRICTION" in exit_context:
            risk_score += 15
        # cap at 100
        risk_score = min(100, risk_score)

        # 10. Promo Code Mapping (based on DNA profile)
        promo_map = {
            "WHALE | UNCLE | T | VIP (최상위)": "VIP-1000",
            "GAMBLER | MZ | T": "BOOST-500",
            "GRINDER | MZ | F": "CHICKEN-200",
            "BULLY | UNCLE | F": "RESPECT-300",
            "CHATTER | MZ | F": "CHAT-100",
            "NORMAL | UNCLE | T": "STANDARD-50"
        }
        promo_code = promo_map.get(user_dna, "GENERIC")

        # --- DYNAMIC STRATEGY ASSEMBLY ---
        # Strategy = [Tone] + [Hook based on Persona] + [Closer based on MBTI]
        
        # A. Select Hook (Persona)
        hook_map = {
            "WHALE": "회장님, 기다리시는 VIP 전용 루트 열어뒀습니다.",
            "GRINDER": "지금 딱 치킨값 2만원 벌 수 있는 기회입니다.",
            "GAMBLER": "오늘 잭팟 확률 300% 터지는 날입니다.",
            "BULLY": "형님 아니면 이 혜택 아무나 안 드립니다.",
            "CHATTER": "요즘 별일 없으시죠? 심심하실까봐 연락드렸습니다.",
            "NORMAL": "고객님만을 위한 스페셜 혜택 도착했습니다."
        }
        base_hook = hook_map.get(core_persona, hook_map["NORMAL"])

        # B. Apply Tone (Age)
        final_msg = base_hook # Default
        
        if age_tone == "MZ":
            # Convert to casual/fast slang
            if core_persona == "GAMBLER": final_msg = "형, 오늘 터지는 날임. 잭팟 3배 각이다 ㄱㄱ"
            elif core_persona == "GRINDER": final_msg = "지금 접속하면 치킨값 꽁으로 줌. 선착순 ㄱ"
            else: final_msg = f"{base_hook.replace('습니다', '요').replace('입니다', '예요')} (핵이득)"
            
        elif age_tone == "SENIOR":
            # Convert to super polite
            final_msg = f"어르신, {base_hook.replace('습니다', ' 올렸습니다').replace('입니다', '입니다')}"

        # C. Apply MBTI Closer (Proof vs Emotion)
        closer = ""
        if mbti_type == "T":
            closer = "(현재 승률 98%, 즉시 환전 가능)"
        else:
            if core_persona == "BULLY": closer = "(제가 형님만 특별히 챙겨 넣었습니다)"
            else: closer = "(항상 저희 이용해주셔서 감사합니다 형님!)"

        full_strategy = f"{final_msg} {closer}"

        # Override Strategy based on Exit Context (Context > Persona) -> But keeping Tone
        if "LOSS_PAIN" in exit_context:
            if mbti_type == "F": full_strategy = "형님.. 많이 속상하셨죠. 제가 복구 지원금 좀 챙겼습니다. 힘내십쇼!"
            else: full_strategy = "손실 복구 지원금 지급되었습니다. 현재 구간 승률 좋습니다."
        elif "TECH_FRICTION" in exit_context:
            full_strategy = "불편 드려 죄송합니다. 점검 보상금 지급 + 서버 최적화 완료되었습니다."

        # User DNA Label
        user_dna = f"{core_persona} | {age_tone} | {mbti_type} | {wallet_size}"
        
        # Priority Calculation
        priority = 99
        display_status = exit_context

        if last_sender == "USER":
            if hours_since > 24:
                display_status = "🚨 CS FAILED (방치됨)"
                priority = 1
            else:
                display_status = "⚠️ WAITING (대기중)"
                priority = 2
        elif last_sender == "ADMIN":
            if days_since > 30:
                display_status = "💀 GHOST (장기이탈)"
            elif days_since > 3:
                display_status = f"💤 SLEEPING"
                priority = 3
            else:
                display_status = "✅ PENDING"
                priority = 6

        # Filter out purely administrative/empty chats
        if user_msg_count == 0 and admin_msg_count == 0: continue

        # Summary Generation
        last_3_msgs = " | ".join(conversation_snippet[-3:])
        
        retention_log.append({
            "Priority": priority,
            "User Name": chat_name,
            "DNA Profile": user_dna,
            "Best Send Time": best_send_time, # New Column
            "Wallet": wallet_size, # New Column
            "Status": display_status,
            "Targeted Action": full_strategy, 
            "Gap": f"{days_since:.1f}d",
            "Sentiment": f"{sentiment_score:.2f}",
            "Interest Tags": interest_tags_str,
            "Last Complaint": last_complaint,
            "Risk Score": risk_score,
            "Promo Code": promo_code,
            "Last Context": last_3_msgs[:150]
        })
    
    # Sort by Priority (Urgent first)
    retention_log.sort(key=lambda x: x["Priority"])

    # Write CSV
    with open(output_csv, 'w', encoding='utf-8-sig', newline='') as f:
        fieldnames = ["Priority", "Status", "DNA Profile", "Best Send Time", "Wallet", "Sentiment", "Interest Tags", "Last Complaint", "Risk Score", "Promo Code", "Targeted Action", "User Name", "Gap", "Last Context"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(retention_log)

    print(f"✅ Retention Flow Analysis Complete!")
    print(f"📄 Report Saved: {output_csv}")
    print(f"📊 Total Chats Analyzed: {len(retention_log)}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=str, default="docs/06_ops/202601/response_templates/result.json")
    parser.add_argument("--output", type=str, default="docs/06_ops/202601/response_templates/retention_risk_report.csv")
    args = parser.parse_args()
    
    analyze_retention_flow(args.input, args.output)
