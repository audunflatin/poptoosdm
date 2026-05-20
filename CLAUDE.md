# CLAUDE.md – PopToOSDM

Les `CONTEXT_PopToOSDM.md` for fullstendig prosjektbeskrivelse.
Dette dokumentet inneholder det Claude trenger raskt: nøkkel-IDer,
pågående oppgaver og OSDM-spesifikk kunnskap som ikke er i koden.

---

## Pågående oppgave

**DSB-rabatt på Kornsjø gr ↔ Oslo S** — ikke påbegynt ennå.

Vy ønsker at DSB (provider `1186`) får 20% rabatt på voksen 2. klasse
for strekningen Kornsjø grense ↔ Oslo S. Skal ikke være tilgjengelig
for andre providere. Faren skal hete noe i retning av
«DSB reduction Adult 2. Klasse».

Tilnærming valgt: **generator utvides** (dynamisk pris, ikke hardkodet).

Hva som trengs:
1. Ny `carrierConstraint` i templaten for DSB (`1186`)
2. Nye fare-oppføringer i templaten for de to Kornsjø-RC-ene som
   refererer til DSB-carrier-constraint (én per retning)
3. Generatoren (`osdm_to_xlsx_bytes` / genereringsfunksjon) utvides
   til å beregne 80% av voksen BASIC-pris for disse farene

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

### FareConstraintBundles (eksisterende)
| ID (v7.0) | Beskrivelse |
|---|---|
| `1076_7.0_S__1` | Primær bundle for alle ordinære farer |
| `1076_7.0_S__2` | Sekundær bundle |

### Fare-struktur (eksempel Kornsjø-fare)
```json
{
  "id": "...",
  "bundleRef": "1076_7.0_S__1",
  "fareType": "ADMISSION",
  "nameRef": "1076_7.0_P__7",
  "priceRef": "1076_7.0_I__90",
  "regionalConstraintRef": "1076_7.0_K__117",
  "carrierConstraintRef": "1076_7.0_C__2",
  "regulatoryConditions": ["CIV"],
  "serviceClassRef": "BASIC",
  "passengerConstraintRef": "1076_7.0_G__1",
  "involvedTCOs": ["1076"]
}
```

### fareStructure-seksjoner (alle nøkler)
`calendars`, `serviceClassDefinitions`, `texts`, `prices`,
`regionalConstraints`, `carrierConstraints`, `passengerConstraints`,
`fareConstraintBundles`, `passengerCombinationConstraints`, `fares`,
`salesAvailabilityConstraint`, `travelValidityConstraints`,
`combinationConstraints`, `fulfillmentConstraints`,
`connectionPoints`, `stationNames`

Merk: `reductionConstraints` finnes ikke i denne templaten ennå.

### Passasjerkategorier og ratio (mot voksen = 1.0)
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

---

## Cache-busting – gjeldende versjoner
| Fil | Versjon |
|---|---|
| `styles.css` | v=6 (v=7 i index.html) |
| `i18n.js` | v=14 |
| `app.js` | v=7 |
| `admin.js` | v=11 |
| `osdmtoExcel.js` | v=3 |

Ved endringer i statiske filer: bump versjonsnummeret i **alle**
HTML-filer som laster den aktuelle filen.
