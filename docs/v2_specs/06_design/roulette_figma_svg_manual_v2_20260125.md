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
