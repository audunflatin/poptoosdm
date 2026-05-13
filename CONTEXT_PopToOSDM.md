# PopToOSDM – Kontekst og løsningsbeskrivelse

Dette dokumentet beskriver status, arkitektur og valg i PopToOSDM-løsningen.
Det er ment som kontekst for videre arbeid, feilsøking eller videreutvikling.

---

## Overordnet formål

PopToOSDM er et GUI-basert verktøy for å generere OSDM fareDelivery-filer
basert på:

- TEN-avstander (regionalConstraints.distance)
- TEN-pristabell (CSV)
- Brukerinput via GUI

Genererte OSDM-filer er validert mot **UIC DRTF** og laster grønt i DRTF.

---

## Teknologi

- **Backend:** FastAPI (Python)
- **Frontend:** HTML / CSS / Vanilla JavaScript (servert via FastAPI)
- **Database:** SQLite (både lokalt og i produksjon på Render)
- **Autentisering:** Session-basert med passlib/pbkdf2_sha256
- **Drift:** Render (automatisk deploy fra `main`)
- **DNS:** Cloudflare
- **Domene:** https://poptoosdm.livetsmiler.no

---

## Filstruktur

```
backend/
  main.py          — all applikasjonslogikk (FastAPI)
  auth_db.py       — SQLAlchemy-modeller: User, LoginLog + migrering
  auth_utils.py    — passord-hashing og generering
  email_utils.py   — e-postutsending via Resend API
  rics_codes.py    — ERA RICS-koder: 2388 europeiske transportørnavn (kode → navn)
  core/
    settings.py    — SESSION_SECRET, RESEND_API_KEY, SENDER_EMAIL, APP_URL
frontend/
  index.html       — hoved-GUI (PopToOSDM)
  admin.html       — admin-panel (brukerhåndtering, kun for admins)
  osdmtoexcel.html — OSDM til Excel-konvertering
  change_password.html — tvungen passordbytte ved første innlogging
  login.html       — innloggingsside
  app.js           — JavaScript for index.html
  admin.js         — JavaScript for admin.html (paginering, søk)
  osdmtoExcel.js   — JavaScript for osdmtoexcel.html
  i18n.js          — flerspråklig støtte (no, en, de, sv)
  styles.css       — felles styling
data/
  input/
    1076-OSDM-template.json          — OSDM-template med farestruktur (ryddet mai 2026)
    connectionpoint_to_stopplace.csv — kobling CP-id → stopplace
    uic_to_stopplace.csv             — kobling UIC → stopplace
schemas/           — JSON-skjemaer for OSDM-validering
```

---

## OSDM-modell (viktig)

### Gyldighet

Gyldighet settes **kun** via:

```
fareDelivery.fareStructure.calendars[].fromDate / untilDate
```

- Ingen gyldighet på price-nivå
- `utcOffset` i calendars settes dynamisk basert på Oslo-tidssone (60 = vintertid, 120 = sommertid)
- Datostrenger bruker alltid `+0000` som offset — mottaker bruker `utcOffset` til å tolke riktig tid
- Dette er eksplisitt tilpasset DRTF-krav

---

### Priser

- Priser beregnes **per regionalConstraint per kategori** (10 kategorier × antall RC-er)
- Basert på:
  - `regionalConstraints.distance`
  - TEN-pristabell (CSV)
  - NOK → EUR valutakurs
  - Avrunding opp til nærmeste 0,20 EUR
- Kategoriratio mot voksen (P__7/G__1 = 1.0):

| Kategori | Suffix | Ratio |
|---|---|---|
| Voksen | P__7 / G__1 | 1.00 |
| Voksen gruppe | P__34 / G__2 | 0.90 |
| Senior | P__11 / G__8 | 0.50 |
| Barn 6-17 år | P__8 / G__3 | 0.25 |
| Barn 6-17 år gruppe | P__35 / G__4 | 0.25 |
| Barn 0-5 år | P__9 / G__6 | 0.00 |
| Barn 0-5 år gruppe | P__36 / G__7 | 0.00 |
| FIP leisure voksen | P__5 / G__1 | 0.50 |
| FIP leisure barn | P__5 / G__3 | 0.25 |
| Hund | P__10 / G__5 | 0.50 |

- `priceRef` i alle fares oppdateres til å peke på nye price-id-er etter generering
- Ingen `priceRef` direkte på regionalConstraints (ikke tillatt av DRTF)

---

### ID-håndtering

Alle ID-er i template-filen følger mønsteret:

```
1076_{deliveryId}_{kode}__{nr}
```

Eksempel: `1076_8.0_I__1`, `1076_8.0_K__42`, `1076_8.0_E__7`

Ved generering erstattes gammel deliveryId med ny overalt i strukturen via
string-replace på serialisert JSON før parsing. Dette treffer alle 33+
felt-typer som inneholder delivery-id-en, uten å iterere manuelt over strukturen.

---

### Delivery-felt

Følgende styres fra GUI og settes i `fareDelivery.delivery`:

- `deliveryId` — må økes for hver innsending til DRTF
- `usage`
  - TEST → `TEST_ONLY`
  - PROD → `PRODUCTION`
- `optionalDelivery` (boolean)

---

### Generert fil

Ferdig OSDM JSON lagres **i minnet** (`OSDM_OUT`-dict i `main.py`) og serveres
direkte via `/ui/download-osdm/{filename}`. Ingen skriving til disk.

---

## OSDM til Excel-konvertering

Egen side (`/osdmtoexcel`) for å konvertere en hvilken som helst OSDM fareDelivery JSON-fil til Excel.

### Funksjonalitet
- Laster opp OSDM JSON → returnerer `.xlsx`
- Fungerer for alle land/operatører, ikke bare 1076
- Kolonner bygges **dynamisk** fra filens farestruktur — ingen hardkoding
- Én rad per stasjonspar (én retning), sortert alfabetisk på fra-stasjon
- Filnavn: `{deliveryId}_{test|prod}_prices.xlsx`
- Stasjonspar med **flere operatører** (ulike serviceConstraints) gir separate kolonner

### Metadata-boks

Øverst i Excel-filen (rader 1–7) vises en stilisert metadata-boks med:
- Mørk blå header-rad med tittel
- Leverandør, leveranse-ID, gyldighetsperiode, bruks-type, transportør(er)
- Transportørkoder vises med ERA RICS-navn, f.eks. `Vygruppen AS (1076)`
- Bruk-celle farges grønt (PRODUCTION) eller oransje (TEST_ONLY)
- Tabellens kolonneoverskrifter starter på rad 8, data fra rad 9
- Frys-pane og auto-filter satt på tabellhodet

### Transportørnavn (RICS)
- `backend/rics_codes.py` inneholder 2388 ERA RICS-koder hentet fra `teleref.era.europa.eu` (mai 2026)
- Format: `RICS_CODES = { '0076': 'Bane NOR', '1076': 'Vygruppen AS', ... }`

### Kolonner
Alltid: `From UIC`, `From station`, `To UIC`, `To station`, `Km`

Deretter én kolonne per unik kombinasjon av:
- `nameRef` (billettnavn, f.eks. "Flexpreis", "Voksen")
- `passengerConstraintRef` (passasjertype)
- `serviceClassRef` (klasse, f.eks. "2. Klasse", "1. Klasse")
- `reductionConstraintRef` (rabattkort, f.eks. "BahnCard 50")
- `serviceConstraintRef` (operatør, f.eks. "Västtrafik", "SJ Regional")

Kolonnenavn bygges automatisk fra tekster i filen. Passasjertype legges kun
til når det er nødvendig for å skille duplikate kolonnenavn.

### Teknisk
- Konvertering kjøres i bakgrunnstråd (`threading.Thread`)
- Klienten poller `/frontend/osdm-to-csv-status/{job_id}` hvert 300ms
- Progress: 0% → 10% → 20% → 35% → 40-70% (fare-løkken) → 80% → 95% → 100%
- Nedlasting via `/frontend/osdm-to-csv-download/{job_id}`
- Resultatet slettes fra minnet etter nedlasting
- Endepunkter:
  - `POST /frontend/osdm-to-csv` — starter jobb, returnerer `jobId`
  - `GET /frontend/osdm-to-csv-status/{job_id}` — returnerer status og percent
  - `GET /frontend/osdm-to-csv-download/{job_id}` — laster ned ferdig fil

---

## Brukerhåndtering

- Brukere lagres i SQLite (både lokalt og i produksjon)
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

### Databasemodell – LoginLog
Logger alle vellykkede innlogginger med `email`, `logged_at` og `ip_address`.

### Innloggingsflyt
1. Bruker logger inn → lagres i LoginLog
2. Hvis `must_change_password = True` → redirect til `/change-password`
3. Bruker velger nytt passord → `must_change_password = False`, `first_login_at` settes
4. Redirect til `/`

### Admin-panel (`/admin`)
- Kun tilgjengelig for brukere med `is_admin = True`
- Søkefelt filtrerer på e-post — viser treff uavhengig av gjeldende side
- Paginering: 15 brukere per side med ←/→-navigasjon (skjules ved søk)
- Brukerstatus: ✅ har logget inn, — avventer, ❌ inaktiv
- Legg til ny bruker → invitasjon sendes automatisk på e-post via Resend
- Nytt passord → sendes på e-post, `must_change_password` settes til True
- Gi/fjern admin-tilgang per bruker (★/☆-knapp)
- Slett bruker (kan ikke slette seg selv)
- Admin-link i header på alle sider, synlig kun for admins

### Lokal testdata
`frontend/admin_mock.js` (gitignored) inneholder 32 mock-brukere for lokal testing.
`admin.html` laster filen kun på `localhost`/`127.0.0.1` via et inline-script —
ingen 404-requests i produksjon. `admin.js` bruker `window.MOCK_USERS` hvis tilgjengelig.

### E-post (Resend)
- Avsender: `SENDER_EMAIL` (default: `noreply@livetsmiler.no`)
- Krever verifisert domene i Resend med DNS-records i Cloudflare
- Miljøvariabler: `RESEND_API_KEY`, `SENDER_EMAIL`, `APP_URL`
- Hvis `RESEND_API_KEY` ikke er satt logges en advarsel — appen fungerer ellers normalt

---

## GUI – Funksjonalitet

### Flyt

1. Last opp TEN-pristabell (CSV)
2. Valider TEN-tabell
3. Fyll inn:
   - DeliveryId
   - Miljø (test / prod)
   - OptionalDelivery
   - Valutakurs
   - Gyldig fra / til
4. Generer OSDM
5. Last ned OSDM-fil
6. Se eksempelpriser

---

### Klientvalidering

- Generer-knapp er deaktivert til TEN er validert
- Inputfelter valideres før backend-kall
- Nedlastingsknapp aktiveres kun ved vellykket generering

---

### TEN-CSV validering

Validerer at:
- Hver linje har nøyaktig 3 kolonner
- Alle verdier er heltall (håndterer mellomrom og non-breaking space som tusenskilletegn)
- km-verdier er positive
- `fra` < `til` per linje
- Ingen gap eller overlapp mellom km-intervaller
- Filen ikke er tom

---

### Eksempelpriser

- Eksempelpriser beregnes i backend basert på voksenprisen
- Vises i GUI som tabell med EUR, NOK og km
- Eksempelstrekninger:
  - Oslo S → Bergen stasjon
  - Oslo S → Trondheim S
  - Oslo S → Stavanger stasjon
  - Oslo S → Halden stasjon
  - Oslo S → Kornsjø grense (UIC 7600551)

---

## GUI – Utseende

- Entur-inspirert fargepalett (lyse toner, `#0066cc`)
- Sticky header med Entur-logo, UIC-logo og tittel
- Subtil skygge på header ved scrolling
- Statusfelt med grønn/rød markering
- Progress-bar under generering
- Admin-panel skjules for ikke-admin-brukere
- Flaggknapper (🇳🇴 🇬🇧 🇩🇪 🇸🇪) øverst til høyre for språkvalg

---

## Flerspråklig støtte (i18n)

- Støtter **norsk, engelsk, tysk og svensk**
- Språk detekteres automatisk fra nettleseren (`navigator.languages`)
- Valgt språk lagres i `localStorage` (nøkkel: `poptoosdm_lang`)
- Alle synlige tekster i HTML bruker `data-i18n="nøkkel"`-attributter
- All dynamisk tekst i JS bruker `t("nøkkel")`-funksjonen
- `i18n.js` må lastes **før** `app.js` / `osdmtoExcel.js`
- Språkbytte kaller `loadUserList()` på admin-siden for å oppdatere knapptekster

### Legge til ny tekst

1. Bruk `data-i18n="min_nøkkel"` i HTML (eller `t("min_nøkkel")` i JS)
2. Legg til nøkkelen under riktig seksjon i **alle fire språk** i `i18n.js`

### Seksjonsoversikt i i18n.js

| Seksjon (kommentar i filen) | Innhold |
|---|---|
| Felles | logout, navigasjonslenker, ja/nei |
| Login-side | labels og knapp på login-siden |
| Advarsel – kun for Norge | norway_warning_* |
| Seksjon 1–2 | labels og knapper i index.html |
| Bytt passord | change_pw_* (change_password.html) |
| Seksjon 3 – Admin | brukertabell, legg til bruker, handlinger, søk, paginering |
| OSDM til Excel-side | labels og knapper i osdmtoexcel.html |
| Valideringsfeil – app.js | feilmeldinger ved inputvalidering |
| Resultat – app.js | tekst i resultatboksen etter generering |
| Eksempelpriser – app.js | kolonneoverskrifter i eksempelpristabellen |
| osdmtoExcel.js | statustekster i Excel-konverteringen |

---

## Miljøvariabler

| Variabel         | Beskrivelse                          | Standard                    |
|------------------|--------------------------------------|-----------------------------|
| `SESSION_SECRET` | Hemmelig nøkkel for sessions         | `CHANGE_ME_BEFORE_PROD`     |
| `DATABASE_URL`   | PostgreSQL-tilkobling (valgfri)      | SQLite lokalt               |
| `RESEND_API_KEY` | API-nøkkel for Resend (e-post)       | _(tom – e-post deaktivert)_ |
| `SENDER_EMAIL`   | Avsenderadresse for e-poster         | `noreply@livetsmiler.no`    |
| `APP_URL`        | Basis-URL i e-postlenker             | `https://poptoosdm.livetsmiler.no` |

---

## Viktige tekniske detaljer

### UIC-koder å merke seg
- Oslo S: `7600100`
- Kornsjø grense: `7600551` (ikke 7600552 — dette var en feil som er rettet i template)

### Cache-busting
Ved endringer i statiske filer må versjonsnummeret bumpes i **alle** HTML-filer som laster dem:

| Fil | Gjeldende versjon |
|---|---|
| `styles.css` | v=6 (v=7 i index.html) |
| `i18n.js` | v=12 |
| `app.js` | v=7 |
| `admin.js` | v=7 |
| `osdmtoExcel.js` | v=3 |

HTML-filer som laster i18n.js: `index.html`, `admin.html`, `osdmtoexcel.html`,
`change_password.html`, `forgot_password.html`, `reset_password.html`, `login.html`

### Database og Render
- SQLite brukes både lokalt og i produksjon på Render
- `init_db()` kalles ved oppstart via `@app.on_event("startup")`
- `users.db` ligger på en persistent disk på Render — overlever redeploy

### Store OSDM-filer
- Deutsche Bahn (1080): 1,2 GB JSON, 1 210 300 fares, 48 412 RC-er
- For store filer tar Excel-konverteringen 30-60 sekunder — progressbar viser fremdrift

---

## Status

- ✅ Funksjonelt ferdig
- ✅ Validert mot UIC DRTF
- ✅ GUI ferdig polert
- ✅ SQLite i produksjon (Render persistent disk)
- ✅ Admin-panel med paginering, søk og admin-tildeling
- ✅ E-postinvitasjon via Resend
- ✅ Tvungen passordbytte ved første innlogging
- ✅ Innloggingslogg (LoginLog)
- ✅ Deployet på Render (poptoosdm.livetsmiler.no)
- ✅ OSDM til Excel-konvertering (alle land/operatører, metadata-boks, RICS-navn)
- ✅ Korrekt prisberegning per kategori med oppdaterte priceRef i fares
- ✅ Dynamisk tidssone-håndtering (sommertid/vintertid)
- ✅ Flerspråklig støtte (norsk, engelsk, tysk, svensk) med automatisk språkdeteksjon
- ✅ OSDM-output lagres i minnet — ingen disk-skriving

---

## Videre arbeid (hvis aktuelt)

- OAuth2 / Azure AD SSO for Entur-intern drift (Entur-partner.entur.org)
- Sorterbar eksempelpristabell
- Mørk/lys-modus

---

## Hvordan bruke dette dokumentet

Når du vil jobbe videre med prosjektet:

1. Last opp `CONTEXT_PopToOSDM.md`
2. Si: _«Dette er kontekstfilen for PopToOSDM»_

Da har Claude full oversikt, samme mentale modell og null oppstartskost.
