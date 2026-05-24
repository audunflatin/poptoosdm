# PopToOSDM

PopToOSDM er et internverktøy for å generere OSDM `fareDelivery`‑filer basert på:

- TEN‑avstander
- TEN‑pristabell (CSV)
- Brukerinput via web‑GUI

Løsningen er validert mot **UIC DRTF** og følger **OSDM‑spesifikasjonen**.

Produksjonsdomene: **https://osdmtools.com**

---

## Funksjonalitet

- Landingsside for uinnloggede brukere med info og tilgangsforespørselsskjema
- **Prisregulering** (`/price-adjust`) — skaler alle priser i en OSDM-fil med fast prosentsats; voksen skaleres og alle kategorier beregnes automatisk
- **Priser fra avstandsfil** (`/`) — validering av TEN‑CSV, generering av OSDM JSON med:
  - DeliveryId, Miljø (test / prod), Optional delivery, Gyldighetsperiode
  - Valutakurs (EUR, NOK, SEK, DKK, GBP, CHF, BGN, CZK, HUF, ISK, PLN, RON, TRY) hentet live fra ECB
  - Visning av eksempelpriser og nedlasting av ferdig OSDM‑fil
- Legg til rabatterte priser i eksisterende OSDM-fil (`/fare-discount`)
- Konvertering av OSDM JSON → Excel (`/osdmtoexcel`)
  - Stilisert metadata-boks øverst i Excel med leveranseinformasjon
  - ERA RICS-navn på transportørkoder (f.eks. `1076` → `Vygruppen AS (1076)`)
  - Støtter stasjonspar med flere operatører
- Admin‑panel for brukerhåndtering (`/admin/users`)
  - Invitasjon av nye brukere via e-post (Resend)
  - Tvungen passordbytte ved første innlogging
  - Logging av innlogginger
  - Paginering (15 per side) og søk i brukerlisten
  - Admin-tilgang kan tildeles/fjernes per bruker
- Aktivitetslogg for admin (`/admin/log`)
- Tilgangsforespørselsskjema på landingssiden (med rate limiting og honeypot)

---

## Arkitektur

- **Backend:** FastAPI (Python)
- **Frontend:** Statisk HTML/JS (servert via FastAPI)
- **Database:** SQLite (persistent disk på Railway)
- **Autentisering:** Session‑basert
- **Drift:** Railway
- **DNS:** Cloudflare
- **Domene:** osdmtools.com

```
Browser
  ↓
FastAPI (backend/main.py)
  ├─ /                 → Landingsside (landing.html) — uinnlogget
  ├─ /login            → Innloggingsside (login.html)
  ├─ /                 → Hoved-GUI (index.html) — innlogget
  ├─ /price-adjust     → Prisregulering (price-adjust.html)
  ├─ /fare-discount    → Legg til rabatterte priser (fare-discount.html)
  ├─ /osdmtoexcel      → OSDM til Excel (osdmtoexcel.html)
  ├─ /admin/users      → Admin-panel (admin.html, kun for admins)
  ├─ /admin/log        → Aktivitetslogg (admin-log.html, kun for admins)
  ├─ /kontakt          → Kontaktskjema (contact.html)
  ├─ /endre-passord    → Endre passord (endre-passord.html)
  ├─ /ui/*             → API (TEN / OSDM)
  ├─ /admin/*          → Brukeradministrasjon API
  ├─ /request-access   → Tilgangsforespørsel (åpent endepunkt)
  └─ /static/*         → CSS, JS, favicon

Database: SQLite (/data/users.db — Railway persistent disk)
```

---

## Oppsett (lokalt – macOS / Linux)

### Forutsetninger

- Python 3.12 eller nyere
- Git

### Oppsett av virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Miljøvariabler

| Variabel         | Beskrivelse                          | Standard                |
|------------------|--------------------------------------|-------------------------|
| `SESSION_SECRET` | Hemmelig nøkkel for sessions         | `CHANGE_ME_BEFORE_PROD` |
| `DATABASE_URL`   | SQLite-sti (valgfri)                 | SQLite lokalt           |
| `RESEND_API_KEY` | API‑nøkkel for Resend (e-post)       | _(tom – e-post deaktivert)_ |
| `SENDER_EMAIL`   | Avsenderadresse for e-poster         | `noreply@osdmtools.com` |
| `CONTACT_EMAIL`  | Mottaker for kontaktskjema og tilgangsforespørsler | _(må settes)_ |
| `APP_URL`        | Basis-URL i e-postlenker             | `https://osdmtools.com` |

Lokalt trenger du ikke sette `DATABASE_URL` — SQLite brukes automatisk.
`RESEND_API_KEY` og `CONTACT_EMAIL` må settes for at e-postfunksjonene skal virke.

### Start applikasjonen lokalt

```bash
.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Applikasjonen er tilgjengelig på `http://127.0.0.1:8000`.

---

## DRTF‑hensyn

Genererte filer følger kravene fra **UIC DRTF**:

- `delivery.usage`: `TEST` → `TEST_ONLY`, `PROD` → `PRODUCTION`
- `deliveryId` styres fra GUI
- `optionalDelivery` settes eksplisitt
- Gyldighet leses kun fra `fareStructure.calendars`
- Priser rundes opp til nærmeste 0,20 EUR (DRTF-krav)

OSDM‑filer generert med dette verktøyet validerer grønt i **UIC DRTF**.

---

## Status

✅ Produksjonsklar  
✅ Validert mot UIC DRTF  
✅ SQLite i produksjon (Railway persistent disk)  
✅ Admin‑panel med paginering, søk og aktivitetslogg  
✅ E-postinvitasjon via Resend  
✅ Tvungen passordbytte ved første innlogging  
✅ OSDM til Excel-konvertering med metadata-boks og RICS-navn  
✅ Legg til rabatterte priser i eksisterende OSDM-fil  
✅ Prisregulering – skaler OSDM-priser med fast prosentsats  
✅ Flerspråklig (norsk, engelsk, tysk, svensk, fransk)  
✅ Landingsside med tilgangsforespørselsskjema  
✅ Deployet på Railway (osdmtools.com)  
