# PopToOSDM

PopToOSDM er et internt verktøy for å generere OSDM `fareDelivery`‑filer basert på:

- TEN‑avstander
- TEN‑pristabell (CSV)
- Brukerinput via web‑GUI

Løsningen er validert mot **UIC DRTF** og følger **OSDM‑spesifikasjonen**.

---

## Funksjonalitet

- Validering av TEN‑CSV
- Generering av OSDM JSON
- Støtte for:
  - DeliveryId
  - Miljø (test / prod)
  - Optional delivery
  - Valutakurs NOK → EUR
  - Gyldighetsperiode
- Visning av eksempelpriser
- Nedlasting av ferdig OSDM‑fil
- Enkel admin‑GUI for brukerhåndtering

---

## Arkitektur

- **Backend:** FastAPI
- **Frontend:** Statisk HTML/JS (servert via FastAPI)
- **Autentisering:** Session‑basert
- **Drift:** Render
- **DNS:** Cloudflare

```
Browser
  ↓
FastAPI (backend/main.py)
  ├─ /            → GUI (index.html)
  ├─ /ui/*        → API (TEN / OSDM)
  └─ /static/*    → CSS, JS, favicon
```

---

## Oppsett (lokalt – macOS / Linux)

### Forutsetninger

- Python 3.10 eller nyere
- Git

Sjekk Python‑versjon:

```bash
python3 --version
```

---

### Oppsett av virtual environment

Fra prosjektroten:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Når venv er aktiv vil terminalen vise:

```text
(.venv)
```

---

### Installer avhengigheter

```bash
pip install fastapi uvicorn python-multipart jsonschema
```

---

### Start applikasjonen lokalt

Fra prosjektroten:

```bash
python -m uvicorn backend.main:app --reload
```

Applikasjonen er tilgjengelig på:

```text
http://127.0.0.1:8000
```

GUI og backend serveres fra samme FastAPI‑instans.

---

## Bruk av GUI

### 1. TEN‑validering

- Last opp TEN‑pristabell (CSV)
- Valider filen før videre bruk

### 2. Generer OSDM

Fyll inn:

- DeliveryId  
  _(må økes ved hver innsending til DRTF)_
- Miljø: `test` / `prod`
- Optional delivery
- Valutakurs NOK → EUR
- Gyldig fra / til

Klikk **Generer OSDM JSON**.

### 3. Resultat

- Status vises i GUI
- Eksempelpriser listes
- Ferdig OSDM‑fil kan lastes ned

---

## DRTF‑hensyn

Genererte filer følger kravene fra **UIC DRTF**:

- `delivery.usage`
  - `TEST` → `TEST_ONLY`
  - `PROD` → `PRODUCTION`
- `deliveryId` styres fra GUI
- `optionalDelivery` settes eksplisitt
- Gyldighet leses kun fra `fareStructure.calendars`
- Ingen ulovlige felt:
  - `priceRef`
  - `validFrom` / `validTo` på prisnivå

OSDM‑filer generert med dette verktøyet validerer grønt i **UIC DRTF**.

---

## Domenenavn og drift

- Produksjonsdomene:
  ```text
  https://www.livetsmiler.no
  ```
- Root‑domene (`livetsmiler.no`) 301‑videresendes til `www`
- HTTPS og redirect håndteres av Cloudflare

---

## Status

✅ Produksjonsklar  
✅ Validert mot UIC DRTF  
✅ Klar for videre vedlikehold
