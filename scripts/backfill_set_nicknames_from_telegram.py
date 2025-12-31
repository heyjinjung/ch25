#!/usr/bin/env python3
"""Backfill script: set `nickname` = `telegram_username` for users missing a nickname.

Usage:
  python scripts/backfill_set_nicknames_from_telegram.py

This will update rows where nickname is NULL/empty and telegram_username is present.
"""
import sys
import os
from sqlalchemy import create_engine, or_, and_
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.models.user import User


def backfill(dry_run: bool = False, force: bool = False):
    settings = get_settings()
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        if force:
            # Update all users who have a telegram_username
            query = db.query(User).filter(User.telegram_username != None)
        else:
            # Only update if nickname is empty
            query = db.query(User).filter(
                and_(
                    or_(User.nickname == None, User.nickname == ""),
                    User.telegram_username != None,
                )
            )
        
        users = query.all()
        total = len(users)
        print(f"Found {total} users to {'force ' if force else ''}backfill")
        if dry_run:
            for u in users[:50]:
                print(f"DRY: {'Force: ' if force else ''}Would set user.id={u.id} nickname='{u.telegram_username}' (current: '{u.nickname}')")
            if total > 50:
                print("... (truncated)")
            return

        count = 0
        for u in users:
            u.nickname = u.telegram_username
            db.add(u)
            count += 1
        db.commit()
        print(f"Backfilled {count} users' nickname from telegram_username")
    except Exception as e:
        db.rollback()
        print("Error during backfill:", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    dry = "--dry" in sys.argv or "-n" in sys.argv
    force = "--force" in sys.argv
    backfill(dry_run=dry, force=force)
