from app.db.session import SessionLocal
from app.models.mission import Mission, MissionCategory, MissionRewardType

def seed_missions():
    db = SessionLocal()
    
    # Sample Missions
    missions = [
        # DAILY
        {
            "title": "🎉 일일 출석 체크",
            "description": "매일 접속하여 다이아몬드 1개를 받으세요.",
            "category": MissionCategory.DAILY,
            "logic_key": "daily_login_v1",
            "action_type": "LOGIN",
            "target_value": 1,
            "reward_type": MissionRewardType.DIAMOND,
            "reward_amount": 1,
            "xp_reward": 5,
        },
        {
            "title": "🎲 다이스 5회 플레이",
            "description": "오늘 다이스 게임을 5회 플레이하세요.",
            "category": MissionCategory.DAILY,
            "logic_key": "daily_play_dice_5",
            "action_type": "PLAY_GAME",
            "target_value": 5,
            "reward_type": MissionRewardType.DIAMOND,
            "reward_amount": 5,
            "xp_reward": 10,
        },
        # WEEKLY
        {
            "title": "🏆 주간 게임 마스커",
            "description": "일주일 동안 아무 게임이나 50회 플레이하세요.",
            "category": MissionCategory.WEEKLY,
            "logic_key": "weekly_play_all_50",
            "action_type": "PLAY_GAME",
            "target_value": 50,
            "reward_type": MissionRewardType.DIAMOND,
            "reward_amount": 50,
            "xp_reward": 100,
        },
        # SPECIAL
        {
            "title": "📢 공식 채널 가입",
            "description": "CCJM 공식 텔레그램 채널에 가입하고 보상을 받으세요.",
            "category": MissionCategory.SPECIAL,
            "logic_key": "special_join_channel_v1",
            "action_type": "JOIN_CHANNEL",
            "target_value": 1,
            "reward_type": MissionRewardType.DIAMOND,
            "reward_amount": 10,
            "xp_reward": 20,
        },
        {
            "title": "🤝 친구 3명 초대",
            "description": "초대 링크로 친구 3명을 미니앱에 초대하세요.",
            "category": MissionCategory.SPECIAL,
            "logic_key": "special_invite_3",
            "action_type": "INVITE_FRIEND",
            "target_value": 3,
            "reward_type": MissionRewardType.DIAMOND,
            "reward_amount": 30,
            "xp_reward": 50,
        },
        {
            "title": "💰 금고 적립 체험",
            "description": "접속만 해도 1,000 P (금고) 적립!",
            "category": MissionCategory.SPECIAL,
            "logic_key": "special_vault_test",
            "action_type": "LOGIN",
            "target_value": 1,
            "reward_type": MissionRewardType.CASH_UNLOCK,
            "reward_amount": 1000,
            "xp_reward": 50,
        }
    ]

    for m_data in missions:
        existing = db.query(Mission).filter(Mission.logic_key == m_data["logic_key"]).first()
        if not existing:
            mission = Mission(**m_data)
            db.add(mission)
            print(f"Adding mission: {m_data['title']}")
        else:
            print(f"Mission already exists: {m_data['title']}")
            # Update existing for testing UI changes if title changed
            existing.title = m_data["title"]
            existing.description = m_data["description"]
            existing.reward_amount = m_data["reward_amount"]
            existing.xp_reward = m_data["xp_reward"]
    
    db.commit()
    db.close()
    print("Seeding complete.")

if __name__ == "__main__":
    seed_missions()
