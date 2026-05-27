# CLAUDE.md – PopToOSDM

Rask referanse for Claude. Detaljert arkitektur og kontekst: `CONTEXT_PopToOSDM.md`.

---

## Slik starter du lokalt

```bash
.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

---

## Viktig: Når du legger til en ny tjeneste

**Hver gang en ny side/tjeneste legges til, MÅ `presentation.js` oppdateres.**
Legg til et nytt slide i `getSlides()`-arrayen med beskrivelse av tjenesten på alle 5 språk (no, en, de, sv, fr), og bump `presentation.js`-versjonen i `presentation.html`.

## Designkrav som alltid gjelder

**Progress bar (ikke spinner) på alle filopplastingssider.**
Nye sider med filopplasting og tung backend-prosessering skal bruke en styled progress bar med prosent og steg-tekst (`.progress-fill`, `.progress-pct`, `.progress-stage`), ikke en spinner. Se `fare-discount.html` / `osdmtoexcel.html` for HTML-mønster og `fareDiscount.js` for JS-mønster.

**Filstørrelsesgrense = 5000 MB overalt.**
Ikke bruk betingede grenser basert på `localhost` vs. produksjon. Deutsche Bahn har OSDM-filer på ~1,2 GB. Grensen skal alltid være `const maxMb = 5000;`.

**Tung prosessering skal bruke async job-mønster.**
Nye endepunkter som gjør tung prosessering (JSON-parse av store filer, validering, konvertering) skal starte en bakgrunnstråd og returnere et `jobId` som frontend poller via et eget progress-endepunkt. Se `XLSX_JOBS`, `VALIDATION_JOBS`, `PARSE_JOBS` i `backend/main.py` for mønster.

---

## Sider og ansvarlige filer

| URL | HTML | JS | Funksjon |
|---|---|---|---|
| `/` (uinnlogget) | `landing.html` | — | Landingsside med info og tilgangsforespørsel |
| `/login` | `login.html` | — | Innlogging |
| `/` (innlogget) | `index.html` | `app.js` | Priser fra avstandsfil (hovedflyt) |
| `/price-adjust` | `price-adjust.html` | `priceAdjust.js` | Prisregulering (skaler priser med fast %) |
| `/osdmtoexcel` | `osdmtoexcel.html` | `osdmtoExcel.js` | OSDM JSON → Excel |
| `/fare-discount` | `fare-discount.html` | `fareDiscount.js` | Legg til rabatterte priser i eksisterende OSDM |
| `/fix-osdm` | `fix-osdm.html` | `fixOsdm.js` | Rydd opp i OSDM (fjern ubrukte elementer) |
| `/admin/users` | `admin.html` | `admin.js` | Brukerhåndtering (kun admin) |
| `/admin/log` | `admin-log.html` | `admin-log.js` | Aktivitetslogg (kun admin) |
| `/kontakt` | `contact.html` | — | Kontaktskjema |
| `/min-konto` | `min-konto.html` | — | Min konto (endre navn, passord, slett konto) |
| `/endre-passord` | `endre-passord.html` | — | Endre passord (301-redirect til /min-konto) |

Felles styling: `styles.css`. Flerspråklig: `i18n.js` (lastes før side-spesifikk JS).

---

## Global server-state (viktig å kjenne til)

Definert øverst i `backend/main.py`:

```python
TEN_TABLE: list | None         # Lastes ved POST /ui/validate-ten — brukes av generate
OSDM_STORE: dict               # user_email → {"filename": str, "content": str, "created_at": float}
FIX_OSDM_STORE: dict           # user_email → {"filename": str, "content": bytes, "created_at": float}
XLSX_JOBS: dict                # job_id → {status, result, percent, user_email, ...}
VALIDATION_JOBS: dict          # job_id → {status, result, percent, user_email, ...}
PARSE_JOBS: dict               # job_id → {status, result, percent, user_email, ...}
GENERATION_PROGRESS: dict      # {"status": ..., "percent": ...} for progressbar
```

**Viktig:** `OSDM_STORE` og `FIX_OSDM_STORE` er per bruker (keyed på `user_email`) — to brukere kan generere OSDM samtidig uten konflikt. Alle job-dicts lagrer `user_email`; progress- og download-endepunkter sjekker eierskap (403 hvis annen bruker).

**Konsekvens:** TEN-filen og OSDM-filen må valideres i riktig rekkefølge per server-sesjon.
Ingenting skrives til disk under generering.

En bakgrunnstråd rydder alle fem stores eldre enn 2 timer hvert 10. minutt (`XLSX_JOBS`, `VALIDATION_JOBS`, `PARSE_JOBS`, `OSDM_STORE`, `FIX_OSDM_STORE`).

---

## Prisregulering – endepunkter

| Kall | Handling |
|---|---|
| `GET /price-adjust` | Serverer `price-adjust.html` |
| `POST /price-adjust` | Mottar OSDM-fil + %, beregner nye priser, oppdaterer delivery-felt, returnerer justert fil |

Parametere: `osdm_file`, `pct`, `delivery_id`, `previous_delivery_id`, `environment`, `optional_delivery`, `valid_from`, `valid_to`.
Algoritme: grupper fares etter (RC, carrier, bundle) → maks = voksen → skaler med `1 + pct/100` → rund opp til 0,20 EUR → beregn øvrige kategorier fra ratio.

---

## Priser fra avstandsfil – flyt og endepunkter

| # | Kall | Handling |
|---|---|---|
| 1 | `POST /ui/validate-ten` | Parser TEN-CSV, lagrer i `TEN_TABLE` |
| 2 | `POST /ui/validate-osdm` | Validerer struktur, returnerer warnings + deliveryId |
| 3 | `GET /ui/exchange-rate?from_=EUR&to=NOK` | Henter kurs fra frankfurter.app (ECB) |
| 4 | `POST /ui/generate-osdm` | Bruker `TEN_TABLE` + template, lagrer i `OSDM_STORE[user_email]` |
| 5 | `GET /ui/download-osdm/{filename}` | Serverer `OSDM_STORE[user_email]` (krever innlogging) |
| 6 | `POST /ui/excel-from-generated` | Konverterer `OSDM_STORE[user_email]` til Excel (async) |

### Delivery-felt som settes ved generering
- `deliveryId` — ny ID (brukes i alle ID-er via string-replace)
- `previousDeliveryId` — forrige leveranse-ID (valgfri)
- `usage` — `TEST_ONLY` / `PRODUCTION`
- `optionalDelivery` — boolean
- `calendars[].fromDate/untilDate` + `utcOffset` — gyldighetsperiode

### Valutakurs
- Brukervalgt valuta for avstandsfilen (standard: EUR)
- `exchangeRate` = EUR per filvaluta-enhet (eksempel NOK: ~0,087)
- EUR gir kurs = 1 (ingen konvertering)
- Støttede valutaer: EUR, NOK, SEK, DKK, GBP, CHF, BGN, CZK, HUF, ISK, PLN, RON, TRY

---

## Fare-discount – flyt og endepunkter

| Kall | Handling |
|---|---|
| `POST /fare-discount/parse` | Parser OSDM-fil, returnerer stasjoner/transportører/passasjerkategorier |
| `POST /fare-discount/apply` | Legger til rabatterte farer, returnerer oppdatert OSDM-fil direkte |
| `GET /fare-discount/rics` | Liste over alle RICS-transportørkoder (for dropdown) |

### `/fare-discount/apply` – nøkkelparametere
- `stationPairsJson` — JSON-streng: `[{fromCpId, toCpId, fromUic, toUic}, …]` (støtter mange par)
- `discountName`, `discountPct` — navn og prosent (1–99)
- `carrierCodes[]` — valgfri liste med RICS-koder (tom = ingen begrensning)
- `passengerRefs[]`, `serviceClassIds[]` — hvilke kategorier og klasser rabatten gjelder

Backend samler RC-er fra **alle** par og lager priser for samtlige kombinasjoner av RC × passasjerkategori × serviceklasse.

---

## OSDM-validering – typer advarsler

`POST /ui/validate-osdm` returnerer warnings for:
- Farer som peker på ukjent `priceRef`, `passengerConstraintRef`, `regionalConstraintRef`, `carrierConstraintRef`, `bundleRef`, `nameRef`
- RC-er med ugyldig `entryConnectionPointId` / `exitConnectionPointId`
- Ubrukte `prices`, `passengerConstraints`, `regionalConstraints`

`POST /ui/fix-osdm` fikser **alle** disse automatisk — se eget avsnitt nedenfor.

---

## Rydd opp i OSDM – flyt og endepunkter

To-stegs flyt: analyser → bekreft → last ned.

| Kall | Handling |
|---|---|
| `POST /ui/fix-osdm` | Analyserer filen, lagrer resultat i `FIX_OSDM_STORE[user_email]`, returnerer JSON `{stats, filename}` |
| `GET /ui/fix-osdm/download` | Serverer lagret resultat fra `FIX_OSDM_STORE[user_email]` |

Frontend (`fixOsdm.js`): viser oppsummering av hva som vil bli fjernet, med "Last ned fikset fil"-knapp som trigges av brukeren. Resultatet ryddes fra `FIX_OSDM_STORE` etter 2 timer.

**`ijson` parser tall som `decimal.Decimal`** — alle `json.dumps`-kall i fix_osdm bruker `default=_ijson_default` for å konvertere Decimal til int/float.

---

## OSDM-template – nøkkel-IDer

Template-fil: `data/input/1076-OSDM-template.json`
Template deliveryId (erstattes ved generering): `7.0`
ID-mønster: `1076_{deliveryId}_{kode}__{nr}`

### ConnectionPoints (CP-er)
| Stasjon | UIC | CP-ID (v7.0) |
|---|---|---|
| Kornsjø grense | 7600551 | `1076_7.0_E__56` |
| Oslo S | 7600100 | `1076_7.0_E__76` |

### RegionalConstraints – Kornsjø gr ↔ Oslo S
| RC-ID (v7.0) | Entry CP | Exit CP | Distanse |
|---|---|---|---|
| `1076_7.0_K__117` | E__56 (Kornsjø) | E__76 (Oslo S) | 188 km |
| `1076_7.0_K__118` | E__76 (Oslo S) | E__56 (Kornsjø) | 188 km |

(To RC-er fordi én per retning.)

### CarrierConstraints (eksisterende)
| ID (v7.0) | Provider |
|---|---|
| `1076_7.0_C__1` | GoAhead (3781) |
| `1076_7.0_C__2` | Vy (1076) |
| `1076_7.0_C__3` | SJ Nord (3733) |
| `1076_7.0_C__4` | (3822) |

Neste ledige: `C__5` → skal brukes til DSB (1186).

### FareConstraintBundles
| ID (v7.0) | Beskrivelse |
|---|---|
| `1076_7.0_S__1` | Primær bundle for alle ordinære priser |
| `1076_7.0_S__2` | Sekundær bundle |

### Passasjerkategorier og ratio
| PassengerConstraint (v7.0) | Kategori | Ratio |
|---|---|---|
| G__1 | Voksen | 1.00 |
| G__2 | Voksen gruppe | 0.90 |
| G__8 | Senior | 0.50 |
| G__3 | Barn 6–17 | 0.25 |
| G__4 | Barn 6–17 gruppe | 0.25 |
| G__6 | Barn 0–5 | 0.00 |
| G__7 | Barn 0–5 gruppe | 0.00 |
| G__1 (FIP) | FIP leisure voksen | 0.50 |
| G__3 (FIP) | FIP leisure barn | 0.25 |
| G__5 | Hund | 0.50 |

### fareStructure-seksjoner (alle nøkler)
`calendars`, `serviceClassDefinitions`, `texts`, `prices`,
`regionalConstraints`, `carrierConstraints`, `passengerConstraints`,
`fareConstraintBundles`, `passengerCombinationConstraints`, `fares`,
`salesAvailabilityConstraint`, `travelValidityConstraints`,
`combinationConstraints`, `fulfillmentConstraints`,
`connectionPoints`, `stationNames`

Merk: `reductionConstraints` finnes ikke i denne templaten ennå.

---

## Tilgangsforespørsel – endepunkt

`POST /request-access` (åpent, ingen innlogging nødvendig):
- Rate limiting: maks 3 forespørsler per IP per 24 timer (`_access_requests` i `main.py`)
- Honeypot-felt (`website`) — bots avvises stille med 200 OK
- Sender e-post til admin via `send_access_request_email()` i `email_utils.py`
- Krever `CONTACT_EMAIL`-miljøvariabel

---

## Cache-busting – gjeldende versjoner

| Fil | Versjon |
|---|---|
| `styles.css` | v=25 |
| `i18n.js` | v=47 (alle hovudsider) / v=19 (login-sider) |
| `app.js` | v=21 |
| `admin.js` | v=15 |
| `admin-log.js` | v=3 |
| `osdmtoExcel.js` | v=7 |
| `fareDiscount.js` | v=18 |
| `priceAdjust.js` | v=10 |
| `fixOsdm.js` | v=3 |
| `presentation.js` | v=7 |

Ved endringer i statiske filer: bump versjonsnummeret i **alle**
HTML-filer som laster den aktuelle filen.

HTML-filer som laster `i18n.js` med v=47:
`landing.html`, `index.html`, `admin.html`, `admin-log.html`, `fare-discount.html`,
`contact.html`, `endre-passord.html`, `min-konto.html`, `osdmtoexcel.html`, `price-adjust.html`, `fix-osdm.html`

HTML-filer med eldre i18n.js (v=19, endres ikke nå):
`login.html`, `change_password.html`, `forgot_password.html`, `reset_password.html`

---

## i18n – legge til ny tekst

**All synlig tekst skal alltid språkstyres.** Ingen hardkodede strenger i HTML eller JS.

1. Bruk `data-i18n="nøkkel"` i HTML eller `t("nøkkel")` i JS
2. For placeholder-tekst: `data-i18n-placeholder="nøkkel"` på input-elementet
3. For title-attributter: `data-i18n-title="nøkkel"` på elementet
4. For toggle-knapper med skjult radio-input: wrap teksten i `<span data-i18n="nøkkel">`
5. Legg til nøkkelen i **alle fem språk** i `i18n.js` (no, en, de, sv, fr)
6. Bump `i18n.js`-versjon overalt

Dynamiske etiketter (f.eks. valutakurs-label) bruker `data-i18n`-attributten
og oppdateres via JS — se `updateExchangeRateLabel()` i `app.js`.

---

## Sikkerhet – viktige mekanismer

- **SESSION_SECRET**: logger advarsel ved oppstart hvis standardverdi brukes (ikke satt i env).
- **CORS**: `ALLOWED_ORIGINS` begrenser til `APP_URL` + localhost (settes i `backend/core/settings.py`).
- **Job-eierskap**: alle job-dicts (`XLSX_JOBS`, `VALIDATION_JOBS`, `PARSE_JOBS`) lagrer `user_email`. Progress- og download-endepunkter returnerer 403 hvis feil bruker spør.
- **Job-cleanup**: bakgrunnstråd sletter jobber eldre enn 2 timer hvert 10. minutt.
- **`_safe_filename()`**: fjerner tegn som kan ødelegge `Content-Disposition`-headere. Brukes i `fix_osdm`, `price_adjust` og `osdm-to-csv-download`.
- **`OSDM_STORE`**: per-bruker dict — to brukere kan generere OSDM samtidig uten å overskrive hverandres resultat.
- **Rate limiting**: 10 innloggingsforsøk per IP per 60 sek; 3 tilgangsforespørsler per IP per 24 t.
- **SameSite=strict** på session-cookie; `CF-Connecting-IP` for korrekt IP bak Cloudflare.

---

## Kjente fallgruver

- **`TEN_TABLE` er None etter serverrestart** — brukeren må validere TEN-filen på nytt. Dette er by design (stateless storage mellom requests, men state lever i server-prosessen).
- **`import requests` var lenge glemt** i `main.py` (lagt til mai 2026). Valutahenting feilet stille.
- **Priser rundes opp til nærmeste 0,20 EUR** (`math.ceil(eur / 0.20) * 0.20`). Dette er DRTF-krav.
- **String-replace på serialisert JSON** brukes til å bytte deliveryId overalt — dette treffer alle 33+ felt-typer uten manuell iterasjon, men betyr at `old_delivery_id` ikke kan være en delstreng av noe annet i filen.
