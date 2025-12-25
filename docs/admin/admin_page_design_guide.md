# 어드민 페이지 디자인 가이드 (교체용)

- 기준일: 2025-12-23
- 목적: 어드민 페이지를 전면 재수정(교체)할 때, 디자인/레이아웃/컴포넌트 구현 기준을 일관되게 맞추기 위한 단일 참조 문서

---

## 1. 디자인 시스템 개요

### 1.1 색상 팔레트

#### 기본 색상
- **배경색**: `#000000` (검정), `#0A0A0A` (어두운 검정), `#111111` (약간 밝은 검정)
- **컴포넌트 배경**: `#1A1A1A` (어두운 회색), `#2C2C2E` (중간 회색), `#3A3A3C` (밝은 회색)
- **테두리**: `#333333` (어두운 회색)

#### 강조 색상
- **주요 강조색**: `#91F402` (밝은 녹색)
- **보조 강조색**: `#2D6B3B` (어두운 녹색)
- **액센트 색상**: `#F0AB48` (골드)

#### 상태 색상
- **성공**: `#2D6B3B` (어두운 녹색), `#91F402` (밝은 녹색)
- **경고**: `#F0AB48` (골드)
- **오류**: `#ff6b6b` (빨간색), `red-900` (어두운 빨간색), `red-300` (밝은 빨간색)
- **비활성화**: `#2C2C2E` (회색), `gray-400` (밝은 회색)

### 1.2 타이포그래피

- **기본 폰트**: `'Noto Sans KR'` (한글 지원)
- **기본 텍스트 색상**: `#FFFFFF` (흰색), `#91F402` (강조 텍스트)
- **보조 텍스트 색상**: `gray-400` (회색), `gray-300` (밝은 회색)

#### 텍스트 크기
- **제목 (h1)**: `text-2xl font-bold` (24px, 굵게)
- **부제목 (h2)**: `text-xl font-semibold` (20px, 중간 굵기)
- **섹션 제목 (h3)**: `text-lg font-medium` (18px, 중간)
- **기본 텍스트**: `text-sm` (14px)
- **작은 텍스트**: `text-xs` (12px)

### 1.3 그림자 및 효과

- **기본 그림자**: `shadow-md` (중간 그림자)
- **호버 그림자**: `shadow-lg` (큰 그림자)
- **테두리 반경**: `rounded-md` (중간 둥근 모서리), `rounded-lg` (큰 둥근 모서리)
- **포커스 효과**: `focus:ring-2 focus:ring-[#91F402]` (포커스 시 녹색 테두리)

### 1.4 애니메이션 및 전환

- **호버 전환**: `transition-colors` (색상 변화), `hover:bg-[#2D6B3B]` (호버 시 배경색 변경)
- **활성화 전환**: `transition-all` (모든 속성 변화)

---

## 2. 레이아웃 구조

### 2.1 기본 레이아웃

```jsx
<div className="h-full w-full font-['Noto_Sans_KR'] bg-[#000000] text-white">
  <NavigationProvider>
    {/* 컨텍스트 프로바이더들 */}
    <Layout>
      {/* 페이지 콘텐츠 */}
    </Layout>
  </NavigationProvider>
</div>
```

### 2.2 레이아웃 컴포넌트

#### Layout.tsx

```jsx
<div className="flex h-full bg-[#0A0A0A] font-['Noto_Sans_KR'] text-white">
  {/* 데스크톱 사이드바 */}
  <div className="hidden md:block">
    <Sidebar />
  </div>

  {/* 모바일 사이드바 */}
  <div className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
    {/* 오버레이 */}
    <div className="fixed inset-0 bg-black bg-opacity-70" onClick={toggleSidebar}></div>
    {/* 사이드바 내용 */}
    <div className="fixed inset-y-0 left-0 w-64 bg-[#0A0A0A] border-r border-[#333333]">
      <Sidebar mobile={true} closeSidebar={toggleSidebar} />
    </div>
  </div>

  {/* 메인 콘텐츠 */}
  <div className="flex flex-col flex-1 w-full overflow-hidden">
    <Header toggleSidebar={toggleSidebar} />
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0A0A] text-white border-t border-[#222222]">
      {children}
    </main>
  </div>
</div>
```

#### Sidebar.tsx

```jsx
<div className="h-full w-64 bg-[#111111] text-white flex flex-col border-r border-[#333333]">
  {/* 모바일 헤더 */}
  {mobile && (
    <div className="p-4 flex justify-between items-center border-b border-[#333333]">
      <h2 className="text-xl font-bold text-[#91F402]">관리자</h2>
      <button onClick={closeSidebar} className="p-1 rounded-md text-white hover:bg-[#2D6B3B]">
        <X size={20} />
      </button>
    </div>
  )}

  {/* 사용자 정보 */}
  <div className="p-4 flex items-center space-x-3 border-b border-[#333333]">
    <div className="h-10 w-10 rounded-full bg-[#2D6B3B] flex items-center justify-center">
      <span className="font-bold text-[#91F402]">관</span>
    </div>
    <div>
      <h3 className="font-medium text-[#91F402]">관리자 메뉴</h3>
      <p className="text-xs text-gray-400">운영자용</p>
    </div>
  </div>

  {/* 네비게이션 메뉴 */}
  <nav className="flex-1 overflow-y-auto py-4">
    <ul className="space-y-1 px-2">
      {/* 메뉴 아이템들 */}
    </ul>
  </nav>

  {/* 푸터 */}
  <div className="p-4 border-t border-[#333333]">
    <div className="flex items-center space-x-3">
      <div className="h-8 w-8 rounded-full bg-[#F0AB48] flex items-center justify-center">
        <span className="text-xs font-bold text-black">?</span>
      </div>
      <div>
        <p className="text-xs text-gray-400">도움이 필요하신가요?</p>
        <a href="#" className="text-xs text-[#91F402] hover:underline">지원 센터</a>
      </div>
    </div>
  </div>
</div>
```

#### Header.tsx

```jsx
<header className="bg-[#111111] border-b border-[#333333] shadow-sm">
  <div className="px-4 py-3 flex items-center justify-between">
    <div className="flex items-center">
      <button onClick={toggleSidebar} className="md:hidden p-2 rounded-md text-white hover:bg-[#2D6B3B]">
        <Menu size={24} />
      </button>
      <h1 className="ml-2 md:ml-0 text-xl font-semibold text-[#91F402]">관리자 페이지</h1>
    </div>
    <div className="flex items-center space-x-4">
      <button className="p-1 rounded-full text-[#91F402] hover:bg-[#2D6B3B]">
        <Bell size={20} />
      </button>
      <div className="h-8 w-8 rounded-full bg-[#2D6B3B] flex items-center justify-center text-[#91F402]">
        <User size={18} />
      </div>
    </div>
  </div>
</header>
```

---

## 3. 페이지별 컴포넌트 구성

### 3.1 대시보드 페이지

#### 통계 카드

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="bg-[#111111] rounded-lg shadow-md p-6 border border-[#333333]">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <h3 className="text-2xl font-bold mt-1 text-white">{value}</h3>
        <p className={`text-xs mt-1 ${isPositive ? 'text-[#91F402]' : 'text-[#F97935]'}`}>
          {change} {isPositive ? '↑' : '↓'}
        </p>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        {icon}
      </div>
    </div>
  </div>
  {/* 반복 */}
</div>
```

#### 대시보드 카드

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <div className="bg-[#111111] rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-[#333333]">
    <div className="p-4 bg-[#2D6B3B] text-white border-b border-[#333333]">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-[#FFFFFF]">{title}</h3>
        {icon}
      </div>
    </div>
    <div className="p-4 bg-[#171717]">
      <p className="text-sm text-gray-400">{description}</p>
      <button className="mt-3 text-sm font-medium text-[#91F402] hover:underline">
        관리하기 &rarr;
      </button>
    </div>
  </div>
  {/* 반복 */}
</div>
```

### 3.2 설정 페이지 (주사위, 룰렛, 복권 등)

#### 페이지 헤더

```jsx
<div className="flex justify-between items-center">
  <div>
    <h2 className="text-2xl font-bold text-[#91F402]">페이지 제목</h2>
    <p className="text-gray-400 mt-1">
      페이지 설명 텍스트
    </p>
  </div>
  <button className="flex items-center px-4 py-2 bg-[#2D6B3B] text-white rounded-md hover:bg-[#91F402] hover:text-black transition-colors">
    <Plus size={18} className="mr-2" />
    새 항목 추가
  </button>
</div>
```

#### 데이터 테이블

```jsx
<div className="bg-[#111111] rounded-lg shadow-md overflow-hidden border border-[#333333]">
  <table className="w-full">
    <thead className="bg-[#1A1A1A] border-b border-[#333333]">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
          열 제목 1
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
          열 제목 2
        </th>
        {/* 추가 열 */}
        <th className="px-4 py-3 text-left text-xs font-medium text-[#91F402] uppercase tracking-wider">
          기능
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-[#333333]">
      <tr className="hover:bg-[#1A1A1A]">
        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
          데이터 1
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
          데이터 2
        </td>
        {/* 추가 데이터 */}
        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
          <div className="flex space-x-2">
            <button className="text-[#91F402] hover:text-white" title="수정">
              <Edit size={18} />
            </button>
            <button className="text-red-500 hover:text-red-300" title="삭제">
              <Trash2 size={18} />
            </button>
          </div>
        </td>
      </tr>
      {/* 반복 */}
    </tbody>
  </table>
  {/* 데이터 없을 때 */}
  {items.length === 0 && (
    <div className="py-8 text-center text-gray-400">
      데이터가 없습니다. 새 항목을 추가해보세요.
    </div>
  )}
</div>
```

### 3.3 모달 컴포넌트

```jsx
<div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
  <div className="bg-[#111111] rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden border border-[#333333]">
    {/* 모달 헤더 */}
    <div className="flex justify-between items-center p-6 border-b border-[#333333] bg-[#2D6B3B]">
      <h3 className="text-xl font-bold text-white">
        모달 제목
      </h3>
      <button onClick={onClose} className="text-white hover:text-[#91F402]">
        <X size={24} />
      </button>
    </div>

    {/* 모달 내용 */}
    <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] bg-[#0A0A0A]">
      <div className="space-y-4">
        {/* 폼 요소들 */}
      </div>
    </div>

    {/* 모달 푸터 */}
    <div className="flex justify-end space-x-2 p-6 border-t border-[#333333] bg-[#0A0A0A]">
      <button
        onClick={onClose}
        className="px-4 py-2 border border-[#333333] rounded-md text-white hover:bg-[#2C2C2E]"
      >
        취소
      </button>
      <button
        onClick={handleSubmit}
        className="px-4 py-2 bg-[#2D6B3B] text-white rounded-md hover:bg-[#91F402] hover:text-black"
      >
        저장
      </button>
    </div>
  </div>
</div>
```

### 3.4 탭 네비게이션

```jsx
<div className="border-b border-[#333333]">
  <div className="flex space-x-2">
    <button
      className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
        activeTab === 'tab1'
          ? 'bg-[#2D6B3B] text-[#91F402] border-b-2 border-[#91F402]'
          : 'text-gray-400 hover:text-gray-200 hover:bg-[#1A1A1A]'
      }`}
      onClick={() => setActiveTab('tab1')}
    >
      탭 1
    </button>
    <button
      className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
        activeTab === 'tab2'
          ? 'bg-[#2D6B3B] text-[#91F402] border-b-2 border-[#91F402]'
          : 'text-gray-400 hover:text-gray-200 hover:bg-[#1A1A1A]'
      }`}
      onClick={() => setActiveTab('tab2')}
    >
      탭 2
    </button>
    {/* 추가 탭 */}
  </div>
</div>

{/* 탭 내용 */}
<div className="mt-4 bg-[#111111] rounded-lg shadow-md border border-[#333333] p-4">
  {activeTab === 'tab1' && <Tab1Content />}
  {activeTab === 'tab2' && <Tab2Content />}
  {/* 추가 탭 내용 */}
</div>
```

---

## 4. 재사용 가능한 UI 컴포넌트

### 4.1 버튼

#### 기본 버튼

```jsx
<button className="px-4 py-2 bg-[#2D6B3B] text-white rounded-md hover:bg-[#91F402] hover:text-black transition-colors">
  버튼 텍스트
</button>
```

#### 보조 버튼

```jsx
<button className="px-4 py-2 border border-[#333333] rounded-md text-white hover:bg-[#2C2C2E] bg-[#1A1A1A]">
  버튼 텍스트
</button>
```

#### 아이콘 버튼

```jsx
<button className="p-2 text-[#91F402] hover:text-white rounded-md">
  <Icon size={18} />
</button>
```

#### 아이콘 + 텍스트 버튼

```jsx
<button className="flex items-center px-4 py-2 bg-[#2D6B3B] text-white rounded-md hover:bg-[#91F402] hover:text-black">
  <Icon size={18} className="mr-2" />
  버튼 텍스트
</button>
```

### 4.2 폼 요소

#### 입력 필드

```jsx
<div>
  <label htmlFor="fieldId" className="block text-sm font-medium text-gray-200 mb-1">
    라벨 텍스트
  </label>
  <input
    type="text"
    id="fieldId"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    className="w-full p-2 border border-[#333333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#91F402] bg-[#1A1A1A] text-white"
    placeholder="플레이스홀더 텍스트"
  />
  {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
</div>
```

#### 선택 필드

```jsx
<div>
  <label htmlFor="selectId" className="block text-sm font-medium text-gray-200 mb-1">
    라벨 텍스트
  </label>
  <select
    id="selectId"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    className="w-full p-2 border border-[#333333] rounded-md focus:outline-none focus:ring-2 focus:ring-[#91F402] bg-[#1A1A1A] text-white"
  >
    <option value="option1">옵션 1</option>
    <option value="option2">옵션 2</option>
    {/* 추가 옵션 */}
  </select>
</div>
```

#### 체크박스

```jsx
<div className="flex items-center">
  <label htmlFor="checkboxId" className="block text-sm font-medium text-gray-200 mr-4">
    라벨 텍스트
  </label>
  <label className="inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      id="checkboxId"
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
      className="sr-only peer"
    />
    <div className="relative w-11 h-6 bg-[#2C2C2E] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#91F402] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2D6B3B]"></div>
  </label>
</div>
```

#### 검색 필드

```jsx
<div className="flex">
  <div className="relative flex-grow">
    <input
      type="text"
      placeholder="검색어 입력..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      className="w-full p-2 pl-10 border border-[#333333] rounded-l-md focus:outline-none focus:ring-2 focus:ring-[#91F402] bg-[#1A1A1A] text-white"
    />
    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
      <Search size={18} className="text-gray-400" />
    </div>
  </div>
  <button
    onClick={handleSearch}
    className="px-4 py-2 bg-[#1A1A1A] border border-[#333333] border-l-0 rounded-r-md hover:bg-[#2D6B3B] text-white"
  >
    검색
  </button>
</div>
```

### 4.3 상태 표시 요소

#### 배지

```jsx
<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
  active
    ? 'bg-[#2D6B3B] text-[#91F402]'
    : 'bg-red-900 text-red-300'
}`}>
  {active ? '활성' : '비활성'}
</span>
```

#### 알림 메시지

```jsx
<div className={`p-4 rounded-md flex items-start ${
  type === 'success'
    ? 'bg-[#2D6B3B] bg-opacity-30 border border-[#2D6B3B]'
    : type === 'error'
      ? 'bg-red-900 bg-opacity-30 border border-red-900'
      : 'bg-blue-900 bg-opacity-30 border border-blue-900'
}`}>
  {type === 'success' && <CheckIcon className="text-[#91F402] mr-3 mt-0.5 flex-shrink-0" />}
  {type === 'error' && <AlertIcon className="text-red-400 mr-3 mt-0.5 flex-shrink-0" />}
  {type === 'info' && <InfoIcon className="text-blue-400 mr-3 mt-0.5 flex-shrink-0" />}

  <div className="flex-grow">
    <p className={`${
      type === 'success'
        ? 'text-[#91F402]'
        : type === 'error'
          ? 'text-red-300'
          : 'text-blue-300'
    }`}>
      {message}
    </p>
  </div>

  <button
    onClick={onClose}
    className="text-gray-400 hover:text-white ml-3 flex-shrink-0"
  >
    <X size={18} />
  </button>
</div>
```

#### 로딩 상태

```jsx
<div className="flex items-center justify-center p-4">
  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#91F402]"></div>
  <span className="ml-2 text-gray-400">로딩 중...</span>
</div>
```

### 4.4 카드 및 컨테이너

#### 기본 카드

```jsx
<div className="bg-[#111111] rounded-lg shadow-md p-6 border border-[#333333]">
  <h3 className="text-lg font-medium text-[#91F402] mb-4">카드 제목</h3>
  <div className="text-sm text-gray-400">
    카드 내용
  </div>
</div>
```

#### 섹션 컨테이너

```jsx
<div className="space-y-6">
  <div>
    <h2 className="text-2xl font-bold text-[#91F402]">섹션 제목</h2>
    <p className="text-gray-400 mt-1">
      섹션 설명 텍스트
    </p>
  </div>

  {/* 섹션 내용 */}
  <div className="bg-[#111111] rounded-lg shadow-md border border-[#333333] p-4">
    {/* 내용 */}
  </div>
</div>
```

---

## 5. 상태 관리 패턴

### 5.1 Context API 구조

```jsx
// 컨텍스트 정의
const SomeContext = createContext<SomeContextType | undefined>(undefined);

// 프로바이더 컴포넌트
export function SomeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);

  // 상태 관리 함수들
  const someFunction = () => {
    // 상태 업데이트 로직
  };

  return (
    <SomeContext.Provider value={{ state, someFunction }}>
      {children}
    </SomeContext.Provider>
  );
}

// 커스텀 훅
export function useSomeContext() {
  const context = useContext(SomeContext);
  if (context === undefined) {
    throw new Error('useSomeContext는 SomeProvider 내에서 사용해야 합니다');
  }
  return context;
}
```

### 5.2 중첩된 프로바이더 패턴

```jsx
// 메인 컴포넌트
export default function AdminDashboard() {
  return (
    <div className="h-full w-full font-['Noto_Sans_KR'] bg-[#000000] text-white">
      <NavigationProvider>
        <RouletteProvider>
          <DiceProvider>
            <LotteryProvider>
              <NewMemberProvider>
                <RankingProvider>
                  <MemberProvider>
                    <TicketProvider>
                      <Layout>
                        {/* 페이지 콘텐츠 */}
                      </Layout>
                    </TicketProvider>
                  </MemberProvider>
                </RankingProvider>
              </NewMemberProvider>
            </LotteryProvider>
          </DiceProvider>
        </RouletteProvider>
      </NavigationProvider>
    </div>
  );
}
```

---

## 6. 반응형 디자인 가이드라인

### 6.1 브레이크포인트

- **모바일**: 기본 (< 768px)
- **태블릿**: `md:` (>= 768px)
- **데스크톱**: `lg:` (>= 1024px)
- **대형 화면**: `xl:` (>= 1280px)

### 6.2 반응형 그리드

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* 그리드 아이템 */}
</div>
```

### 6.3 반응형 레이아웃

- **사이드바**: 모바일에서는 숨겨지고 토글 버튼으로 표시됨

```jsx
<div className="hidden md:block">
  <Sidebar />
</div>
```

- **테이블**: 모바일에서는 가로 스크롤 가능

```jsx
<div className="overflow-x-auto">
  <table className="w-full">
    {/* 테이블 내용 */}
  </table>
</div>
```

- **버튼 그룹**: 모바일에서는 세로로 쌓임

```jsx
<div className="flex flex-col sm:flex-row gap-2">
  {/* 버튼들 */}
</div>
```

### 6.4 모바일 최적화 팁

1. **터치 영역 확대**: 모바일에서는 버튼과 클릭 가능한 요소의 크기를 충분히 크게 설정 (최소 44x44px)
2. **폰트 크기 조정**: 모바일에서도 읽기 쉽도록 충분한 폰트 크기 유지
3. **간결한 UI**: 모바일에서는 불필요한 요소 숨기기
4. **스크롤 최적화**: 긴 목록은 가상화 또는 페이지네이션 적용

---

## 7. 파일 구조 및 컴포넌트 조직

```text
├── components/
│   ├── Layout.tsx              # 기본 레이아웃
│   ├── Sidebar.tsx             # 사이드바 네비게이션
│   ├── Header.tsx              # 상단 헤더
│   ├── Dashboard.tsx           # 대시보드 페이지
│   ├── Stats.tsx               # 통계 컴포넌트
│   ├── DiceSettings.tsx        # 주사위 설정 페이지
│   ├── DiceModal.tsx           # 주사위 설정 모달
│   ├── RouletteSettings.tsx    # 룰렛 설정 페이지
│   ├── RouletteModal.tsx       # 룰렛 설정 모달
│   ├── LotterySettings.tsx     # 복권 설정 페이지
│   ├── LotteryModal.tsx        # 복권 설정 모달
│   ├── PrizeModal.tsx          # 상품 설정 모달
│   ├── TeamBattle/             # 팀 배틀 관련 컴포넌트
│   │   ├── SeasonManagement.tsx
│   │   ├── TeamManagement.tsx
│   │   ├── TeamLeaderboard.tsx
│   │   └── TeamAssignment.tsx
│   ├── TeamBattlePage.tsx      # 팀 배틀 페이지
│   ├── TicketLogs/             # 티켓 로그 관련 컴포넌트
│   │   ├── PlayLogView.tsx
│   │   └── TicketLogView.tsx
│   └── ...
├── contexts/                   # 상태 관리 컨텍스트
│   ├── NavigationContext.tsx
│   ├── DiceContext.tsx
│   ├── RouletteContext.tsx
│   ├── LotteryContext.tsx
│   ├── TeamBattleContext.tsx
│   ├── TicketContext.tsx
│   └── ...
├── hooks/                      # 커스텀 훅
│   └── useNavigate.tsx
└── main.tsx                    # 앱 진입점
```

---

## 8. 구현 시 주의사항

1. **한글 지원**: 모든 UI 텍스트는 한글로 표시하고, 영어나 기술적인 용어는 사용하지 않음
2. **다크 테마 일관성**: 모든 컴포넌트가 다크 테마 색상 팔레트를 따르도록 함
3. **접근성**: 충분한 색상 대비와 키보드 접근성 보장
4. **성능 최적화**: 큰 목록은 가상화 또는 페이지네이션 적용
5. **에러 처리**: 모든 사용자 입력과 API 호출에 대한 적절한 에러 처리 및 피드백 제공
6. **반응형 디자인**: 모든 화면 크기에서 적절하게 작동하도록 설계

---

## 9. 아이콘 사용 가이드

이 프로젝트는 `lucide-react` 패키지의 아이콘을 사용합니다. 주요 아이콘 목록:

- **네비게이션**: `Home`, `Settings`, `Users`, `Calendar`, `Box`, `Gift`, `Award`, `Ticket`, `BarChart3`, `FileText`, `Target`
- **액션**: `Plus`, `Edit`, `Trash2`, `Save`, `Search`, `RefreshCw`, `Download`, `Filter`, `RotateCcw`
- **토글**: `ToggleLeft`, `ToggleRight`, `ChevronDown`, `ChevronUp`, `ChevronLeft`, `ChevronRight`
- **알림**: `AlertTriangle`, `Info`, `Check`, `X`
- **기타**: `Menu`, `Bell`, `User`, `PieChart`

아이콘 사용 예:

```jsx
import { Plus, Edit, Trash2 } from 'lucide-react';

// 사용 예
<Plus size={18} className="mr-2" />
```

---

## 10. 결론

이 디자인 가이드는 어드민 페이지의 일관된 구현을 위한 참조 문서입니다. 모든 컴포넌트는 다크 테마 색상 팔레트를 따르며, 반응형 디자인을 적용하여 다양한 화면 크기에서 최적의 사용자 경험을 제공합니다. 이 가이드를 따라 구현하면 기존 어드민 페이지와 동일한 디자인과 기능을 가진 페이지를 만들 수 있습니다.
