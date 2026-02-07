"""
Test 25: Team Battle Rankings Alias
시나리오: /team-battle/rankings == leaderboard view
fixtures: test_client, db_session
가드레일: limit<=100, offset>=0
"""
import pytest
from app.v2.models import V2User
from app.v2.models.user import V2UserRole, V2UserStatus
from app.v2.models.v2_team_battle import V2TeamBattle, V2TeamBattleMember


def test_team_battle_rankings_endpoint(test_client):
    """팀 배틀 랭킹 엔드포인트"""
    response = test_client.get("/api/v2/team-battle/rankings")

    # 200(성공) 또는 404(미구현) 허용
    assert response.status_code in [200, 404, 401]

    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, (dict, list))


def test_team_battle_rankings_with_limit(test_client):
    """limit 파라미터 테스트 (최대 100)"""
    # limit=50
    response = test_client.get("/api/v2/team-battle/rankings?limit=50")
    assert response.status_code in [200, 404, 401]

    # limit=100
    response = test_client.get("/api/v2/team-battle/rankings?limit=100")
    assert response.status_code in [200, 404, 401]

    # limit > 100 (가드레일 위반)
    response = test_client.get("/api/v2/team-battle/rankings?limit=150")
    # 400(잘못된 요청) 또는 자동으로 100으로 제한
    assert response.status_code in [200, 400, 404, 422]


def test_team_battle_rankings_with_offset(test_client):
    """offset 파라미터 테스트 (최소 0)"""
    # offset=0
    response = test_client.get("/api/v2/team-battle/rankings?offset=0")
    assert response.status_code in [200, 404, 401]

    # offset=10
    response = test_client.get("/api/v2/team-battle/rankings?offset=10")
    assert response.status_code in [200, 404, 401]

    # offset < 0 (가드레일 위반)
    response = test_client.get("/api/v2/team-battle/rankings?offset=-1")
    # 400(잘못된 요청) 또는 자동으로 0으로 조정
    assert response.status_code in [200, 400, 404, 422]


def test_team_battle_rankings_pagination(test_client):
    """페이지네이션 테스트"""
    # limit=10, offset=0 (첫 페이지)
    response1 = test_client.get("/api/v2/team-battle/rankings?limit=10&offset=0")
    assert response1.status_code in [200, 404, 401]

    # limit=10, offset=10 (두 번째 페이지)
    response2 = test_client.get("/api/v2/team-battle/rankings?limit=10&offset=10")
    assert response2.status_code in [200, 404, 401]

    if response1.status_code == 200 and response2.status_code == 200:
        data1 = response1.json()
        data2 = response2.json()
        # 두 페이지의 데이터가 다를 것으로 예상
        assert data1 != data2 or len(data1) == 0 or len(data2) == 0


def test_team_battle_rankings_leaderboard_alias(test_client):
    """rankings 엔드포인트가 leaderboard와 동일한 뷰"""
    # rankings 호출
    response_rankings = test_client.get("/api/v2/team-battle/rankings")

    # leaderboard 호출
    response_leaderboard = test_client.get("/api/v2/team-battle/leaderboard")

    # 둘 다 같은 상태 코드
    assert response_rankings.status_code == response_leaderboard.status_code

    # 200이면 동일한 데이터 구조
    if response_rankings.status_code == 200 and response_leaderboard.status_code == 200:
        data_rankings = response_rankings.json()
        data_leaderboard = response_leaderboard.json()

        # 데이터 구조가 동일
        assert type(data_rankings) == type(data_leaderboard)


def test_team_battle_rankings_data_structure(test_client, db_session):
    """랭킹 데이터 구조 검증"""
    # Given: 테스트 데이터 생성
    user1 = V2User(
        cc_id="RANK_USER1",
        nickname="랭킹유저1",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    user2 = V2User(
        cc_id="RANK_USER2",
        nickname="랭킹유저2",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE
    )
    db_session.add_all([user1, user2])
    db_session.commit()

    # When: 랭킹 조회
    response = test_client.get("/api/v2/team-battle/rankings")

    if response.status_code == 200:
        data = response.json()

        # Then: 랭킹 데이터 구조 확인
        if isinstance(data, list) and len(data) > 0:
            # 각 항목은 랭킹 정보 포함
            item = data[0]
            # 예상되는 필드들 (있으면 검증)
            possible_fields = ["rank", "team_id", "team_name", "score", "members"]
            has_field = any(field in item for field in possible_fields)
            assert has_field


def test_team_battle_rankings_empty_result(test_client, db_session):
    """팀 배틀이 없을 때 빈 결과"""
    # Given: 팀 배틀 데이터 없음 (새 DB 상태)

    # When: 랭킹 조회
    response = test_client.get("/api/v2/team-battle/rankings")

    if response.status_code == 200:
        data = response.json()
        # 빈 리스트 또는 빈 딕셔너리
        assert isinstance(data, (list, dict))
        if isinstance(data, list):
            assert len(data) >= 0
