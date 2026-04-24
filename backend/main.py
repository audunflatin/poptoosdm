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
from fastapi import Request
from fastapi.responses import HTMLResponse

@app.get("/", response_class=HTMLResponse)
def root(request: Request):
    is_admin = bool(request.session.get("is_admin"))

    # Ikke innlogget -> login-side
    if "user_email" not in request.session:
        with open("frontend/login.html", encoding="utf-8") as f:
            return HTMLResponse(f.read())

    # Innlogget -> hoved-GUI
    with open("frontend/index.html", encoding="utf-8") as f:
        html = f.read()

    # Injiser admin-flag til GUI
    html = html.replace(
        "</head>",
        f"<script>window.IS_ADMIN = {str(is_admin).lower()};</script></head>"
    )

    return HTMLResponse(html)

from fastapi import Request
@app.post("/ui/validate-ten")
def validate_ten(
    request: Request,
    tenFile: UploadFile = File(...)
):
    require_login(request)
    global TEN_TABLE, TEN_INFO

    content = tenFile.file.read().decode("utf-8-sig")
    result = validate_ten_csv(content)

    if not result["ok"]:
        TEN_TABLE = None
        TEN_INFO = None
        return {"step": "TEN validation", "ok": False, "error": result["error"]}

    TEN_TABLE = result["table"]
    TEN_INFO = result
    TEN_SAVE_PATH = Path("data/input/ten_uploaded.csv")
    TEN_SAVE_PATH.parent.mkdir(parents=True, exist_ok=True)
    TEN_SAVE_PATH.write_text(content, encoding="utf-8")

    return {
        "step": "TEN validation",
        "ok": True,
        "summary": {
            "rows": result["rows"],
            "interval": f'{result["from_km"]}–{result["to_km"]} km'
        }
    }

def nok_price_from_distance(km: int):
    for frm, to, price in TEN_TABLE:
        if frm <= km <= to:
            return price
    raise ValueError(f"Ingen TEN‑pris for {km} km")

def eur_amount(nok: int, rate: float):
    eur = nok * rate
    eur_rounded = math.ceil(eur / 0.20) * 0.20
    return int(eur_rounded * 100)

from fastapi import Request

@app.post("/ui/generate-osdm")
def generate_osdm(
    request: Request,
    exchangeRate: float = Form(...),
    validFrom: str = Form(...),
    validTo: str = Form(...),
    datasetId: str = Form(...),
    environment: str = Form(...),
):
    require_login(request)


    GENERATION_PROGRESS["status"] = "running"
    GENERATION_PROGRESS["percent"] = 0

    if TEN_TABLE is None:
        raise HTTPException(status_code=400, detail="TEN‑CSV er ikke validert")

    data = json.loads(OSDM_IN.read_text(encoding="utf-8"))
    fs = data["fareDelivery"]["fareStructure"]
    
    # ✅ Sett usage basert på miljø (DRTF-krav)
    if environment == "test":
        data["fareDelivery"]["delivery"]["usage"] = "TEST_ONLY"
    else:
        data["fareDelivery"]["delivery"]["usage"] = "PRODUCTION"

    # ✅ Sett gyldighet fra GUI på calendars (DRTF-leser disse)
    from_date = f"{validFrom}T00:00:00+0000"
    until_date = f"{validTo}T23:59:59+0000"

    for cal in fs.get("calendars", []):
        cal["fromDate"] = from_date
        cal["untilDate"] = until_date

    # ✅ Sett deliveryId basert på GUI-input
    data["fareDelivery"]["delivery"]["deliveryId"] = datasetId
    data["fareDelivery"]["delivery"]["optionalDelivery"] = (optionalDelivery.lower() == "true")

    # ✅ Bygg price per regionalConstraint basert på distance
    new_prices = []
    price_index = 1
    total = len(fs["regionalConstraints"])

    for idx, rc in enumerate(fs["regionalConstraints"], start=1):
        km = rc.get("distance")
        if km is None:
            continue

        nok = nok_price_from_distance(km)
        amount = eur_amount(nok, exchangeRate)

        price_id = f"1076_{datasetId}_I__{price_index}"

        new_prices.append({
            "id": price_id,
            "price": [{
                "amount": amount,
                "currency": "EUR",
                "scale": 2,
                "vatDetails": []
            }]
        })

                
        GENERATION_PROGRESS["percent"] = int(idx / total * 100)

        price_index += 1

    # ✅ Erstatt hele prices-lista
    fs["prices"] = new_prices


    GENERATION_PROGRESS["status"] = "done"
    GENERATION_PROGRESS["percent"] = 100


    output_name = f"1076_{datasetId}_{environment}.final.json"
    output_path = Path(f"data/output/{output_name}")

    global OSDM_OUT
    OSDM_OUT = output_path

    output_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))


    # ✅ Eksempelstrekninger (basert på faktiske regionalConstraints)
    example_routes = [
        ("Oslo S", "Bergen stasjon", "7600100", "7602351"),
        ("Oslo S", "Trondheim S", "7600100", "7601126"),
        ("Oslo S", "Stavanger stasjon", "7600100", "7602234"),
        ("Oslo S", "Halden stasjon", "7600100", "7600546"),
    ]

    # bygg UIC -> connectionPointId
    cp_for_uic = {}
    for cp in fs["connectionPoints"]:
        for ss in cp.get("stationSets", []):
            for s in ss:
                if s.get("codeList") == "UIC":
                    cp_for_uic[s["code"]] = cp["id"]

    examples = {}
    example_idx = 1

    for from_name, to_name, from_uic, to_uic in example_routes:
        from_cp = cp_for_uic.get(from_uic)
        to_cp = cp_for_uic.get(to_uic)

        if not from_cp or not to_cp:
            continue

        for rc in fs["regionalConstraints"]:
            if (
                rc["entryConnectionPointId"] == from_cp and
                rc["exitConnectionPointId"] == to_cp
            ):
                km = rc["distance"]
                nok = nok_price_from_distance(km)
                eur = eur_amount(nok, exchangeRate) / 100
                examples[f"example_{example_idx}"] = (
                    f"{from_name} → {to_name}: {eur:.2f} EUR ({km} km)"
                )
                example_idx += 1

                break


    return {
        "step": "OSDM generation",
        "status": "OK",
        "outputFile": output_name,
        "summary": {
        "pricesUpdated": len(fs["prices"]),
        "exchangeRate": exchangeRate,
        "rounding": "Opp til nærmeste 0.20 EUR",
        "validity": f"{validFrom} → {validTo}",
        "deliveryId": datasetId,
        "environment": environment,
        "usage": data["fareDelivery"]["delivery"]["usage"],
        "optionalDelivery": data["fareDelivery"]["delivery"]["optionalDelivery"],
        "exampleFares": examples
    }


    }
from fastapi.responses import FileResponse


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

SCHEMA_PATH = Path("schemas/osdm-7.0.schema.json")

@app.post("/ui/validate-osdm")
def validate_osdm():
    if not OSDM_OUT.exists():
        raise HTTPException(
            status_code=404,
            detail="OSDM-fil er ikke generert ennå"
        )

    if not SCHEMA_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="OSDM schema mangler"
        )

    data = json.loads(OSDM_OUT.read_text(encoding="utf-8"))
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

    validator = Draft7Validator(schema)
    errors = sorted(validator.iter_errors(data), key=lambda e: e.path)

    if errors:
        return {
            "step": "OSDM schema validation",
            "ok": False,
            "errorCount": len(errors),
            "errors": [
                {
                    "path": ".".join([str(p) for p in err.path]),
                    "message": err.message
                }
                for err in errors[:10]  # begrens til 10
            ]
        }

    return {
        "step": "OSDM schema validation",
        "ok": True,
        "message": "OSDM er gyldig mot schema"
    }
from difflib import unified_diff

@app.get("/ui/diff-osdm")
def diff_osdm():
    if not OSDM_IN.exists() or not OSDM_OUT.exists():
        raise HTTPException(status_code=404, detail="OSDM-filer mangler")

    original = OSDM_IN.read_text(encoding="utf-8").splitlines()
    final = OSDM_OUT.read_text(encoding="utf-8").splitlines()

    diff = list(unified_diff(
        original,
        final,
        fromfile="original.json",
        tofile="final.json",
        lineterm=""
    ))

    return {
        "step": "OSDM diff",
        "changedLines": len(diff),
        "preview": diff[:200]  # begrens visning
    }
@app.get("/ui/summary")
def summary():
    summary = {
        "tenCsv": "OK" if TEN_TABLE is not None else "IKKE VALIDERT",
        "tenCsvSaved": Path("data/input/ten_uploaded.csv").exists(),
        "osdmGenerated": OSDM_OUT.exists(),
        "schemaValidated": None,
        "notes": []
    }

    # schema-status (best effort)
    try:
        if OSDM_OUT.exists() and SCHEMA_PATH.exists():
            data = json.loads(OSDM_OUT.read_text(encoding="utf-8"))
            schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
            validator = Draft7Validator(schema)
            errors = list(validator.iter_errors(data))
            summary["schemaValidated"] = len(errors) == 0
            if errors:
                summary["notes"].append(f"{len(errors)} schema-feil funnet")
        else:
            summary["schemaValidated"] = False
    except Exception as e:
        summary["schemaValidated"] = False
        summary["notes"].append(str(e))

    if summary["tenCsv"] != "OK":
        summary["notes"].append("TEN-CSV må valideres før generering")
    if not summary["osdmGenerated"]:
        summary["notes"].append("OSDM er ikke generert ennå")

    return summary
@app.get("/ui/progress")
def get_progress():
    return GENERATION_PROGRESS
    from fastapi import Request, Form, HTTPException
from fastapi.responses import RedirectResponse

from backend.auth_db import SessionLocal, User
from backend.auth_utils import verify_password


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

    # ✅ Lag session
    request.session["user_email"] = user.email
    request.session["is_admin"] = user.is_admin

    return RedirectResponse("/", status_code=302)
def require_login(request: Request):
    if "user_email" not in request.session:
        raise HTTPException(status_code=401, detail="Ikke innlogget")
from fastapi.responses import HTMLResponse
from fastapi import Request

@app.get("/", response_class=HTMLResponse)
def root(request: Request):
    is_admin = bool(request.session.get("is_admin"))

    if "user_email" not in request.session:
        with open("frontend/login.html") as f:
            return HTMLResponse(f.read())

    with open("frontend/index.html") as f:
        html = f.read()

    # ✅ Injiser admin-flag i HTML
    html = html.replace(
        "</head>",
        f"<script>window.IS_ADMIN = {str(is_admin).lower()};</script></head>"
    )

    return HTMLResponse(html)

@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/", status_code=302)


@app.post("/admin/add-user")
def admin_add_user(
    request: Request,
    email: str = Form(...)
):
    require_login(request)

    if not request.session.get("is_admin"):
        raise HTTPException(status_code=403, detail="Ikke administrator")

    from backend.auth_utils import generate_password, hash_password
    from backend.auth_db import SessionLocal, User

    db = SessionLocal()

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bruker finnes allerede")

    password = generate_password()

    user = User(
        email=email,
        password_hash=hash_password(password),
        is_admin=False,
        is_active=True
    )

    db.add(user)
    db.commit()

    return {
        "email": email,
        "password": password
    }
@app.post("/admin/reset-password")

def admin_reset_password(
    request: Request,
    email: str = Form(...)
):
    require_login(request)

    if not request.session.get("is_admin"):
        raise HTTPException(status_code=403, detail="Ikke administrator")

    from backend.auth_utils import generate_password, hash_password
    from backend.auth_db import SessionLocal, User

    db = SessionLocal()

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="Bruker ikke funnet")

    new_password = generate_password()
    user.password_hash = hash_password(new_password)

    db.commit()

    return {
        "email": email,
        "new_password": new_password
    }
    from fastapi import Request
    from fastapi.responses import HTMLResponse
    from backend.core.security import require_login

    @app.get("/", response_class=HTMLResponse)
    def root(request: Request):
        is_admin = bool(request.session.get("is_admin"))

        # Ikke innlogget → login-side
        if "user_email" not in request.session:
            with open("frontend/login.html", encoding="utf-8") as f:
                return HTMLResponse(f.read())

        # Innlogget → hoved-GUI
        with open("frontend/index.html", encoding="utf-8") as f:
            html = f.read()

        # Injiser admin-flag for GUI
        html = html.replace(
            "</head>",
            f"<script>window.IS_ADMIN = {str(is_admin).lower()};</script></head>"
        )

        return HTMLResponse(html)
