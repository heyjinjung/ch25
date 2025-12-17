#!/usr/bin/env python3
"""Analyze new member inflow funnel."""

import os
import sys
from datetime import datetime, timedelta

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.user_activity_event import UserActivityEvent
from app.models.new_member_dice import NewMemberDiceLog

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL', 'mysql+pymysql://xmasuser:xmaspass@localhost:3307/xmas_event')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def analyze_funnel():
    """Analyze the new member inflow funnel."""
    db = SessionLocal()

    try:
        # Define time period - last 30 days for new members
        cutoff_date = datetime.utcnow() - timedelta(days=30)

        # Step 1: Registrations (new users in last 30 days)
        step1 = db.query(func.count(User.id)).filter(User.created_at >= cutoff_date).scalar()
        print(f"Step 1 - Registrations (last 30 days): {step1}")

        # Step 2: First login (users who logged in at least once)
        step2 = db.query(func.count(User.id)).filter(
            User.created_at >= cutoff_date,
            User.last_login_at.isnot(None)
        ).scalar()
        print(f"Step 2 - First Login: {step2}")

        # Step 3: First play (users with play events)
        play_event_types = ['ROULETTE_PLAY', 'DICE_PLAY', 'LOTTERY_PLAY']
        step3 = db.query(func.count(UserActivityEvent.user_id.distinct())).filter(
            UserActivityEvent.event_type.in_(play_event_types),
            User.created_at >= cutoff_date
        ).join(User, User.id == UserActivityEvent.user_id).scalar()
        print(f"Step 3 - First Play (from events): {step3}")

        # Additional: Total play events
        total_plays = db.query(func.count(UserActivityEvent.id)).filter(
            UserActivityEvent.event_type.in_(play_event_types),
            User.created_at >= cutoff_date
        ).join(User, User.id == UserActivityEvent.user_id).scalar()
        print(f"Total Play Events: {total_plays}")

        # Step 4: New member dice play
        step4 = db.query(func.count(NewMemberDiceLog.user_id.distinct())).filter(
            User.created_at >= cutoff_date
        ).join(User, User.id == NewMemberDiceLog.user_id).scalar()
        print(f"Step 4 - New Member Dice Play: {step4}")

        # Calculate conversion rates
        print("\nConversion Rates:")
        if step1 > 0:
            print(f"Registration -> First Login: {step2/step1*100:.1f}%")
        if step2 > 0:
            print(f"First Login -> First Play: {step3/step2*100:.1f}%")
        if step3 > 0:
            print(f"First Play -> Dice Play: {step4/step3*100:.1f}%")

    finally:
        db.close()

if __name__ == "__main__":
    analyze_funnel()