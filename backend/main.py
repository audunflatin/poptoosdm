from fastapi import (
    FastAPI, Request, UploadFile, File, Form, HTTPException
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import (
    HTMLResponse, FileResponse, RedirectResponse
)
from starlette.middleware.sessions import SessionMiddleware

from pathlib import Path
import csv
import io
import json
import math
from jsonschema import Draft7Validator

# --- App ---
app = FastAPI(title="PopToOSDM")

# --- Static files ---
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# --- Session ---
from backend.core.settings import SESSION_SECRET
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET
)

# --- CORS (safe for same-origin usage on Render) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Auth helpers ---
from backend.auth_db import SessionLocal, User
from backend.auth_utils import verify_password, generate_password, hash_password

def require_login(request: Request):
    if "user_email" not in request.session:
        raise HTTPException(status_code=401, detail="Ikke innlogget")

# --- Health ---
@app.get("/health")
def health():
    return {"status": "ok"}

# --- Root (GUI) ---
@app.get("/", response_class=HTMLResponse)
def root(request: Request):
    is_admin = bool(request.session.get("is_admin"))

    if "user_email" not in request.session:
        with open("frontend/login.html", encoding="utf-8") as f:
            return HTMLResponse(f.read())

    with open("frontend/index.html", encoding="utf-8") as f:
        html = f.read()

    html = html.replace(
        "</head>",
        f"<script>window.IS_ADMIN = {str(is_admin).lower()};</script></head>"
    )

    return HTMLResponse(html)

# --- Login / logout ---
@app.post("/login")
def login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...)
):
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Ugyldig innlogging")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Ugyldig innlogging")

    request.session["user_email"] = user.email
    request.session["is_admin"] = user.is_admin

    return RedirectResponse("/", status_code=302)

@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/", status_code=302)

# --------------------------------------------------------------------
# ------------------------ TEN / OSDM LOGIKK --------------------------
# --------------------------------------------------------------------

TEN_TABLE = None
TEN_INFO = None
GENERATION_PROGRESS = {"status": "idle", "percent": 0}

