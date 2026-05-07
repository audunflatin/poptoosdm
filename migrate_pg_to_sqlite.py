"""
Migreringsskript: PostgreSQL → SQLite

Bruk:
  python migrate_pg_to_sqlite.py <postgresql-url> [sqlite-sti]

Eksempel lokalt:
  python migrate_pg_to_sqlite.py "postgresql+psycopg2://..." users.db

Eksempel i Render Shell:
  python migrate_pg_to_sqlite.py "$OLD_DATABASE_URL" /var/data/users.db
"""

import sys
from sqlalchemy import create_engine, text

PG_URL   = sys.argv[1] if len(sys.argv) > 1 else None
SQLITE   = sys.argv[2] if len(sys.argv) > 2 else "users.db"

if not PG_URL:
    print("Bruk: python migrate_pg_to_sqlite.py <postgresql-url> [sqlite-sti]")
    sys.exit(1)

if PG_URL.startswith("postgres://"):
    PG_URL = PG_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif PG_URL.startswith("postgresql://"):
    PG_URL = PG_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

pg  = create_engine(PG_URL)
sq  = create_engine(f"sqlite:///{SQLITE}", connect_args={"check_same_thread": False})

# Opprett tabeller i SQLite via eksisterende modeller
from backend.auth_db import Base, User, LoginLog
Base.metadata.create_all(bind=sq)

with pg.connect() as src, sq.begin() as dst:
    # --- Users ---
    users = src.execute(text("SELECT email, password_hash, is_admin, is_active, must_change_password, first_login_at FROM users")).fetchall()
    for u in users:
        dst.execute(text("""
            INSERT OR REPLACE INTO users (email, password_hash, is_admin, is_active, must_change_password, first_login_at)
            VALUES (:email, :password_hash, :is_admin, :is_active, :must_change_password, :first_login_at)
        """), {
            "email":               u[0],
            "password_hash":       u[1],
            "is_admin":            u[2],
            "is_active":           u[3],
            "must_change_password": u[4],
            "first_login_at":      u[5],
        })
    print(f"✅ {len(users)} brukere migrert")

    # --- LoginLog (hvis tabellen finnes i PostgreSQL) ---
    try:
        logs = src.execute(text("SELECT email, logged_at, ip_address FROM login_log")).fetchall()
        for l in logs:
            dst.execute(text("""
                INSERT INTO login_log (email, logged_at, ip_address)
                VALUES (:email, :logged_at, :ip_address)
            """), {"email": l[0], "logged_at": l[1], "ip_address": l[2]})
        print(f"✅ {len(logs)} innlogginger migrert")
    except Exception:
        print("ℹ️  login_log-tabell ikke funnet i PostgreSQL – hoppes over")

print(f"\n✅ Ferdig. SQLite-database: {SQLITE}")
