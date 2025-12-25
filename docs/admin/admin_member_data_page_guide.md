# 회원관리 및 데이터 페이지 구현 가이드

이 문서는 어드민 페이지의 회원관리, 티켓기록/회수, 랭킹입력 등의 데이터 중심 페이지를 구현하기 위한 상세 가이드입니다. 기존 디자인 가이드를 보완하여 특정 페이지들의 구현 방법과 패턴에 대해 더 자세한 정보를 제공합니다.

## 1. 회원관리 페이지 구현

### 1.1 회원관리 페이지 구조

회원관리 페이지는 다음과 같은 구조로 구성됩니다:

```
MemberCRUD.tsx
├── 페이지 헤더 (제목 및 설명)
├── 검색 및 필터링 영역
├── 회원 추가 폼 (토글 가능)
├── 회원 목록 테이블
└── 페이지네이션
```

### 1.2 회원 데이터 모델

회원 데이터는 다음과 같은 구조를 가집니다:

```typescript
interface Member {
  id: string;
  nickname: string;
  level: number;
  seasonLevel: number;
  xp: number;
  status: 'ACTIVE' | 'INACTIVE';
  password: string | null;
  isEditing?: boolean;
}
```

### 1.3 회원 목록 테이블 구현

회원 목록 테이블은 다음과 같이 구현합니다:

```jsx
<div className="bg-[#111111] rounded-lg shadow-md overflow-hidden border border-[#333333]">
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-[#1A1A1A] border-b border-[#333333]">
        <tr>
          <th 
            className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:bg-[#2D6B3B]"
            onClick={() => handleSort('id')}
          >
            ID{renderSortIcon('id')}
          </th>
          <th 
            className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:bg-[#2D6B3B]"
            onClick={() => handleSort('nickname')}
          >
            닉네임{renderSortIcon('nickname')}
          </th>
          {/* 추가 열 헤더 */}
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">
            액션
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#333333]">
        {currentMembers.map((member, index) => (
          <tr key={member.id} className={index % 2 === 0 ? 'bg-[#111111]' : 'bg-[#1A1A1A]'}>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
              {member.id}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              {member.isEditing ? (
                <input
                  type="text"
                  value={member.nickname}
                  onChange={(e) => handleUpdateField(member.id, 'nickname', e.target.value)}
                  className="w-full p-1.5 border border-[#333333] rounded-md focus:ring-2 focus:ring-[#2D6B3B] bg-[#1A1A1A] text-white"
                />
              ) : (
                <div className="text-sm font-medium text-white">
                  {member.nickname}
                </div>
              )}
            </td>
            {/* 추가 데이터 셀 */}
            <td className="px-4 py-3 whitespace-nowrap text-center">
              <div className="flex justify-center space-x-2">
                {member.isEditing ? (
                  <button
                    onClick={() => updateMember(member.id, { isEditing: false })}
                    className="text-[#91F402] hover:text-white"
                    title="저장"
                  >
                    <Save size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => updateMember(member.id, { isEditing: true })}
                    className="text-[#91F402] hover:text-white"
                    title="수정"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteMember(member.id)}
                  className="text-red-500 hover:text-red-300"
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  
  {currentMembers.length === 0 && (
    <div className="py-8 text-center text-gray-400">
      검색 결과가 없습니다.
    </div>
  )}
</div>
```

### 1.4 인라인 편집 구현

회원 정보의 인라인 편집은 다음과 같이 구현합니다:

1. 각 회원 객체에 `isEditing` 상태를 추가합니다.
2. 편집 버튼 클릭 시 해당 회원의 `isEditing` 상태를 `true`로 변경합니다.
3. `isEditing` 상태에 따라 텍스트 또는 입력 필드를 조건부 렌더링합니다.
4. 저장 버튼 클릭 시 변경된 데이터를 저장하고 `isEditing` 상태를 `false`로 변경합니다.

```jsx
// 필드 업데이트 함수
const handleUpdateField = (
  id: string, 
  field: keyof Member, 
  value: string | number | 'ACTIVE' | 'INACTIVE'
) => {
  // 숫자 필드의 경우 숫자로 변환
  if (field === 'level' || field === 'seasonLevel' || field === 'xp') {
    const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
    
    // 음수 방지
    if (numValue < 0) return;
    
    updateMember(id, { [field]: numValue });
  } else {
    updateMember(id, { [field]: value });
  }
};
```

### 1.5 페이지네이션 구현

페이지네이션은 다음과 같이 구현합니다:

```jsx
{totalPages > 1 && (
  <div className="px-4 py-3 bg-[#1A1A1A] border-t border-[#333333] sm:px-6 flex items-center justify-between">
    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-gray-400">
          <span className="font-medium">{itemsPerPage * (currentPage - 1) + 1}</span>
          -
          <span className="font-medium">
            {Math.min(itemsPerPage * currentPage, filteredMembers.length)}
          </span>
          /
          <span className="font-medium">{filteredMembers.length}</span>
          개 항목 표시
        </p>
      </div>
      <div>
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-[#333333] ${
              currentPage === 1
                ? 'bg-[#111111] text-gray-500 cursor-not-allowed'
                : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#2D6B3B]'
            }`}
          >
            <span className="sr-only">이전</span>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          
          {/* 페이지 번호 */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // 페이지 번호 계산 로직
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else {
              const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              pageNum = startPage + i;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`relative inline-flex items-center px-4 py-2 border border-[#333333] text-sm font-medium ${
                  currentPage === pageNum
                    ? 'z-10 bg-[#2D6B3B] text-[#91F402]'
                    : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#2C2C2E]'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-[#333333] ${
              currentPage === totalPages
                ? 'bg-[#111111] text-gray-500 cursor-not-allowed'
                : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#2D6B3B]'
            }`}
          >
            <span className="sr-only">다음</span>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  </div>
)}
```

### 1.6 회원 추가 폼 구현

회원 추가 폼은 다음과 같이 구현합니다:

```jsx
{showAddForm && (
  <div className="bg-[#111111] rounded-lg shadow-md p-6 border border-[#333333]">
    <h3 className="text-lg font-medium text-[#91F402] mb-4">새 회원 추가</h3>
    <form onSubmit={handleAddMember} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-gray-300 mb-1">
            닉네임
          </label>
          <input
            type="text"
            id="nickname"
            value={newMember.nickname}
            onChange={(e) => setNewMember({ ...newMember, nickname: e.target.value })}
            className="w-full p-2 border border-[#333333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2D6B3B] bg-[#1A1A1A] text-white"
            required
          />
        </div>
        {/* 추가 필드 */}
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={() => setShowAddForm(false)}
          className="px-4 py-2 border border-[#333333] rounded-md text-gray-300 hover:bg-[#1A1A1A] bg-[#111111]"
        >
          취소
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-[#2D6B3B] text-white rounded-md hover:bg-[#91F402] hover:text-black"
        >
          저장
        </button>
      </div>
    </form>
  </div>
)}
```

## 2. 티켓기록/회수 페이지 구현

### 2.1 티켓기록/회수 페이지 구조

티켓기록/회수 페이지는 다음과 같은 구조로 구성됩니다:

```
TicketLogsPage.tsx
├── 페이지 헤더 (제목 및 설명)
├── 상태 카드 (요약 통계)
├── 검색 및 필터링 영역
├── 탭 네비게이션
│   ├── 지갑 잔액 탭
│   ├── 플레이 로그 탭 (PlayLogView.tsx)
│   ├── 코인 원장 탭 (TicketLogView.tsx)
│   └── 티켓 회수 탭
└── 알림 영역
```

### 2.2 티켓 로그 데이터 모델

티켓 로그 데이터는 다음과 같은 구조를 가집니다:

```typescript
export interface TicketLog {
  id: string;
  externalId: string;
  ticketType: TicketType;
  amount: number;
  balance: number;
  reason: string;
  label: string;
  timestamp: string;
}

export interface PlayLog {
  game: 'ROULETTE' | 'DICE' | 'LOTTERY';
  id: string;
  reward: string;
  label: string;
  timestamp: string;
}
```

### 2.3 티켓 로그 뷰 구현

티켓 로그 뷰는 다음과 같이 구현합니다:

```jsx
<div className="space-y-5">
  <div className="flex justify-between items-center">
    <h3 className="text-lg font-medium text-[#91F402]">코인 원장 관리</h3>
    <div className="flex space-x-2">
      {/* 필터 및 내보내기 버튼 */}
    </div>
  </div>

  {/* 고급 필터링 패널 */}
  {showFilters && (
    <div className="bg-[#111111] rounded-lg border border-[#333333] p-4 mb-4">
      {/* 필터링 옵션 */}
    </div>
  )}

  {/* 통계 대시보드 */}
  {showStats && (
    <div className="bg-[#111111] rounded-lg border border-[#333333] p-4 mb-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 차트 및 통계 */}
      </div>
    </div>
  )}

  {/* 티켓 로그 테이블 */}
  <div className="bg-[#111111] rounded-lg border border-[#333333] overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-[#151515] sticky top-0 z-10">
          <tr>
            <th className="px-2 py-3 w-10">
              <input 
                type="checkbox"
                checked={selectAll}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-[#91F402] bg-[#1A1A1A] border-[#333333] rounded focus:ring-[#2D6B3B]"
              />
            </th>
            {/* 테이블 헤더 */}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#333333]">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <React.Fragment key={log.id}>
                <tr className={`hover:bg-[#1A1A1A] ${
                  selectedLogs.includes(log.id) ? 'bg-[#2D6B3B] bg-opacity-20' : ''
                }`}>
                  {/* 로그 데이터 셀 */}
                </tr>
                
                {/* 확장 패널 */}
                {expandedLogId === log.id && (
                  <tr className="bg-[#1A1A1A]">
                    <td colSpan={7} className="px-6 py-4 border-t border-[#333333]">
                      {/* 확장된 상세 정보 */}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                검색 결과가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
</div>
```

### 2.4 데이터 시각화 구현

티켓 로그 페이지의 데이터 시각화는 다음과 같이 구현합니다:

```jsx
<div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#333333]">
  <h4 className="text-sm font-medium text-[#91F402] mb-3">최근 거래량 추이</h4>
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={statsData.timeChartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
        <XAxis 
          dataKey="date" 
          tick={{ fill: '#aaaaaa' }} 
          stroke="#555555"
        />
        <YAxis 
          tick={{ fill: '#aaaaaa' }} 
          stroke="#555555" 
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#111111', borderColor: '#333333' }}
          itemStyle={{ color: '#ffffff' }}
          labelStyle={{ color: '#91F402' }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="발행" 
          stroke="#91F402" 
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line 
          type="monotone" 
          dataKey="회수" 
          stroke="#ff6b6b" 
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
</div>
```

### 2.5 고급 필터링 구현

고급 필터링은 다음과 같이 구현합니다:

```jsx
<div className="bg-[#111111] rounded-lg border border-[#333333] p-4 mb-4">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        거래 이유(Reason) 필터
      </label>
      <select
        value={reasonFilter}
        onChange={(e) => setReasonFilter(e.target.value)}
        className="w-full p-2 border border-[#333333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#91F402] bg-[#1A1A1A] text-white"
      >
        <option value="all">모든 이유</option>
        {reasonTypes.map(reason => (
          <option key={reason} value={reason}>{reason}</option>
        ))}
      </select>
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        금액 범위
      </label>
      <div className="flex space-x-2">
        <div className="flex-1">
          <input
            type="number"
            placeholder="최소"
            value={amountFilter.min ?? ''}
            onChange={(e) => {
              const value = e.target.value === '' ? undefined : Number(e.target.value);
              setAmountFilter(prev => ({ ...prev, min: value }));
            }}
            className="w-full p-2 border border-[#333333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#91F402] bg-[#1A1A1A] text-white"
          />
        </div>
        <span className="text-gray-400 flex items-center">~</span>
        <div className="flex-1">
          <input
            type="number"
            placeholder="최대"
            value={amountFilter.max ?? ''}
            onChange={(e) => {
              const value = e.target.value === '' ? undefined : Number(e.target.value);
              setAmountFilter(prev => ({ ...prev, max: value }));
            }}
            className="w-full p-2 border border-[#333333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#91F402] bg-[#1A1A1A] text-white"
          />
        </div>
      </div>
    </div>
    
    <div className="flex flex-col justify-end">
      <div className="flex justify-end space-x-2 mt-auto">
        <button
          onClick={resetFilters}
          className="px-4 py-2 text-sm font-medium border border-[#333333] rounded-md hover:bg-[#2C2C2E] bg-[#111111] text-gray-300"
        >
          초기화
        </button>
        <button
          onClick={() => setShowFilters(false)}
          className="px-4 py-2 text-sm font-medium bg-[#2D6B3B] text-white rounded-md hover:bg-[#91F402] hover:text-black"
        >
          필터 적용
        </button>
      </div>
    </div>
  </div>
</div>
```

### 2.6 데이터 그룹화 및 집계 구현

데이터 그룹화 및 집계는 다음과 같이 구현합니다:

```jsx
// 사용자별 그룹화
const groupedByUser = useMemo(() => {
  if (!groupByUser) return null;
  
  const groups: Record<string, {
    externalId: string;
    totalAmount: number;
    ticketCounts: Record<string, number>;
    logCount: number;
  }> = {};
  
  filteredLogs.forEach(log => {
    if (!groups[log.externalId]) {
      groups[log.externalId] = {
        externalId: log.externalId,
        totalAmount: 0,
        ticketCounts: {},
        logCount: 0
      };
    }
    
    groups[log.externalId].totalAmount += log.amount;
    groups[log.externalId].logCount += 1;
    
    // 티켓 유형별 카운트
    if (!groups[log.externalId].ticketCounts[log.ticketType]) {
      groups[log.externalId].ticketCounts[log.ticketType] = 0;
    }
    groups[log.externalId].ticketCounts[log.ticketType] += log.amount;
  });
  
  return Object.values(groups);
}, [filteredLogs, groupByUser]);
```

## 3. 랭킹입력 페이지 구현

### 3.1 랭킹입력 페이지 구조

랭킹입력 페이지는 다음과 같은 구조로 구성됩니다:

```
RankingInput.tsx
├── 페이지 헤더 (제목 및 설명)
├── 검색 및 필터링 영역
├── 주요 액션 버튼 (행 추가, 전체 저장)
├── 랭킹 테이블
│   ├── 인라인 편집 기능
│   └── 정렬 기능
├── 페이지네이션
├── 필터 모달 (RankingFilterModal.tsx)
└── 일괄 편집 모달 (RankingBulkEditModal.tsx)
```

### 3.2 랭킹 데이터 모델

랭킹 데이터는 다음과 같은 구조를 가집니다:

```typescript
export interface RankingEntry {
  id: string;
  externalId: string;
  deposit: number;
  gameCount: number;
  memo: string;
  isEditing?: boolean;
  isNew?: boolean;
}
```

### 3.3 랭킹 테이블 구현

랭킹 테이블은 다음과 같이 구현합니다:

```jsx
<div className="bg-[#111111] rounded-lg shadow-md overflow-hidden border border-[#333333]">
  <div ref={tableRef} className="overflow-x-auto max-h-[600px]">
    <table className="w-full">
      <thead className="bg-[#1A1A1A] border-b border-[#333333] sticky top-0 z-10">
        <tr>
          <th className="px-2 py-3 text-center">
            <input 
              type="checkbox"
              checked={selectAllChecked}
              onChange={toggleSelectAll}
              className="w-4 h-4 text-[#91F402] bg-[#1A1A1A] border-[#333333] rounded focus:ring-[#2D6B3B]"
            />
          </th>
          <th 
            className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:bg-[#2D6B3B]"
            onClick={() => handleSort('externalId')}
          >
            <div className="flex items-center">
              외부 ID {renderSortIcon('externalId')}
            </div>
          </th>
          <th 
            className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:bg-[#2D6B3B]"
            onClick={() => handleSort('deposit')}
          >
            <div className="flex items-center">
              입금액 {renderSortIcon('deposit')}
            </div>
          </th>
          <th 
            className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:bg-[#2D6B3B]"
            onClick={() => handleSort('gameCount')}
          >
            <div className="flex items-center">
              게임횟수 {renderSortIcon('gameCount')}
            </div>
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
            메모
          </th>
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">
            기능
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#333333]">
        {paginatedData.map((ranking, idx) => (
          <tr 
            key={ranking.id} 
            className={`hover:bg-[#1A1A1A] ${
              ranking.isNew ? 'bg-[#2D6B3B] bg-opacity-30' : ''
            }`}
          >
            <td className="px-2 py-2 text-center">
              <input 
                type="checkbox"
                checked={selectedRankings.includes(ranking.id)}
                onChange={() => toggleSelectRanking(ranking.id)}
                className="w-4 h-4 text-[#91F402] bg-[#1A1A1A] border-[#333333] rounded focus:ring-[#2D6B3B]"
              />
            </td>
            <td className="px-4 py-2 whitespace-nowrap">
              {ranking.isEditing ? (
                <input
                  type="text"
                  value={ranking.externalId}
                  onChange={(e) => handleUpdateField(ranking.id, 'externalId', e.target.value)}
                  className="w-full p-1.5 border border-[#333333] rounded-md focus:ring-2 focus:ring-[#91F402] bg-[#1A1A1A] text-white"
                  placeholder="외부 ID"
                  ref={idx === 0 && !ranking.externalId ? newRowRef : null}
                />
              ) : (
                <div 
                  className="text-sm font-medium text-white cursor-pointer hover:text-[#91F402]"
                  onClick={() => handleEditRow(ranking.id)}
                >
                  {highlightSearchTerm(ranking.externalId)}
                </div>
              )}
            </td>
            {/* 추가 데이터 셀 */}
            <td className="px-4 py-2 whitespace-nowrap text-center">
              <div className="flex justify-center space-x-2">
                {ranking.isEditing ? (
                  <button
                    onClick={() => handleSaveRow(ranking.id)}
                    className="text-[#91F402] hover:text-white"
                    title="저장"
                  >
                    <Save size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleEditRow(ranking.id)}
                    className="text-[#91F402] hover:text-white"
                    title="수정"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteRow(ranking.id)}
                  className="text-red-500 hover:text-red-300"
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

### 3.4 일괄 편집 모달 구현

일괄 편집 모달은 다음과 같이 구현합니다:

```jsx
<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
  <div className="bg-[#111111] rounded-lg shadow-xl w-full max-w-md border border-[#333333]">
    <div className="flex justify-between items-center p-5 border-b border-[#333333] bg-[#2D6B3B]">
      <h3 className="text-lg font-semibold text-white">
        선택한 {selectedCount}개 항목 일괄 편집
      </h3>
      <button onClick={onClose} className="text-gray-300 hover:text-white">
        <X size={24} />
      </button>
    </div>
    
    <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-[#0A0A0A]">
      <div className="space-y-4">
        <div>
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="applyDeposit"
              name="applyDeposit"
              checked={changes.applyDeposit}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-[#91F402] focus:ring-[#2D6B3B] bg-[#1A1A1A] border-[#333333] rounded"
            />
            <label htmlFor="applyDeposit" className="ml-2 block text-sm text-gray-300">
              입금액 변경
            </label>
          </div>
          <input
            type="text"
            name="deposit"
            value={changes.deposit}
            onChange={handleInputChange}
            placeholder="입금액"
            disabled={!changes.applyDeposit}
            className={`w-full p-2 border border-[#333333] rounded-md ${
              changes.applyDeposit 
                ? "focus:outline-none focus:ring-2 focus:ring-[#91F402] bg-[#1A1A1A] text-white" 
                : "bg-[#111111] text-gray-600 cursor-not-allowed"
            }`}
          />
        </div>
        
        {/* 추가 필드 */}
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-300 bg-[#1A1A1A] hover:bg-[#2C2C2E] rounded-md border border-[#333333]"
        >
          취소
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-[#2D6B3B] hover:bg-[#91F402] hover:text-black rounded-md"
        >
          적용
        </button>
      </div>
    </form>
  </div>
</div>
```

### 3.5 검색 결과 강조 표시 구현

검색 결과 강조 표시는 다음과 같이 구현합니다:

```jsx
const highlightSearchTerm = (text: string) => {
  if (!searchTerm || !text) return text;
  
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === searchTerm.toLowerCase() 
          ? <span key={i} className="bg-[#2D6B3B] text-[#91F402]">{part}</span>
          : part
      )}
    </>
  );
};
```

## 4. 공통 구현 패턴

### 4.1 데이터 필터링 및 정렬

데이터 필터링 및 정렬은 다음과 같이 구현합니다:

```jsx
// 필터링된 데이터 계산
const getFilteredData = useCallback(() => {
  // 기본 검색어 필터링
  let result = searchTerm 
    ? rankings.filter(r => 
        r.externalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.memo.toLowerCase().includes(searchTerm.toLowerCase()))
    : [...rankings];
  
  // 고급 필터 적용
  if (advancedFilters.depositMin !== undefined) {
    result = result.filter(r => r.deposit >= (advancedFilters.depositMin || 0));
  }
  
  // 추가 필터 적용
  
  // 정렬 적용
  if (sortConfig.key) {
    result.sort((a, b) => {
      if (a[sortConfig.key!] < b[sortConfig.key!]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key!] > b[sortConfig.key!]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }
  
  return result;
}, [rankings, searchTerm, advancedFilters, sortConfig]);
```

### 4.2 CSV 내보내기 구현

CSV 내보내기는 다음과 같이 구현합니다:

```jsx
const exportToCSV = (data: any[], filename: string) => {
  let csvContent = '';
  
  // 데이터가 있는 경우
  if (data.length > 0) {
    // 헤더 생성
    const headers = Object.keys(data[0]).filter(key => 
      typeof data[0][key] !== 'object' || data[0][key] === null
    );
    csvContent += headers.join(',') + '\n';
    
    // 행 추가
    data.forEach(item => {
      const row = headers.map(header => {
        // 콤마가 포함된 문자열은 따옴표로 감싸기
        const value = item[header] === null ? '' : String(item[header]);
        return `"${value.replace(/"/g, '""')}"`;
      });
      csvContent += row.join(',') + '\n';
    });
  }
  
  // 다운로드 트리거
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 알림 표시
  setNotification({
    type: 'success',
    message: '데이터가 성공적으로 내보내기되었습니다.',
    autoHide: true
  });
};
```

### 4.3 알림 메시지 구현

알림 메시지는 다음과 같이 구현합니다:

```jsx
// 알림 상태
const [notification, setNotification] = useState<{
  type: 'success' | 'error' | 'info' | null;
  message: string;
  autoHide?: boolean;
}>({ type: null, message: '' });

// 자동 숨김 처리
useEffect(() => {
  if (notification.type && notification.autoHide) {
    const timer = setTimeout(() => {
      setNotification({ type: null, message: '' });
    }, 5000);
    return () => clearTimeout(timer);
  }
}, [notification]);

// 알림 컴포넌트
{notification.type && (
  <div className={`p-4 rounded-md flex items-start ${
    notification.type === 'success' 
      ? 'bg-[#2D6B3B] bg-opacity-30 border border-[#2D6B3B]' 
      : notification.type === 'error'
        ? 'bg-red-900 bg-opacity-30 border border-red-900'
        : 'bg-blue-900 bg-opacity-30 border border-blue-900'
  }`}>
    {notification.type === 'success' && <Check size={20} className="text-[#91F402] mr-3 mt-0.5 flex-shrink-0" />}
    {notification.type === 'error' && <AlertCircle size={20} className="text-red-400 mr-3 mt-0.5 flex-shrink-0" />}
    {notification.type === 'info' && <Info size={20} className="text-blue-400 mr-3 mt-0.5 flex-shrink-0" />}
    
    <div className="flex-grow">
      <p className={`${
        notification.type === 'success' 
          ? 'text-[#91F402]'
          : notification.type === 'error'
            ? 'text-red-300'
            : 'text-blue-300'
      }`}>
        {notification.message}
      </p>
    </div>
    
    <button 
      onClick={() => setNotification({ type: null, message: '' })}
      className="text-gray-400 hover:text-white ml-3 flex-shrink-0"
    >
      <X size={18} />
    </button>
  </div>
)}
```

### 4.4 확장 가능한 테이블 행 구현

확장 가능한 테이블 행은 다음과 같이 구현합니다:

```jsx
<React.Fragment key={log.id}>
  <tr className={`hover:bg-[#1A1A1A] ${
    selectedLogs.includes(log.id) ? 'bg-[#2D6B3B] bg-opacity-20' : ''
  }`}>
    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
      {log.id}
    </td>
    {/* 추가 데이터 셀 */}
    <td className="px-4 py-3 text-center">
      <button
        onClick={() => toggleExpand(log.id)}
        className="text-gray-400 hover:text-white"
      >
        {expandedLogId === log.id ? (
          <ChevronUp size={16} />
        ) : (
          <ChevronDown size={16} />
        )}
      </button>
    </td>
  </tr>
  
  {/* 확장 패널 */}
  {expandedLogId === log.id && (
    <tr className="bg-[#1A1A1A]">
      <td colSpan={7} className="px-6 py-4 border-t border-[#333333]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 확장된 상세 정보 */}
        </div>
      </td>
    </tr>
  )}
</React.Fragment>
```

### 4.5 탭 네비게이션 구현

탭 네비게이션은 다음과 같이 구현합니다:

```jsx
<div className="border-b border-[#333333]">
  <div className="flex flex-wrap -mb-px">
    <button
      className={`py-2 px-4 font-medium text-sm border-b-2 ${
        activeView === 'balance'
          ? 'text-[#91F402] border-[#91F402]'
          : 'text-gray-400 border-transparent hover:text-gray-300'
      }`}
      onClick={() => setActiveView('balance')}
    >
      지갑 잔액
    </button>
    <button
      className={`py-2 px-4 font-medium text-sm border-b-2 ${
        activeView === 'playLogs'
          ? 'text-[#91F402] border-[#91F402]'
          : 'text-gray-400 border-transparent hover:text-gray-300'
      }`}
      onClick={() => setActiveView('playLogs')}
    >
      플레이 로그
    </button>
    {/* 추가 탭 */}
  </div>
</div>

{/* 탭 내용 */}
{activeView === 'balance' && (
  <div className="space-y-5">
    {/* 지갑 잔액 내용 */}
  </div>
)}
{activeView === 'playLogs' && (
  <PlayLogView 
    playLogs={playLogs}
    onExportCSV={exportToCSV}
    onRefresh={handleSearch}
    onFilterChange={setPlayLogLimit}
    currentLimit={playLogLimit}
    filteredExternalId={filteredExternalId}
  />
)}
{/* 추가 탭 내용 */}
```

## 5. 고급 UI 패턴

### 5.1 데이터 그리드 구현

데이터 그리드는 다음과 같이 구현합니다:

1. 테이블 헤더를 `sticky`로 설정하여 스크롤 시에도 고정되도록 합니다.
2. 테이블 컨테이너에 `overflow-x-auto`를 적용하여 가로 스크롤을 지원합니다.
3. 테이블 높이를 제한하고 `overflow-y-auto`를 적용하여 세로 스크롤을 지원합니다.
4. 정렬 기능을 헤더에 추가합니다.
5. 행 선택 기능을 체크박스로 구현합니다.

```jsx
<div ref={tableRef} className="overflow-x-auto max-h-[600px]">
  <table className="w-full">
    <thead className="bg-[#1A1A1A] border-b border-[#333333] sticky top-0 z-10">
      {/* 테이블 헤더 */}
    </thead>
    <tbody className="divide-y divide-[#333333]">
      {/* 테이블 본문 */}
    </tbody>
  </table>
</div>
```

### 5.2 인라인 편집 구현

인라인 편집은 다음과 같이 구현합니다:

1. 각 행에 `isEditing` 상태를 추가합니다.
2. 편집 버튼 클릭 시 해당 행의 `isEditing` 상태를 `true`로 변경합니다.
3. `isEditing` 상태에 따라 텍스트 또는 입력 필드를 조건부 렌더링합니다.
4. 저장 버튼 클릭 시 변경된 데이터를 저장하고 `isEditing` 상태를 `false`로 변경합니다.

```jsx
<td className="px-4 py-2 whitespace-nowrap">
  {ranking.isEditing ? (
    <input
      type="text"
      value={ranking.externalId}
      onChange={(e) => handleUpdateField(ranking.id, 'externalId', e.target.value)}
      className="w-full p-1.5 border border-[#333333] rounded-md focus:ring-2 focus:ring-[#91F402] bg-[#1A1A1A] text-white"
      placeholder="외부 ID"
    />
  ) : (
    <div 
      className="text-sm font-medium text-white cursor-pointer hover:text-[#91F402]"
      onClick={() => handleEditRow(ranking.id)}
    >
      {ranking.externalId}
    </div>
  )}
</td>
```

### 5.3 모달 구현

모달은 다음과 같이 구현합니다:

1. 모달 상태를 관리하는 상태 변수를 추가합니다.
2. 모달 열기/닫기 함수를 구현합니다.
3. 모달 컴포넌트를 조건부 렌더링합니다.
4. 모달 배경을 클릭하면 모달이 닫히도록 구현합니다.

```jsx
const [isModalOpen, setIsModalOpen] = useState(false);
const [modalData, setModalData] = useState<any>(null);

const openModal = (data?: any) => {
  setModalData(data);
  setIsModalOpen(true);
};

const closeModal = () => {
  setIsModalOpen(false);
  setModalData(null);
};

// 모달 렌더링
{isModalOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
    <div className="bg-[#111111] rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden border border-[#333333]">
      {/* 모달 내용 */}
    </div>
  </div>
)}
```

### 5.4 드롭다운 메뉴 구현

드롭다운 메뉴는 다음과 같이 구현합니다:

```jsx
const [isDropdownOpen, setIsDropdownOpen] = useState(false);

// 드롭다운 토글
const toggleDropdown = () => {
  setIsDropdownOpen(!isDropdownOpen);
};

// 드롭다운 닫기
const closeDropdown = () => {
  setIsDropdownOpen(false);
};

// 드롭다운 렌더링
<div className="relative">
  <button
    onClick={toggleDropdown}
    className="flex items-center px-3 py-2 bg-[#1A1A1A] border border-[#333333] rounded-md hover:bg-[#2D6B3B] text-white"
  >
    <Filter size={16} className="mr-1" />
    필터
    <ChevronDown size={16} className="ml-1" />
  </button>
  
  {isDropdownOpen && (
    <>
      <div 
        className="fixed inset-0 z-10" 
        onClick={closeDropdown}
      ></div>
      <div className="absolute right-0 mt-1 w-48 bg-[#111111] border border-[#333333] rounded-md shadow-lg z-20">
        <div className="py-1">
          <button
            onClick={() => {
              // 필터 액션
              closeDropdown();
            }}
            className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#2D6B3B]"
          >
            필터 옵션 1
          </button>
          {/* 추가 옵션 */}
        </div>
      </div>
    </>
  )}
</div>
```

### 5.5 토스트 알림 구현

토스트 알림은 다음과 같이 구현합니다:

```jsx
const [toasts, setToasts] = useState<Array<{
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}>>([]);

// 토스트 추가
const addToast = (type: 'success' | 'error' | 'info', message: string) => {
  const id = Math.random().toString(36).substr(2, 9);
  setToasts(prev => [...prev, { id, type, message }]);
  
  // 자동 제거
  setTimeout(() => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, 5000);
};

// 토스트 제거
const removeToast = (id: string) => {
  setToasts(prev => prev.filter(toast => toast.id !== id));
};

// 토스트 렌더링
<div className="fixed bottom-4 right-4 z-50 space-y-2">
  {toasts.map(toast => (
    <div
      key={toast.id}
      className={`p-3 rounded-md shadow-lg flex items-center ${
        toast.type === 'success' 
          ? 'bg-[#2D6B3B] text-[#91F402]' 
          : toast.type === 'error'
            ? 'bg-red-900 text-red-300'
            : 'bg-blue-900 text-blue-300'
      }`}
    >
      {toast.type === 'success' && <Check size={16} className="mr-2" />}
      {toast.type === 'error' && <AlertTriangle size={16} className="mr-2" />}
      {toast.type === 'info' && <Info size={16} className="mr-2" />}
      <span>{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="ml-3 text-gray-300 hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  ))}
</div>
```

## 6. 성능 최적화 기법

### 6.1 메모이제이션 사용

메모이제이션은 다음과 같이 사용합니다:

```jsx
// 필터링된 데이터 메모이제이션
const filteredData = useMemo(() => {
  // 필터링 로직
  return result;
}, [data, filters, searchTerm]);

// 콜백 함수 메모이제이션
const handleSearch = useCallback(() => {
  // 검색 로직
}, [searchTerm]);
```

### 6.2 가상화 스크롤 구현

대용량 데이터를 처리하기 위한 가상화 스크롤은 다음과 같이 구현합니다:

```jsx
import { FixedSizeList as List } from 'react-window';

// 행 렌더링 함수
const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
  const item = data[index];
  return (
    <div style={style} className="flex items-center px-4 py-2 border-b border-[#333333]">
      {/* 행 내용 */}
    </div>
  );
};

// 가상화 리스트 렌더링
<List
  height={500}
  width="100%"
  itemCount={data.length}
  itemSize={50}
>
  {Row}
</List>
```

### 6.3 지연 로딩 구현

지연 로딩은 다음과 같이 구현합니다:

```jsx
import { lazy, Suspense } from 'react';

// 지연 로딩할 컴포넌트
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// 지연 로딩 렌더링
<Suspense fallback={<div className="p-4 text-center text-gray-400">로딩 중...</div>}>
  <HeavyComponent />
</Suspense>
```

### 6.4 디바운싱 구현

검색 입력과 같은 빈번한 이벤트에 디바운싱을 적용합니다:

```jsx
import { useState, useEffect } from 'react';

// 디바운스 훅
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

// 사용 예
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 300);

// 디바운스된 값으로 검색 수행
useEffect(() => {
  if (debouncedSearchTerm) {
    performSearch(debouncedSearchTerm);
  }
}, [debouncedSearchTerm]);
```

## 7. 접근성 및 사용자 경험 향상

### 7.1 키보드 접근성 구현

키보드 접근성은 다음과 같이 구현합니다:

```jsx
// 키보드 이벤트 처리
const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    action();
  }
};

// 적용 예
<div
  role="button"
  tabIndex={0}
  onClick={handleAction}
  onKeyDown={(e) => handleKeyDown(e, handleAction)}
  className="cursor-pointer"
>
  클릭 가능한 요소
</div>
```

### 7.2 스크린 리더 지원

스크린 리더 지원은 다음과 같이 구현합니다:

```jsx
// ARIA 속성 추가
<button
  aria-label="항목 삭제"
  aria-describedby="delete-description"
  onClick={handleDelete}
>
  <Trash2 size={16} />
</button>
<div id="delete-description" className="sr-only">
  이 항목을 영구적으로 삭제합니다.
</div>

// 상태 변경 알림
<div role="alert" aria-live="polite">
  {notification.message}
</div>
```

### 7.3 로딩 상태 표시

로딩 상태는 다음과 같이 표시합니다:

```jsx
{isLoading ? (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#91F402]"></div>
    <span className="ml-2 text-gray-400">로딩 중...</span>
  </div>
) : (
  // 콘텐츠
)}
```

### 7.4 에러 처리 및 표시

에러 처리 및 표시는 다음과 같이 구현합니다:

```jsx
{error && (
  <div className="p-4 rounded-md bg-red-900 bg-opacity-30 border border-red-900 text-red-300 mb-4">
    <div className="flex items-center">
      <AlertTriangle size={18} className="mr-2" />
      <span>{error}</span>
    </div>
  </div>
)}
```

## 8. 결론

이 가이드는 회원관리, 티켓기록/회수, 랭킹입력 등의 데이터 중심 페이지를 구현하기 위한 상세한 패턴과 기법을 제공합니다. 이러한 패턴을 따르면 일관된 디자인과 사용자 경험을 제공하는 어드민 페이지를 구현할 수 있습니다.

주요 구현 포인트:

1. **데이터 테이블**: 정렬, 필터링, 페이지네이션, 인라인 편집 기능을 갖춘 데이터 테이블
2. **고급 필터링**: 다양한 필터 옵션을 제공하는 필터링 시스템
3. **데이터 시각화**: 차트와 그래프를 활용한 데이터 시각화
4. **모달 및 드롭다운**: 사용자 인터랙션을 위한 모달 및 드롭다운 메뉴
5. **성능 최적화**: 메모이제이션, 가상화 스크롤, 지연 로딩, 디바운싱 등의 성능 최적화 기법
6. **접근성**: 키보드 접근성, 스크린 리더 지원 등의 접근성 향상 기법

이러한 패턴과 기법을 적절히 조합하여 사용하면 사용자 친화적이고 성능이 우수한 어드민 페이지를 구현할 수 있습니다.
