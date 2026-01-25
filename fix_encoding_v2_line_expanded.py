import os

def fix_by_lines(path, replacements):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    for line_num, new_text in replacements.items():
        if line_num <= len(lines):
            old_line = lines[line_num-1]
            indent = old_line[:len(old_line) - len(old_line.lstrip())]
            lines[line_num-1] = indent + new_text + '\n'
    
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Fixed {path} by lines")

# TicketInventoryPage.tsx
fix_by_lines(r'c:\Users\JAVIS\ch\ch25\src\v2\admin\pages\economy\TicketInventoryPage.tsx', {
    114: '  const [reason, setReason] = useState("이벤트 보상");',
    183: '        alert("해당 닉네임의 유저를 찾을 수 없습니다.");',
    188: '      alert("유저 검색 중 오류가 발생했습니다.");',
    206: '        setTargetUserNickname("유저를 찾을 수 없음");',
    209: '      setTargetUserNickname("검색 오류");',
    326: '    setReason("이벤트 보상");',
    348: '            티켓/인벤토리 관리(Inventory Ops)',
    351: '            유저 아이템 지급/회수 로그를 관리하고 보상을 지급합니다.',
    491: '              사용자가 소모한 건수',
    544: '          조회하기',
    566: '            아이템 로그 목록 (Inventory Logs)',
    573: '                <TableHead className="w-[180px]">시간</TableHead>',
    574: '                <TableHead>유저 ID</TableHead>',
    577: '                <TableHead>수량</TableHead>',
    578: '                <TableHead>잔액 (After)</TableHead>',
    579: '                <TableHead className="max-w-[300px]">사유</TableHead>',
    580: '                <TableHead className="text-right">액션</TableHead>',
    589: '                      로그를 불러오는 중입니다...',
    598: '                      검색된 로그가 없습니다.',
    674: '                            관리 액션',
    678: '                            수정 (Edit)',
    686: '                            삭제 (Delete)',
    705: '              새 아이템 보상 지급',
    708: '                유저에게 티켓이나 아이템을 수동으로 지급합니다. 지급 즉시',
    715: '                지급 대상(User ID)',
    720: '                  placeholder="유저 ID 입력"',
    736: '                  <span className="underline">{targetUserNickname}</span> 유저',
    742: '                <Label className="text-zinc-400">종류 (Type)</Label>',
    757: '                <Label className="text-zinc-400">수량 (Amount)</Label>',
    767: '              <Label className="text-zinc-400">지급 사유 (Reason)</Label>',
    777: '                <Label className="text-zinc-400">만료일 (Optional)</Label>',
    799: '              지급 실행'
})

# TicketManagementTab.tsx
fix_by_lines(r'c:\Users\JAVIS\ch\ch25\src\v2\admin\pages\economy\TicketManagementTab.tsx', {
    470: '                      티켓을 불러오는 중입니다...',
    479: '                      검색된 티켓이 없습니다.',
    551: '                            관리 액션',
    555: '                            수정 (Edit)',
    563: '                            삭제 (Delete)'
})

# CCDepositPage.tsx
fix_by_lines(r'c:\Users\JAVIS\ch\ch25\src\v2\admin\pages\economy\CCDepositPage.tsx', {
    361: '            <Plus className="w-4 h-4" /> 행 추가',
    368: '            {isSaving ? "저장중.." : "전체 저장"}',
    421: '                  작업 일시 {getSortIcon("createdAt")}'
})
