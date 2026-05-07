from sqlalchemy import Column, Integer, String, Boolean, DateTime, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./users.db")

# Render setter postgresql:// men SQLAlchemy krever postgresql+psycopg2://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=True)
    first_login_at = Column(DateTime, nullable=True)


class LoginLog(Base):
    __tablename__ = "login_log"

    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False, index=True)
    logged_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ip_address = Column(String, nullable=True)


def _migrate():
    from sqlalchemy import text, inspect as sa_inspect
    insp = sa_inspect(engine)
    user_cols = {c["name"] for c in insp.get_columns("users")}
    with engine.begin() as conn:
        if DATABASE_URL.startswith("sqlite"):
            if "must_change_password" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0"))
            if "first_login_at" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN first_login_at DATETIME"))
        else:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMP"))


def init_db():
    Base.metadata.create_all(bind=engine)
    _migrate()