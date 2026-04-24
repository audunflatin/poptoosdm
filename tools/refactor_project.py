"""
ENGANGS OPPRYDDINGSSCRIPT – PopToOSDM

- Lager ny backend-struktur
- Flytter auth / admin / ui / core
- Lager ryddig FastAPI entrypoint
- Rører ikke frontend
"""

from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
TOOLS = ROOT / "tools"

print("▶ Starter opprydding…")

# --- Safety backup ---
backup = BACKEND / "app.py.bak"
if not backup.exists():
    shutil.copy(BACKEND / "app.py", backup)
    print("✅ Backup laget: backend/app.py.bak")

# --- Create directories ---
for d in [
    BACKEND / "api",
    BACKEND / "core",
    BACKEND / "models",
]:
    d.mkdir(exist_ok=True)

(BACKEND / "api" / "__init__.py").write_text("")
(BACKEND / "core" / "__init__.py").write_text("")
(BACKEND / "models" / "__init__.py").write_text("")

# --- core/security.py ---
(BACKEND / "core" / "security.py").write_text("""
from fastapi import Request, HTTPException

def require_login(request: Request):
    if "user_email" not in request.session:
        raise HTTPException(status_code=401, detail="Ikke innlogget")
""".strip() + "\n")

# --- core/db.py ---
(BACKEND / "core" / "db.py").write_text("""
from backend.auth_db import SessionLocal, User, init_db

__all__ = ["SessionLocal", "User", "init_db"]
""".strip() + "\n")

# --- core/settings.py ---
(BACKEND / "core" / "settings.py").write_text("""
import os

SESSION_SECRET = os.getenv("SESSION_SECRET", "CHANGE_ME_BEFORE_PROD")
""".strip() + "\n")

# --- models/user.py ---
(BACKEND / "models" / "user.py").write_text("""
from backend.auth_db import User

__all__ = ["User"]
""".strip() + "\n")

# --- api/auth.py ---
(BACKEND / "api" / "auth.py").write_text("""
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
""".strip() + "\n")

# --- api/admin.py ---
(BACKEND / "api" / "admin.py").write_text("""
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
""".strip() + "\n")

# --- api/health.py ---
(BACKEND / "api" / "health.py").write_text("""
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok"}
""".strip() + "\n")

# --- main.py ---
(BACKEND / "main.py").write_text("""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from backend.api.auth import router as auth_router
from backend.api.admin import router as admin_router
from backend.api.health import router as health_router
from backend.core.settings import SESSION_SECRET

app = FastAPI(title="PopToOSDM")

app.mount("/static", StaticFiles(directory="frontend"), name="static")

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(health_router)
""".strip() + "\n")

print("✅ Opprydding ferdig.")
print("➡ Ny entry: backend/main.py")
print("➡ Original app.py ligger som backup.")
