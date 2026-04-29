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
- **Database:** PostgreSQL (produksjon via Render) / SQLite (lokalt fallback)
- **Autentisering:** Session-basert med passlib/pbkdf2_sha256
- **Drift:** Render (automatisk deploy fra `main`)
- **DNS:** Cloudflare
- **Domene:** https://www.livetsmiler.no

---

## OSDM-modell (viktig)

### Gyldighet

Gyldighet settes **kun** via:

```
fareDelivery.fareStructure.calendars[].fromDate / untilDate
```

- Ingen gyldighet på price-nivå
- Dette er eksplisitt tilpasset DRTF-krav

---

### Priser

- Priser beregnes **per regionalConstraint**
- Basert på:
  - `regionalConstraints.distance`
  - TEN-pristabell (CSV)
  - NOK → EUR valutakurs
  - Avrunding opp til nærmeste 0,20 EUR
- Ingen `priceRef` på regionalConstraints (ikke tillatt av DRTF)

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

## Brukerhåndtering

- Brukere lagres i PostgreSQL (produksjon) eller SQLite (lokalt)
- Passord: UUID-basert, hashes med pbkdf2_sha256 via passlib
- Sesjon: server-side via Starlette SessionMiddleware
- Admin-GUI:
  - Liste over alle brukere med admin- og aktivstatus
  - Legg til ny bruker (passord vises én gang i GUI)
  - Generer nytt passord for eksisterende bruker
  - Slett bruker (kan ikke slette seg selv)

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

- Eksempelpriser beregnes i backend
- Vises i GUI som tabell med EUR, NOK og km
- Eksempelstrekninger:
  - Oslo S → Bergen stasjon
  - Oslo S → Trondheim S
  - Oslo S → Stavanger stasjon
  - Oslo S → Halden stasjon

---

## GUI – Utseende

- Entur-inspirert fargepalett (lyse toner, `#0066cc`)
- Sticky header med Entur-logo, UIC-logo og tittel
- Subtil skygge på header ved scrolling
- Statusfelt med grønn/rød markering
- Progress-bar under generering
- Admin-panel skjules for ikke-admin-brukere

---

## Miljøvariabler

| Variabel         | Beskrivelse                      | Standard                |
|------------------|----------------------------------|-------------------------|
| `SESSION_SECRET` | Hemmelig nøkkel for sessions     | `CHANGE_ME_BEFORE_PROD` |
| `DATABASE_URL`   | PostgreSQL-tilkobling (valgfri)  | SQLite lokalt           |

---

## Status

- ✅ Funksjonelt ferdig
- ✅ Validert mot UIC DRTF
- ✅ GUI ferdig polert
- ✅ PostgreSQL i produksjon
- ✅ Admin-GUI for brukerhåndtering
- ✅ Deployet på Render (livetsmiler.no)

---

## Videre arbeid (hvis aktuelt)

- Sorterbar eksempelpristabell
- Eksport av eksempelpriser (CSV)
- Mørk/lys-modus
- Rollebasert GUI

---

## Hvordan bruke dette dokumentet

Når du vil jobbe videre med prosjektet:

1. Last opp `CONTEXT_PopToOSDM.md`
2. Si: _«Dette er kontekstfilen for PopToOSDM»_

Da har Claude full oversikt, samme mentale modell og null oppstartskost.
