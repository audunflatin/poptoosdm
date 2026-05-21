# CLAUDE.md – PopToOSDM

Rask referanse for Claude. Detaljert arkitektur og kontekst: `CONTEXT_PopToOSDM.md`.

---

## Slik starter du lokalt

```bash
python3.14 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

> **OBS:** `.venv/bin/uvicorn` har feil interpreter-path (gammel disk-lokasjon).
> Bruk alltid `python3.14 -m uvicorn` direkte.

---

## Sider og ansvarlige filer

| URL | HTML | JS | Funksjon |
|---|---|---|---|
| `/` | `index.html` | `app.js` | Oppdater OSDM-priser (hovedflyt) |
| `/osdmtoexcel` | `osdmtoexcel.html` | `osdmtoExcel.js` | OSDM JSON → Excel |
| `/fare-discount` | `fare-discount.html` | `fareDiscount.js` | Legg til rabatterte farer i eksisterende OSDM |
| `/admin/users` | `admin.html` | `admin.js` | Brukerhåndtering (kun admin) |
| `/admin/log` | `admin-log.html` | `admin-log.js` | Aktivitetslogg (kun admin) |
| `/kontakt` | `contact.html` | — | Kontaktskjema |
| `/endre-passord` | `endre-passord.html` | — | Endre passord |

Felles styling: `styles.css`. Flerspråklig: `i18n.js` (lastes før side-spesifikk JS).

---

## Global server-state (viktig å kjenne til)

Definert øverst i `backend/main.py`:

```python
TEN_TABLE: list | None      # Lastes ved POST /ui/validate-ten — brukes av generate
OSDM_OUT:  dict | None      # {"filename": str, "content": str} — generert fil i minnet
XLSX_JOBS: dict             # job_id → {status, result, percent, ...} for async Excel-jobber
GENERATION_PROGRESS: dict   # {"status": ..., "percent": ...} for progressbar
```

**Konsekvens:** TEN-filen og OSDM-filen må valideres i riktig rekkefølge per server-sesjon.
Ingenting skrives til disk under generering.

---

## Generer OSDM – flyt og endepunkter

| # | Kall | Handling |
|---|---|---|
| 1 | `POST /ui/validate-ten` | Parser TEN-CSV, lagrer i `TEN_TABLE` |
| 2 | `POST /ui/validate-osdm` | Validerer struktur, returnerer warnings + deliveryId |
| 3 | `GET /ui/exchange-rate?from_=EUR&to=NOK` | Henter kurs fra frankfurter.app (ECB) |
| 4 | `POST /ui/generate-osdm` | Bruker `TEN_TABLE` + template, lagrer i `OSDM_OUT` |
| 5 | `POST /ui/fix-osdm` | Rydder opp feil og ubrukte elementer i OSDM-fil |
| 6 | `GET /ui/download-osdm/{filename}` | Serverer `OSDM_OUT` |
| 7 | `POST /ui/excel-from-generated` | Konverterer `OSDM_OUT` til Excel (async) |

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

---

## OSDM-validering – typer advarsler

`POST /ui/validate-osdm` returnerer warnings for:
- Farer som peker på ukjent `priceRef`, `passengerConstraintRef`, `regionalConstraintRef`, `carrierConstraintRef`, `bundleRef`, `nameRef`
- RC-er med ugyldig `entryConnectionPointId` / `exitConnectionPointId`
- Ubrukte `prices`, `passengerConstraints`, `regionalConstraints`

`POST /ui/fix-osdm` fikser **alle** disse automatisk og returnerer `X-Fix-Stats`-header med antall fjernede elementer per kategori.

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
| `1076_7.0_S__1` | Primær bundle for alle ordinære farer |
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

## Pågående oppgave

**DSB-rabatt på Kornsjø gr ↔ Oslo S** — klar til å kjøres via `/fare-discount`:
- Fra: Kornsjø grense (UIC 7600551), Til: Oslo S (UIC 7600100)
- Transportør: DSB (RICS 1186) – velg «Spesifikke transportører»
- Rabatt: 20 %
- Passasjerkategorier: Voksen 2. kl. = G__1 og G__2
- Farnavn: f.eks. «DSB reduction Adult 2nd class»

---

## Cache-busting – gjeldende versjoner

| Fil | Versjon |
|---|---|
| `styles.css` | v=13 |
| `i18n.js` | v=28 |
| `app.js` | v=14 |
| `admin.js` | v=12 |
| `admin-log.js` | v=1 |
| `osdmtoExcel.js` | v=3 |
| `fareDiscount.js` | v=8 |

Ved endringer i statiske filer: bump versjonsnummeret i **alle**
HTML-filer som laster den aktuelle filen.

HTML-filer som laster `i18n.js` med v=28:
`index.html`, `admin.html`, `admin-log.html`, `fare-discount.html`,
`contact.html`, `endre-passord.html`, `osdmtoexcel.html`

HTML-filer med eldre i18n.js (v=19, endres ikke nå):
`login.html`, `change_password.html`, `forgot_password.html`, `reset_password.html`

---

## i18n – legge til ny tekst

1. Bruk `data-i18n="nøkkel"` i HTML eller `t("nøkkel")` i JS
2. Legg til nøkkelen i **alle fire språk** i `i18n.js` (no, en, de, sv)
3. Bump `i18n.js`-versjon overalt

Dynamiske etiketter (f.eks. valutakurs-label) bruker `data-i18n`-attributten
og oppdateres via JS — se `updateExchangeRateLabel()` i `app.js`.

---

## Kjente fallgruver

- **`.venv/bin/uvicorn` virker ikke** — interpreter-path er feil (prosjektet ble flyttet). Bruk `python3.14 -m uvicorn`.
- **`TEN_TABLE` er None etter serverrestart** — brukeren må validere TEN-filen på nytt. Dette er by design (stateless storage mellom requests, men state lever i server-prosessen).
- **`import requests` var lenge glemt** i `main.py` (lagt til mai 2026). Valutahenting feilet stille.
- **Priser rundes opp til nærmeste 0,20 EUR** (`math.ceil(eur / 0.20) * 0.20`). Dette er DRTF-krav.
- **String-replace på serialisert JSON** brukes til å bytte deliveryId overalt — dette treffer alle 33+ felt-typer uten manuell iterasjon, men betyr at `old_delivery_id` ikke kan være en delstreng av noe annet i filen.
