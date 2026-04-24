from fastapi import APIRouter, Request, Form, HTTPException
from fastapi.responses import RedirectResponse
from backend.auth_utils import verify_password
from backend.core.db import SessionLocal, User

router = APIRouter()

@router.post("/login")
def login(request: Request, email: str = Form(...), password: str = Form(...)):
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()

    if not user or not user.is_active:
        raise HTTPException(status_code=401)

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401)

    request.session["user_email"] = user.email
    request.session["is_admin"] = user.is_admin

    return RedirectResponse("/", status_code=302)

@router.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/", status_code=302)
