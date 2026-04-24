from fastapi import (
    FastAPI, Request, UploadFile, File, Form, HTTPException
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import FileResponse

from pathlib import Path
import csv
import io
import json
import math

from backend.auth_db import SessionLocal, User
from backend.auth_utils import verify_password, generate_password, hash_password
from backend.core.settings import SESSION_SECRET

# ---------------------------------------------------------------------
# App
# ---------------------------------------------------------------------

app = FastAPI(title="PopToOSDM")

app.mount("/static", StaticFiles(directory="frontend"), name="static")

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET
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
# Root / GUI
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

# ---------------------------------------------------------------------
# TEN / OSDM state
# ---------------------------------------------------------------------

TEN_TABLE = None
GENERATION_PROGRESS = {"status": "idle", "percent": 0}

OSDM_IN = Path("data/input/1076-OSDM-template.json")
OSDM_OUT = None

# ---------------------------------------------------------------------
# TEN validation
# ---------------------------------------------------------------------

def validate_ten_csv(text: str):
    reader = csv.reader(io.StringIO(text), delimiter=";")
    rows = []

    for i, row in enumerate(reader, start=1):
        if len(row) != 3:
            return {"ok": False, "error": f"Linje {i}: feil kolonneantall"}

        frm, to, price = row
        rows.append((int(frm), int(to), int(price)))

    return {
        "ok": True,
        "rows": len(rows),
        "from_km": rows[0][0],
        "to_km": rows[-1][1],
        "table": rows
    }

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

# ---------------------------------------------------------------------
# Price helpers
# ---------------------------------------------------------------------

def nok_price_from_distance(km: int):
    for frm, to, price in TEN_TABLE:
        if frm <= km <= to:
            return price
    raise ValueError(f"Ingen TEN‑pris for {km} km")

def eur_amount(nok: int, rate: float):
    eur = nok * rate
    eur_rounded = math.ceil(eur / 0.20) * 0.20
    return int(eur_rounded * 100)

# ---------------------------------------------------------------------
# Generate OSDM
# ---------------------------------------------------------------------

@app.post("/ui/generate-osdm")
def generate_osdm(
    request: Request,
    exchangeRate: float = Form(...),
    validFrom: str = Form(...),
    validTo: str = Form(...),
    datasetId: str = Form(...),
    environment: str = Form(...),
    optionalDelivery: str = Form("false")
):
    require_login(request)

    if TEN_TABLE is None:
        raise HTTPException(status_code=400, detail="TEN‑CSV er ikke validert")

    GENERATION_PROGRESS["status"] = "running"
    GENERATION_PROGRESS["percent"] = 0

    data = json.loads(OSDM_IN.read_text(encoding="utf-8"))
    fs = data["fareDelivery"]["fareStructure"]

    data["fareDelivery"]["delivery"]["optionalDelivery"] = (
        optionalDelivery.lower() == "true"
    )

    data["fareDelivery"]["delivery"]["usage"] = (
        "TEST_ONLY" if environment == "test" else "PRODUCTION"
    )
    data["fareDelivery"]["delivery"]["deliveryId"] = datasetId

    from_date = f"{validFrom}T00:00:00+0000"
    until_date = f"{validTo}T23:59:59+0000"

    for cal in fs.get("calendars", []):
        cal["fromDate"] = from_date
        cal["untilDate"] = until_date

    new_prices = []
    examples = {}
    price_index = 1
    example_idx = 1
    total = len(fs["regionalConstraints"])

    example_routes = [
        ("Oslo S", "Bergen stasjon", "7600100", "7602351"),
        ("Oslo S", "Trondheim S", "7600100", "7601126"),
        ("Oslo S", "Stavanger stasjon", "7600100", "7602234"),
        ("Oslo S", "Halden stasjon", "7600100", "7600546"),
    ]

    cp_for_uic = {}
    for cp in fs["connectionPoints"]:
        for ss in cp.get("stationSets", []):
            for s in ss:
                if s.get("codeList") == "UIC":
                    cp_for_uic[s["code"]] = cp["id"]

    for idx, rc in enumerate(fs["regionalConstraints"], start=1):
        km = rc.get("distance")
        if km is None:
            continue

        nok = nok_price_from_distance(km)
        amount = eur_amount(nok, exchangeRate)

        new_prices.append({
            "id": f"1076_{datasetId}_{price_index}",
            "price": [{
                "amount": amount,
                "currency": "EUR",
                "scale": 2,
                "vatDetails": []
            }]
        })

        for from_name, to_name, from_uic, to_uic in example_routes:
            if (
                rc["entryConnectionPointId"] == cp_for_uic.get(from_uic)
                and rc["exitConnectionPointId"] == cp_for_uic.get(to_uic)
            ):
                eur = amount / 100
                examples[f"example_{example_idx}"] = (
                    f"{from_name} → {to_name}: {eur:.2f} EUR ({km} km)"
                )
                example_idx += 1

        GENERATION_PROGRESS["percent"] = int(idx / total * 100)
        price_index += 1

    fs["prices"] = new_prices

    GENERATION_PROGRESS["status"] = "done"
    GENERATION_PROGRESS["percent"] = 100

    out = Path(f"data/output/{datasetId}_{environment}.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False))

    global OSDM_OUT
    OSDM_OUT = out

   
    return {
        "step": "OSDM generation",
        "ok": True,
        "outputFile": out.name,
        "summary": {
            "pricesUpdated": len(fs["prices"]),
            "exchangeRate": exchangeRate,
            "environment": environment,
            "exampleFares": examples
        }
    }


# ---------------------------------------------------------------------
# Progress
# ---------------------------------------------------------------------

@app.get("/ui/progress")
def get_progress():
    return GENERATION_PROGRESS

@app.get("/ui/download-osdm/{filename}")
def download_osdm(filename: str):
    path = Path("data/output") / filename

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="OSDM-fil finnes ikke"
        )

    return FileResponse(
        path=path,
        media_type="application/json",
        filename=path.name
    )