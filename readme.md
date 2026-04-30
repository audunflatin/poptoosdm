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
- Admin‑GUI for brukerhåndtering

---

## Arkitektur

- **Backend:** FastAPI (Python)
- **Frontend:** Statisk HTML/JS (servert via FastAPI)
- **Database:** PostgreSQL (produksjon via Render) / SQLite (lokalt)
- **Autentisering:** Session‑basert
- **Drift:** Render
- **DNS:** Cloudflare

```
Browser
  ↓
FastAPI (backend/main.py)
  ├─ /            → GUI (index.html)
  ├─ /ui/*        → API (TEN / OSDM)
  ├─ /admin/*     → Brukeradministrasjon
  └─ /static/*    → CSS, JS, favicon

Database: PostgreSQL (Render) / SQLite (lokalt)
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
pip install -r requirements.txt
```

---

### Miljøvariabler

| Variabel         | Beskrivelse                      | Standard                |
|------------------|----------------------------------|-------------------------|
| `SESSION_SECRET` | Hemmelig nøkkel for sessions     | `CHANGE_ME_BEFORE_PROD` |
| `DATABASE_URL`   | PostgreSQL‑tilkobling (valgfri)  | SQLite lokalt           |

Lokalt trenger du ikke sette disse — applikasjonen bruker fornuftige standardverdier.
I produksjon (Render) settes de som miljøvariabler i dashboardet.

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

- Last opp TEN‑pristabell (CSV, semikolonseparert)
- Filen valideres automatisk ved opplasting
- Feilmeldinger vises med linjenummer og årsak

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
- Eksempelpriser listes (Oslo S til Bergen, Trondheim, Stavanger, Halden)
- Ferdig OSDM‑fil kan lastes ned

### 4. Admin

Kun tilgjengelig for admin‑brukere:

- Liste over alle brukere med status
- Legg til ny bruker (passord genereres automatisk)
- Generer nytt passord for eksisterende bruker
- Slett bruker

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
- Automatisk deploy ved push til `main`

---

## Status

✅ Produksjonsklar
✅ Validert mot UIC DRTF
✅ PostgreSQL i produksjon
✅ Admin‑GUI for brukerhåndtering
✅ Deployet på Render (livetsmiler.no)
