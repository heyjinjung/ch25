"""Paste Import Service - 클립보드 붙여넣기로 데이터 Import

두 가지 형식 지원:
1. 게임 로그: 번호/이름/닉네임/타입/베팅일시/게임종류/금액
2. 데일리 입금: 번호/소속/이름(아이디)/닉네임/신청날짜/충전금액/입금자명/충전날짜/상태

작성일: 2026-02-04
"""
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.v2.models import V2User, ExternalRankingData
from app.v2.models.v2_hq_daily_deposit_log import HQDailyDepositLog
from app.v2.services import V2AdminAuditService
from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService
from app.v2.schemas.v2_cc_deposit import CCDepositCreate

logger = logging.getLogger(__name__)


@dataclass
class ParsedDeposit:
    """파싱된 입금 건"""
    nickname: str
    amount: int
    deposit_at: Optional[datetime]
    depositor_name: str
    raw_line: str


@dataclass
class ParsedGameLog:
    """파싱된 게임 로그"""
    cc_id: str
    nickname: str
    log_type: str  # 베팅/결과
    bet_at: datetime
    game_type: str
    amount: int
    raw_line: str


class PasteImportService:
    """클립보드 붙여넣기 Import 서비스"""

    @staticmethod
    def _parse_amount(value: str) -> int:
        """금액 파싱 (콤마, 공백, '원' 제거)"""
        if not value:
            return 0
        cleaned = value.replace(',', '').replace(' ', '').replace('원', '').replace('₩', '').strip()
        if not cleaned or cleaned == '-':
            return 0
        try:
            return int(float(cleaned))
        except (ValueError, TypeError):
            return 0

    @staticmethod
    def _parse_datetime(value: str) -> Optional[datetime]:
        """다양한 날짜 형식 파싱"""
        if not value:
            return None
        value = value.strip()
        
        formats = [
            "%Y/%m/%d %H:%M:%S",  # 2026/02/04 11:10:09
            "%Y/%m/%d %H:%M",     # 2026/02/04 11:10
            "%y/%m/%d %H:%M",     # 26/02/04 16:00
            "%y/%m/%d",           # 26/02/04
            "%Y-%m-%dT%H:%M:%S",  # 2026-02-04T00:00:00
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d",
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
        return None

    @staticmethod
    def _extract_cc_id(name_with_id: str) -> Tuple[str, str]:
        """'박관종(hjer5429)' → ('hjer5429', '정우성')"""
        # 이름 (아이디) 형식에서 아이디 추출
        match = re.search(r'\(([^)]+)\)', name_with_id)
        if match:
            cc_id = match.group(1)
            name = name_with_id.replace(f'({cc_id})', '').strip()
            return cc_id, name
        return name_with_id, name_with_id

    @staticmethod
    def parse_daily_deposit(text: str) -> List[ParsedDeposit]:
        """데일리 입금 로그 파싱
        
        형식: 번호\t소속\t이름(아이디)\t닉네임\t신청날짜\t충전금액\t입금자명\t충전날짜\t상태
        또는: 네임\t금액\t입금일시\t입금자 (붙여넣기 4열)
        """
        results = []
        lines = text.strip().split('\n')
        
        for line in lines:
            if not line.strip():
                continue

            parts = line.split('\t') if '\t' in line else re.split(r"\s{2,}|\t+", line.strip())
            if len(parts) < 6:
                if len(parts) < 4:
                    continue
            
            # 헤더 스킵
            if '번호' in parts[0] or '닉네임' in parts[0] or '네임' in parts[0]:
                continue
            
            try:
                if len(parts) >= 8:
                    # 번호, 소속, 이름(아이디), 닉네임, 신청날짜, 충전금액, 입금자명, 충전날짜, 상태
                    nickname = parts[3].strip() if len(parts) > 3 else ''
                    amount = PasteImportService._parse_amount(parts[5]) if len(parts) > 5 else 0
                    depositor = parts[6].strip() if len(parts) > 6 else ''
                    # 신청날짜(parts[4])에 시분 정보가 있으면 우선 사용, 없으면 충전날짜(parts[7]) 사용
                    request_date_str = parts[4].strip() if len(parts) > 4 else ''
                    charge_date_str = parts[7].strip() if len(parts) > 7 else ''
                    # 신청날짜에 시간 정보가 있으면 (콜론 포함) 우선 사용
                    deposit_date_str = request_date_str if ':' in request_date_str else charge_date_str
                    deposit_at = PasteImportService._parse_datetime(deposit_date_str)
                else:
                    # 네임, 금액, 입금일시, 입금자
                    nickname = parts[0].strip() if len(parts) > 0 else ''
                    amount = PasteImportService._parse_amount(parts[1]) if len(parts) > 1 else 0
                    deposit_date_str = parts[2].strip() if len(parts) > 2 else ''
                    depositor = parts[3].strip() if len(parts) > 3 else ''
                    deposit_at = PasteImportService._parse_datetime(deposit_date_str)
                
                if nickname and amount > 0:
                    results.append(ParsedDeposit(
                        nickname=nickname,
                        amount=amount,
                        deposit_at=deposit_at,
                        depositor_name=depositor,
                        raw_line=line,
                    ))
            except Exception as e:
                logger.warning(f"[PasteImport] Failed to parse line: {line}, error: {e}")
                continue
        
        return results

    @staticmethod
    def parse_game_log(text: str) -> List[ParsedGameLog]:
        """게임 로그 파싱
        
        형식: 번호\t이름\t닉네임\t타입\t베팅일시\t게임종류\t금액
        """
        results = []
        lines = text.strip().split('\n')
        
        for line in lines:
            if not line.strip():
                continue
            
            parts = line.split('\t')
            if len(parts) < 7:
                continue
            
            # 헤더 스킵
            if '번호' in parts[0] or '베팅일시' in parts[0]:
                continue
            
            try:
                # 번호, 이름(아이디), 닉네임, 타입, 베팅일시, 게임종류, 금액
                cc_id, _ = PasteImportService._extract_cc_id(parts[1].strip())
                nickname = parts[2].strip()
                log_type = parts[3].strip()  # 베팅/결과
                bet_at = PasteImportService._parse_datetime(parts[4].strip())
                game_type = parts[5].strip()
                amount = PasteImportService._parse_amount(parts[6])
                
                if nickname and bet_at:
                    results.append(ParsedGameLog(
                        cc_id=cc_id,
                        nickname=nickname,
                        log_type=log_type,
                        bet_at=bet_at,
                        game_type=game_type,
                        amount=amount,
                        raw_line=line,
                    ))
            except Exception as e:
                logger.warning(f"[PasteImport] Failed to parse game log: {line}, error: {e}")
                continue
        
        return results

    @staticmethod
    def import_daily_deposits(
        db: Session,
        text: str,
        admin_id: str,
    ) -> Dict:
        """데일리 입금 Import (붙여넣기)
        
        - 기존 기록된 최신 시간 이후의 입금만 처리
        - 중복 방지 (dedup_key)
        """
        import hashlib
        import uuid
        
        parsed = PasteImportService.parse_daily_deposit(text)
        if not parsed:
            return {
                "success": False,
                "error": "파싱된 데이터가 없습니다. 형식을 확인하세요.",
                "parsed_count": 0,
            }
        
        batch_id = str(uuid.uuid4())[:8]
        
        # 기존 기록된 최신 시간 조회
        latest_deposit_at = db.query(func.max(HQDailyDepositLog.deposit_at)).scalar()
        logger.info(f"[PasteImport] Latest deposit_at: {latest_deposit_at}")
        
        # 기존 dedup_key 조회
        existing_keys: Set[str] = set(
            row[0] for row in db.query(HQDailyDepositLog.dedup_key).all()
        )
        
        # 통계
        total_parsed = len(parsed)
        processed_count = 0
        skipped_old_count = 0
        duplicate_count = 0
        not_found_count = 0
        total_amount = 0
        
        user_deposits: Dict[int, int] = {}
        user_play_counts: Dict[int, int] = {}
        deposit_logs_to_add = []
        matched_details = []
        
        for item in parsed:
            # 최신 기록 이후만 처리
            # 시간 정보가 없는 경우 (00:00:00) 날짜 비교로 처리
            if latest_deposit_at and item.deposit_at:
                is_no_time = (item.deposit_at.hour == 0 and item.deposit_at.minute == 0 and item.deposit_at.second == 0)
                if is_no_time:
                    # 같은 날짜는 허용, 이전 날짜만 스킵
                    if item.deposit_at.date() < latest_deposit_at.date():
                        skipped_old_count += 1
                        continue
                else:
                    if item.deposit_at <= latest_deposit_at:
                        skipped_old_count += 1
                        continue
            
            # 중복 체크
            dt_str = item.deposit_at.strftime("%Y%m%d%H%M") if item.deposit_at else "no_time"
            raw_key = f"{item.nickname.lower().strip()}|{item.amount}|{dt_str}"
            dedup_key = hashlib.md5(raw_key.encode()).hexdigest()[:16]
            
            if dedup_key in existing_keys:
                duplicate_count += 1
                continue
            
            existing_keys.add(dedup_key)
            
            # V2User 매칭
            user = db.query(V2User).filter(
                func.lower(V2User.nickname) == item.nickname.lower()
            ).first()
            
            if not user:
                user = db.query(V2User).filter(
                    func.lower(V2User.external_nickname) == item.nickname.lower()
                ).first()
            
            status = "MATCHED" if user else "NOT_FOUND"
            
            # 로그 기록
            deposit_logs_to_add.append(HQDailyDepositLog(
                dedup_key=dedup_key,
                nickname=item.nickname,
                amount=item.amount,
                deposit_at=item.deposit_at,
                user_id=user.id if user else None,
                status=status,
                import_batch_id=batch_id,
            ))
            
            if user:
                # 기존 deposit 조회
                existing = db.query(ExternalRankingData).filter(
                    ExternalRankingData.user_id == user.id
                ).first()
                
                current_deposit = existing.deposit_amount if existing else 0
                current_play = existing.play_count if existing else 0
                
                if user.id not in user_deposits:
                    user_deposits[user.id] = current_deposit
                    user_play_counts[user.id] = current_play
                
                user_deposits[user.id] += item.amount
                total_amount += item.amount
                processed_count += 1
                
                matched_details.append({
                    "nickname": item.nickname,
                    "user_id": user.id,
                    "amount": item.amount,
                    "deposit_at": item.deposit_at.isoformat() if item.deposit_at else None,
                })
            else:
                not_found_count += 1
        
        # 로그 저장
        if deposit_logs_to_add:
            db.bulk_save_objects(deposit_logs_to_add)
        
        # CC Deposit 반영
        if user_deposits:
            cc_deposit_payloads = [
                CCDepositCreate(
                    user_id=user_id,
                    deposit_amount=total_deposit,
                    play_count=user_play_counts.get(user_id, 0),
                )
                for user_id, total_deposit in user_deposits.items()
            ]
            V2AdminCCDepositService.upsert_many(db, cc_deposit_payloads)
        
        db.commit()
        
        # 감사 로그
        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="PASTE_DAILY_DEPOSIT_IMPORT",
            target_type="CC_DEPOSIT",
            target_id=None,
            after={
                "batch_id": batch_id,
                "total_parsed": total_parsed,
                "processed": processed_count,
                "skipped_old": skipped_old_count,
                "duplicate": duplicate_count,
                "not_found": not_found_count,
                "total_amount": total_amount,
            },
        )
        
        logger.info(
            f"[PasteImport] Daily deposits: parsed={total_parsed}, processed={processed_count}, "
            f"skipped_old={skipped_old_count}, amount={total_amount:,}"
        )
        
        return {
            "success": True,
            "batch_id": batch_id,
            "total_parsed": total_parsed,
            "processed_count": processed_count,
            "skipped_old_count": skipped_old_count,
            "duplicate_count": duplicate_count,
            "not_found_count": not_found_count,
            "total_amount": total_amount,
            "unique_users": len(user_deposits),
            "latest_deposit_at_in_db": latest_deposit_at.isoformat() if latest_deposit_at else None,
            "matched_details": matched_details[:20],
        }

    @staticmethod
    def import_game_logs(
        db: Session,
        text: str,
        admin_id: str,
    ) -> Dict:
        """게임 로그 Import (붙여넣기)
        
        - 수익률 계산 및 위기 감지용
        - V2GameLog 테이블에 저장
        """
        from app.v2.models import V2GameLog
        
        parsed = PasteImportService.parse_game_log(text)
        if not parsed:
            return {
                "success": False,
                "error": "파싱된 데이터가 없습니다. 형식을 확인하세요.",
                "parsed_count": 0,
            }
        
        # 기존 기록된 최신 시간 조회
        latest_bet_at = db.query(func.max(V2GameLog.recorded_at)).scalar()
        logger.info(f"[PasteImport] Latest bet_at: {latest_bet_at}")
        
        total_parsed = len(parsed)
        processed_count = 0
        skipped_old_count = 0
        duplicate_count = 0
        not_found_count = 0
        
        game_logs_to_add = []
        
        for item in parsed:
            # 최신 기록 이후만 처리
            if latest_bet_at and item.bet_at:
                if item.bet_at <= latest_bet_at:
                    skipped_old_count += 1
                    continue
            
            # V2User 매칭 (cc_id 또는 닉네임)
            user = db.query(V2User).filter(
                func.lower(V2User.cc_id) == item.cc_id.lower()
            ).first()
            
            if not user:
                user = db.query(V2User).filter(
                    func.lower(V2User.nickname) == item.nickname.lower()
                ).first()
            
            if not user:
                not_found_count += 1
                continue
            
            # 게임 타입 매핑
            game_type_map = {
                "에볼루션": "EVOLUTION",
                "프라그마틱": "PRAGMATIC", 
                "마이크로게이밍": "MICROGAMING",
            }
            game_type = game_type_map.get(item.game_type, item.game_type.upper())
            
            # 결과 계산 (베팅 vs 결과)
            is_win = item.log_type == "결과" and item.amount > 0
            
            game_logs_to_add.append(V2GameLog(
                user_id=user.id,
                game_type=game_type,
                bet_amount=item.amount if item.log_type == "베팅" else 0,
                payout_amount=item.amount if item.log_type == "결과" else 0,
                result="WIN" if is_win else "LOSE" if item.log_type == "결과" else "BET",
                recorded_at=item.bet_at,
            ))
            processed_count += 1
        
        if game_logs_to_add:
            db.bulk_save_objects(game_logs_to_add)
            db.commit()
        
        # 감사 로그
        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action="PASTE_GAME_LOG_IMPORT",
            target_type="GAME_LOG",
            target_id=None,
            after={
                "total_parsed": total_parsed,
                "processed": processed_count,
                "skipped_old": skipped_old_count,
                "not_found": not_found_count,
            },
        )
        
        logger.info(
            f"[PasteImport] Game logs: parsed={total_parsed}, processed={processed_count}, "
            f"skipped_old={skipped_old_count}"
        )
        
        return {
            "success": True,
            "total_parsed": total_parsed,
            "processed_count": processed_count,
            "skipped_old_count": skipped_old_count,
            "not_found_count": not_found_count,
            "latest_bet_at_in_db": latest_bet_at.isoformat() if latest_bet_at else None,
        }
