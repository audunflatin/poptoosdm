from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from pathlib import Path
import csv
import io
import json
import math

import threading
import uuid

from backend.auth_db import SessionLocal, User, LoginLog, init_db
from backend.auth_utils import verify_password, generate_password, hash_password
from backend.core.settings import SESSION_SECRET
from backend.email_utils import send_welcome_email, send_reset_email

import logging
logger = logging.getLogger(__name__)

from zoneinfo import ZoneInfo
from datetime import datetime, timezone

# ---------------------------------------------------------------------
# App
# ---------------------------------------------------------------------

app = FastAPI(title="PopToOSDM")

app.mount("/static", StaticFiles(directory="frontend"), name="static")

app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------

@app.on_event("startup")
def startup():
    init_db()

# ---------------------------------------------------------------------
# State
# ---------------------------------------------------------------------

TEN_TABLE = None
GENERATION_PROGRESS = {"status": "idle", "percent": 0}
OSDM_IN = Path("data/input/1076-OSDM-template.json")
OSDM_OUT = None
XLSX_JOBS: dict = {}  # job_id -> {"status": "running"|"done"|"error", "result": bytes, "error": str}

# ---------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------

def require_login(request: Request):
    if "user_email" not in request.session:
        raise HTTPException(status_code=401, detail="Ikke innlogget")

def require_admin(request: Request):
    require_login(request)
    if not request.session.get("is_admin"):
        raise HTTPException(status_code=403, detail="Ikke administrator")

# ---------------------------------------------------------------------
# Root / GUI
# ---------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
def root(request: Request):
    if "user_email" not in request.session:
        return HTMLResponse(
            Path("frontend/login.html").read_text(encoding="utf-8")
        )
    is_admin = bool(request.session.get("is_admin"))
    html = Path("frontend/index.html").read_text(encoding="utf-8")
    html = html.replace(
        "</head>",
        f"<script>window.IS_ADMIN = {str(is_admin).lower()};</script></head>"
    )
    return HTMLResponse(html)

# ---------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}

# ---------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------

@app.post("/login")
def login(request: Request, email: str = Form(...), password: str = Form(...)):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Ugyldig innlogging")
        if not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Ugyldig innlogging")
        request.session["user_email"] = user.email
        request.session["is_admin"] = user.is_admin
        db.add(LoginLog(
            email=user.email,
            ip_address=request.client.host if request.client else None,
        ))
        if user.must_change_password:
            db.commit()
            return RedirectResponse("/change-password", status_code=302)
        if user.first_login_at is None:
            user.first_login_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()
    return RedirectResponse("/", status_code=302)

@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/", status_code=302)

# ---------------------------------------------------------------------
# Bytt passord (tvinges ved første innlogging)
# ---------------------------------------------------------------------

@app.get("/change-password", response_class=HTMLResponse)
def change_password_page(request: Request):
    if "user_email" not in request.session:
        return RedirectResponse("/", status_code=302)
    return HTMLResponse(Path("frontend/change_password.html").read_text(encoding="utf-8"))

@app.post("/change-password")
def change_password(
    request: Request,
    password: str = Form(...),
    confirm: str = Form(...),
):
    if "user_email" not in request.session:
        raise HTTPException(status_code=401, detail="Ikke innlogget")
    if password != confirm:
        raise HTTPException(status_code=400, detail="Passordene er ikke like")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Passordet må være minst 8 tegn")
    email = request.session["user_email"]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Bruker ikke funnet")
        user.password_hash = hash_password(password)
        user.must_change_password = False
        if user.first_login_at is None:
            user.first_login_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()
    return {"ok": True}

# ---------------------------------------------------------------------
# TEN validation
# ---------------------------------------------------------------------

def validate_ten_csv(text: str):
    reader = csv.reader(io.StringIO(text), delimiter=";")
    rows = []

    for i, row in enumerate(reader, start=1):
        if len(row) != 3:
            return {"ok": False, "error": f"Linje {i}: feil kolonneantall (forventet 3, fikk {len(row)})"}

        frm, to, price = [c.strip().replace(" ", "").replace("\xa0", "") for c in row]

        try:
            frm_int = int(frm)
        except ValueError:
            return {"ok": False, "error": f"Linje {i}: ugyldig 'fra'-verdi: '{frm}' er ikke et heltall"}

        try:
            to_int = int(to)
        except ValueError:
            return {"ok": False, "error": f"Linje {i}: ugyldig 'til'-verdi: '{to}' er ikke et heltall"}

        try:
            price_int = int(price)
        except ValueError:
            return {"ok": False, "error": f"Linje {i}: ugyldig pris: '{price}' er ikke et heltall"}

        if frm_int < 0 or to_int < 0:
            return {"ok": False, "error": f"Linje {i}: negative km-verdier er ikke tillatt"}

        if frm_int >= to_int:
            return {"ok": False, "error": f"Linje {i}: 'fra' ({frm_int}) må være mindre enn 'til' ({to_int})"}

        if price_int <= 0:
            return {"ok": False, "error": f"Linje {i}: pris må være større enn 0 (fikk {price_int})"}

        if rows and frm_int != rows[-1][1]:
            return {"ok": False, "error": f"Linje {i}: gap eller overlapp i km-intervall (forrige til={rows[-1][1]}, denne fra={frm_int})"}

        rows.append((frm_int, to_int, price_int))

    if not rows:
        return {"ok": False, "error": "Filen er tom"}

    return {
        "ok": True,
        "rows": len(rows),
        "from_km": rows[0][0],
        "to_km": rows[-1][1],
        "table": rows
    }

@app.post("/ui/validate-ten")
def validate_ten(request: Request, tenFile: UploadFile = File(...)):
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
    raise ValueError(f"Ingen TEN-pris for {km} km")

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
    optionalDelivery: str = Form("false"),
):
    require_login(request)

    if TEN_TABLE is None:
        raise HTTPException(status_code=400, detail="TEN-CSV er ikke validert")

    GENERATION_PROGRESS["status"] = "running"
    GENERATION_PROGRESS["percent"] = 0

    data = json.loads(OSDM_IN.read_text(encoding="utf-8"))

    # Erstatt gammel delivery-id med ny datasetId overalt i strukturen
    old_delivery_id = data["fareDelivery"]["delivery"]["deliveryId"]
    if old_delivery_id and old_delivery_id != datasetId:
        raw = json.dumps(data)
        raw = raw.replace(f"1076_{old_delivery_id}_", f"1076_{datasetId}_")
        data = json.loads(raw)

    fs = data["fareDelivery"]["fareStructure"]

    data["fareDelivery"]["delivery"]["deliveryId"] = datasetId
    data["fareDelivery"]["delivery"]["optionalDelivery"] = (optionalDelivery.lower() == "true")
    data["fareDelivery"]["delivery"]["usage"] = (
        "TEST_ONLY" if environment == "test" else "PRODUCTION"
    )

    # Sett datoer og utcOffset basert på Oslo-tidssone
    oslo_tz = ZoneInfo("Europe/Oslo")
    from_dt = datetime.fromisoformat(validFrom).replace(tzinfo=oslo_tz)
    until_dt = datetime.fromisoformat(validTo).replace(hour=23, minute=59, second=59, tzinfo=oslo_tz)
    utc_offset_from = int(from_dt.utcoffset().total_seconds() / 60)

    from_date = f"{validFrom}T00:00:00+0000"
    until_date = f"{validTo}T23:59:59+0000"

    for cal in fs.get("calendars", []):
        cal["fromDate"] = from_date
        cal["untilDate"] = until_date
        cal["utcOffset"] = utc_offset_from

    # Bygg eksempel-oppslag: UIC-kode -> connectionPointId
    cp_for_uic = {}
    for cp in fs["connectionPoints"]:
        for ss in cp.get("stationSets", []):
            for s in ss:
                if s.get("codeList") == "UIC":
                    cp_for_uic[s["code"]] = cp["id"]

    example_routes = [
        ("Oslo S",  "Bergen stasjon",    "7600100", "7602351"),
        ("Oslo S",  "Trondheim S",       "7600100", "7601126"),
        ("Oslo S",  "Stavanger stasjon", "7600100", "7602234"),
        ("Oslo S",  "Halden stasjon",    "7600100", "7600546"),
        ("Oslo S",  "Kornsjø grense",    "7600100", "7600551"),
    ]

    # Kategoriratio mot voksen
    # (nameRef-suffix, passengerConstraintRef-suffix, ratio)
    CATEGORY_RATIOS = [
        ("P__7",  "G__1", 1.00),   # Voksen
        ("P__34", "G__2", 0.90),   # Voksen gruppe
        ("P__11", "G__8", 0.50),   # Senior
        ("P__8",  "G__3", 0.25),   # Barn 6-17 år
        ("P__35", "G__4", 0.25),   # Barn 6-17 år gruppe
        ("P__9",  "G__6", 0.00),   # Barn 0-5 år
        ("P__36", "G__7", 0.00),   # Barn 0-5 år gruppe
        ("P__5",  "G__1", 0.50),   # FIP leisure reduction voksen
        ("P__5",  "G__3", 0.25),   # FIP leisure reduction barn
        ("P__10", "G__5", 0.50),   # Hund
    ]

    # Finn id-prefix fra eksisterende fare-id-er (f.eks. "1076_8.2_")
    sample_nr = fs["fares"][0].get("nameRef", "") if fs.get("fares") else ""
    id_prefix = "_".join(sample_nr.split("_")[:2]) + "_" if sample_nr else f"1076_{datasetId}_"

    new_prices = []
    price_index = 1
    total = len(fs["regionalConstraints"])
    examples = {}
    example_idx = 1

    # rc_id -> { (nameRef, passengerConstraintRef) -> ny price_id }
    rc_fare_price_map: dict = {}

    for idx, rc in enumerate(fs["regionalConstraints"], start=1):
        km = rc.get("distance")
        if km is None:
            continue

        nok = nok_price_from_distance(km)
        rc_fare_price_map[rc["id"]] = {}
        voksen_amount = None

        for nr_sfx, pc_sfx, ratio in CATEGORY_RATIOS:
            nr_key = id_prefix + nr_sfx
            pc_key = id_prefix + pc_sfx

            if ratio > 0:
                raw_eur = nok * exchangeRate * ratio
                cat_amount = int(math.ceil(raw_eur / 0.20) * 0.20 * 100)
            else:
                cat_amount = 0

            # Lagre voksenbeløpet for eksempelpriser
            if nr_sfx == "P__7" and pc_sfx == "G__1":
                voksen_amount = cat_amount

            price_id = f"1076_{datasetId}_I__{price_index}"
            new_prices.append({
                "id": price_id,
                "price": [{
                    "amount": cat_amount,
                    "currency": "EUR",
                    "scale": 2,
                    "vatDetails": []
                }]
            })
            rc_fare_price_map[rc["id"]][(nr_key, pc_key)] = price_id
            price_index += 1

        # Eksempelpriser bruker voksenprisen
        if voksen_amount is not None:
            for from_name, to_name, from_uic, to_uic in example_routes:
                if (
                    rc["entryConnectionPointId"] == cp_for_uic.get(from_uic)
                    and rc["exitConnectionPointId"] == cp_for_uic.get(to_uic)
                ):
                    examples[f"example_{example_idx}"] = (
                        f"{from_name} -> {to_name}: {voksen_amount / 100:.2f} EUR ({km} km)"
                    )
                    example_idx += 1

        GENERATION_PROGRESS["percent"] = int(idx / total * 100)

    fs["prices"] = new_prices

    # Oppdater priceRef i alle fares til å peke på nye price-id-er
    for fare in fs["fares"]:
        rc_ref = fare.get("regionalConstraintRef")
        nr = fare.get("nameRef")
        pc = fare.get("passengerConstraintRef")
        new_price_id = rc_fare_price_map.get(rc_ref, {}).get((nr, pc))
        if new_price_id:
            fare["priceRef"] = new_price_id

    GENERATION_PROGRESS["status"] = "done"
    GENERATION_PROGRESS["percent"] = 100

    out = Path(f"data/output/1076_{datasetId}_{environment}.json")
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
            "utcOffset": utc_offset_from,
            "exampleFares": examples,
        },
    }


# ---------------------------------------------------------------------
# Progress & download
# ---------------------------------------------------------------------

@app.get("/ui/progress")
def get_progress():
    return GENERATION_PROGRESS

@app.get("/ui/download-osdm/{filename}")
def download_osdm(filename: str):
    path = Path("data/output") / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="OSDM-fil finnes ikke")
    return FileResponse(path=path, media_type="application/json", filename=path.name)

# ---------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------

@app.get("/admin/list-users")
def list_users(request: Request):
    require_admin(request)
    db = SessionLocal()
    try:
        users = db.query(User).all()
        return [
            {
                "email": u.email,
                "is_admin": u.is_admin,
                "is_active": u.is_active,
                "has_logged_in": u.first_login_at is not None,
                "first_login_at": u.first_login_at.isoformat() if u.first_login_at else None,
                "must_change_password": bool(u.must_change_password),
            }
            for u in users
        ]
    finally:
        db.close()

@app.post("/admin/add-user")
def admin_add_user(request: Request, email: str = Form(...), is_admin: str = Form("false")):
    require_admin(request)
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            raise HTTPException(status_code=400, detail="Bruker finnes allerede")
        password = generate_password()
        db.add(User(
            email=email,
            password_hash=hash_password(password),
            is_admin=(is_admin.lower() == "true"),
            is_active=True,
            must_change_password=True,
        ))
        db.commit()
    finally:
        db.close()
    try:
        send_welcome_email(email, password)
        return {"ok": True, "email": email, "email_sent": True}
    except Exception as exc:
        logger.error("Kunne ikke sende velkomst-e-post til %s: %s", email, exc)
        return {"ok": True, "email": email, "email_sent": False}

@app.post("/admin/reset-password")
def admin_reset_password(request: Request, email: str = Form(...)):
    require_admin(request)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=404, detail="Bruker ikke funnet")
        new_password = generate_password()
        user.password_hash = hash_password(new_password)
        user.must_change_password = True
        db.commit()
    finally:
        db.close()
    try:
        send_reset_email(email, new_password)
        return {"ok": True, "email": email, "email_sent": True}
    except Exception as exc:
        logger.error("Kunne ikke sende reset-e-post til %s: %s", email, exc)
        return {"ok": True, "email": email, "email_sent": False}

@app.post("/admin/delete-user")
def delete_user(request: Request, email: str = Form(...)):
    require_admin(request)
    if email == request.session.get("user_email"):
        raise HTTPException(status_code=400, detail="Kan ikke slette deg selv")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Bruker ikke funnet")
        db.delete(user)
        db.commit()
        return {"ok": True, "deleted": email}
    finally:
        db.close()

# ---------------------------------------------------------------------
# OSDM til CSV
# ---------------------------------------------------------------------

def suffix(id_str: str) -> str:
    """Hent suffix etter siste '__', f.eks '1076_7.0_P__7' -> 'P__7'"""
    parts = id_str.split("_")
    # finn P__, G__, osv
    for i, p in enumerate(parts):
        if p in ("P", "G", "I", "K", "E", "S", "C", "M", "Q", "T", "D"):
            return p + "__" + parts[i + 1]
    return id_str


def osdm_to_xlsx_bytes(data: dict, job_id: str = None, jobs: dict = None) -> bytes:
    import io as _io
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter

    def set_progress(percent: int):
        if job_id and jobs and job_id in jobs:
            jobs[job_id]["percent"] = percent

    fs = data["fareDelivery"]["fareStructure"]
    delivery_id = data["fareDelivery"]["delivery"]["deliveryId"]

    text_map = {
        t["id"]: t.get("textUtf8", t.get("text", ""))
        for t in fs.get("texts", [])
    }
    price_map = {
        p["id"]: p["price"][0]["amount"]
        for p in fs.get("prices", [])
    }
    station_map = {
        sn["code"]: sn.get("nameUtf8", sn.get("name", ""))
        for sn in fs.get("stationNames", [])
    }
    service_class_map = {
        sc["id"]: text_map.get(sc.get("textRef", ""), sc["id"])
        for sc in fs.get("serviceClassDefinitions", [])
    }
    pc_map = {pc["id"]: pc for pc in fs.get("passengerConstraints", [])}

    # Reduction-oppslag: id -> korteste representative kortnavn
    reduction_map = {}
    for rc in fs.get("reductionConstraints", []):
        cards = rc.get("requiredCards", [])
        if cards:
            name = min(cards, key=lambda c: len(c.get("cardName", "")))
            reduction_map[rc["id"]] = name.get("cardName", rc["id"])

    set_progress(10)

    PASSENGER_TYPE_LABELS = {
        "ADULT": "Adult", "CHILD": "Child", "YOUNG_CHILD": "Young child",
        "SENIOR": "Senior", "DOG": "Dog", "INFANT": "Infant",
    }

    # CP-id -> beste UIC-kode og stasjonsnavn
    cp_to_uic = {}
    cp_to_name = {}
    for cp in fs["connectionPoints"]:
        best_code = None
        all_codes = []
        for ss in cp.get("stationSets", []):
            for s in ss:
                if s.get("codeList") == "UIC":
                    code = s["code"]
                    all_codes.append(code)
                    if best_code is None or s.get("country") == "NO":
                        best_code = code
        best_name = None
        for code in all_codes:
            name = station_map.get(code)
            if name:
                best_name = name
                break
        cp_to_uic[cp["id"]] = best_code or ""
        cp_to_name[cp["id"]] = best_name or best_code or ""

    rc_map = {rc["id"]: rc for rc in fs["regionalConstraints"]}

    set_progress(20)

    # Pass 1: bygg kolonnenavn uten passasjertype
    # Nøkkel: (nameRef, passengerConstraintRef, serviceClassRef, reductionConstraintRef)
    seen_categories = {}
    category_order = []

    for fare in fs["fares"]:
        nr = fare.get("nameRef", "")
        pc_ref = fare.get("passengerConstraintRef", "")
        sc = fare.get("serviceClassRef", "")
        red = fare.get("reductionConstraintRef", "")
        key = (nr, pc_ref, sc, red)
        if key not in seen_categories:
            parts = [text_map.get(nr, nr)]
            sc_name = service_class_map.get(sc, "")
            if sc_name:
                parts.append(sc_name)
            red_name = reduction_map.get(red, "")
            if red_name:
                parts.append(red_name)
            seen_categories[key] = " ".join(parts)
            category_order.append(key)

    set_progress(35)

    # Pass 2: legg til passasjertype kun for duplikater
    name_counts: dict = {}
    for name in seen_categories.values():
        name_counts[name] = name_counts.get(name, 0) + 1
    duplicates = {name for name, count in name_counts.items() if count > 1}

    for key in category_order:
        if seen_categories[key] in duplicates:
            nr, pc_ref, sc, red = key
            pc = pc_map.get(pc_ref, {})
            ptype = PASSENGER_TYPE_LABELS.get(pc.get("passengerType", ""), "")
            fare_name = text_map.get(nr, nr)
            sc_name = service_class_map.get(sc, "")
            red_name = reduction_map.get(red, "")
            parts = [fare_name]
            if ptype:
                parts.append(ptype)
            if sc_name:
                parts.append(sc_name)
            if red_name:
                parts.append(red_name)
            seen_categories[key] = " ".join(parts)

    set_progress(40)

    # Samle priser per RC
    rc_prices: dict = {}
    total_fares = len(fs["fares"])
    for i, fare in enumerate(fs["fares"]):
        rc_ref = fare.get("regionalConstraintRef")
        nr = fare.get("nameRef", "")
        pc = fare.get("passengerConstraintRef", "")
        sc = fare.get("serviceClassRef", "")
        red = fare.get("reductionConstraintRef", "")
        price_ref = fare.get("priceRef")
        amount = price_map.get(price_ref)
        if amount is not None and rc_ref:
            rc_prices.setdefault(rc_ref, {})[(nr, pc, sc, red)] = amount
        if i % 50000 == 0:
            set_progress(40 + int(i / total_fares * 30))

    set_progress(70)

    # Bygg rader
    seen_pairs: set = set()
    rows = []

    for rc_id, prices in rc_prices.items():
        rc = rc_map.get(rc_id)
        if not rc:
            continue
        entry_cp = rc["entryConnectionPointId"]
        exit_cp = rc["exitConnectionPointId"]
        entry_uic = cp_to_uic.get(entry_cp, "")
        exit_uic = cp_to_uic.get(exit_cp, "")

        pair = tuple(sorted([entry_uic, exit_uic]))
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)

        row = {
            "From UIC": entry_uic,
            "From station": cp_to_name.get(entry_cp, entry_uic),
            "To UIC": exit_uic,
            "To station": cp_to_name.get(exit_cp, exit_uic),
            "Km": rc.get("distance", ""),
        }
        for key in category_order:
            amount = prices.get(key)
            row[seen_categories[key]] = round(amount / 100, 2) if amount is not None else None
        rows.append(row)

    rows.sort(key=lambda r: r["From station"])

    set_progress(80)

    # Bygg XLSX
    wb = Workbook()
    ws = wb.active
    ws.title = f"Priser {delivery_id}"

    fieldnames = (
        ["From UIC", "From station", "To UIC", "To station", "Km"]
        + [seen_categories[key] for key in category_order]
    )

    header_font = Font(name="Arial", bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", start_color="0066CC")
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for col_idx, col_name in enumerate(fieldnames, start=1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align

    normal_font = Font(name="Arial", size=10)
    alt_fill = PatternFill("solid", start_color="E8F1FB")
    price_col_start = 6

    for row_idx, row in enumerate(rows, start=2):
        fill = alt_fill if row_idx % 2 == 0 else None
        for col_idx, col_name in enumerate(fieldnames, start=1):
            val = row.get(col_name, "")
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.font = normal_font
            if fill:
                cell.fill = fill
            if col_idx == 5:
                cell.number_format = "#,##0"
                cell.alignment = Alignment(horizontal="right")
            elif col_idx >= price_col_start:
                cell.number_format = "#,##0.00"
                cell.alignment = Alignment(horizontal="right")

    ws.column_dimensions["A"].width = 12
    ws.column_dimensions["B"].width = 22
    ws.column_dimensions["C"].width = 12
    ws.column_dimensions["D"].width = 22
    ws.column_dimensions["E"].width = 8
    for col_idx in range(price_col_start, len(fieldnames) + 1):
        ws.column_dimensions[get_column_letter(col_idx)].width = 20

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    ws.row_dimensions[1].height = 30

    set_progress(95)
    row_count = len(rows)
    buf = _io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read(), row_count


@app.post("/frontend/osdm-to-csv")
async def osdm_to_csv(
    request: Request,
    osdmFile: UploadFile = File(...),
):
    require_login(request)

    content = await osdmFile.read()
    print(f"Mottok fil: {osdmFile.filename}, størrelse: {len(content)} bytes")
    
    try:
        data = json.loads(content.decode("utf-8"))
        print("JSON parset OK")
    except Exception as e:
        print(f"JSON-feil: {e}")
        raise HTTPException(status_code=400, detail="Ugyldig JSON-fil")

    if "fareDelivery" not in data or "fareStructure" not in data.get("fareDelivery", {}):
        print("Struktursjekk feilet")
        raise HTTPException(status_code=400, detail="Filen ser ikke ut som en gyldig OSDM fareDelivery")

    job_id = str(uuid.uuid4())
    print(f"Starter jobb: {job_id}")
    XLSX_JOBS[job_id] = {"status": "running", "result": None, "error": None, "filename": None, "percent": 0, "rows": 0}

    def run():
        try:
            print(f"run() starter for jobb {job_id}")
            xlsx_bytes, row_count = osdm_to_xlsx_bytes(data, job_id, XLSX_JOBS)
            delivery = data.get("fareDelivery", {}).get("delivery", {})
            fare_provider = delivery.get("fareProvider", "")
            delivery_id = delivery.get("deliveryId", "osdm")
            usage = delivery.get("usage", "")
            env_suffix = "test" if usage == "TEST_ONLY" else "prod"
            filename = f"{fare_provider}_{delivery_id}_{env_suffix}.xlsx"
            XLSX_JOBS[job_id]["result"] = xlsx_bytes
            XLSX_JOBS[job_id]["rows"] = row_count
            XLSX_JOBS[job_id]["filename"] = filename
            XLSX_JOBS[job_id]["status"] = "done"
            XLSX_JOBS[job_id]["percent"] = 100
        except Exception as e:
            print(f"run() feilet: {e}")
            import traceback
            traceback.print_exc()
            XLSX_JOBS[job_id]["status"] = "error"
            XLSX_JOBS[job_id]["error"] = str(e)
            
    threading.Thread(target=run, daemon=True).start()
    print(f"Returnerer jobId: {job_id}")
    return {"jobId": job_id}

@app.get("/frontend/osdm-to-csv-status/{job_id}")
def osdm_to_csv_status(job_id: str, request: Request):
    require_login(request)
    job = XLSX_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Jobb ikke funnet")
    return {
        "status": job["status"],
        "percent": job.get("percent", 0),
        "error": job.get("error"),
        "filename": job.get("filename"),
        "rows": job.get("rows", 0),
}

@app.get("/frontend/osdm-to-csv-download/{job_id}")
def osdm_to_csv_download(job_id: str, request: Request):
    from fastapi.responses import StreamingResponse
    import io as _io
    require_login(request)
    job = XLSX_JOBS.get(job_id)
    if not job or job["status"] != "done":
        raise HTTPException(status_code=404, detail="Fil ikke klar")
    xlsx_bytes = job["result"]
    filename = job["filename"]
    # Rydd opp etter nedlasting
    del XLSX_JOBS[job_id]
    return StreamingResponse(
        _io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

@app.get("/admin", response_class=HTMLResponse)
def admin_page(request: Request):
    if "user_email" not in request.session or not request.session.get("is_admin"):
        return RedirectResponse("/", status_code=302)
    return HTMLResponse(Path("frontend/admin.html").read_text(encoding="utf-8"))

@app.get("/osdmtoexcel", response_class=HTMLResponse)
@app.head("/osdmtoexcel")
def osdmtoexcel_page(request: Request):
    if "user_email" not in request.session:
        return HTMLResponse(Path("frontend/login.html").read_text(encoding="utf-8"))
    is_admin = bool(request.session.get("is_admin"))
    html = Path("frontend/osdmtoexcel.html").read_text(encoding="utf-8")
    html = html.replace(
        "</head>",
        f"<script>window.IS_ADMIN = {str(is_admin).lower()};</script></head>"
    )
    return HTMLResponse(html)
