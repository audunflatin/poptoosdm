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

from backend.auth_db import SessionLocal, User, init_db
from backend.auth_utils import verify_password, generate_password, hash_password
from backend.core.settings import SESSION_SECRET

from zoneinfo import ZoneInfo
from datetime import datetime

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
    finally:
        db.close()
    return RedirectResponse("/", status_code=302)

@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/", status_code=302)

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
            {"email": u.email, "is_admin": u.is_admin, "is_active": u.is_active}
            for u in users
        ]
    finally:
        db.close()

@app.post("/admin/add-user")
def admin_add_user(request: Request, email: str = Form(...)):
    require_admin(request)
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            raise HTTPException(status_code=400, detail="Bruker finnes allerede")
        password = generate_password()
        db.add(User(
            email=email,
            password_hash=hash_password(password),
            is_admin=False,
            is_active=True,
        ))
        db.commit()
        return {"ok": True, "email": email, "password": password}
    finally:
        db.close()

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
        db.commit()
        return {"ok": True, "email": email, "password": new_password}
    finally:
        db.close()

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

# Kolonnedefinisjoner — (nameRef-suffix, passengerConstraint-suffix, kolonnenavn)
# Disse er relative til deliveryId og vil fungere uavhengig av versjon
# siden vi matcher på suffix etter siste "__"
OSDM_CSV_COLUMNS = [
    ("P__7",  "G__1", "Voksen"),
    ("P__34", "G__2", "Voksen gruppe"),
    ("P__11", "G__8", "Senior"),
    ("P__8",  "G__3", "Barn 6-17 år"),
    ("P__35", "G__4", "Barn 6-17 år gruppe"),
    ("P__9",  "G__6", "Barn 0-5 år"),
    ("P__36", "G__7", "Barn 0-5 år gruppe"),
    ("P__5",  "G__1", "FIP leisure reduction voksen"),
    ("P__5",  "G__3", "FIP leisure reduction barn"),
    ("P__10", "G__5", "Hund"),
]


def suffix(id_str: str) -> str:
    """Hent suffix etter siste '__', f.eks '1076_7.0_P__7' -> 'P__7'"""
    parts = id_str.split("_")
    # finn P__, G__, osv
    for i, p in enumerate(parts):
        if p in ("P", "G", "I", "K", "E", "S", "C", "M", "Q", "T", "D"):
            return p + "__" + parts[i + 1]
    return id_str


def osdm_to_xlsx_bytes(data: dict) -> bytes:
    import io as _io
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, PatternFill
    from openpyxl.utils import get_column_letter

    fs = data["fareDelivery"]["fareStructure"]
    delivery_id = data["fareDelivery"]["delivery"]["deliveryId"]

    station_map = {
        sn["code"]: sn.get("nameUtf8", sn.get("name", ""))
        for sn in fs.get("stationNames", [])
    }

    # CP-id -> foretrukken norsk UIC-kode
    cp_to_uic = {}
    for cp in fs["connectionPoints"]:
        no_code = None
        first_code = None
        for ss in cp.get("stationSets", []):
            for s in ss:
                if s.get("codeList") == "UIC":
                    if first_code is None:
                        first_code = s["code"]
                    if s.get("country") == "NO":
                        no_code = s["code"]
        cp_to_uic[cp["id"]] = no_code or first_code or ""

    price_map = {p["id"]: p["price"][0]["amount"] for p in fs.get("prices", [])}

    # Finn prefix fra fare-id-er
    sample_nr = fs["fares"][0].get("nameRef", "") if fs.get("fares") else ""
    id_prefix = "_".join(sample_nr.split("_")[:2]) + "_" if sample_nr else f"1076_{delivery_id}_"

    col_keys = [
        (id_prefix + nr_sfx, id_prefix + pc_sfx, col_name)
        for nr_sfx, pc_sfx, col_name in OSDM_CSV_COLUMNS
    ]

    rc_map = {rc["id"]: rc for rc in fs["regionalConstraints"]}

    # Samle priser per RC via priceRef i fares
    rc_prices: dict = {}
    for fare in fs["fares"]:
        rc_ref = fare.get("regionalConstraintRef")
        nr = fare.get("nameRef")
        pc = fare.get("passengerConstraintRef")
        price_ref = fare.get("priceRef")
        amount = price_map.get(price_ref)
        if amount is not None and rc_ref:
            rc_prices.setdefault(rc_ref, {})[(nr, pc)] = amount

    # Bygg rader
    seen_pairs: set = set()
    rows = []

    for rc_id, prices in rc_prices.items():
        rc = rc_map.get(rc_id)
        if not rc:
            continue
        entry_uic = cp_to_uic.get(rc["entryConnectionPointId"], "")
        exit_uic = cp_to_uic.get(rc["exitConnectionPointId"], "")
        pair = tuple(sorted([entry_uic, exit_uic]))
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)

        entry_name = station_map.get(entry_uic, entry_uic)
        exit_name = station_map.get(exit_uic, exit_uic)

        row = {
            "Fra UIC": entry_uic,
            "Fra stasjon": entry_name,
            "Til UIC": exit_uic,
            "Til stasjon": exit_name,
            "Km": rc.get("distance", ""),
        }
        for nr_key, pc_key, col_name in col_keys:
            amount = prices.get((nr_key, pc_key))
            row[col_name] = round(amount / 100, 2) if amount is not None else None
        rows.append(row)

    rows.sort(key=lambda r: r["Fra stasjon"])

    # Bygg XLSX
    wb = Workbook()
    ws = wb.active
    ws.title = f"Priser {delivery_id}"

    fieldnames = [
        "Fra UIC", "Fra stasjon", "Til UIC", "Til stasjon", "Km",
    ] + [col_name for _, _, col_name in OSDM_CSV_COLUMNS]

    # Header-styling
    header_font = Font(name="Arial", bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", start_color="0066CC")
    header_align = Alignment(horizontal="center", vertical="center")

    for col_idx, col_name in enumerate(fieldnames, start=1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align

    # Dataformat
    normal_font = Font(name="Arial", size=10)
    alt_fill = PatternFill("solid", start_color="E8F1FB")
    number_format = '#,##0.00'

    price_col_start = 6  # kolonne F og utover er priser

    for row_idx, row in enumerate(rows, start=2):
        fill = alt_fill if row_idx % 2 == 0 else None
        for col_idx, col_name in enumerate(fieldnames, start=1):
            val = row.get(col_name, "")
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.font = normal_font
            if fill:
                cell.fill = fill
            # Tall-format for priskolonner og km
            if col_idx == 5:  # Km
                cell.number_format = '#,##0'
                cell.alignment = Alignment(horizontal="right")
            elif col_idx >= price_col_start:
                cell.number_format = number_format
                cell.alignment = Alignment(horizontal="right")

    # Kolonnebredder
    col_widths = {
        1: 12,   # Fra UIC
        2: 22,   # Fra stasjon
        3: 12,   # Til UIC
        4: 22,   # Til stasjon
        5: 8,    # Km
    }
    default_price_width = 14

    for col_idx in range(1, len(fieldnames) + 1):
        width = col_widths.get(col_idx, default_price_width)
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    # Frys toppraden
    ws.freeze_panes = "A2"

    # Auto-filter
    ws.auto_filter.ref = ws.dimensions

    buf = _io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()

@app.post("/frontend/osdm-to-csv")
async def osdm_to_csv(
    request: Request,
    osdmFile: UploadFile = File(...),
):
    from fastapi.responses import StreamingResponse
    import io as _io

    require_login(request)

    content = await osdmFile.read()
    try:
        data = json.loads(content.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Ugyldig JSON-fil")

    if "fareDelivery" not in data or "fareStructure" not in data.get("fareDelivery", {}):
        raise HTTPException(status_code=400, detail="Filen ser ikke ut som en gyldig OSDM fareDelivery")

    try:
        xlsx_bytes = osdm_to_xlsx_bytes(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Konvertering feilet: {str(e)}")

    delivery_id = (
        data.get("fareDelivery", {})
        .get("delivery", {})
        .get("deliveryId", "osdm")
    )
    filename = f"1076_{delivery_id}_priser.xlsx"

    return StreamingResponse(
        _io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

@app.get("/osdmtocsv", response_class=HTMLResponse)
def osdmtocsv_page(request: Request):
    if "user_email" not in request.session:
        return HTMLResponse(
            Path("frontend/login.html").read_text(encoding="utf-8")
        )
    return HTMLResponse(
        Path("frontend/osdmtocsv.html").read_text(encoding="utf-8")
    )