# PopToOSDM

PopToOSDM er et internt verktøy for å generere OSDM `fareDelivery`‑filer basert på:

- TEN‑avstander
- TEN‑pristabell (CSV)
- Brukerinput via web‑GUI

Løsningen er validert mot **UIC DRTF** og følger **OSDM‑spesifikasjonen**.

---

## Funksjonalitet

- Validering av TEN‑CSV
- Generering av OSDM JSON (lagres i minnet, ikke på disk)
- Støtte for:
  - DeliveryId
  - Miljø (test / prod)
  - Optional delivery
  - Valutakurs NOK → EUR
  - Gyldighetsperiode
- Visning av eksempelpriser
- Nedlasting av ferdig OSDM‑fil
- Konvertering av OSDM JSON → Excel (`/osdmtoexcel`)
  - Stilisert metadata-boks øverst i Excel med leveranseinformasjon
  - ERA RICS-navn på transportørkoder (f.eks. `1076` → `Vygruppen AS (1076)`)
  - Støtter stasjonspar med flere operatører
- Admin‑panel for brukerhåndtering (`/admin`)
  - Invitasjon av nye brukere via e-post (Resend)
  - Tvungen passordbytte ved første innlogging
  - Logging av innlogginger
  - Paginering (15 per side) og søk i brukerlisten
  - Admin-tilgang kan tildeles/fjernes per bruker

---

## Arkitektur

- **Backend:** FastAPI (Python)
- **Frontend:** Statisk HTML/JS (servert via FastAPI)
- **Database:** SQLite (lokalt og i produksjon på Render)
- **Autentisering:** Session‑basert
- **Drift:** Render
- **DNS:** Cloudflare

```
Browser
  ↓
FastAPI (backend/main.py)
  ├─ /                 → Hoved-GUI (index.html)
  ├─ /admin            → Admin-panel (admin.html, kun for admins)
  ├─ /osdmtoexcel      → OSDM til Excel (osdmtoexcel.html)
  ├─ /change-password  → Passordbytte (change_password.html)
  ├─ /ui/*             → API (TEN / OSDM)
  ├─ /admin/*          → Brukeradministrasjon API
  └─ /static/*         → CSS, JS, favicon

Database: SQLite (Render persistent disk / lokalt)
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

| Variabel         | Beskrivelse                          | Standard                |
|------------------|--------------------------------------|-------------------------|
| `SESSION_SECRET` | Hemmelig nøkkel for sessions         | `CHANGE_ME_BEFORE_PROD` |
| `DATABASE_URL`   | PostgreSQL‑tilkobling (valgfri)      | SQLite lokalt           |
| `RESEND_API_KEY` | API‑nøkkel for Resend (e-post)       | _(tom – e-post deaktivert)_ |
| `SENDER_EMAIL`   | Avsenderadresse for e-poster         | `noreply@livetsmiler.no` |
| `APP_URL`        | Basis-URL i e-postlenker             | `https://poptoosdm.livetsmiler.no` |

Lokalt trenger du ikke sette `DATABASE_URL` — SQLite brukes automatisk.
`RESEND_API_KEY` må settes for at e-postinvitasjoner skal fungere.
I produksjon (Render) settes alle som miljøvariabler i dashboardet.

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

### 4. Admin (`/admin`)

Kun tilgjengelig for admin‑brukere:

- Søk i brukerlisten og bla med paginering (15 per side)
- Legg til ny bruker — invitasjon sendes automatisk på e-post
- Nye brukere tvinges til å bytte passord ved første innlogging
- Generer nytt passord — sendes på e-post til brukeren
- Gi/fjern admin-tilgang per bruker
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
  https://poptoosdm.livetsmiler.no
  ```
- HTTPS håndteres av Cloudflare
- Automatisk deploy ved push til `main`

---

## Status

✅ Produksjonsklar  
✅ Validert mot UIC DRTF  
✅ SQLite i produksjon (Render persistent disk)  
✅ Admin‑panel med paginering og søk  
✅ E-postinvitasjon via Resend  
✅ Tvungen passordbytte ved første innlogging  
✅ Innloggingslogg  
✅ OSDM til Excel-konvertering med metadata-boks og RICS-navn  
✅ Flerspråklig (norsk, engelsk, tysk, svensk)  
✅ Deployet på Render (poptoosdm.livetsmiler.no)  
