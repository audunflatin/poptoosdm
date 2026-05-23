# PopToOSDM – Kontekst og løsningsbeskrivelse

Dette dokumentet beskriver status, arkitektur og valg i PopToOSDM-løsningen.
Det er ment som kontekst for videre arbeid, feilsøking eller videreutvikling.

---

## Overordnet formål

PopToOSDM er et GUI-basert verktøy for europeiske jernbaneoperatører for å generere
og håndtere OSDM fareDelivery-filer basert på:

- TEN-avstander (regionalConstraints.distance)
- TEN-pristabell (CSV)
- Brukerinput via GUI

Genererte OSDM-filer er validert mot **UIC DRTF** og laster grønt i DRTF.

Produksjonsdomene: **https://osdmtools.com**

---

## Teknologi

- **Backend:** FastAPI (Python 3.12)
- **Frontend:** HTML / CSS / Vanilla JavaScript (servert via FastAPI)
- **Database:** SQLite (persistent disk på Railway: `/data/users.db`)
- **Autentisering:** Session-basert med passlib/pbkdf2_sha256
- **Drift:** Railway (automatisk deploy fra `main`)
- **DNS / CDN:** Cloudflare (CNAME-oppslag, ikke A-record)
- **E-post:** Resend API

---

## Filstruktur

```
backend/
  main.py          — all applikasjonslogikk (FastAPI)
  auth_db.py       — SQLAlchemy-modeller: User, LoginLog, EventLog + migrering
  auth_utils.py    — passord-hashing og generering
  email_utils.py   — e-postutsending via Resend API
  rics_codes.py    — ERA RICS-koder: 2388 europeiske transportørnavn (kode → navn)
  core/
    settings.py    — SESSION_SECRET, RESEND_API_KEY, SENDER_EMAIL, CONTACT_EMAIL, APP_URL
frontend/
  landing.html     — landingsside for uinnloggede brukere
  login.html       — innloggingsside
  index.html       — hoved-GUI (Oppdater OSDM-priser)
  fare-discount.html — legg til rabatterte farer i eksisterende OSDM
  admin.html       — admin-panel (brukerhåndtering, kun for admins)
  admin-log.html   — aktivitetslogg (kun for admins)
  osdmtoexcel.html — OSDM til Excel-konvertering
  contact.html     — kontaktskjema
  endre-passord.html — endre passord (innlogget bruker)
  change_password.html — tvungen passordbytte ved første innlogging
  forgot_password.html — glemt passord (be om tilbakestillingslenke)
  reset_password.html  — tilbakestill passord via e-postlenke
  app.js           — JavaScript for index.html
  admin.js         — JavaScript for admin.html (paginering, søk)
  admin-log.js     — JavaScript for admin-log.html
  fareDiscount.js  — JavaScript for fare-discount.html
  osdmtoExcel.js   — JavaScript for osdmtoexcel.html
  i18n.js          — flerspråklig støtte (no, en, de, sv, fr)
  styles.css       — felles styling (mørk marineblå, Entur-inspirert)
data/
  input/
    1076-OSDM-template.json          — OSDM-template med farestruktur
    connectionpoint_to_stopplace.csv — kobling CP-id → stopplace
    uic_to_stopplace.csv             — kobling UIC → stopplace
schemas/           — JSON-skjemaer for OSDM-validering
railway.json       — Railway-konfigurasjon
Procfile           — alternativ startkommando for Railway
.python-version    — Python 3.12
```

---

## Routing – viktig å kjenne til

`/` (root) serverer **ulike sider** avhengig av innloggingsstatus:
- Uinnlogget → `landing.html` (landingsside)
- Innlogget → `index.html` (hoved-GUI)

`/login` er en separat rute (GET + POST).

---

## Landingsside og tilgangsforespørsel

`landing.html` vises for alle som ikke er innlogget. Inneholder:
- Hero med logo, tagline og "Logg inn"-knapp
- Tre funksjonskort (Oppdater OSDM-priser, OSDM→Excel, Legg til rabatt)
- Tilgangsforespørselsskjema — skjult bak en trigger-knapp med smooth CSS-animasjon

### Tilgangsforespørsel (`POST /request-access`)
- **Åpent endepunkt** — ingen innlogging nødvendig
- **Honeypot:** skjult `website`-felt — bots fyller det ut og avvises stille
- **Rate limiting:** maks 3 forespørsler per IP per 24 timer (`_access_requests` dict i `main.py`)
- Sender e-post til `CONTACT_EMAIL` via `send_access_request_email()` i `email_utils.py`
- Logger hendelsen i `EventLog`

---

## Flerspråklig støtte (i18n)

Støtter **5 språk**: norsk (no), engelsk (en), tysk (de), svensk (sv), fransk (fr).

- Språk detekteres automatisk fra nettleseren (`navigator.languages`)
- Valgt språk lagres i `localStorage` (nøkkel: `poptoosdm_lang`)
- Alle synlige tekster i HTML bruker `data-i18n="nøkkel"`-attributter
- Plassholdertekst: `data-i18n-placeholder="nøkkel"`
- Title-attributter: `data-i18n-title="nøkkel"`
- Toggle-knapper med skjult radio-input: wrap teksten i `<span data-i18n="nøkkel">`
- All dynamisk tekst i JS bruker `t("nøkkel")`-funksjonen
- `i18n.js` må lastes **før** side-spesifikk JS
- Språkbytte kaller `loadUserList()` på admin-siden for å oppdatere knapptekster

### Legge til ny tekst
1. Bruk `data-i18n="min_nøkkel"` i HTML eller `t("min_nøkkel")` i JS
2. Legg til nøkkelen i **alle fem språk** i `i18n.js`
3. Bump `i18n.js`-versjon i alle HTML-filer som laster den

---

## Cache-busting – gjeldende versjoner

| Fil | Versjon |
|---|---|
| `styles.css` | v=13 |
| `i18n.js` | v=36 (landing.html) / v=33 (hovudsider) / v=19 (login-sider) |
| `app.js` | v=15 |
| `admin.js` | v=12 |
| `admin-log.js` | v=1 |
| `osdmtoExcel.js` | v=3 |
| `fareDiscount.js` | v=14 |

HTML-filer som laster `i18n.js` med v=36: `landing.html`

HTML-filer som laster `i18n.js` med v=33:
`index.html`, `admin.html`, `admin-log.html`, `fare-discount.html`,
`contact.html`, `endre-passord.html`, `osdmtoexcel.html`

HTML-filer med v=19 (login-sider, endres sjelden):
`login.html`, `change_password.html`, `forgot_password.html`, `reset_password.html`

---

## Global server-state

Definert øverst i `backend/main.py`:

```python
TEN_TABLE: list | None      # Lastes ved POST /ui/validate-ten
OSDM_OUT:  dict | None      # {"filename": str, "content": str}
XLSX_JOBS: dict             # job_id → {status, result, percent, ...}
GENERATION_PROGRESS: dict   # {"status": ..., "percent": ...}
_login_attempts: dict       # IP → [timestamps] — rate limiting innlogging
_access_requests: dict      # IP → [timestamps] — rate limiting tilgangsforespørsler
```

**Konsekvens:** TEN-filen og OSDM-filen må valideres i riktig rekkefølge per server-sesjon.
Ingenting skrives til disk under generering.

---

## Miljøvariabler

| Variabel         | Beskrivelse                          | Standard                    |
|------------------|--------------------------------------|-----------------------------|
| `SESSION_SECRET` | Hemmelig nøkkel for sessions         | `CHANGE_ME_BEFORE_PROD`     |
| `DATABASE_URL`   | SQLite-sti                           | SQLite lokalt               |
| `RESEND_API_KEY` | API-nøkkel for Resend                | _(tom – e-post deaktivert)_ |
| `SENDER_EMAIL`   | Avsenderadresse for e-poster         | `noreply@osdmtools.com`     |
| `CONTACT_EMAIL`  | Mottaker for kontaktskjema og tilgangsforespørsler | _(må settes)_ |
| `APP_URL`        | Basis-URL i e-postlenker             | `https://osdmtools.com`     |

---

## E-post (Resend)

Alle utgående e-poster håndteres av `email_utils.py`.

| Funksjon | Trigger | Mottaker |
|---|---|---|
| `send_welcome_email` | Admin legger til ny bruker | Ny bruker |
| `send_reset_link_email` | Bruker ber om glemt-passord | Brukeren |
| `send_reset_email` | Admin genererer nytt passord | Brukeren |
| `send_contact_email` | Kontaktskjema sendes | `CONTACT_EMAIL` |
| `send_access_request_email` | Tilgangsforespørsel sendes | `CONTACT_EMAIL` |

E-postdesign: mørk marineblå (`#0d1b2a`/`#152535`), korall-rød aksentfarge.
Støtter dark mode via `@media (prefers-color-scheme: dark)` + `data-ogsc` for Outlook.

---

## Brukerhåndtering

- Brukere lagres i SQLite (`/data/users.db` på Railway)
- Passord: UUID-basert, hashes med pbkdf2_sha256 via passlib
- Sesjon: server-side via Starlette SessionMiddleware

### Databasemodell – User
| Kolonne | Type | Beskrivelse |
|---|---|---|
| `email` | String | Unik, brukes som innlogging |
| `password_hash` | String | pbkdf2_sha256-hash |
| `is_admin` | Boolean | Admin-tilgang |
| `is_active` | Boolean | Aktiv/deaktivert |
| `must_change_password` | Boolean | True inntil bruker bytter passord |
| `first_login_at` | DateTime | Tidspunkt for første vellykkede innlogging |

### Databasemodell – EventLog
Logger alle hendelser: innlogginger, brukerstyring, OSDM-generering, kontakt, tilgangsforespørsler.
Feltene er `user_email`, `event_type`, `status`, `detail` (JSON), `created_at`.

### Innloggingsflyt
1. Bruker logger inn → logges i EventLog
2. Hvis `must_change_password = True` → redirect til `/change-password`
3. Bruker velger nytt passord → `must_change_password = False`
4. Redirect til `/`

### Admin-panel (`/admin/users`)
- Søkefelt filtrerer på e-post
- Paginering: 15 brukere per side
- Brukerstatus: ✅ innlogget, — avventer, ❌ inaktiv
- Legg til / slett bruker, generer nytt passord, gi/fjern admin-tilgang

### Aktivitetslogg (`/admin/log`)
Viser alle EventLog-hendelser med filtrering og paginering.

---

## Generer OSDM – flyt og endepunkter

| # | Kall | Handling |
|---|---|---|
| 1 | `POST /ui/validate-ten` | Parser TEN-CSV, lagrer i `TEN_TABLE` |
| 2 | `POST /ui/validate-osdm` | Validerer struktur, returnerer warnings + deliveryId |
| 3 | `GET /ui/exchange-rate?from_=EUR&to=NOK` | Henter kurs fra frankfurter.app (ECB) |
| 4 | `POST /ui/generate-osdm` | Bruker `TEN_TABLE` + template, lagrer i `OSDM_OUT` |
| 5 | `POST /ui/fix-osdm` | Rydder opp feil og ubrukte elementer |
| 6 | `GET /ui/download-osdm/{filename}` | Serverer `OSDM_OUT` |
| 7 | `POST /ui/excel-from-generated` | Konverterer `OSDM_OUT` til Excel (async) |

### OSDM-template
- Template-fil: `data/input/1076-OSDM-template.json`
- Template deliveryId (erstattes ved generering): `7.0`
- ID-mønster: `1076_{deliveryId}_{kode}__{nr}`
- String-replace på serialisert JSON brukes til å bytte deliveryId overalt — treffer alle 33+ felttyper

### Priser
- Beregnes per regionalConstraint per kategori
- Rundes opp til nærmeste 0,20 EUR (DRTF-krav): `math.ceil(eur / 0.20) * 0.20`
- Valutakurs hentes live fra frankfurter.app (ECB)

### Validering – typer advarsler
`POST /ui/validate-osdm` returnerer warnings for:
- Farer som peker på ukjent `priceRef`, `passengerConstraintRef`, `regionalConstraintRef` o.l.
- RC-er med ugyldig `entryConnectionPointId` / `exitConnectionPointId`
- Ubrukte `prices`, `passengerConstraints`, `regionalConstraints`

`POST /ui/fix-osdm` fikser alle disse og returnerer `X-Fix-Stats`-header.

---

## Fare-discount – legg til rabatterte farer

| Kall | Handling |
|---|---|
| `POST /fare-discount/parse` | Parser OSDM-fil, returnerer stasjoner/transportører/passasjerkategorier |
| `POST /fare-discount/apply` | Legger til rabatterte farer, returnerer oppdatert OSDM-fil |
| `GET /fare-discount/rics` | Liste over alle RICS-transportørkoder |

Nøkkelparametere for `/fare-discount/apply`:
- `stationPairsJson` — `[{fromCpId, toCpId, fromUic, toUic}, …]`
- `discountName`, `discountPct` — navn og prosent (1–99)
- `carrierCodes[]` — valgfri RICS-liste (tom = ingen begrensning)
- `passengerRefs[]`, `serviceClassIds[]` — kategorier og klasser

---

## OSDM til Excel-konvertering

Konvertering kjøres async i bakgrunnstråd. Klienten poller status hvert 300ms.

Endepunkter:
- `POST /frontend/osdm-to-csv` — starter jobb, returnerer `jobId`
- `GET /frontend/osdm-to-csv-status/{job_id}` — status og prosent
- `GET /frontend/osdm-to-csv-download/{job_id}` — last ned ferdig fil

Kolonner bygges dynamisk fra farestruktur. Metadata-boks øverst (rader 1–7)
med leverandør, delivery-ID, gyldighetsperiode, transportør(er) med RICS-navn.

---

## Viktige tekniske detaljer

### UIC-koder å merke seg
- Oslo S: `7600100`
- Kornsjø grense: `7600551`

### Kjente fallgruver
- **`TEN_TABLE` er None etter serverrestart** — brukeren må validere TEN-filen på nytt (by design)
- **`import requests` var lenge glemt** i `main.py` (lagt til mai 2026) — valutahenting feilet stille
- **`padding-left: 220px` på body** i `styles.css` gjelder hovudsider med sidemeny — login-sider må overstyre med `padding: 0`
- **String-replace på deliveryId** — `old_delivery_id` kan ikke være en delstreng av andre verdier i filen

### Store OSDM-filer
- Deutsche Bahn (1080): 1,2 GB JSON, 1 210 300 fares, 48 412 RC-er
- Ingen øvre filstørrelsesgrense på Railway (tidligere 100 MB på Render)

### Railway-konfigurasjon
- Startkommando: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Persistent disk montert på `/data` — inneholder `users.db`
- DNS: Cloudflare CNAME (ikke A-record) mot Railway-domenet

---

## Status

- ✅ Funksjonelt ferdig
- ✅ Validert mot UIC DRTF
- ✅ Deployet på Railway (osdmtools.com)
- ✅ SQLite i produksjon (Railway persistent disk)
- ✅ Landingsside med tilgangsforespørselsskjema (honeypot + rate limiting)
- ✅ Admin-panel med paginering, søk og aktivitetslogg
- ✅ E-postinvitasjon via Resend
- ✅ Tvungen passordbytte ved første innlogging
- ✅ OSDM til Excel-konvertering (alle land/operatører, metadata-boks, RICS-navn)
- ✅ Legg til rabatterte farer i eksisterende OSDM-fil
- ✅ Flerspråklig støtte (norsk, engelsk, tysk, svensk, fransk)
- ✅ Ingen øvre filstørrelsesgrense

---

## Videre arbeid (hvis aktuelt)

- OAuth2 / Azure AD SSO for Entur-intern drift
- Sorterbar eksempelpristabell
