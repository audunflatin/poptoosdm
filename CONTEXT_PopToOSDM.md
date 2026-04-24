
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

- Backend: **FastAPI (Python)**
- Frontend: **HTML / CSS / Vanilla JavaScript**
- Kjører lokalt på macOS
- Python virtual environment (.venv)

---

## OSDM-modell (viktig)

### Gyldighet
- Gyldighet settes **kun** via:
 
fareDelivery.fareStructure.calendars[].fromDate / untilDate
- Ingen gyldighet på price-nivå
- Dette er eksplisitt tilpasset DRTF-krav

---

### Priser
- Priser beregnes **per regionalConstraint**
- Basert på:
- regionalConstraints.distance
- TEN-pristabell
- NOK → EUR valutakurs
- Avrunding opp til nærmeste 0,20 EUR
- Ingen `priceRef` på regionalConstraints (ikke tillatt av DRTF)

---

### Delivery-felt

Følgende styres fra GUI og settes i:

fareDelivery.delivery

- `deliveryId` (må økes for hver innsending)
- `usage`
  - TEST → TEST_ONLY
  - PROD → PRODUCTION
- `optionalDelivery` (boolean)

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

### Eksempelpriser
- Eksempelpriser beregnes i backend
- Vises i GUI **kun som tabell**
- Ikke duplisert i statuslisten

Eksempelstrekninger brukt:
- Oslo S → Bergen stasjon
- Oslo S → Trondheim S
- Oslo S → Stavanger stasjon
- Oslo S → Halden stasjon

Prisene er indikative og basert på modellens faktiske avstander.

---

## GUI – Utseende

- Entur-inspirert fargepalett (lyse toner)
- Mørke knapper for kontrast
- Sticky header med:
  - UIC-logo
  - Entur-logo
  - Tittel
- Subtil skygge på header ved scrolling
- Statusfelt med grønn/rød markering
- Progress-bar under generering

---

## Status

- ✅ Funksjonelt ferdig
- ✅ Validert mot UIC DRTF
- ✅ GUI ferdig polert
- ✅ Klar for videre bruk

---

## Videre arbeid (hvis aktuelt)

Mulige utvidelser:
- Sorterbar eksempelpristabell
- Eksport av eksempelpriser (CSV)
- Mørk/lys-modus
- Rollebasert GUI



✅ Hvordan bruke dette senere
Når du vil jobbe videre:

Last opp CONTEXT_PopToOSDM.md
Si f.eks.:

«Dette er kontekstfilen for PopToOSDM»



Da har jeg:

full oversikt
samme mentale modell
null oppstartskost