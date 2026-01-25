import os

def fix_by_lines(path, replacements):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    for line_num, new_text in replacements.items():
        # line_num is 1-indexed
        if line_num <= len(lines):
            # Preserve indentation if possible
            old_line = lines[line_num-1]
            indent = old_line[:len(old_line) - len(old_line.lstrip())]
            lines[line_num-1] = indent + new_text + '\n'
    
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Fixed {path} by lines")

# UserListPage.tsx
fix_by_lines(r'c:\Users\JAVIS\ch\ch25\src\v2\admin\pages\users\UserListPage.tsx', {
    174: '회원 관리',
    177: '총 {total.toLocaleString()}명의 회원을 관리하고 상세 정보를 조회합니다.',
    185: '회원 등록',
    194: '            placeholder="닉네임, CC ID, Telegram ID, Telegram Username 검색..."',
    209: '필터',
    220: '<label className="text-sm text-zinc-400 mb-2 block">상태</label>',
    223: '<SelectValue placeholder="전체" />',
    235: '레벨 범위',
    265: '필터 초기화',
    275: '{selectedUserIds.length}개 선택',
    291: '차단',
    319: '<TableHead className="text-zinc-400">텔레그램 ID</TableHead>',
    325: '레벨',
    334: '금고 잔액',
    343: '최근 접속일',
    348: '관리',
    401: '관리',
    414: '          {(page - 1) * limit + 1}~{Math.min(page * limit, total)} / 총 {total}',
    415: '          명'
})

# ModalControlPage.tsx
fix_by_lines(r'c:\Users\JAVIS\ch\ch25\src\v2\admin\pages\game\ModalControlPage.tsx', {
    157: '모달 제어 (Modal Control)',
    160: '전체 모달의 노출 여부를 제어합니다. OFF 시 해당 모달은 완전히 차단됩니다.',
    170: '새로고침',
    178: '{showPreview ? "미리보기 닫기" : "모달 미리보기"}',
    254: '실제 서비스에서 표시되는 모달의 미리보기입니다.',
    279: '변경사항이 저장되지 않았습니다.'
})

# V2WithdrawalGuideModal.tsx
fix_by_lines(r'c:\Users\JAVIS\ch\ch25\src\v2\components\vault\V2WithdrawalGuideModal.tsx', {
    57: '출금 준비 안내',
    60: '금고 잔액을 안전하게 출금하기 위해',
    62: '다음의 조건을 먼저 달성해 주세요.'
})
