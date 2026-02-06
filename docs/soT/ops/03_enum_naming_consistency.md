# 03_enum_naming_consistency.md 🟢

## 한줄 요약
SoT 문서의 Enum/상수(CostType, RewardType, SKU/Product ID 네이밍 등)가 코드/DB/프론트와 1:1 매핑되는지 자동 검증을 추가합니다.

---

## Scope
- Enums: `CostType`, `RewardType`, `GameTokenType` 등
- Files to inspect: `app/v2/models/shop.py`, `app/v2/enums.py` (if exists), frontend TypeScript enums

---

## Implementation Steps
1. Create canonical enum source in repository (docs JSON):
   - `docs/soT/canonical_enums/shop_enums.json` (format below)

```json
{
  "CostType": ["VAULT", "DIAMOND"],
  "RewardType": ["TICKET", "ITEM"]
}
```

2. Add test that asserts runtime enums match canonical file:
   - `tests/test_enum_matches_sot.py`
   - Example (pseudo):
```py
from app.v2.enums import CostType
import json

canonical = json.load(open('docs/soT/canonical_enums/shop_enums.json'))
assert set([e.name for e in CostType]) == set(canonical['CostType'])
```

3. Integrate into CI (pytest) so mismatch fails the build

4. Optionally: create a small `scripts/enum_sync.py` to generate TS/py enums from canonical JSON

---

## Tests
- `test_enum_matches_sot` (fail-fast, informative message)
- Add similar checks for DB enum/value constraints if used

---

## Ops
- When SoT change occurs, update `docs/soT/canonical_enums/shop_enums.json` and create a PR that updates both docs and code

---

> Benefit: prevents drift between policy doc and code/FE, enabling safer deployments.