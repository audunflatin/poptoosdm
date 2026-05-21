from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse, StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from pathlib import Path
import csv
import io
import json
import math

import base64
import threading
import uuid
import requests

from backend.auth_db import SessionLocal, User, LoginLog, PasswordResetToken, EventLog, init_db
from backend.auth_utils import verify_password, generate_password, hash_password
from backend.core.settings import SESSION_SECRET
from backend.email_utils import send_welcome_email, send_reset_email, send_reset_link_email, send_contact_email

import logging
logger = logging.getLogger(__name__)

from collections import defaultdict
import time

from zoneinfo import ZoneInfo
from datetime import datetime, timezone, timedelta

# ---------------------------------------------------------------------
# App
# ---------------------------------------------------------------------

app = FastAPI(title="OSDMTools")

app.mount("/static", StaticFiles(directory="frontend"), name="static")

app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET, same_site="strict")
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
# Rate limiting (innlogging)
# ---------------------------------------------------------------------

_login_attempts: dict[str, list[float]] = defaultdict(list)
_LOGIN_WINDOW = 60   # sekunder
_LOGIN_MAX    = 10   # maks forsøk per vindu

def _get_client_ip(request: Request) -> str:
    """Hent reell klient-IP — foretrekker Cloudflare-header."""
    return (
        request.headers.get("CF-Connecting-IP")
        or (request.client.host if request.client else "unknown")
    )

def _rate_limit_check(ip: str):
    now = time.time()
    _login_attempts[ip] = [t for t in _login_attempts[ip] if now - t < _LOGIN_WINDOW]
    if len(_login_attempts[ip]) >= _LOGIN_MAX:
        raise HTTPException(status_code=429, detail="For mange innloggingsforsøk. Prøv igjen om litt.")
    _login_attempts[ip].append(now)

def _rate_limit_reset(ip: str):
    _login_attempts.pop(ip, None)

# ---------------------------------------------------------------------
# State
# ---------------------------------------------------------------------

TEN_TABLE = None
GENERATION_PROGRESS = {"status": "idle", "percent": 0}
OSDM_IN = Path("data/input/1076-OSDM-template.json")
OSDM_OUT: dict | None = None  # {"filename": str, "content": str}
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
# Event logging
# ---------------------------------------------------------------------

def log_event(
    user_email: str | None,
    event_type: str,
    status: str = "ok",
    detail: dict | None = None,
):
    try:
        db = SessionLocal()
        try:
            db.add(EventLog(
                user_email=user_email,
                event_type=event_type,
                status=status,
                detail=json.dumps(detail, ensure_ascii=False) if detail else None,
            ))
            db.commit()
        finally:
            db.close()
    except Exception:
        pass  # Logging skal aldri bryte en forespørsel

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
    ip = _get_client_ip(request)
    _rate_limit_check(ip)
    email = email.lower()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.is_active or not verify_password(password, user.password_hash):
            db.add(LoginLog(email=email, ip_address=ip, success=False))
            db.commit()
            log_event(email, "login_failed", "error", {"ip": ip})
            raise HTTPException(status_code=401, detail="Ugyldig innlogging")
        _rate_limit_reset(ip)
        request.session["user_email"] = user.email
        request.session["is_admin"] = user.is_admin
        db.add(LoginLog(email=user.email, ip_address=ip, success=True))
        log_event(user.email, "login_success", "ok", {"ip": ip})
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
    email = request.session.get("user_email")
    request.session.clear()
    log_event(email, "logout")
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
    log_event(email, "password_changed")
    return {"ok": True}

# ---------------------------------------------------------------------
# Glemt passord
# ---------------------------------------------------------------------

@app.get("/forgot-password", response_class=HTMLResponse)
def forgot_password_page():
    return HTMLResponse(Path("frontend/forgot_password.html").read_text(encoding="utf-8"))

@app.post("/forgot-password")
def forgot_password(email: str = Form(...)):
    email = email.lower()
    from backend.core.settings import APP_URL as _APP_URL
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email, User.is_active == True).first()
        if user:
            token = str(uuid.uuid4())
            expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + __import__("datetime").timedelta(hours=1)
            db.add(PasswordResetToken(token=token, email=email, expires_at=expires_at))
            db.commit()
            try:
                send_reset_link_email(email, f"{_APP_URL}/reset-password/{token}")
            except Exception as exc:
                logger.error("Kunne ikke sende reset-lenke til %s: %s", email, exc)
    finally:
        db.close()
    return {"ok": True}

@app.get("/reset-password/{token}", response_class=HTMLResponse)
def reset_password_page(token: str):
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        rt = db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token,
            PasswordResetToken.expires_at > now,
        ).first()
        if not rt:
            return HTMLResponse("<h2>Lenken er ugyldig eller utløpt.</h2>", status_code=400)
    finally:
        db.close()
    html = Path("frontend/reset_password.html").read_text(encoding="utf-8")
    return HTMLResponse(html.replace("__TOKEN__", token))

@app.post("/reset-password/{token}")
def reset_password(token: str, password: str = Form(...), confirm: str = Form(...)):
    if password != confirm:
        raise HTTPException(status_code=400, detail="Passordene er ikke like")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Passordet må være minst 8 tegn")
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        rt = db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token,
            PasswordResetToken.expires_at > now,
        ).first()
        if not rt:
            raise HTTPException(status_code=400, detail="Lenken er ugyldig eller utløpt")
        user = db.query(User).filter(User.email == rt.email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Bruker ikke funnet")
        user.password_hash = hash_password(password)
        user.must_change_password = False
        db.delete(rt)
        db.commit()
    finally:
        db.close()
    log_event(rt.email, "password_changed", detail={"via": "reset_link"})
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
# OSDM validation
# ---------------------------------------------------------------------

@app.post("/ui/validate-osdm")
async def validate_osdm(request: Request, osdmFile: UploadFile = File(...)):
    require_login(request)

    try:
        data = json.loads(await osdmFile.read())
    except Exception:
        return {"ok": False, "error": "Filen er ikke gyldig JSON"}

    fd = data.get("fareDelivery", {})
    if not fd or "fareStructure" not in fd:
        return {"ok": False, "error": "Filen mangler fareDelivery.fareStructure"}

    delivery = fd.get("delivery", {})
    fs = fd["fareStructure"]
    warnings: list[str] = []

    # Build defined-ID sets
    price_ids      = {p["id"] for p in fs.get("prices", [])}
    pc_ids         = {p["id"] for p in fs.get("passengerConstraints", [])}
    rc_ids         = {r["id"] for r in fs.get("regionalConstraints", [])}
    cc_ids         = {c["id"] for c in fs.get("carrierConstraints", [])}
    bundle_ids     = {b["id"] for b in fs.get("fareConstraintBundles", [])}
    text_ids       = {t["id"] for t in fs.get("texts", [])}
    cp_ids         = {cp["id"] for cp in fs.get("connectionPoints", [])}

    # Track which IDs are actually used
    used_price_ids: set[str] = set()
    used_pc_ids:    set[str] = set()
    used_rc_ids:    set[str] = set()

    missing: dict[str, set[str]] = {
        "priceRef": set(), "passengerConstraintRef": set(),
        "regionalConstraintRef": set(), "carrierConstraintRef": set(),
        "bundleRef": set(), "nameRef": set(),
    }

    for fare in fs.get("fares", []):
        pr = fare.get("priceRef")
        if pr:
            if pr not in price_ids:
                missing["priceRef"].add(pr)
            else:
                used_price_ids.add(pr)

        pc = fare.get("passengerConstraintRef")
        if pc:
            if pc not in pc_ids:
                missing["passengerConstraintRef"].add(pc)
            else:
                used_pc_ids.add(pc)

        rc = fare.get("regionalConstraintRef")
        if rc:
            if rc not in rc_ids:
                missing["regionalConstraintRef"].add(rc)
            else:
                used_rc_ids.add(rc)

        cc = fare.get("carrierConstraintRef")
        if cc and cc not in cc_ids:
            missing["carrierConstraintRef"].add(cc)

        br = fare.get("bundleRef")
        if br and br not in bundle_ids:
            missing["bundleRef"].add(br)

        nr = fare.get("nameRef")
        if nr and nr not in text_ids:
            missing["nameRef"].add(nr)

    # Check RC consistency (entry/exit CPs must exist)
    rc_bad_cps: list[str] = []
    for rc in fs.get("regionalConstraints", []):
        for field in ("entryConnectionPointId", "exitConnectionPointId"):
            cp = rc.get(field)
            if cp and cp not in cp_ids:
                rc_bad_cps.append(f"{rc['id']}: {field}={cp}")

    # Emit warnings for missing refs (capped at 5 examples each)
    label_map = {
        "priceRef": "prices",
        "passengerConstraintRef": "passengerConstraints",
        "regionalConstraintRef": "regionalConstraints",
        "carrierConstraintRef": "carrierConstraints",
        "bundleRef": "fareConstraintBundles",
        "nameRef": "texts",
    }
    for field, ids in missing.items():
        if ids:
            examples = ", ".join(sorted(ids)[:5])
            more = f" (+ {len(ids) - 5} til)" if len(ids) > 5 else ""
            warnings.append(
                f"{len(ids)} fare(r) peker på ukjent {field} i {label_map[field]}: {examples}{more}"
            )

    if rc_bad_cps:
        examples = "; ".join(rc_bad_cps[:3])
        more = f" (+ {len(rc_bad_cps) - 3} til)" if len(rc_bad_cps) > 3 else ""
        warnings.append(f"RC-er med ugyldig CP-referanse: {examples}{more}")

    # Warn about unused definitions
    unused_prices = price_ids - used_price_ids
    unused_pcs    = pc_ids - used_pc_ids
    unused_rcs    = rc_ids - used_rc_ids

    if unused_prices:
        warnings.append(f"{len(unused_prices)} pris(er) er definert men ikke referert av noen fare")
    if unused_pcs:
        warnings.append(f"{len(unused_pcs)} passengerConstraint(s) er definert men ikke referert av noen fare")
    if unused_rcs:
        warnings.append(f"{len(unused_rcs)} regionalConstraint(s) er definert men ikke referert av noen fare")

    station_count = len({
        s["code"]
        for cp in fs.get("connectionPoints", [])
        for ss in cp.get("stationSets", [])
        for s in ss
        if s.get("codeList") == "UIC"
    })

    return {
        "ok": True,
        "warnings": warnings,
        "deliveryId": delivery.get("deliveryId", ""),
        "fareProvider": delivery.get("fareProvider", ""),
        "fareCount": len(fs.get("fares", [])),
        "priceCount": len(price_ids),
        "stationCount": station_count,
    }


# ---------------------------------------------------------------------
# Distance CSV validation
# ---------------------------------------------------------------------

@app.post("/ui/validate-distances")
async def validate_distances(
    request: Request,
    distanceFile: UploadFile = File(...),
    osdmFile: UploadFile = File(...),
):
    require_login(request)

    # Parse TEN-format avstandsfil (fra_km;til_km;pris)
    try:
        csv_text = (await distanceFile.read()).decode("utf-8-sig")
    except Exception:
        return {"ok": False, "error": "Kunne ikke lese avstandsfilen"}

    ten_result = validate_ten_csv(csv_text)
    if not ten_result["ok"]:
        return {"ok": False, "error": ten_result["error"]}
    ten_table: list[tuple[int, int, int]] = ten_result["table"]  # (fra_km, til_km, pris)

    # Parse OSDM
    try:
        data = json.loads(await osdmFile.read())
    except Exception:
        return {"ok": False, "error": "OSDM-filen er ikke gyldig JSON"}

    fs = data.get("fareDelivery", {}).get("fareStructure", {})
    if not fs:
        return {"ok": False, "error": "OSDM-filen mangler fareDelivery.fareStructure"}

    # Stasjonsnavn fra stationNames
    station_names: dict[str, str] = {
        sn["code"]: sn.get("nameUtf8") or sn.get("name") or sn["code"]
        for sn in fs.get("stationNames", [])
    }

    # CP-id → beste UIC-kode og stasjonsnavn
    cp_to_uic: dict[str, str] = {}
    cp_to_name: dict[str, str] = {}
    for cp in fs.get("connectionPoints", []):
        uic_codes = [
            s["code"]
            for ss in cp.get("stationSets", [])
            for s in ss
            if s.get("codeList") == "UIC"
        ]
        best = next((c for c in uic_codes if str(c).startswith("76")), uic_codes[0] if uic_codes else None)
        if best:
            cp_to_uic[cp["id"]] = str(best)
            cp_to_name[cp["id"]] = station_names.get(str(best), str(best))

    # Samle unike avstandsverdier fra OSDM (én per RC, ignorer duplikater)
    osdm_distances: dict[int, list[str]] = {}  # km → liste med "Fra → Til"-beskrivelser
    for rc in fs.get("regionalConstraints", []):
        km = rc.get("distance")
        if km is None:
            continue
        entry = cp_to_name.get(rc.get("entryConnectionPointId", ""), rc.get("entryConnectionPointId", ""))
        exit_ = cp_to_name.get(rc.get("exitConnectionPointId", ""), rc.get("exitConnectionPointId", ""))
        osdm_distances.setdefault(km, []).append(f"{entry} → {exit_}")

    def ten_covers(km: int) -> bool:
        return any(frm <= km <= til for frm, til, _ in ten_table)

    warnings: list[str] = []
    uncovered: list[str] = []

    for km, routes in sorted(osdm_distances.items()):
        if not ten_covers(km):
            example = routes[0]
            more = f" (+ {len(routes) - 1} RC til med samme avstand)" if len(routes) > 1 else ""
            uncovered.append(f"{km} km ({example}{more})")

    if uncovered:
        cap = 15
        examples = "; ".join(uncovered[:cap])
        more = f" (+ {len(uncovered) - cap} til)" if len(uncovered) > cap else ""
        warnings.append(
            f"{len(uncovered)} avstandsverdi(er) fra OSDM dekkes ikke av TEN-tabellen: {examples}{more}"
        )

    ten_max = ten_table[-1][1]
    osdm_max = max(osdm_distances.keys()) if osdm_distances else 0
    if osdm_max > ten_max:
        warnings.append(
            f"OSDM har ruter opp til {osdm_max} km, men TEN-tabellen slutter på {ten_max} km"
        )

    return {
        "ok": True,
        "warnings": warnings,
        "tenRows": len(ten_table),
        "tenRangeKm": f"{ten_table[0][0]}–{ten_table[-1][1]}",
        "osdmDistinctDistances": len(osdm_distances),
        "osdmRcCount": sum(len(v) for v in osdm_distances.values()),
        "uncoveredCount": len(uncovered),
    }


# ---------------------------------------------------------------------
# Exchange rate
# ---------------------------------------------------------------------

@app.get("/ui/exchange-rate")
def exchange_rate(request: Request, from_: str = "EUR", to: str = "NOK"):
    require_login(request)
    try:
        resp = requests.get(
            f"https://api.frankfurter.app/latest",
            params={"from": from_.upper(), "to": to.upper()},
            timeout=5,
        )
        resp.raise_for_status()
        payload = resp.json()
        rate = payload["rates"][to.upper()]
        return {"ok": True, "from": from_.upper(), "to": to.upper(), "rate": rate, "date": payload.get("date")}
    except Exception as exc:
        logger.warning("Kunne ikke hente valutakurs %s→%s: %s", from_, to, exc)
        return {"ok": False, "error": "Kunne ikke hente valutakurs fra frankfurter.app"}


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
    previousDeliveryId: str = Form(""),
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
    if previousDeliveryId.strip():
        data["fareDelivery"]["delivery"]["previousDeliveryId"] = previousDeliveryId.strip()
    else:
        data["fareDelivery"]["delivery"].pop("previousDeliveryId", None)
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

    filename = f"1076_{datasetId}_{environment}.json"
    content = json.dumps(data, indent=2, ensure_ascii=False)

    global OSDM_OUT
    OSDM_OUT = {"filename": filename, "content": content}

    log_event(request.session.get("user_email"), "osdm_generated", detail={
        "deliveryId": datasetId,
        "environment": environment,
        "validFrom": validFrom,
        "validTo": validTo,
        "priceCount": len(new_prices),
    })

    return {
        "step": "OSDM generation",
        "ok": True,
        "outputFile": filename,
        "summary": {
            "pricesUpdated": len(fs["prices"]),
            "exchangeRate": exchangeRate,
            "environment": environment,
            "utcOffset": utc_offset_from,
            "exampleFares": examples,
        },
    }


# ---------------------------------------------------------------------
# Progress, download & Excel export
# ---------------------------------------------------------------------

@app.get("/ui/progress")
def get_progress():
    return GENERATION_PROGRESS

@app.post("/ui/excel-from-generated")
def excel_from_generated(request: Request):
    require_login(request)
    if not OSDM_OUT:
        raise HTTPException(status_code=400, detail="Ingen generert OSDM-fil tilgjengelig")
    try:
        data = json.loads(OSDM_OUT["content"])
    except Exception:
        raise HTTPException(status_code=500, detail="Kunne ikke lese generert OSDM-fil")

    job_id = str(uuid.uuid4())
    XLSX_JOBS[job_id] = {"status": "running", "result": None, "error": None, "filename": None, "percent": 0, "rows": 0}

    caller_email = request.session.get("user_email")

    def run():
        try:
            xlsx_bytes, row_count = osdm_to_xlsx_bytes(data, job_id, XLSX_JOBS)
            delivery   = data.get("fareDelivery", {}).get("delivery", {})
            env_suffix = "test" if delivery.get("usage") == "TEST_ONLY" else "prod"
            filename   = f"{delivery.get('fareProvider', '')}_{delivery.get('deliveryId', 'osdm')}_{env_suffix}.xlsx"
            XLSX_JOBS[job_id].update({"status": "done", "result": xlsx_bytes, "filename": filename, "rows": row_count, "percent": 100})
            log_event(caller_email, "excel_exported", detail={"filename": filename, "rows": row_count})
        except Exception as e:
            import traceback; traceback.print_exc()
            XLSX_JOBS[job_id].update({"status": "error", "error": str(e)})
            log_event(caller_email, "excel_exported", "error", {"error": str(e)})

    threading.Thread(target=run, daemon=True).start()
    return {"jobId": job_id}


@app.get("/ui/download-osdm/{filename}")
def download_osdm(filename: str):
    if not OSDM_OUT or OSDM_OUT["filename"] != filename:
        raise HTTPException(status_code=404, detail="OSDM-fil finnes ikke")
    return Response(
        content=OSDM_OUT["content"],
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

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
    email = email.lower()
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
    log_event(request.session.get("user_email"), "admin_user_created", detail={
        "email": email, "is_admin": is_admin.lower() == "true",
    })
    try:
        send_welcome_email(email, password)
        return {"ok": True, "email": email, "email_sent": True}
    except Exception as exc:
        logger.error("Kunne ikke sende velkomst-e-post til %s: %s", email, exc)
        return {"ok": True, "email": email, "email_sent": False}

@app.post("/admin/reset-password")
def admin_reset_password(request: Request, email: str = Form(...)):
    require_admin(request)
    email = email.lower()
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
    log_event(request.session.get("user_email"), "admin_password_reset", detail={"email": email})
    try:
        send_reset_email(email, new_password)
        return {"ok": True, "email": email, "email_sent": True}
    except Exception as exc:
        logger.error("Kunne ikke sende reset-e-post til %s: %s", email, exc)
        return {"ok": True, "email": email, "email_sent": False}

@app.post("/admin/set-admin")
def admin_set_admin(request: Request, email: str = Form(...), is_admin: str = Form(...)):
    require_admin(request)
    email = email.lower()
    if email == request.session.get("user_email"):
        raise HTTPException(status_code=400, detail="Kan ikke endre din egen admin-status")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Bruker ikke funnet")
        user.is_admin = (is_admin.lower() == "true")
        db.commit()
        log_event(request.session.get("user_email"), "admin_set_admin", detail={
            "email": email, "is_admin": user.is_admin,
        })
        return {"ok": True, "email": email, "is_admin": user.is_admin}
    finally:
        db.close()

@app.post("/admin/delete-user")
def delete_user(request: Request, email: str = Form(...)):
    require_admin(request)
    email = email.lower()
    if email == request.session.get("user_email"):
        raise HTTPException(status_code=400, detail="Kan ikke slette deg selv")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Bruker ikke funnet")
        db.delete(user)
        db.commit()
        log_event(request.session.get("user_email"), "admin_user_deleted", detail={"email": email})
        return {"ok": True, "deleted": email}
    finally:
        db.close()

@app.get("/admin/login-log")
def admin_login_log(
    request: Request,
    search: str = "",
    date_from: str = "",
    date_to: str = "",
    page: int = 1,
    page_size: int = 25,
):
    require_admin(request)
    db = SessionLocal()
    try:
        q = db.query(LoginLog)
        if search:
            q = q.filter(LoginLog.email.ilike(f"%{search}%"))
        if date_from:
            q = q.filter(LoginLog.logged_at >= date_from)
        if date_to:
            dt_to = datetime.fromisoformat(date_to) + timedelta(days=1)
            q = q.filter(LoginLog.logged_at < dt_to)
        total = q.count()
        entries = (
            q.order_by(LoginLog.logged_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "entries": [
                {
                    "email": e.email,
                    "logged_at": e.logged_at.isoformat() if e.logged_at else None,
                    "ip_address": e.ip_address or "—",
                    "success": bool(e.success) if e.success is not None else True,
                }
                for e in entries
            ],
        }
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


from backend.rics_codes import RICS_CODES as RICS_CARRIER_NAMES, RICS_COUNTRIES


def osdm_to_xlsx_bytes(data: dict, job_id: str = None, jobs: dict = None) -> bytes:
    import io as _io
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from datetime import datetime, timezone, timedelta

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
    svc_constraint_map = {
        sc["id"]: text_map.get(sc.get("textRef", ""), sc["id"])
        for sc in fs.get("serviceConstraints", [])
    }

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
    # Nøkkel: (nameRef, passengerConstraintRef, serviceClassRef, reductionConstraintRef, serviceConstraintRef)
    seen_categories = {}
    category_order = []

    for fare in fs["fares"]:
        nr = fare.get("nameRef", "")
        pc_ref = fare.get("passengerConstraintRef", "")
        sc = fare.get("serviceClassRef", "")
        red = fare.get("reductionConstraintRef", "")
        svc = fare.get("serviceConstraintRef", "")
        key = (nr, pc_ref, sc, red, svc)
        if key not in seen_categories:
            parts = [text_map.get(nr, nr)]
            sc_name = service_class_map.get(sc, "")
            if sc_name:
                parts.append(sc_name)
            red_name = reduction_map.get(red, "")
            if red_name:
                parts.append(red_name)
            svc_name = svc_constraint_map.get(svc, "")
            if svc_name:
                parts.append(svc_name)
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
            nr, pc_ref, sc, red, svc = key
            pc = pc_map.get(pc_ref, {})
            ptype = PASSENGER_TYPE_LABELS.get(pc.get("passengerType", ""), "")
            fare_name = text_map.get(nr, nr)
            sc_name = service_class_map.get(sc, "")
            red_name = reduction_map.get(red, "")
            svc_name = svc_constraint_map.get(svc, "")
            parts = [fare_name]
            if ptype:
                parts.append(ptype)
            if sc_name:
                parts.append(sc_name)
            if red_name:
                parts.append(red_name)
            if svc_name:
                parts.append(svc_name)
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
        svc = fare.get("serviceConstraintRef", "")
        price_ref = fare.get("priceRef")
        amount = price_map.get(price_ref)
        if amount is not None and rc_ref:
            rc_prices.setdefault(rc_ref, {})[(nr, pc, sc, red, svc)] = amount
        if i % 50000 == 0:
            set_progress(40 + int(i / total_fares * 30))

    set_progress(70)

    # Bygg rader: slå sammen priser fra alle RC-er med samme stasjonsparparet
    pair_data: dict = {}  # sortert UIC-par -> {"entry_cp", "exit_cp", "rc", "prices"}

    for rc_id, prices in rc_prices.items():
        rc = rc_map.get(rc_id)
        if not rc:
            continue
        entry_cp = rc["entryConnectionPointId"]
        exit_cp = rc["exitConnectionPointId"]
        entry_uic = cp_to_uic.get(entry_cp, "")
        exit_uic = cp_to_uic.get(exit_cp, "")

        pair = tuple(sorted([entry_uic, exit_uic]))
        if pair not in pair_data:
            pair_data[pair] = {
                "entry_cp": entry_cp,
                "exit_cp": exit_cp,
                "rc": rc,
                "prices": {},
            }
        pair_data[pair]["prices"].update(prices)

    rows = []
    for pdata in pair_data.values():
        entry_cp = pdata["entry_cp"]
        exit_cp = pdata["exit_cp"]
        rc = pdata["rc"]
        prices = pdata["prices"]
        row = {
            "From UIC": cp_to_uic.get(entry_cp, ""),
            "From station": cp_to_name.get(entry_cp, ""),
            "To UIC": cp_to_uic.get(exit_cp, ""),
            "To station": cp_to_name.get(exit_cp, ""),
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
    num_cols = len(fieldnames)
    last_col = get_column_letter(num_cols)

    header_font = Font(name="Arial", bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", start_color="0066CC")
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    normal_font = Font(name="Arial", size=10)
    alt_fill = PatternFill("solid", start_color="E8F1FB")
    price_col_start = 6

    # --- Metadata-seksjon øverst ---
    delivery = data["fareDelivery"]["delivery"]
    cal = fs.get("calendars", [{}])[0]
    utc_offset = cal.get("utcOffset", 0)
    tz = timezone(timedelta(minutes=utc_offset))

    def parse_osdm_date(dt_str):
        if not dt_str:
            return ""
        try:
            dt = datetime.fromisoformat(dt_str.replace("+0000", "+00:00"))
            return dt.astimezone(tz).strftime("%Y-%m-%d")
        except Exception:
            return dt_str[:10]

    valid_from  = parse_osdm_date(cal.get("fromDate", ""))
    valid_until = parse_osdm_date(cal.get("untilDate", ""))
    carriers = sorted({
        c for cc in fs.get("carrierConstraints", [])
        for c in cc.get("includedCarrier", [])
    })
    carriers_display = ", ".join(
        f"{RICS_CARRIER_NAMES[c]} ({c})" if c in RICS_CARRIER_NAMES else c
        for c in carriers
    )
    usage = delivery.get("usage", "")

    thin = Side(style="thin", color="B0C4DE")
    cell_border  = Border(left=thin, right=thin, top=thin, bottom=thin)
    label_fill   = PatternFill("solid", start_color="D0E4F7")
    value_fill   = PatternFill("solid", start_color="F5F9FF")
    label_font   = Font(name="Arial", size=10, bold=True, color="1A3A5C")
    value_font   = Font(name="Arial", size=10, color="1A1A1A")
    label_align  = Alignment(horizontal="left", vertical="center", indent=1)

    # Rad 1: tittelbar
    ws.merge_cells(f"A1:{last_col}1")
    tc = ws["A1"]
    tc.value = (
        f"OSDM Fare Delivery  —  "
        f"Provider {delivery.get('fareProvider', '')}  /  "
        f"Delivery {delivery.get('deliveryId', '')}"
    )
    tc.font      = Font(name="Arial", size=13, bold=True, color="FFFFFF")
    tc.fill      = PatternFill("solid", start_color="003A7A")
    tc.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    # Rader 2-6: to label+verdi-par per rad
    info_rows = [
        ("Fare Provider", delivery.get("fareProvider", ""),
         "Valid from",    valid_from),
        ("Delivery ID",   delivery.get("deliveryId", ""),
         "Valid until",   valid_until),
        ("OSDM version",  delivery.get("version", ""),
         "Carriers",      carriers_display),
        ("Usage",         usage,
         "Route pairs",   str(len(pair_data))),
        ("Optional",      "Yes" if delivery.get("optionalDelivery") else "No",
         "Fares",         f"{len(fs['fares']):,}"),
    ]

    for r_off, (lbl1, val1, lbl2, val2) in enumerate(info_rows, start=2):
        for col, text, is_label in (
            (1, lbl1, True), (2, val1, False),
            (3, lbl2, True), (4, val2, False),
        ):
            cell = ws.cell(row=r_off, column=col, value=text)
            cell.font      = label_font if is_label else value_font
            cell.fill      = label_fill if is_label else value_fill
            cell.border    = cell_border
            cell.alignment = label_align
        # Fargelegg usage-verdien
        if lbl1 == "Usage":
            uc = ws.cell(row=r_off, column=2)
            if val1 == "PRODUCTION":
                uc.font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
                uc.fill = PatternFill("solid", start_color="2E7D32")
            elif "TEST" in val1:
                uc.font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
                uc.fill = PatternFill("solid", start_color="C65000")
        ws.row_dimensions[r_off].height = 18

    # Rad 7: tom separator — pristabell starter på rad 8
    TABLE_HEADER_ROW = 8
    TABLE_DATA_START = 9

    # --- Pristabell-header (rad 8) ---
    for col_idx, col_name in enumerate(fieldnames, start=1):
        cell = ws.cell(row=TABLE_HEADER_ROW, column=col_idx, value=col_name)
        cell.font      = header_font
        cell.fill      = header_fill
        cell.alignment = header_align

    # --- Pristabell-data (rad 9+) ---
    for row_idx, row in enumerate(rows, start=TABLE_DATA_START):
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
    for col_idx in range(price_col_start, num_cols + 1):
        ws.column_dimensions[get_column_letter(col_idx)].width = 20

    ws.freeze_panes = f"A{TABLE_DATA_START}"
    ws.auto_filter.ref = f"A{TABLE_HEADER_ROW}:{last_col}{TABLE_HEADER_ROW + len(rows)}"
    ws.row_dimensions[TABLE_HEADER_ROW].height = 30

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
    caller_email = request.session.get("user_email")

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
            log_event(caller_email, "excel_exported", detail={"filename": filename, "rows": row_count})
        except Exception as e:
            print(f"run() feilet: {e}")
            import traceback
            traceback.print_exc()
            XLSX_JOBS[job_id]["status"] = "error"
            XLSX_JOBS[job_id]["error"] = str(e)
            log_event(caller_email, "excel_exported", "error", {"error": str(e)})
            
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
def admin_redirect(request: Request):
    if "user_email" not in request.session or not request.session.get("is_admin"):
        return RedirectResponse("/", status_code=302)
    return RedirectResponse("/admin/users", status_code=302)

@app.get("/admin/users", response_class=HTMLResponse)
def admin_users_page(request: Request):
    if "user_email" not in request.session or not request.session.get("is_admin"):
        return RedirectResponse("/", status_code=302)
    return HTMLResponse(Path("frontend/admin.html").read_text(encoding="utf-8"))

@app.get("/admin/log", response_class=HTMLResponse)
def admin_log_page(request: Request):
    if "user_email" not in request.session or not request.session.get("is_admin"):
        return RedirectResponse("/", status_code=302)
    return HTMLResponse(Path("frontend/admin-log.html").read_text(encoding="utf-8"))

@app.get("/admin/event-log")
def admin_event_log(
    request: Request,
    search: str = "",
    date_from: str = "",
    date_to: str = "",
    event_type: str = "",
    status: str = "",
    page: int = 1,
    page_size: int = 50,
):
    require_admin(request)
    db = SessionLocal()
    try:
        q = db.query(EventLog)
        if search:
            q = q.filter(EventLog.user_email.ilike(f"%{search}%"))
        if date_from:
            q = q.filter(EventLog.logged_at >= date_from)
        if date_to:
            dt_to = datetime.fromisoformat(date_to) + timedelta(days=1)
            q = q.filter(EventLog.logged_at < dt_to)
        if event_type:
            q = q.filter(EventLog.event_type == event_type)
        if status:
            q = q.filter(EventLog.status == status)
        total = q.count()
        entries = (
            q.order_by(EventLog.logged_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "entries": [
                {
                    "id": e.id,
                    "logged_at": e.logged_at.isoformat() if e.logged_at else None,
                    "user_email": e.user_email or "—",
                    "event_type": e.event_type,
                    "status": e.status or "ok",
                    "detail": json.loads(e.detail) if e.detail else {},
                }
                for e in entries
            ],
        }
    finally:
        db.close()

@app.get("/kontakt", response_class=HTMLResponse)
@app.head("/kontakt")
def kontakt_page(request: Request):
    if "user_email" not in request.session:
        return HTMLResponse(Path("frontend/login.html").read_text(encoding="utf-8"))
    is_admin  = bool(request.session.get("is_admin"))
    user_email = request.session.get("user_email", "")
    html = Path("frontend/contact.html").read_text(encoding="utf-8")
    html = html.replace(
        "</head>",
        f"<script>window.IS_ADMIN = {str(is_admin).lower()}; window.USER_EMAIL = {json.dumps(user_email)};</script></head>"
    )
    return HTMLResponse(html)

@app.get("/endre-passord", response_class=HTMLResponse)
@app.head("/endre-passord")
def endre_passord_page(request: Request):
    if "user_email" not in request.session:
        return HTMLResponse(Path("frontend/login.html").read_text(encoding="utf-8"))
    is_admin = bool(request.session.get("is_admin"))
    html = Path("frontend/endre-passord.html").read_text(encoding="utf-8")
    html = html.replace(
        "</head>",
        f"<script>window.IS_ADMIN = {str(is_admin).lower()};</script></head>"
    )
    return HTMLResponse(html)

@app.post("/contact")
def contact(
    name: str = Form(...),
    email: str = Form(...),
    message: str = Form(...),
):
    try:
        send_contact_email(name, email, message)
        log_event(email, "contact_sent", detail={"name": name})
        return {"ok": True}
    except Exception as exc:
        logger.error("Kunne ikke sende kontakt-e-post: %s", exc)
        log_event(email, "contact_sent", "error", {"name": name})
        return {"ok": False}

@app.get("/fare-discount/rics")
def fare_discount_rics(request: Request):
    require_login(request)
    return [
        {"code": code, "name": name, "country": RICS_COUNTRIES.get(code, "")}
        for code, name in sorted(RICS_CARRIER_NAMES.items(), key=lambda x: x[1])
    ]


@app.get("/fare-discount", response_class=HTMLResponse)
@app.head("/fare-discount")
def fare_discount_page(request: Request):
    if "user_email" not in request.session:
        return HTMLResponse(Path("frontend/login.html").read_text(encoding="utf-8"))
    is_admin = bool(request.session.get("is_admin"))
    html = Path("frontend/fare-discount.html").read_text(encoding="utf-8")
    html = html.replace(
        "</head>",
        f"<script>window.IS_ADMIN = {str(is_admin).lower()};</script></head>"
    )
    return HTMLResponse(html)

@app.post("/fare-discount/parse")
async def fare_discount_parse(request: Request, osdmFile: UploadFile = File(...)):
    require_login(request)
    try:
        data = json.loads(await osdmFile.read())
    except Exception:
        raise HTTPException(status_code=400, detail="Filen er ikke gyldig JSON")

    fs = data.get("fareDelivery", {}).get("fareStructure", {})

    # UIC → navn fra stationNames (bruker nameUtf8 for norske tegn)
    uic_to_name: dict[str, str] = {}
    for sn in fs.get("stationNames", []):
        code = sn.get("code") or sn.get("uicCode")
        name = sn.get("nameUtf8") or sn.get("name") or code
        if code:
            uic_to_name[str(code)] = name

    # Stasjonsliste fra connectionPoints
    stations: list[dict] = []
    seen: set[str] = set()
    for cp in fs.get("connectionPoints", []):
        for station_set in cp.get("stationSets", []):
            for s in station_set:
                if s.get("codeList") == "UIC":
                    uic = str(s["code"])
                    if uic not in seen:
                        seen.add(uic)
                        stations.append({
                            "cp_id": cp["id"],
                            "uic": uic,
                            "name": uic_to_name.get(uic, uic),
                            "country": s.get("country", ""),
                        })
    stations.sort(key=lambda x: x["name"].lower())

    # Carriers fra carrierConstraints
    carriers: list[dict] = []
    seen_codes: set[str] = set()
    for cc in fs.get("carrierConstraints", []):
        for code in cc.get("includedCarrier", []):
            if code not in seen_codes:
                seen_codes.add(code)
                carriers.append({
                    "code": code,
                    "name": RICS_CARRIER_NAMES.get(code, code),
                    "constraint_id": cc["id"],
                })

    # Passasjerkategorier (deduplisert per nameRef)
    texts_map = {t["id"]: t for t in fs.get("texts", [])}
    seen_refs: dict[str, dict] = {}
    for pc in fs.get("passengerConstraints", []):
        ref = pc.get("nameRef", "")
        text_obj = texts_map.get(ref, {})
        name = text_obj.get("textUtf8") or text_obj.get("text") or ref
        if ref not in seen_refs:
            seen_refs[ref] = {"nameRef": ref, "name": name, "ids": []}
        seen_refs[ref]["ids"].append(pc["id"])
    passenger_constraints = list(seen_refs.values())

    # Serviceklasser
    service_classes = []
    for scd in fs.get("serviceClassDefinitions", []):
        text_obj = texts_map.get(scd.get("textRef", ""), {})
        name = text_obj.get("textUtf8") or text_obj.get("text") or scd["id"]
        service_classes.append({"id": scd["id"], "name": name})

    delivery = data.get("fareDelivery", {}).get("delivery", {})

    return {
        "deliveryId": delivery.get("deliveryId", ""),
        "stations": stations,
        "carriers": carriers,
        "passengerConstraints": passenger_constraints,
        "serviceClasses": service_classes,
    }


# ---------------------------------------------------------------------------
# Hjelpefunksjoner for fare-discount/apply
# ---------------------------------------------------------------------------

def _round_up_020(eur: float) -> float:
    """Rund opp til nærmeste 0.20 EUR."""
    return math.ceil(eur / 0.20) * 0.20


def _id_base(data: dict) -> str:
    """Utled ID-base (f.eks. '1076_7.0_') fra fareProvider og deliveryId i filen."""
    delivery = data.get("fareDelivery", {}).get("delivery", {})
    provider = delivery.get("fareProvider", "")
    did = delivery.get("deliveryId", "")
    if provider and did:
        return f"{provider}_{did}_"
    # Fallback: trekk ut fra eksisterende IDer i filen
    fs = data.get("fareDelivery", {}).get("fareStructure", {})
    for sample in [
        next((c["id"] for c in fs.get("carrierConstraints", [])), None),
        next((t["id"] for t in fs.get("texts", [])), None),
        next((p["id"] for p in fs.get("prices", [])), None),
    ]:
        if sample and "_" in sample:
            parts = sample.split("_")
            if len(parts) >= 2:
                return "_".join(parts[:2]) + "_"
    return f"disc_{did}_" if did else "disc_"


def _next_id_num(existing_ids: list[str], prefix: str) -> int:
    """Finn neste ledige nummer for IDer med gitt prefix."""
    import re
    pattern = re.compile(re.escape(prefix) + r"(\d+)$")
    nums = [int(m.group(1)) for id_ in existing_ids if (m := pattern.search(id_))]
    return max(nums) + 1 if nums else 1


def _new_fare_id() -> str:
    """Generer en unik fare-ID i samme format som eksisterende IDer."""
    return "_" + base64.urlsafe_b64encode(uuid.uuid4().bytes).rstrip(b"=").decode()


@app.post("/fare-discount/apply")
async def fare_discount_apply(
    request: Request,
    osdmFile: UploadFile = File(...),
    fromCpId: str = Form(...),
    toCpId: str = Form(...),
    fromUic: str = Form(...),
    toUic: str = Form(...),
    discountName: str = Form(...),
    carrierCodes: list[str] = Form(default=[]),
    discountPct: float = Form(...),
    passengerRefs: list[str] = Form(...),
    serviceClassIds: list[str] = Form(...),
):
    require_login(request)

    try:
        data = json.loads(await osdmFile.read())
    except Exception:
        raise HTTPException(status_code=400, detail="Filen er ikke gyldig JSON")

    fs = data.get("fareDelivery", {}).get("fareStructure", {})
    delivery_id = data.get("fareDelivery", {}).get("delivery", {}).get("deliveryId", "")
    id_base = _id_base(data)

    # Finn RCs som kobler begge CP-ene (begge retninger)
    target_cps = {fromCpId, toCpId}
    matching_rc_ids = {
        rc["id"] for rc in fs.get("regionalConstraints", [])
        if {rc.get("entryConnectionPointId"), rc.get("exitConnectionPointId")} == target_cps
    }
    if not matching_rc_ids:
        raise HTTPException(status_code=400, detail="Ingen regionalConstraints funnet for valgt stasjonspar")

    # nameRef → liste av passengerConstraint-IDer
    nameref_to_pc_ids: dict[str, list[str]] = {}
    for pc in fs.get("passengerConstraints", []):
        ref = pc.get("nameRef", "")
        if ref in passengerRefs:
            nameref_to_pc_ids.setdefault(ref, []).append(pc["id"])
    selected_pc_ids = {pid for ids in nameref_to_pc_ids.values() for pid in ids}

    # Prisoppslag: priceId → første price-element
    price_lookup: dict[str, dict] = {
        p["id"]: p["price"][0] for p in fs.get("prices", []) if p.get("price")
    }

    multiplier = 1 - discountPct / 100

    # --- Ny carrierConstraint (kun hvis transportører er valgt) ---
    new_cc_id: str | None = None
    new_carrier_constraint: dict | None = None
    if carrierCodes:
        cc_prefix = f"{id_base}C__"
        existing_cc_ids = [c["id"] for c in fs.get("carrierConstraints", [])]
        new_cc_id = f"{cc_prefix}{_next_id_num(existing_cc_ids, cc_prefix)}"
        new_carrier_constraint = {"id": new_cc_id, "includedCarrier": list(carrierCodes)}

    # --- Ny tekst ---
    text_prefix = f"{id_base}P__"
    existing_text_ids = [t["id"] for t in fs.get("texts", [])]
    new_text_id = f"{text_prefix}{_next_id_num(existing_text_ids, text_prefix)}"
    new_text = {
        "id": new_text_id,
        "textUtf8": discountName,
        "text": discountName,
        "shortTextUtf8": discountName,
        "shortText": discountName,
        "translations": [],
    }

    # --- Nye priser (dedupliser på beløp) ---
    price_prefix = f"{id_base}I__"
    existing_price_ids = [p["id"] for p in fs.get("prices", [])]
    next_price_num = _next_id_num(existing_price_ids, price_prefix)
    new_amount_to_price_id: dict[int, str] = {}
    new_prices: list[dict] = []

    def get_or_create_price_id(orig: dict) -> str:
        nonlocal next_price_num
        scale = orig.get("scale", 2)
        eur = orig["amount"] / (10 ** scale)
        discounted_int = int(round(_round_up_020(eur * multiplier) * (10 ** scale)))
        if discounted_int in new_amount_to_price_id:
            return new_amount_to_price_id[discounted_int]
        new_id = f"{price_prefix}{next_price_num}"
        next_price_num += 1
        new_prices.append({
            "id": new_id,
            "price": [{"currency": orig.get("currency", "EUR"), "amount": discounted_int,
                        "scale": scale, "vatDetails": []}],
        })
        new_amount_to_price_id[discounted_int] = new_id
        return new_id

    # --- Nye farer ---
    new_fares: list[dict] = []
    seen_combos: set[tuple] = set()

    for fare in fs.get("fares", []):
        rc_ref = fare.get("regionalConstraintRef")
        pc_ref = fare.get("passengerConstraintRef")
        sc_ref = fare.get("serviceClassRef")

        if rc_ref not in matching_rc_ids:
            continue
        if pc_ref not in selected_pc_ids:
            continue
        if sc_ref not in serviceClassIds:
            continue

        key = (rc_ref, pc_ref, sc_ref)
        if key in seen_combos:
            continue
        seen_combos.add(key)

        orig_price = price_lookup.get(fare.get("priceRef", ""))
        if not orig_price:
            continue

        new_fare: dict = {
            "id": _new_fare_id(),
            "bundleRef": fare.get("bundleRef", ""),
            "fareType": fare.get("fareType", "ADMISSION"),
            "nameRef": new_text_id,
            "priceRef": get_or_create_price_id(orig_price),
            "regionalConstraintRef": rc_ref,
            "regulatoryConditions": fare.get("regulatoryConditions", ["CIV"]),
            "serviceClassRef": sc_ref,
            "passengerConstraintRef": pc_ref,
            "involvedTCOs": list(carrierCodes),
        }
        if new_cc_id:
            new_fare["carrierConstraintRef"] = new_cc_id
        new_fares.append(new_fare)

    if not new_fares:
        raise HTTPException(
            status_code=400,
            detail="Ingen eksisterende farer funnet for valgt kombinasjon av stasjoner, passasjerer og serviceklasse",
        )

    # Injer nye elementer i fareStructure
    if new_carrier_constraint:
        fs["carrierConstraints"].append(new_carrier_constraint)
    fs["texts"].append(new_text)
    fs["prices"].extend(new_prices)
    fs["fares"].extend(new_fares)

    log_event(request.session.get("user_email"), "discount_applied", detail={
        "deliveryId": delivery_id,
        "fromUic": fromUic,
        "toUic": toUic,
        "carrierCodes": list(carrierCodes),
        "discountPct": discountPct,
        "fareName": discountName,
        "fareCount": len(new_fares),
        "priceCount": len(new_prices),
    })

    filename = f"fareDelivery_{id_base.rstrip('_')}_discount.json"
    return Response(
        content=json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Fare-Count": str(len(new_fares)),
            "X-Price-Count": str(len(new_prices)),
        },
    )


@app.post("/ui/fix-osdm")
async def fix_osdm(request: Request, osdmFile: UploadFile = File(...)):
    require_login(request)

    try:
        data = json.loads(await osdmFile.read())
    except Exception:
        raise HTTPException(status_code=400, detail="Filen er ikke gyldig JSON")

    fd = data.get("fareDelivery", {})
    if not fd or "fareStructure" not in fd:
        raise HTTPException(status_code=400, detail="Filen mangler fareDelivery.fareStructure")

    fs = fd["fareStructure"]
    stats: dict[str, int] = {}

    # Bygg sett med definerte IDer
    price_ids  = {p["id"] for p in fs.get("prices", [])}
    pc_ids     = {p["id"] for p in fs.get("passengerConstraints", [])}
    rc_ids     = {r["id"] for r in fs.get("regionalConstraints", [])}
    cc_ids     = {c["id"] for c in fs.get("carrierConstraints", [])}
    bundle_ids = {b["id"] for b in fs.get("fareConstraintBundles", [])}
    text_ids   = {t["id"] for t in fs.get("texts", [])}
    cp_ids     = {cp["id"] for cp in fs.get("connectionPoints", [])}

    # 1. Fjern RC-er med ugyldig CP-referanse
    orig = len(fs.get("regionalConstraints", []))
    fs["regionalConstraints"] = [
        rc for rc in fs.get("regionalConstraints", [])
        if rc.get("entryConnectionPointId") in cp_ids
        and rc.get("exitConnectionPointId") in cp_ids
    ]
    rc_ids = {r["id"] for r in fs["regionalConstraints"]}
    stats["removed_bad_rcs"] = orig - len(fs["regionalConstraints"])

    # 2. Fjern farer med manglende referanser
    orig = len(fs.get("fares", []))
    fs["fares"] = [
        f for f in fs.get("fares", [])
        if (not f.get("priceRef")  or f["priceRef"]  in price_ids)
        and (not f.get("passengerConstraintRef") or f["passengerConstraintRef"] in pc_ids)
        and (not f.get("regionalConstraintRef") or f["regionalConstraintRef"] in rc_ids)
        and (not f.get("carrierConstraintRef")  or f["carrierConstraintRef"]  in cc_ids)
        and (not f.get("bundleRef")             or f["bundleRef"]             in bundle_ids)
        and (not f.get("nameRef")               or f["nameRef"]               in text_ids)
    ]
    stats["removed_bad_fares"] = orig - len(fs["fares"])

    # 3. Fjern ubrukte priser
    used_price_ids = {f.get("priceRef") for f in fs.get("fares", []) if f.get("priceRef")}
    orig = len(fs.get("prices", []))
    fs["prices"] = [p for p in fs.get("prices", []) if p["id"] in used_price_ids]
    stats["removed_unused_prices"] = orig - len(fs["prices"])

    # 4. Fjern ubrukte passengerConstraints
    used_pc_ids = {f.get("passengerConstraintRef") for f in fs.get("fares", []) if f.get("passengerConstraintRef")}
    orig = len(fs.get("passengerConstraints", []))
    fs["passengerConstraints"] = [p for p in fs.get("passengerConstraints", []) if p["id"] in used_pc_ids]
    stats["removed_unused_pcs"] = orig - len(fs["passengerConstraints"])

    # 5. Fjern ubrukte regionalConstraints
    used_rc_ids = {f.get("regionalConstraintRef") for f in fs.get("fares", []) if f.get("regionalConstraintRef")}
    orig = len(fs.get("regionalConstraints", []))
    fs["regionalConstraints"] = [r for r in fs.get("regionalConstraints", []) if r["id"] in used_rc_ids]
    stats["removed_unused_rcs"] = orig - len(fs["regionalConstraints"])

    orig_name = osdmFile.filename or "osdm.json"
    base = orig_name.rsplit(".", 1)[0] if "." in orig_name else orig_name
    out_name = f"{base}_fixed.json"

    log_event(request.session.get("user_email"), "osdm_fixed", detail=stats)

    return Response(
        content=json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{out_name}"',
            "X-Fix-Stats": json.dumps(stats),
        },
    )


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
