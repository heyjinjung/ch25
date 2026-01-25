# v2 룰렛(Figma → 로컬 SVG) 구현 메뉴얼 (AI 재현용)

- 작성일: 2026-01-25
- 목적: Figma 디자인을 기준으로, 외부 URL 없이 **로컬 SVG 에셋만**으로 룰렛 UI를 재현한다.
- 대상: v2 유저 게임 룰렛 페이지
- 스택: React + Vite + TypeScript, Tailwind 기반 스타일


## 0) 범위/원칙

### 범위
- 룰렛 UI(프레임/휠/오버레이/포인터/센터캡)만 다룬다.
- 게임 로직(확률/보상/서버 응답)은 변경하지 않고, **표시/정렬/인덱스 매칭**만 검증한다.

### 원칙
- SoT(디자인): Figma 노드 구조/블렌드 모드/레이어 순서
- SoT(에셋): `public/assets/roulette/*.svg` 로컬 파일
- 외부 Figma asset URL은 만료되므로(일시적), 최종 구현에서는 사용 금지


## 1) 입력(필요한 정보)

### 1.1 Figma 노드
- 룰렛 메인: `1189:616`
- 오버레이 그룹(휠 상단 질감): `1189:761`
- 오버레이 개별 노드:
  - `1189:757` = 12 (multiply)
  - `1189:758` = 13 (포인터)
  - `1189:759` = 14 (overlay)
  - `1189:760` = 15 (overlay)
  - `1189:761` = 16 (센터캡 그룹)


## 2) 필수 로컬 에셋 목록

모든 파일은 아래 경로에 존재해야 한다.
- `public/assets/roulette/`

### 2.1 프레임(고정, 292×293 기준)
- `Vector.svg` (외곽 링)
- `Vector2.svg` (내부 다크 링)
- `Vector3.svg` (컨텐츠 위에 덮는 링)

### 2.2 휠 조각(회전, 8개)
- `Vector4.svg`
- `Vector5.svg`
- `Vector6.svg`
- `Vector7.svg`
- `Vector8.svg`
- `Vector9.svg`
- `Vector10.svg`
- `Vector11.svg`

### 2.3 오버레이/포인터/센터캡
- `12.svg` (multiply)
- `13.svg` (포인터)
- `14.svg` (overlay)
- `15.svg` (overlay)
- `16.svg` (센터캡)


## 3) 레이어 구조(권장 SoT)

### 3.1 전체 컨테이너
- 기준 비율은 292:293 이다.
- 컨테이너는 `aspect-[292/293]`로 고정(정사각형 강제 금지).

### 3.2 레이어 순서(z-order)

1) Frame Layer (고정)
- `Vector.svg` (100%)
- `Vector2.svg` (~98.46%)

2) Wheel Layer (회전)
- `12.svg` (multiply, ~98.4%)
- `Vector4~Vector11.svg` (8조각)
- `14.svg` (overlay, ~86.33%)
- `15.svg` (overlay, ~26.98%)
- `16.svg` (센터캡)

3) Frame Ring Overlay (고정)
- `Vector3.svg` (Wheel 위에 덮기)

4) Pointer (고정)
- `13.svg`


## 4) Figma 좌표/크기 → 퍼센트 변환 규칙

### 4.1 퍼센트 변환 공식
부모 컨테이너 기준으로:

- left% = (x / parentWidth) * 100
- top% = (y / parentHeight) * 100
- width% = (width / parentWidth) * 100
- height% = (height / parentHeight) * 100

### 4.2 적용 방식
- 조각(Vector4~Vector11)처럼 “특정 위치에 붙는 형태”는:
  - `absolute left-[..%] top-[..%] w-[..%] h-[..%]`
- 12/14/15/16처럼 “중앙 정렬 + 비율 고정”이 중요한 요소는:
  - 바깥 래퍼: `absolute inset-0 flex items-center justify-center`
  - 내부 img: `w-[..%] h-[..%]`


## 5) 블렌드 모드(필수)

Figma 기준:
- 12.svg: multiply → `mix-blend-multiply`
- 14.svg: overlay → `mix-blend-overlay`
- 15.svg: overlay → `mix-blend-overlay`

권장 규칙:
- 블렌드 적용 레이어는 `pointer-events-none` 사용
- 순서가 틀리면 색/광원이 완전히 달라진다(특히 12가 너무 위로 올라가면 전체가 뿌옇게 됨)


## 6) 구현 패턴(코드 구조)

### 6.1 파일 위치(참고)
- 프레임: src/v2/components/game/RouletteFrame.tsx
- 휠: src/v2/components/game/RouletteWheel.tsx
- 페이지: src/v2/pages/game/RoulettePage.tsx

### 6.2 프레임 구성
- Frame은 “고정 레이어 + 중앙 Wheel 슬롯 + 링 오버레이”만 담당한다.
- Wheel 슬롯 크기는 Vector3 링과 동일 비율로 맞춘다.

### 6.3 휠 구성
- 회전 대상은 하나의 컨테이너(`wheelRef`)로 통일한다.
- 회전 컨테이너 내부에는 다음이 포함된다:
  - 12, Vector4~11, 14, 15, 16
- 포인터(13)는 회전 컨테이너 밖, 최상단에 고정한다.


## 7) 게임 로직(포인터 결과 일치) 검증

### 7.1 용어
- segmentCount = 8
- selectedIndex = 서버 응답의 slot_index
- 포인터는 “12시(상단)” 기준

### 7.2 각도 계산(중심 보정)
선택된 인덱스의 “조각 중심”이 포인터 아래에 오도록 half-segment 보정이 필요하다.

- anglePerSegment = 360 / segmentCount
- target = 360 - (anglePerSegment * selectedIndex) - (anglePerSegment / 2)
- spinTo = 360 * baseTurns + target

### 7.3 체크리스트(최소 2회)
1) 스핀 시작 직후, 서버 응답 `slot_index`를 로그로 확인한다.
2) 스핀 종료 시, 포인터 아래에 보이는 조각/라벨이 `segments[slot_index]`와 일치하는지 확인한다.
3) 한 칸씩 밀리면: half-segment 보정 누락 가능성이 높다.
4) 방향이 반대면: 조각 배치 순서(Vector4~Vector11)가 시계/반시계로 뒤집혔을 수 있다.


## 8) 트러블슈팅

### 8.1 오버레이가 안 보이거나 너무 약함
- 블렌드 모드(`mix-blend-multiply/overlay`) 누락 여부 확인
- 레이어 순서(12가 아래, 14/15가 위) 확인
- `inset-0`로 늘려서 “모양이 깨지는” 배치를 했는지 확인 → 중앙정렬+비율 고정으로 수정

### 8.2 포인터/센터캡이 늘어나는 문제
- 13/16은 “픽셀 기반 자산”에 가까워서 `absolute inset-0`로 깔면 왜곡된다.
- 해결: `left-1/2 top-0` + `w-auto h-...` 같은 방식으로 고정 크기/비율 적용

### 8.3 no-loss-of-precision 경고
- 매우 긴 소수점 숫자 리터럴을 코드에 직접 넣으면 발생 가능
- 해결: 퍼센트 값은 Tailwind arbitrary 값(문자열)로 유지하거나, 계산식으로 생성하되 ‘긴 리터럴’ 직접 하드코딩을 피한다.


## 9) 완료 조건(Definition of Done)
- 외부 URL 없이 `/assets/roulette/*.svg`만으로 렌더링된다.
- 포인터는 고정, 휠(조각+오버레이+센터캡)은 함께 회전한다.
- `slot_index`와 포인터 아래 결과가 일치한다.
- 프론트 빌드가 통과한다.



룰렛 라벨이 조각 밖으로 절대 안 나가게, 휠 크기를 기준으로 반지름/가용폭을 계산하고 2줄 클램프를 적용하는 최소 패치를 진행하겠습니다.

읽기 RouletteWheel.tsx, 220 줄에서 223 줄까지

Edited
RouletteWheel.tsx+44-2
요약된 대화 내용

라벨 패치가 적용됐고, 지금은 ESLint가 style= 인라인 스타일을 에러로 잡고 있어요. 다음으로는 라벨 배치를 “중첩 div + 고정 클래스(버킷)” 방식으로 바꿔 인라인 스타일을 제거하는 최소 패치를 계획하겠습니다. 먼저 현재 블록을 정확히 확인할게요.

읽기 RouletteWheel.tsx, 160 줄에서 262 줄까지

PLAN
A) Triage Summary (facts only)

RouletteWheel.tsx에서 라벨이 조각 밖으로 나가던 원인(고정 반지름 + nowrap)을 해결하기 위해 “휠 크기 기반 반지름/가용폭 계산 + 2줄 클램프” 로직을 이미 넣었습니다.
현재 파일에서 style={{ transform: ... }}, style={{ maxWidth: ... }} 같은 인라인 스타일이 ESLint 규칙에 의해 에러로 잡힙니다.
따라서 “조각 안에 넣기” 기능은 방향이 맞지만, 빌드/린트 통과를 위해 인라인 스타일 제거가 필요합니다.
B) Root Cause Hypotheses TOP3 (ranked)

프로젝트 ESLint 규칙이 style= 사용을 금지
Why plausible: 현재 에러 메시지가 “CSS inline styles should not be used”로 명확함
How to confirm: 같은 파일에서 style= 제거 시 에러 사라지는지 get_errors로 확인
Tailwind/JIT 특성상 “동적 className”로만 처리하면 클래스가 빌드에 포함되지 않을 위험
Why plausible: Tailwind는 정적 문자열 스캔 중심이라 런타임 문자열 조합은 누락될 수 있음
How to confirm: 버킷 클래스들을 “리터럴로 나열”한 후 frontend build 통과 확인
라벨 배치가 transform 조합이라 단일 class로 완전 대체가 어려움
Why plausible: 현재 transform 순서가 rotate + translate 조합
How to confirm: 중첩 div로 transform을 분해하면 인라인 없이 동일 배치 재현 가능
C) Fix Plan

Allowed Files (최대 12개)
RouletteWheel.tsx
(필요 시) src/v2/components/game/rouletteWheel.css 또는 기존 인접 스타일 파일 1개 (프로젝트 패턴 확인 후)
Out of Scope
스핀 로직/각도 보정/세그먼트 데이터 구조 변경
SVG 레이어/블렌드 모드/에셋 경로 변경
다른 게임(주사위/로또) UI 수정
Minimal patch strategy
인라인 style을 없애기 위해 라벨 렌더링을 “중첩 div transform 분해”로 변경:
바깥: rotate(${rotateDeg})도 인라인이므로, 여기 역시 “버킷 회전”은 불가(8개 고정이니 8개 클래스를 리터럴로 나열해 선택)
안쪽: 반지름/폭도 인라인 금지 → 반지름/폭을 몇 개 버킷 값으로 quantize해서 해당 Tailwind arbitrary class를 리터럴로 준비해 선택
line-clamp-2는 유지 (이미 사용 중)
Verify Checklist
Frontend: RouletteWheel.tsx get_errors가 0인지
Frontend: npm run build (workspace task “frontend build”) 통과
UX: 라벨 샘플(룰렛1만/스벅깁콘1만/보너스콤프적용권/CC포인트 10민)이 조각 밖으로 튀지 않는지 확인
D) Missing info (필요 시 1회만 요청)

없음. (현재 에러/코드 위치가 확정이라 바로 패치 가능)
인라인 스타일 금지 규칙을 만족시키기 위해, “라벨 반지름/폭을 버킷으로 고정 + 8개 회전 각도는 8개 클래스 리터럴로 분기” 방식으로 바꾸는 PATCH를 진행해도 될까요? (승인해주시면 바로 최소 diff로 고칩니다.)