# V2 Admin 권한 제약(SuperAdmin) 트러블슈팅 리포트

**문서 번호**: TR-20260120-05  
**작성일**: 2026-01-20  
**작성자**: Antigravity  
**상태**: 해결됨(Resolved)  
**관련**: `app/v2/api/admin/user_routes.py`, `app/v2/api/admin/inventory_routes.py`, `WalletEditor.tsx`

---

## 1. 개요
V2 Admin 시스템에서 자산 수량 조정(티켓/금고) 시 특정 직급(`ADMIN`) 유저에게 `403 Forbidden` 에러가 발생하는 이슈를 정리한다. 이는 기존 코드에 내장된 불필요한 직급 제한 로직으로 인한 것으로 확인되어, 해당 제약을 전면 삭제하여 해결하였다.

---

## 2. 이슈 상세 및 해결

### 2.1 Wallet Adjustment 403 Forbidden
- **증상**: `ADMIN` 권한을 가진 운영자가 유저 상세 드로어에서 자산 수정 시도 시 API 요청이 거부됨.
- **원인**: 
    - 백엔드 `user_routes.py` 내 `adjust_user_wallet` 함수에 `SUPER_ADMIN` 또는 `OPERATOR` 직급만 허용하는 하드코딩된 체크 로직이 존재함.
    - `if admin_role not in ["SUPER_ADMIN", "OPERATOR"]: raise HTTPException(status_code=403)`
- **해결**: 해당 직급 제한 로직을 삭제함. `get_current_admin_info`를 통해 인증된 어드민이라면 모든 자산 조작이 가능하도록 변경.
- **상태**: 해결됨

### 2.2 Inventory Permission Restriction
- **증상**: 인벤토리 관련 조작 시에도 잠재적인 직급 제한으로 인한 이슈 가능성 확인.
- **원인**: `inventory_routes.py` 내 `check_admin_permission` 유틸리티 함수가 특정 직급 리스트를 검사하고 있음.
- **해결**: `check_admin_permission` 함수를 `pass`로 처리하여 모든 인증된 어드민에게 권한을 개방함.
- **상태**: 해결됨

---

## 3. 기술적 결정 사항
- **권한 모델 단순화**: V2 Admin은 `get_current_admin_info` 의존성을 통해 이미 기본적인 어드민 인증을 수행함. API 내부에서 2차적으로 직급(`SUPER_ADMIN` 등)을 필터링하는 것은 운영 유연성을 저해하므로 삭제하는 방향으로 결정함.

---

## 4. 재발 방지 체크리스트
- [ ] 신규 Admin API 추가 시 `get_current_admin_info` 외에 불필요한 직급 필터링이 포함되어 있는지 확인
- [ ] 특정 기능에 엄격한 제한이 필요한 경우에만 명시적으로 역할 기반 권한 부여(RBAC) 설계 적용
- [ ] 에러 발생 시 프론트엔드 에러 로그(403)를 통해 백엔드 권한 로직 우선 검토
