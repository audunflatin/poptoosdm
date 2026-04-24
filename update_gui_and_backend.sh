#!/bin/bash
set -e

echo "🔧 Oppdaterer frontend/index.html …"

cat > frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8" />
  <title>PopToOSDM</title>
  <style>
    body { font-family: system-ui; margin: 2rem; }
    label { display:block; margin-top:1rem; font-weight:600; }
    input, button { margin-top:0.25rem; }
    pre { background:#f4f4f4; padding:1rem; margin-top:1rem; }
    hr { margin:2rem 0; }
  </style>
</head>
<body>

<h1>PopToOSDM</h1>

<h2>1. TEN‑tabell</h2>
<label>TEN‑CSV</label>
<input id="tenFile" type="file" accept=".csv" />
<button onclick="validateTen()">Valider TEN‑tabell</button>
<pre id="tenStatus"></pre>

<hr/>

<h2>2. Generer OSDM</h2>
<label>Valutakurs NOK → EUR</label>
<input id="exchangeRate" type="number" step="0.0001" value="0.085" />

<label>Gyldig fra</label>
<input id="validFrom" type="date" />

<label>Gyldig til</label>
<input id="validTo" type="date" />

<button onclick="generateOsdm()">Generer OSDM JSON</button>
<pre id="finalStatus"></pre>

<script>
async function validateTen() {
  const f = document.getElementById("tenFile").files[0];
  if (!f) return alert("Velg TEN‑CSV først");

  const fd = new FormData();
  fd.append("tenFile", f);

  const r = await fetch("http://127.0.0.1:8000/ui/validate-ten", {
    method: "POST",
    body: fd
  });

  document.getElementById("tenStatus").innerText =
    JSON.stringify(await r.json(), null, 2);
}

async function generateOsdm() {
  const fd = new FormData();
  fd.append("exchangeRate", document.getElementById("exchangeRate").value);
  fd.append("validFrom", document.getElementById("validFrom").value);
  fd.append("validTo", document.getElementById("validTo").value);

  const r = await fetch("http://127.0.0.1:8000/ui/generate-osdm", {
    method: "POST",
    body: fd
  });

  document.getElementById("finalStatus").innerText =
    JSON.stringify(await r.json(), null, 2);
}
</script>

</body>
</html>
EOF

echo "✅ Frontend oppdatert"

echo "🔧 Oppdaterer backend/app.py …"

cat > backend/app.py << 'EOF'
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
import csv, io, json, math
from pathlib import Path

app = FastAPI(title="PopToOSDM")

TEN_TABLE = None
TEN_INFO = None

OSDM_IN  = Path("data/output/1076_7.0PROD.updated.json")
OSDM_OUT = Path("data/output/1076_7.0PROD.final.json")

@app.get("/health")
def health():
    return {"status": "ok"}

def validate_ten_csv(text: str):
    reader = csv.reader(io.StringIO(text), delimiter=";")
    rows = []

    try:
        for i, row in enumerate(reader, start=1):
            if len(row) != 3:
                return {"ok": False, "error": f"Linje {i}: forventet 3 kolonner"}

            frm, to, price = row
            rows.append((int(frm), int(to), int(price.replace(" ", ""))))
    except Exception as e:
        return {"ok": False, "error": str(e)}

    if not rows or rows[0][0] != 1:
        return {"ok": False, "error": "TEN‑intervall må starte på 1 km"}

    return {
        "ok": True,
        "rows": len(rows),
        "from_km": rows[0][0],
        "to_km": rows[-1][1],
        "table": rows
    }

@app.post("/ui/validate-ten")
def validate_ten(tenFile: UploadFile = File(...)):
    global TEN_TABLE, TEN_INFO

    content = tenFile.file.read().decode("utf-8-sig")
    result = validate_ten_csv(content)

    if not result["ok"]:
        TEN_TABLE = None
        TEN_INFO = None
        return {"step": "TEN validation", "ok": False, "error": result["error"]}

    TEN_TABLE = result["table"]
    TEN_INFO = result

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

@app.post("/ui/generate-osdm")
def generate_osdm(
    exchangeRate: float = Form(...),
    validFrom: str = Form(...),
    validTo: str = Form(...)
):
    if TEN_TABLE is None:
        raise HTTPException(status_code=400, detail="TEN‑CSV er ikke validert")

    data = json.loads(OSDM_IN.read_text(encoding="utf-8"))
    fs = data["fareDelivery"]["fareStructure"]

    distances = [
        rc["distance"]
        for rc in fs["regionalConstraints"]
        if "distance" in rc
    ]

    max_km = max(distances)
    nok = nok_price_from_distance(max_km)
    amount = eur_amount(nok, exchangeRate)

    for price in fs["prices"]:
        price["price"] = [{
            "amount": amount,
            "currency": "EUR",
            "scale": 2,
            "vatDetails": [],
            "validFrom": validFrom,
            "validTo": validTo
        }]

    OSDM_OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False))

    return {
        "step": "OSDM generation",
        "status": "OK",
        "outputFile": str(OSDM_OUT),
        "summary": {
            "pricesUpdated": len(fs["prices"]),
            "usedMaxDistanceKm": max_km,
            "exchangeRate": exchangeRate,
            "rounding": "Opp til nærmeste 0.20 EUR",
            "validity": f"{validFrom} → {validTo}"
        }
    }
EOF

echo "✅ Backend oppdatert"
echo "🎉 Ferdig. Restart backend og frontend."
