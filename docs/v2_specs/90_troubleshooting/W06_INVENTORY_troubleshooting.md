문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: INVENTORY
상태: 진행 중 ⏳

# W06 INVENTORY 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 1 |
| SoT 승격 예정 | 0 |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) INVENTORY 리포트](./archive/weekly/W05_FRONTEND_troubleshooting.md)
- [Inventory learned SoT](../00_sot_meta/00_A_sot_code_ops_chk/learned_/inventory/05.inventory.md)

---

## 🔍 주간 이슈 내역

### [02-04] - INVENTORY/ADMIN: 회수(ADMIN_REVOKE) 로그가 USE로 표시됨

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 티켓/인벤토리 로그 조회 (GET /api/v2/admin/inventory/logs) |
| HTTP Status | 200 (Logic Error - 회수 로그가 USE로 표시) |
| 영향 범위 | 어드민 로그/통계(회수 카운트, 필터) |
| 재현 빈도 | 항상 |

**증거 기반 RCA**
- 로그 타입이 단순히 음수(`delta < 0`)면 `USE`로 분류됨
- 어드민 회수(ADMIN)와 유저 사용(소비)을 구분하지 못함

**해결 방법**
- 관리자 액션(`label`/`related_id`가 admin 식별자)일 때 **REVOKE**로 분류
- 일반 소비는 기존처럼 **USE** 유지

```python
# app/v2/api/admin/inventory_routes.py
if log.delta < 0:
    log_type = "REVOKE" if is_admin_label(log.label) else "USE"
else:
    log_type = "GRANT"
```

**수정 파일**
- `app/v2/api/admin/inventory_routes.py`

**검증 방법**
- 어드민 회수 실행 후 `/api/v2/admin/inventory/logs`에서 type=REVOKE 확인
- 인벤토리/티켓 페이지 필터(회수) 정상 동작 확인

**🏷️ 태그**
`P1` `ADMIN` `INVENTORY` `TICKET` `LOG_CLASSIFICATION`
