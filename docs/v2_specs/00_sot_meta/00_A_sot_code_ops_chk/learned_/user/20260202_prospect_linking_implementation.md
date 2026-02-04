# HQ 잠재유저 매칭 시스템 구현

- **작성일**: 2026-02-02
- **상태**: ✅ 구현 완료
- **관련 이슈**: 텔레그램 username 미설정 유저 매칭 불가 문제

---

## 1. 문제 정의

### 배경
HQ(외부 카지노) CSV 데이터를 통해 VIP/WHALE 세그먼트 유저를 식별하고 있으나, 
텔레그램 미니앱 유저 중 **username을 설정하지 않은 유저**는 telegram_id만 존재하여 
HQ 닉네임과 자동 매칭이 불가능했음.

### 영향
- VIP/WHALE 유저가 일반 유저로 분류되어 적절한 혜택 미제공
- 고가치 유저 이탈 위험 증가
- 마케팅 타겟팅 정확도 저하

---

## 2. 솔루션 개요

**듀얼 매칭 시스템** 구현:

| 방식 | 주체 | 설명 |
|------|------|------|
| **Admin 수동 매칭** | 운영자 | `/admin/prospect/linking`에서 HQ 잠재유저 목록 확인 후 V2User와 수동 연결 |
| **User Self-Linking** | 유저 | 미니앱에서 본인 CC닉네임 입력 → HQ 데이터와 퍼지 매칭으로 자동 연결 |

---

## 3. 기술 구현

### 3.1 DB 스키마 확장

#### V2User 테이블 추가 필드
```sql
ALTER TABLE v2_user ADD COLUMN external_nickname VARCHAR(100);
ALTER TABLE v2_user ADD COLUMN external_linked_at DATETIME;
ALTER TABLE v2_user ADD COLUMN hq_segment VARCHAR(50);  -- VIP, WHALE, AT_RISK
```

#### HQProspectiveUser 테이블 추가 필드
```sql
ALTER TABLE hq_prospective_user ADD COLUMN linked_user_id INT REFERENCES v2_user(id);
ALTER TABLE hq_prospective_user ADD COLUMN linked_at DATETIME;
ALTER TABLE hq_prospective_user ADD COLUMN ignored BOOLEAN DEFAULT FALSE;
ALTER TABLE hq_prospective_user ADD COLUMN ignored_at DATETIME;
ALTER TABLE hq_prospective_user ADD COLUMN ignored_reason VARCHAR(200);
```

### 3.2 핵심 서비스: ProspectLinkingService

**위치**: `app/v2/services/prospect_linking_service.py`

#### 퍼지 매칭 알고리즘
```python
from difflib import SequenceMatcher

def normalize_nickname(nickname: str) -> str:
    """특수문자 제거 + 소문자 변환"""
    return re.sub(r'[^a-z0-9가-힣]', '', nickname.lower())

def calculate_similarity(str1: str, str2: str) -> float:
    """0.0 ~ 1.0 유사도 반환 (SequenceMatcher 사용)"""
    return SequenceMatcher(None, normalize(str1), normalize(str2)).ratio()
```

#### 주요 메서드
- `find_similar_users(nickname, threshold=0.7)` - 유사 V2User 검색
- `get_unlinked_prospects(segment_filter, include_ignored, limit, offset)` - 미연결 목록
- `admin_link_prospect(prospect_id, user_id, admin_id)` - Admin 수동 연결
- `admin_ignore_prospect(prospect_id, admin_id, reason)` - 무시 처리
- `user_self_link(user_id, external_nickname)` - 유저 셀프 연동

### 3.3 API 엔드포인트

#### Admin API (`/api/v2/admin/prospect/`)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/prospects` | 미연결 잠재유저 목록 + 유사도 추천 |
| POST | `/prospects/{id}/link` | 수동 연결 |
| POST | `/prospects/{id}/ignore` | 무시 처리 |
| GET | `/prospects/stats` | 연동 현황 통계 |
| GET | `/users/search` | V2User 검색 (연결용) |

#### User API (`/api/v2/user/`)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/link-status` | 연동 상태 + 혜택 정보 |
| POST | `/link-external` | 외부 닉네임 연동 |
| DELETE | `/link-external` | 연동 해제 |

### 3.4 프론트엔드 컴포넌트

#### Admin 대시보드
**파일**: `src/v2/admin/pages/prospect/ProspectLinkingPage.tsx`
**경로**: `/admin/prospect/linking`

기능:
- 통계 카드 (전체/연결/대기/무시/연결률) - **클릭 시 상태별 상세 리스트 필터링**
- 세그먼트 필터 (ALL/VIP/WHALE/AT_RISK)
- 무시 항목 포함 토글
- 잠재유저 목록 + 유사도 추천 배지
- 연결 다이얼로그 (추천 목록 + 수동 검색)
- 무시 다이얼로그 (사유 입력)

#### User Self-Link 카드
**파일**: `src/v2/components/user/ExternalLinkCard.tsx`

기능:
- 연동 전: VIP/WHALE 혜택 안내 + 연동 버튼
- 연동 다이얼로그: 외부 닉네임 입력 → 결과 표시
- 연동 후: 세그먼트 배지 + 적용 혜택 목록 + 해제 버튼

---

## 4. 사용 시나리오

### 시나리오 A: Admin 수동 매칭
1. Admin이 `/admin/prospect/linking` 접속
2. 세그먼트별 미연결 잠재유저 목록 확인
3. 각 잠재유저에 대해 유사도 기반 V2User 추천 확인
4. "연결" 버튼 → 추천 유저 선택 또는 수동 검색
5. 연결 완료 → V2User에 세그먼트 즉시 적용

### 시나리오 B: User Self-Linking
1. 유저가 미니앱 프로필/설정 페이지 진입
2. `ExternalLinkCard` 컴포넌트에서 "계정 연동하기" 클릭
3. 외부 카지노 닉네임 입력 (예: "큰손고래123")
4. 시스템이 HQ 데이터에서 퍼지 매칭으로 검색
5. 매칭 성공 시 → 세그먼트 즉시 적용 + 혜택 안내
6. 매칭 실패 시 → "대기 중" 상태 (Admin 수동 확인 필요)

---

## 5. 파일 목록

### 백엔드
- `app/v2/models/user.py` - V2User 모델 확장
- `app/v2/models/hq_prospective_user.py` - HQProspectiveUser 모델 확장
- `app/v2/services/prospect_linking_service.py` - 핵심 비즈니스 로직
- `app/v2/api/admin/prospect_routes.py` - Admin API
- `app/v2/api/user_link_routes.py` - User API
- `alembic/versions/20260202_1600_add_external_linking_fields.py` - 마이그레이션

### 프론트엔드
- `src/v2/admin/pages/prospect/ProspectLinkingPage.tsx` - Admin 대시보드
- `src/v2/components/user/ExternalLinkCard.tsx` - User Self-Link UI
- `src/v2/router/V2AdminRoutes.tsx` - 라우트 등록
- `src/v2/admin/layouts/AdminLayout.tsx` - 사이드바 메뉴 추가

---

## 6. 향후 개선 사항

- [ ] 벌크 매칭: CSV 업로드로 다수 유저 일괄 연결
- [ ] 매칭 히스토리: 연결/해제 이력 관리
- [ ] 알림: 새 잠재유저 등록 시 Admin 알림
- [ ] 자동 매칭 스케줄러: 주기적으로 미연결 유저 자동 매칭 시도

---

## 7. 관련 문서

- [HQ 마진 CSV Import 스펙](../golden/12.hq_margin_csv_import_comprehensive.md)
- [CSV 데이터 통합 확장](../golden/20260202_csv_data_integration_expansion_implementation.md)
- [User 일관성 가이드](./user_consistency_guide.md)
