# 20260129 텔레그램 미션 신뢰성 최적화 업데이트

## 배경
텔레그램 채널 가입 및 공유(스토리/링크) 미션 진행 시 보상 누락 및 운영 에러가 빈번함에 따라, **V2 Native 표준(V2User, cc_id)**을 적용한 정밀한 트리거 로직과 백엔드 검증 체계를 정립함.

## 기술적 변경 사항 (Learned Logic)

### 1. 정확한 트리거 공식 (Trigger Mapping)
미션의 `action_type`에 따라 최적화된 UX 및 트리거 방식을 적용함.

| 미션 유형 | 트리거 (SDK) | 보상 기록 방식 | UX 가이드 |
| :--- | :--- | :--- | :--- |
| **채널 가입** | `tg.openTelegramLink` | **2단계 서버 검증** | 가입(Link) -> 복귀 -> 확인(Verify) |
| **스토리 공유** | `tg.shareToStory` | 신뢰 기반 즉시 기록 | 공유 기능 호출 즉시 API 트리거 |
| **링크 공유** | `tg.openTelegramLink` | 신뢰 기반 즉시 기록 | 공유 링크 오픈 즉시 API 트리거 |

- **V2 Native 표준**: 모든 미션 기록 시 legacy `User` 모델을 폐기하고 `V2User` 모델의 `cc_id`를 식별자로 사용함.

### 2. 백엔드 검증 및 멱등성 (Viral API)
- **서버 검증 (Server-side)**: 채널 가입 미션은 텔레그램 `getChatMember` API를 통해 실제 멤버십 유무를 백엔드에서 최종 확인 후 완료 처리함.
- **멱등성 로직**: `MissionService.update_progress` 내에서 `is_completed` 상태를 선제적으로 체크하여, 이미 보상이 지급된 미션에 대한 중복 지급을 원천 방지함.
- **로깅 (Ops-Friendly)**: `[VIRAL_VERIFY]` 태그와 함께 유저의 `telegram_id` 및 API 응답 상세(Error Code 등)를 기록하여 CS 대응력을 높임.

## 검증 결과 (Verification)

### 자동화 테스트 성공 (Full Cycle)
- **테스트 파일**: `tests/v2/test_viral_full_cycle.py`
- **검증 항목**:
    - V2 Native 유저(cc_id) 기반 인증 토큰 발급 및 보안 검증.
    - 채널 가입 -> 서버 확인 -> 보상 지급의 풀 사이클 정상 작동.
    - 공유 액션 즉시 기록 및 멱등성(중복 지급 방지) 성공.
- **결과**: **6 Tests Passed ✅**

## 운영 및 대응 가이드 (Admin/CS)
- **지급 누락 문의**: 백엔드 로그에서 유저의 `cc_id` 또는 `telegram_id`와 `[VIRAL_VERIFY]` 태그를 조합하여 검색 시, 실제 텔레그램 서버가 가입 상태를 'member'로 판단했는지 여부를 즉시 확인할 수 있음.
- **공유 미션 정책**: 텔레그램 API 특성상 성공 콜백이 없으므로, 공유 시도는 'Trust-based'로 처리됨을 안내함.

---
> **Note**: 본 문서는 V2 Native 전환 이후 텔레그램 미션 신뢰성 운영의 표준(SOT)으로 사용됨.
