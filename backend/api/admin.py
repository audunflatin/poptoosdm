from fastapi import APIRouter, Request, Form, HTTPException
from backend.auth_utils import generate_password, hash_password
from backend.core.db import SessionLocal, User
from backend.core.security import require_login

router = APIRouter()

@router.post("/admin/add-user")
def add_user(request: Request, email: str = Form(...)):
    require_login(request)
    if not request.session.get("is_admin"):
        raise HTTPException(status_code=403)

    db = SessionLocal()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400)

    password = generate_password()
    user = User(email=email, password_hash=hash_password(password), is_active=True)
    db.add(user)
    db.commit()

    return {"email": email, "password": password}

@router.post("/admin/reset-password")
def reset_password(request: Request, email: str = Form(...)):
    require_login(request)
    if not request.session.get("is_admin"):
        raise HTTPException(status_code=403)

    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404)

    password = generate_password()
    user.password_hash = hash_password(password)
    db.commit()

    return {"email": email, "new_password": password}
