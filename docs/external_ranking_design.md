# 랭킹 시스템 외부 데이터(타 플랫폼 입금/게임횟수) 연동 설계

## 목표
- 관리자가 타 플랫폼(예: 외부 게임/입금 서비스)에서 유저별 입금액, 게임횟수를 직접 입력/설정할 수 있도록 함
- 입력된 외부 데이터 기반으로 랭킹 집계 및 보상 지급
- 기존 게임 결과 기반 랭킹과 병행 또는 대체 가능

---

## 1. DB/스키마 설계

### 1) 외부 랭킹 데이터 테이블
- `external_ranking_data`
  - id (PK)
  - user_id (FK)
  - platform_name (varchar)
  - deposit_amount (decimal)
  - game_count (int)
  - created_at, updated_at (timestamp)

```sql
CREATE TABLE external_ranking_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    platform_name VARCHAR(64) NOT NULL,
    deposit_amount DECIMAL(18,2) DEFAULT 0,
    game_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id)
);
```

### 2) 랭킹 집계 테이블(기존)
- 기존 게임 로그/랭킹 테이블과 별도 관리
- 필요시 외부/내부 랭킹을 통합하는 뷰 또는 집계 테이블 추가

---

## 2. 관리자 UI/입력 플로우

- `/admin/external-ranking` 페이지 신설
  - 유저 검색/선택
  - 플랫폼명, 입금액, 게임횟수 입력 폼
  - 입력/수정/삭제 기능
  - 일괄 업로드(엑셀/CSV) 지원 가능
- 입력 시 `external_ranking_data` 테이블에 저장

---

## 3. 랭킹 집계/API

- `/ranking/status` API에서 외부 데이터 집계 포함
  - 내부 게임 결과 랭킹과 외부 데이터 랭킹을 분리 또는 통합하여 반환
  - 예시: `{ "internal_ranking": [...], "external_ranking": [...] }`
- 집계 기준(입금액, 게임횟수 등) 명확히 문서화
- 시즌 종료 시 외부 랭킹 기준으로 보상 지급 가능

---

## 4. 보상 지급/로그

- 외부 랭킹 기준 상위 유저에게 관리자 UI에서 보상 지급
  - 기존 `grantGameTokens` 엔드포인트 활용
  - 지급 내역은 기존 지급 로그 테이블에 기록
- 지급/회수 내역, 외부 데이터 변경 이력 모두 DB에 남김

---

## 5. 운영/문서

- README/운영 문서에 외부 랭킹 입력/집계/보상 프로세스 명시
- 데이터 입력/수정/삭제, 집계 기준, 지급 정책 등 상세 가이드 작성

---

## 전체 구조 요약
1. 외부 랭킹 데이터 테이블 신설
2. 관리자 UI에서 유저별 입금액/게임횟수 입력
3. 랭킹 API에서 외부 데이터 집계 포함
4. 시즌 종료 시 외부 랭킹 기준 보상 지급
5. 지급/변경 내역 로그 및 운영 문서화

---

## 예시 ERD
```
user
  |
external_ranking_data
  |
ranking_log
```

---

## 예시 API/운영 문서
- `/admin/external-ranking` (입력/수정/삭제)
- `/ranking/status` (내부/외부 랭킹 동시 반환)
- 지급/회수: 기존 관리자 지급 엔드포인트 활용
- 운영 문서: 외부 랭킹 입력/집계/보상 정책 명시

---

# models/external_ranking.py
from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey
from app.db.base_class import Base

class ExternalRankingData(Base):
    __tablename__ = "external_ranking_data"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    platform_name = Column(String(64), nullable=False)
















    deposit_amount: float    platform_name: str    user_id: int    id: intclass ExternalRankingDataOut(BaseModel):    game_count: int = 0    deposit_amount: float = 0    platform_name: str    user_id: intclass ExternalRankingDataCreate(BaseModel):from typing import Optionalfrom pydantic import BaseModel# schemas/external_ranking.py    deposit_amount = Column(DECIMAL(18,2), default=0)
    game_count = Column(Integer, default=0)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)created_at: Optional[str]    game_count: int    deposit_amount: float    platform_name: str    user_id: int    id: intclass ExternalRankingDataOut(BaseModel):    game_count: int = 0    deposit_amount: float = 0    platform_name: str    user_id: intclass ExternalRankingDataCreate(BaseModel):from typing import Optionalfrom pydantic import BaseModel# schemas/external_ranking.py    deposit_amount = Column(DECIMAL(18,2), default=0)
    game_count = Column(Integer, default=0)





















def list_external_ranking(db: Session = Depends(get_db)):@router.get("/", response_model=list[ExternalRankingDataOut])    return obj    db.refresh(obj)    db.commit()    db.add(obj)    obj = ExternalRankingData(**data.dict())def create_external_ranking(data: ExternalRankingDataCreate, db: Session = Depends(get_db)):@router.post("/", response_model=ExternalRankingDataOut)router = APIRouter(prefix="/admin/external-ranking", tags=["admin"])from app.models.external_ranking import ExternalRankingDatafrom app.schemas.external_ranking import ExternalRankingDataCreate, ExternalRankingDataOutfrom app.api.deps import get_dbfrom sqlalchemy.orm import Sessionfrom fastapi import APIRouter, Depends# app/api/admin/routes/external_ranking.py---    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    return db.query(ExternalRankingData).all()def list_external_ranking(db: Session = Depends(get_db)):@router.get("/", response_model=list[ExternalRankingDataOut])    return obj    db.refresh(obj)    db.commit()    db.add(obj)    obj = ExternalRankingData(**data.dict())def create_external_ranking(data: ExternalRankingDataCreate, db: Session = Depends(get_db)):@router.post("/", response_model=ExternalRankingDataOut)router = APIRouter(prefix="/admin/external-ranking", tags=["admin"])from app.models.external_ranking import ExternalRankingDatafrom app.schemas.external_ranking import ExternalRankingDataCreate, ExternalRankingDataOutfrom app.api.deps import get_dbfrom sqlalchemy.orm import Sessionfrom fastapi import APIRouter, Depends# app/api/admin/routes/external_ranking.py---    created_at = Column(DateTime)
















    }        ]            } for r in external                "game_count": r.game_count                "deposit_amount": float(r.deposit_amount),                "user_id": r.user_id,            {        "external_ranking": [        "internal_ranking": internal,    return {    external = db.query(ExternalRankingData).order_by(ExternalRankingData.deposit_amount.desc()).all()    internal = ... # 기존 게임 결과 랭킹 집계def get_ranking_status(db: Session = Depends(get_db)):@router.get("/ranking/status")# app/api/routes/ranking.py    updated_at = Column(DateTime)
