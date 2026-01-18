import re
from datetime import datetime
from collections import defaultdict

# ==========================================
# 1. 설정 (Thresholds)
# ==========================================
CONFIG = {
    "TILT_LOSS_STREAK": 5,      # 5연패 이상이면 틸팅 의심
    "SLOT_RTP_WINDOW": 10,      # 슬롯은 10판 단위로 묶어서 분석
    "SLOT_LOW_RTP": 0.5,        # 10판 돌렸는데 환급률이 50% 미만이면 위험
    "BAILOUT_BALANCE": 5000     # (가정) 잔액 추정치가 이 이하면 구제 필요
}

# ==========================================
# 2. 파서 로직 (Parser Logic)
# ==========================================
class RetentionLogParser:
    def __init__(self):
        self.users = defaultdict(lambda: {
            "loss_streak": 0,
            "total_bet": 0,
            "total_win": 0,
            "history": []
        })

    def parse_text_data(self, raw_text):
        """
        웹페이지에서 긁어온 텍스트를 줄 단위로 파싱합니다.
        지원 포맷:
        1. 에볼루션/스포츠 포맷 (번호, 이름, 닉네임, 타입...) 
        2. 슬롯 포맷 (번호, 이름, 닉네임, 타입...)
        """
        lines = raw_text.strip().split('\n')
        processed_count = 0
        
        for line in lines:
            line = line.strip()
            if not line or "번호" in line: continue # 헤더 skip

            # 탭이나 공백으로 분리
            parts = re.split(r'\t|\s{2,}', line)
            
            # 데이터 정제 (금액에서 '원', ',' 제거)
            try:
                # 공통 필드 매핑 시도 (대략적인 위치 추정)
                # 닉네임 찾기 (괄호 안 아이디 제외)
                # 데이터 포맷이 다양하므로, 키워드 기반으로 데이터 추출
                
                # 금액 추출 (숫자 + "원" 패턴)
                amounts = [int(x.replace(',','').replace('원','')) for x in re.findall(r'([\d,]+) 원', line)]
                
                if len(amounts) >= 2:
                    # [베팅금, 당첨금] 순서라고 가정 (보통 베팅이 먼저 나옴, 하지만 '결과' 행은 당첨금만 있을 수 있음)
                    # 입력 데이터 특성상 '베팅' 행과 '결과' 행이 분리되어 있거나, 한 줄에 다 있는 경우가 있음.
                    # 여기서는 제공해주신 "슬롯 데이터" (한 줄에 다 있지 않고 베팅/결과가 분리됨)에 맞춤
                    
                    tokens = line.split()
                    nickname = tokens[1] # 대략 2번째가 이름/닉네임
                    action_type = "결과" if "결과" in line else "베팅"
                    
                    # 베팅/결과 행 처리
                    amount = amounts[0]
                    
                    self._update_user_state(nickname, action_type, amount)
                    processed_count += 1
                    
            except Exception as e:
                # 파싱 에러는 무시하고 진행
                continue
                
        return processed_count

    def _update_user_state(self, nickname, action_type, amount):
        user = self.users[nickname]
        
        if action_type == "베팅":
            user['current_bet'] = amount # 홀딩
            user['total_bet'] += amount
            user['history'].append('L') # 일단 패배로 가정 (결과 오면 수정)
            
        elif action_type == "결과":
            win_amount = amount
            user['total_win'] += win_amount
            
            # 직전 기록 수정
            if user['history']:
                if win_amount > 0:
                    user['history'][-1] = 'W'
                    user['loss_streak'] = 0
                else:
                    user['loss_streak'] += 1
            
            # 1. 틸팅 감지 (연패)
            if user['loss_streak'] >= CONFIG["TILT_LOSS_STREAK"]:
                print(f"🚨 [경고] {nickname}님 {user['loss_streak']}연패 중! (멘탈 케어 필요)")

            # 2. 슬롯 그라인더 감지 (최근 10판 RTP 확인)
            if len(user['history']) >= CONFIG["SLOT_RTP_WINDOW"]:
                recent_history = user['history'][-CONFIG["SLOT_RTP_WINDOW"]:]
                # 단순히 승패만으론 RTP 계산 어려우니, 여기선 승리 횟수로 약식 체크
                win_count = recent_history.count('W')
                if win_count < 2: # 10판 중 2판 미만 승리
                     print(f"⚠️ [주의] {nickname}님 최근 10판 중 {win_count}승.. (재미 반감 주의)")

# ==========================================
# 3. 실행 예시 (Run)
# ==========================================
if __name__ == "__main__":
    # 유저가 제공한 샘플 데이터 (슬롯)
    raw_data = """
    9690	오동수(dongccuu3152)	동추	결과	2026/01/17 15:37:58	부운고	0 원  
    9689	오동수(dongccuu3152)	동추	베팅	2026/01/17 15:37:58	부운고	1,000 원  
    9688	오동수(dongccuu3152)	동추	결과	2026/01/17 15:37:54	부운고	0 원  
    9687	오동수(dongccuu3152)	동추	베팅	2026/01/17 15:37:54	부운고	1,000 원  
    9686	오동수(dongccuu3152)	동추	결과	2026/01/17 15:37:51	부운고	0 원  
    9685	오동수(dongccuu3152)	동추	베팅	2026/01/17 15:37:51	부운고	1,000 원  
    9684	오동수(dongccuu3152)	동추	결과	2026/01/17 15:37:50	부운고	0 원  
    9683	오동수(dongccuu3152)	동추	베팅	2026/01/17 15:37:50	부운고	1,000 원  
    """
    
    print(">>> 로그 분석 시작...")
    parser = RetentionLogParser()
    parser.parse_text_data(raw_data)
    print(">>> 분석 완료.")
