from fastapi import (
    FastAPI, Request, UploadFile, File, Form, HTTPException
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from pathlib import Path
import csv
import io
import json
import math
from jsonschema import Draft7Validator

from backend.auth_db import SessionLocal, User
from backend.auth_utils import (
    verify_password,
    generate_password,
    hash_password
)

# ---------------------------------------------------------------------
# App
# ---------------------------------------------------------------------

app = FastAPI(title="PopToOSDM")

app.mount("/static", StaticFiles(directory="frontend"), name="static")

app.add_middleware(
    SessionMiddleware,
    secret_key="CHANGE_ME_TO_SOMETHING_RANDOM"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def require_login(request: Request):
    if "user_email" not in request.session:
        raise HTTPException(status_code=401, detail="Ikke innlogget")

# ---------------------------------------------------------------------
# GUI / Root
# ---------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
def root(request: Request):
    is_admin = bool(request.session.get("is_admin"))

    if "user_email" not in request.session:
        return HTMLResponse(
            Path("frontend/login.html").read_text(encoding="utf-8")
        )

    html = Path("frontend/index.html").read_text(encoding="utf-8")
    html = html.replace(
        "</head>",
        f"<script>window.IS_ADMIN = {str(is_admin).lower()};</script></head>"
    )
    return HTMLResponse(html)

# ---------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------

@app.post("/login")
def login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...)
):
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()

    if not user or not user.is_active:
        raise HTTPException(status_code=401)

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401)

    request.session["user_email"] = user.email
    request.session["is_admin"] = user.is_admin

    return RedirectResponse("/", status_code=302)

@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/", status_code=302)

# ---------------------------------------------------------------------
# TEN / OSDM
# ---------------------------------------------------------------------

TEN_TABLE = None
GENERATION_PROGRESS = {"status": "idle", "percent": 0}
OSDM_IN = Path("data/input/1076-OSDM-template.json")
OSDM_OUT = None

def validate_ten_csv(text: str):
    reader = csv.reader(io.StringIO(text), delimiter=";")
    rows = []

    for i, row in enumerate(reader, start=1):
        if len(row) != 3:
            return {"ok": False, "error": f"Linje {i}: feil kolonneantall"}
        frm, to, price = row
        rows.append((int(frm), int(to), int(price)))

    return {"ok": True, "table": rows}

@app.post("/ui/validate-ten")
def validate_ten(
    request: Request,
    tenFile: UploadFile = File(...)
):
    require_login(request)
    global TEN_TABLE

    content = tenFile.file.read().decode("utf-8-sig")
    result = validate_ten_csv(content)

    if not result["ok"]:
        TEN_TABLE = None
        return {"ok": False, "error": result["error"]}

    TEN_TABLE = result["table"]
    return {"ok": True}

@app.post("/ui/generate-osdm")
def generate_osdm(
    request: Request,
    exchangeRate: float = Form(...),
    datasetId: str = Form(...),
    environment: str = Form(...)
):
    require_login(request)

    if TEN_TABLE is None:
        raise HTTPException(status_code=400, detail="TEN ikke validert")

    data = json.loads(OSDM_IN.read_text(encoding="utf-8"))
    fs = data["fareDelivery"]["fareStructure"]

    prices = []
    for idx, rc in enumerate(fs["regionalConstraints"], start=1):
        km = rc.get("distance")
        if not km:
            continue

        for frm, to, nok in TEN_TABLE:
            if frm <= km <= to:
                eur = math.ceil((nok * exchangeRate) / 0.2) * 0.2
                prices.append({
                    "id": f"1076_{datasetId}_{idx}",
                    "price": [{
                        "amount": int(eur * 100),
                        "currency": "EUR",
                        "scale": 2,
                        "vatDetails": []
                    }]
                })
                break

    fs["prices"] = prices

    out = Path(f"data/output/{datasetId}.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False))

    global OSDM_OUT
    OSDM_OUT = out

    return {"status": "OK"}

@app.get("/ui/progress")
def progress():
    return GENERATION_PROGRESS
