# PopToOSDM

PopToOSDM er et verktøy for å generere OSDM fareDelivery-filer basert på
TEN-avstander, TEN-pristabell og brukerinput via GUI.

Løsningen er validert mot UIC DRTF og følger OSDM-spesifikasjonen.

---

## Oppsett og oppstart (macOS)

### Forutsetninger
- macOS
- Python 3.10 eller nyere

Sjekk Python-versjon:
```bash
python3 --version
Oppsett av virtual environment (venv)
Fra prosjektroten (PopToOSDM):
Shellpython3 -m venv .venvsource .venv/bin/activateShow more lines
Når venv er aktiv vil terminalen vise:
(.venv)

Installer avhengigheter:
Shellpip install fastapi uvicorn python-multipart jsonschemaShow more lines

Starte backend (FastAPI)
Fra prosjektroten:
Shellsource .venv/bin/activatepython -m uvicorn backend.app:app --reloadShow more lines
Backend kjører på:
http://127.0.0.1:8000


Starte frontend (GUI)
Åpne ny terminal:
Shellcd frontendpython3 -m http.server 5173Show more lines
GUI er tilgjengelig på:
http://127.0.0.1:5173


Bruk av GUI

Last opp TEN-pristabell (CSV)
Valider TEN-tabell
Fyll inn:

DeliveryId (må økes ved hver innsending til DRTF)
Miljø: test / prod
OptionalDelivery
Valutakurs NOK → EUR
Gyldig fra / til


Generer OSDM
Last ned ferdig OSDM-fil
Se eksempelpriser i statusfeltet


DRTF-hensyn

delivery.usage settes korrekt:

TEST → TEST_ONLY
PROD → PRODUCTION


deliveryId styres fra GUI
optionalDelivery settes eksplisitt
Gyldighet leses kun fra fareStructure.calendars
Ingen ulovlige felt (priceRef, validFrom/validTo på price-nivå)

OSDM-filer generert med dette verktøyet validerer grønt i UIC DRTF.