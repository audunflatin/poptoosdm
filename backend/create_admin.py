from backend.auth_db import SessionLocal, User, init_db
from backend.auth_utils import generate_password, hash_password

ADMIN_EMAIL = "audun.flatin@entur.org"

def main():
    init_db()

    db = SessionLocal()

    existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if existing:
        print("⚠️ Admin finnes allerede")
        return

    password = generate_password()

    user = User(
        email=ADMIN_EMAIL,
        password_hash=hash_password(password),
        is_admin=True,
        is_active=True,
    )

    db.add(user)
    db.commit()

    print("✅ Admin-bruker opprettet")
    print(f"E-post: {ADMIN_EMAIL}")
    print(f"PASSORD (kopier og ta vare på): {password}")

if __name__ == "__main__":
    main()