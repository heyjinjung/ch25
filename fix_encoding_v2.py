import os

def fix_file(path, replacements):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {path}")

# UserListPage.tsx
fix_file(r'c:\Users\JAVIS\ch\ch25\src\v2\admin\pages\users\UserListPage.tsx', [
    ('?원 관?', '회원 관리'),
    ('?{total.toLocaleString()}명의 ?원??관리하??세 ?보? 조회?니??', '총 {total.toLocaleString()}명의 회원을 관리하고 상세 정보를 조회합니다.'),
    ('?원 ?록', '회원 등록'),
    ('?네?? CC_id, telegram_id, telegram_username 검??..', '닉네임, CC ID, Telegram ID, Telegram Username 검색...'),
    ('?터', '필터'),
    ('?태', '상태'),
    ('?체', '전체'),
    ('?벨 범위', '레벨 범위'),
    ('?터 초기??', '필터 초기화'),
    ('?택', '선택'),
    ('?레그램 ID', '텔레그램 ID'),
    ('?벨', '레벨'),
    ('금고 ?액', '금고 잔액'),
    ('최근 ?속??', '최근 접속일'),
    ('관?', '관리')
])

# ModalControlPage.tsx
fix_file(r'c:\Users\JAVIS\ch\ch25\src\v2\admin\pages\game\ModalControlPage.tsx', [
    ('?어', '제어'),
    ('?체 모달???출 ????어?니?? OFF ???당 모달? ?전??차단?니??', '전체 모달의 노출 여부를 제어합니다. OFF 시 해당 모달은 완전히 차단됩니다.'),
    ('?로고침', '새로고침'),
    ('미리보기 ?기', '미리보기 닫기'),
    ('?제 ?용?에??시?는 모달??미리보기?니??', '실제 서비스에서 표시되는 모달의 미리보기입니다.'),
    ('변경사?? ??되지 ?았?니??', '변경사항이 저장되지 않았습니다.')
])

# V2WithdrawalGuideModal.tsx
fix_file(r'c:\Users\JAVIS\ch\ch25\src\v2\components\vault\V2WithdrawalGuideModal.tsx', [
    ('?비???내', '준비 안내'),
    ('금고 ?액???전?게 출금?기 ?해', '금고 잔액을 안전하게 출금하기 위해'),
    ('?음??조건??먼? ?성??주세??', '다음의 조건을 먼저 달성해 주세요.')
])
