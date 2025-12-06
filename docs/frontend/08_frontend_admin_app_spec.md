# 관리자 앱 화면 스펙

- 문서 타입: 프론트엔드 관리자 앱 스펙
- 버전: v1.0
- 작성일: 2025-12-10
- 작성자: 시니어 백엔드/FE 협업 가이드
- 대상 독자: 프론트엔드 개발자, 운영, QA

## 1. 목적 (Purpose)
- 관리자용 SPA의 페이지/폼/테이블 요구사항을 정의해 구현과 운영 프로세스를 명확히 한다.

## 2. 범위 (Scope)
- Scope: `/admin/*` 라우트의 화면, 폼 필드, 검증 스키마, API 매핑.
- Out of Scope: 인증 백엔드 상세, 권한 세분화 정책.

## 3. 용어 정의 (Definitions)
- Slot Editor: 룰렛 6칸 편집 폼.
- Prize Editor: 복권 상품/확률/재고 편집 폼.

## 4. 본문 (페이지 스펙)
- `/admin/login`: 아이디/비밀번호 입력, 로그인 실패 토스트, 토큰 저장(Httponly 권장).
- `/admin`: 요약 대시보드(오늘 feature, 간단 지표).
- `/admin/seasons`: 시즌 목록/생성/수정. 필수 필드: season_name, start/end, max_level, base_xp_per_stamp.
- `/admin/feature-schedule`: 날짜별 feature_type 지정 테이블/캘린더, 중복 방지 경고.
- `/admin/roulette`: slot_index 0~5 편집(라벨/보상/weight). Σweight>0 검증, is_active config 토글.
- `/admin/dice`: max_daily_plays, win/draw/lose reward 타입/금액 설정.
- `/admin/lottery`: prize 리스트 테이블(label/reward/weight/stock/is_active), Σweight>0 검증, stock 0 제외.
- `/admin/ranking`: date별 rank/score/display_name 입력, UNIQUE(date, rank) 유효성.
- 모든 폼: react-hook-form + Zod 스키마, 저장 전 클라이언트 검증.

## 5. 예시
- 룰렛 슬롯 Zod 스키마 예시:
```ts
const slotSchema = z.object({
  slot_index: z.number().min(0).max(5),
  label: z.string().min(1),
  reward_type: z.enum(["POINT", "COUPON", "TOKEN", "NONE"]),
  reward_amount: z.number().min(0),
  weight: z.number().min(0)
});
```

## 6. Validation / Checklist
- [ ] 모든 Admin 폼에 react-hook-form + Zod 검증이 정의되었는가?
- [ ] feature-schedule 중복 방지/경고 UX가 명시되었는가?
- [ ] 룰렛 6칸, 복권 Σweight>0, ranking UNIQUE(date, rank) 검증이 포함되었는가?
- [ ] Admin 인증 실패 시 로그인 페이지로 리다이렉트 규칙이 정의되었는가?

## 7. 변경 이력 (Changelog)
- v1.0 (2025-12-10): 최초 작성. Admin 라우트, 폼/테이블 요구사항, 검증 규칙 정의.
