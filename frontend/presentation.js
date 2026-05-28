// OSDMTools – Presentasjon (no / en / de / sv / fr)

const SVG_LOGO = `<svg width="260" height="52" viewBox="0 0 220 44" xmlns="http://www.w3.org/2000/svg">
  <circle cx="14" cy="22" r="9" fill="#ff5959"/>
  <line x1="23" y1="22" x2="35" y2="22" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" stroke-dasharray="3 2"/>
  <circle cx="44" cy="22" r="7" fill="none" stroke="white" stroke-width="2.5"/>
  <text x="60" y="29" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-weight="800" font-size="21" fill="white"><tspan fill="#ff5959">OSDM</tspan>Tools</text>
</svg>`;

// ── Oversettelser ─────────────────────────────────────────────────────────────

const T = {
  no: {
    cover_subtitle: "Automatisert generering av OSDM fareDelivery-filer",
    cover_subnote:  "for europeiske jernbaneoperatører",

    s2_heading: "Hva er OSDM?",
    s2_b1: "Open Sales and Distribution Model – europeisk jernbanestandard (UIC/ERA)",
    s2_b2: "Operatører leverer <em>fareDelivery</em>-filer til UIC/DRTF minst én gang i året",
    s2_b3: "Filen definerer priser, strekninger, passasjerkategorier og gyldighetsperioder",
    s2_b4: "Godkjent fil er grunnlaget for billettdeling mellom operatører i CIT/DRTF",

    s3_heading: "Utfordringen",
    s3_b1: "Utgangspunktet var Legacy 108-filer – posisjonsdefinert tekstformat der ett tegn på feil plass brøt hele datasettet",
    s3_b2: "Konvertering til OSDM JSON innebar mange steg – prisvalidering, justering og gjentatt feilretting i en krevende arbeidsflyt",
    s3_b3: "Ferdig OSDM-fil måtte konverteres tilbake til Legacy 108 – som grunnlag for neste år, med risiko for nye feil i hvert ledd",
    s3_b4: "Feil ble ofte oppdaget sent i prosessen – og å rette dem krevde ofte bistand fra andre",
    s3_b5: "Tidkrevende prosess med lite rom for feil – særlig krevende tett på innleveringsfristene til UIC",

    s4_heading: "Prisregulering – flyten",
    s4_step1: "Last opp\nOSDM-fil",
    s4_step2: "Oppgi\nprosentsats",
    s4_step3: "Fyll inn\nleveransefelt",
    s4_step4: "Klikk\nJuster",
    s4_step5: "Last ned\nferdig fil",

    s5_heading: "Fire verktøy i ett",
    s5_b1: "<strong>Prisregulering</strong> – juster alle priser med fast prosentsats; voksen skaleres og alle kategorier beregnes automatisk",
    s5_b2: "<strong>Priser fra avstandsfil</strong> – henter valutakurs live, beregner nye priser, genererer komplett leveranse",
    s5_b3: "<strong>OSDM → Excel</strong> – konverterer leveransen til Excel for kontroll og arkivering",
    s5_b4: "<strong>Legg til rabatt i OSDM</strong> – legger inn rabatterte priser for valgt strekning og transportør",

    s6_heading: "Prisregulering",
    s6_b1: "Last opp en eksisterende OSDM fareDelivery-fil",
    s6_b2: "Oppgi ønsket prisendring i prosent (f.eks. +4 %)",
    s6_b3: "Fyll inn DeliveryId, gyldighetsperiode og miljø",
    s6_b4: "Voksenprisen skaleres med faktoren og rundes opp til nærmeste 0,20 EUR",
    s6_b5: "Alle andre kategorier (barn, senior, FIP, hund…) beregnes fra voksenprisen",
    s6_b6: "Last ned oppdatert OSDM-fil klar for levering",

    s7_heading: "Priser fra avstandsfil",
    s7_left_label: "Steg",
    s7_left_b1: "Last opp avstandsfil (TEN-CSV) med priser per strekning",
    s7_left_b2: "Last opp eksisterende OSDM-mal for validering",
    s7_left_b3: "Velg valuta og hent live valutakurs fra ECB",
    s7_left_b4: "Fyll inn DeliveryId, gyldighetsperiode og miljø",
    s7_left_b5: "Priser rundes opp til nærmeste 0,20 EUR",
    s7_left_b6: "Last ned ferdig OSDM-fil og/eller Excel-oversikt",
    s7_right_label: "Eksempel – avstandsfil (fra;til;pris;)",

    s8_heading: "Legg til rabatt i OSDM",
    s8_b1: "Last opp en eksisterende OSDM fareDelivery-fil",
    s8_b2: "Velg strekningsbegrensning (alle strekninger, eller spesifikke stasjonspar)",
    s8_b3: "Velg transportør og eventuell RICS-kode",
    s8_b4: "Oppgi rabattnavn og prosent (1–99 %)",
    s8_b5: "Velg passasjerkategorier og serviceklasse",
    s8_b6: "Generer fil med nye rabatterte priser innlagt",

    s8b_heading: "Rydd opp i OSDM",
    s8b_b1: "Last opp en OSDM fareDelivery-fil for automatisk opprydding",
    s8b_b2: "Ubrukte priser, passasjerkategorier og regionsbegrensninger fjernes",
    s8b_b3: "Feil stasjonsreferanser rettes automatisk",
    s8b_b4: "Statistikk over fjernede elementer vises etter nedlasting",

    s8c_heading: "OSDM-editor",
    s8c_b1: "Last opp en OSDM fareDelivery-fil for redigering",
    s8c_b2: "Rediger passasjerprofiler – endre ratio og recalkuler alle priser",
    s8c_b3: "Legg til nye strekningsrelasjoner med UIC-koder, voksenpris og avstand",
    s8c_b4: "Last ned den redigerte filen klar for bruk",

    s9_heading: "Teknisk",
    s9_left_label: "Backend",
    s9_left_b2: "SQLite (brukere + logg)",
    s9_left_b3: "Kjøres på Railway (cloud)",
    s9_right_label: "Frontend",
    s9_right_b2: "Ingen rammeverk",
    s9_right_b3: "Flerspråklig (no / en / de / sv / fr)",
    s9_right_b4: "Responsivt design",

    s10_heading: "Status",
    s10_num1_label: "valutaer\nstøttet",
    s10_num2_label: "språk\n(no/en/de/sv/fr)",
    s10_num3_label: "godkjent av\nUIC/DRTF",
    s10_b1: "I aktiv bruk – leveranser generert og godkjent av UIC/DRTF",
    s10_b2: "Validering med advarsler og automatisk rydding av OSDM-strukturen",
    s10_b3: "Aktivitetslogg med alle hendelser per bruker",

    keyhint: "← → &nbsp;·&nbsp; Home End &nbsp;·&nbsp; F = fullskjerm",
  },

  en: {
    cover_subtitle: "Automated generation of OSDM fareDelivery files",
    cover_subnote:  "for European railway operators",

    s2_heading: "What is OSDM?",
    s2_b1: "Open Sales and Distribution Model – European railway standard (UIC/ERA)",
    s2_b2: "Operators deliver <em>fareDelivery</em> files to UIC/DRTF at least once a year",
    s2_b3: "The file defines prices, routes, passenger categories and validity periods",
    s2_b4: "An approved file is the basis for ticket sharing between operators in CIT/DRTF",

    s3_heading: "The challenge",
    s3_b1: "Starting point was Legacy 108 files – a position-defined text format where one character out of place would break the entire dataset",
    s3_b2: "Converting to OSDM JSON involved many steps – price validation, adjustments and repeated error correction in a demanding workflow",
    s3_b3: "The finished OSDM file had to be converted back to Legacy 108 – as a baseline for next year, with risk of new errors at each stage",
    s3_b4: "Errors were often discovered late in the process – and fixing them often required outside assistance",
    s3_b5: "Time-consuming process with little margin for error – especially demanding close to UIC submission deadlines",

    s4_heading: "Price adjustment – the flow",
    s4_step1: "Upload\nOSDM file",
    s4_step2: "Enter\npercentage",
    s4_step3: "Fill in\ndelivery fields",
    s4_step4: "Click\nAdjust",
    s4_step5: "Download\nfinished file",

    s5_heading: "Four tools in one",
    s5_b1: "<strong>Price adjustment</strong> – adjust all prices with a fixed percentage; adult price scaled and all categories calculated automatically",
    s5_b2: "<strong>Prices from distance file</strong> – fetches exchange rate live, calculates new prices, generates complete delivery",
    s5_b3: "<strong>OSDM → Excel</strong> – converts the delivery to Excel for review and archiving",
    s5_b4: "<strong>Add discount to OSDM</strong> – adds discounted prices for selected route and carrier",

    s6_heading: "Price adjustment",
    s6_b1: "Upload an existing OSDM fareDelivery file",
    s6_b2: "Enter the desired price change in percent (e.g. +4%)",
    s6_b3: "Fill in DeliveryId, validity period and environment",
    s6_b4: "Adult price is scaled by the factor and rounded up to the nearest 0.20 EUR",
    s6_b5: "All other categories (children, senior, FIP, pet…) are calculated from the adult price",
    s6_b6: "Download updated OSDM file ready for delivery",

    s7_heading: "Prices from distance file",
    s7_left_label: "Steps",
    s7_left_b1: "Upload distance file (TEN-CSV) with prices per route",
    s7_left_b2: "Upload existing OSDM template for validation",
    s7_left_b3: "Select currency and fetch live exchange rate from ECB",
    s7_left_b4: "Fill in DeliveryId, validity period and environment",
    s7_left_b5: "Prices rounded up to nearest 0.20 EUR",
    s7_left_b6: "Download finished OSDM file and/or Excel overview",
    s7_right_label: "Example – distance file (from;to;price;)",

    s8_heading: "Add discount to OSDM",
    s8_b1: "Upload an existing OSDM fareDelivery file",
    s8_b2: "Select route constraint (all routes, or specific station pairs)",
    s8_b3: "Select carrier and optional RICS code",
    s8_b4: "Enter discount name and percentage (1–99%)",
    s8_b5: "Select passenger categories and service class",
    s8_b6: "Generate file with new discounted prices added",

    s8b_heading: "Clean up OSDM",
    s8b_b1: "Upload an OSDM fareDelivery file for automatic cleanup",
    s8b_b2: "Unused prices, passenger constraints and regional constraints are removed",
    s8b_b3: "Invalid station references are fixed automatically",
    s8b_b4: "Statistics on removed elements are shown after download",

    s8c_heading: "OSDM editor",
    s8c_b1: "Upload an OSDM fareDelivery file for editing",
    s8c_b2: "Edit passenger profiles – change ratio and recalculate all prices",
    s8c_b3: "Add new route relations with UIC codes, adult price and distance",
    s8c_b4: "Download the edited file ready for use",

    s9_heading: "Technical",
    s9_left_label: "Backend",
    s9_left_b2: "SQLite (users + log)",
    s9_left_b3: "Runs on Railway (cloud)",
    s9_right_label: "Frontend",
    s9_right_b2: "No framework",
    s9_right_b3: "Multilingual (no / en / de / sv / fr)",
    s9_right_b4: "Responsive design",

    s10_heading: "Status",
    s10_num1_label: "currencies\nsupported",
    s10_num2_label: "languages\n(no/en/de/sv/fr)",
    s10_num3_label: "approved by\nUIC/DRTF",
    s10_b1: "In active use – deliveries generated and approved by UIC/DRTF",
    s10_b2: "Validation with warnings and automatic cleanup of the OSDM structure",
    s10_b3: "Activity log with all events per user",

    keyhint: "← → &nbsp;·&nbsp; Home End &nbsp;·&nbsp; F = fullscreen",
  },

  de: {
    cover_subtitle: "Automatisierte Generierung von OSDM fareDelivery-Dateien",
    cover_subnote:  "für europäische Eisenbahnbetreiber",

    s2_heading: "Was ist OSDM?",
    s2_b1: "Open Sales and Distribution Model – europäischer Eisenbahnstandard (UIC/ERA)",
    s2_b2: "Betreiber liefern <em>fareDelivery</em>-Dateien an UIC/DRTF mindestens einmal jährlich",
    s2_b3: "Die Datei definiert Preise, Strecken, Fahrgastkategorien und Gültigkeitszeiträume",
    s2_b4: "Eine genehmigte Datei ist die Grundlage für die Fahrkartenteilung zwischen Betreibern in CIT/DRTF",

    s3_heading: "Die Herausforderung",
    s3_b1: "Ausgangspunkt waren Legacy-108-Dateien – ein positionsdefiniertes Textformat, bei dem ein falsch gesetztes Zeichen den gesamten Datensatz zerstören konnte",
    s3_b2: "Die Konvertierung in OSDM JSON umfasste viele Schritte – Preisvalidierung, Anpassungen und wiederholte Fehlerkorrekturen in einem anspruchsvollen Arbeitsablauf",
    s3_b3: "Die fertige OSDM-Datei musste zurück in Legacy 108 konvertiert werden – als Grundlage für das nächste Jahr, mit dem Risiko neuer Fehler in jedem Schritt",
    s3_b4: "Fehler wurden oft erst spät im Prozess entdeckt – und deren Behebung erforderte häufig externe Unterstützung",
    s3_b5: "Zeitaufwändiger Prozess mit wenig Fehlertoleranz – besonders anspruchsvoll kurz vor den Einreichungsfristen an UIC",

    s4_heading: "Preisanpassung – der Ablauf",
    s4_step1: "OSDM-Datei\nhochladen",
    s4_step2: "Prozentsatz\neingeben",
    s4_step3: "Lieferfelder\nausfüllen",
    s4_step4: "Anpassen\nklicken",
    s4_step5: "Fertige Datei\nherunterladen",

    s5_heading: "Vier Werkzeuge in einem",
    s5_b1: "<strong>Preisanpassung</strong> – alle Preise mit festem Prozentsatz anpassen; Erwachsenenpreis wird skaliert, alle Kategorien automatisch berechnet",
    s5_b2: "<strong>Preise aus Entfernungsdatei</strong> – holt Wechselkurs live, berechnet neue Preise, generiert vollständige Lieferung",
    s5_b3: "<strong>OSDM → Excel</strong> – konvertiert die Lieferung in Excel zur Prüfung und Archivierung",
    s5_b4: "<strong>Rabatt zu OSDM hinzufügen</strong> – fügt rabattierte Preise für ausgewählte Strecke und Betreiber hinzu",

    s6_heading: "Preisanpassung",
    s6_b1: "Eine vorhandene OSDM fareDelivery-Datei hochladen",
    s6_b2: "Gewünschte Preisänderung in Prozent eingeben (z. B. +4 %)",
    s6_b3: "DeliveryId, Gültigkeitszeitraum und Umgebung ausfüllen",
    s6_b4: "Erwachsenenpreis wird mit dem Faktor skaliert und auf das nächste 0,20 EUR aufgerundet",
    s6_b5: "Alle anderen Kategorien (Kinder, Senior, FIP, Hund…) werden vom Erwachsenenpreis berechnet",
    s6_b6: "Aktualisierte OSDM-Datei zur Lieferung herunterladen",

    s7_heading: "Preise aus Entfernungsdatei",
    s7_left_label: "Schritte",
    s7_left_b1: "Entfernungsdatei (TEN-CSV) mit Preisen pro Strecke hochladen",
    s7_left_b2: "Vorhandene OSDM-Vorlage zur Validierung hochladen",
    s7_left_b3: "Währung wählen und Live-Wechselkurs von der EZB abrufen",
    s7_left_b4: "DeliveryId, Gültigkeitszeitraum und Umgebung ausfüllen",
    s7_left_b5: "Preise werden auf das nächste 0,20 EUR aufgerundet",
    s7_left_b6: "Fertige OSDM-Datei und/oder Excel-Übersicht herunterladen",
    s7_right_label: "Beispiel – Entfernungsdatei (von;bis;Preis;)",

    s8_heading: "Rabatt zu OSDM hinzufügen",
    s8_b1: "Eine vorhandene OSDM fareDelivery-Datei hochladen",
    s8_b2: "Streckenbeschränkung wählen (alle Strecken oder spezifische Stationspaare)",
    s8_b3: "Betreiber und optionalen RICS-Code wählen",
    s8_b4: "Rabattname und Prozentsatz eingeben (1–99 %)",
    s8_b5: "Fahrgastkategorien und Serviceklasse wählen",
    s8_b6: "Datei mit neuen rabattierten Preisen generieren",

    s8b_heading: "OSDM bereinigen",
    s8b_b1: "Eine OSDM fareDelivery-Datei zur automatischen Bereinigung hochladen",
    s8b_b2: "Nicht verwendete Preise, Fahrgastgruppen und Regionalbeschränkungen werden entfernt",
    s8b_b3: "Fehlerhafte Stationsreferenzen werden automatisch korrigiert",
    s8b_b4: "Statistiken über entfernte Elemente werden nach dem Download angezeigt",

    s8c_heading: "OSDM-Editor",
    s8c_b1: "Eine OSDM fareDelivery-Datei zur Bearbeitung hochladen",
    s8c_b2: "Fahrgastprofile bearbeiten – Verhältnis ändern und alle Preise neu berechnen",
    s8c_b3: "Neue Streckenrelationen mit UIC-Codes, Erwachsenenpreis und Entfernung hinzufügen",
    s8c_b4: "Die bearbeitete Datei für den Einsatz bereit herunterladen",

    s9_heading: "Technisch",
    s9_left_label: "Backend",
    s9_left_b2: "SQLite (Benutzer + Protokoll)",
    s9_left_b3: "Läuft auf Railway (cloud)",
    s9_right_label: "Frontend",
    s9_right_b2: "Kein Framework",
    s9_right_b3: "Mehrsprachig (no / en / de / sv / fr)",
    s9_right_b4: "Responsives Design",

    s10_heading: "Status",
    s10_num1_label: "Währungen\nunterstützt",
    s10_num2_label: "Sprachen\n(no/en/de/sv/fr)",
    s10_num3_label: "genehmigt von\nUIC/DRTF",
    s10_b1: "Im aktiven Einsatz – Lieferungen generiert und von UIC/DRTF genehmigt",
    s10_b2: "Validierung mit Warnungen und automatische Bereinigung der OSDM-Struktur",
    s10_b3: "Aktivitätsprotokoll mit allen Ereignissen pro Benutzer",

    keyhint: "← → &nbsp;·&nbsp; Home End &nbsp;·&nbsp; F = Vollbild",
  },

  sv: {
    cover_subtitle: "Automatiserad generering av OSDM fareDelivery-filer",
    cover_subnote:  "för europeiska järnvägsoperatörer",

    s2_heading: "Vad är OSDM?",
    s2_b1: "Open Sales and Distribution Model – europeisk järnvägsstandard (UIC/ERA)",
    s2_b2: "Operatörer levererar <em>fareDelivery</em>-filer till UIC/DRTF minst en gång per år",
    s2_b3: "Filen definierar priser, sträckor, passagerarkategorier och giltighetsperioder",
    s2_b4: "En godkänd fil är grunden för biljettdelning mellan operatörer i CIT/DRTF",

    s3_heading: "Utmaningen",
    s3_b1: "Utgångspunkten var Legacy 108-filer – ett positionsdefinierat textformat där ett tecken på fel plats kunde förstöra hela datasetet",
    s3_b2: "Konvertering till OSDM JSON innebar många steg – prisvalidering, justeringar och upprepade felkorrigeringar i ett krävande arbetsflöde",
    s3_b3: "Den färdiga OSDM-filen behövde konverteras tillbaka till Legacy 108 – som underlag för nästa år, med risk för nya fel i varje led",
    s3_b4: "Fel upptäcktes ofta sent i processen – och att åtgärda dem krävde ofta extern hjälp",
    s3_b5: "Tidskrävande process med litet utrymme för fel – särskilt krävande nära inlämningsdeadlinerna till UIC",

    s4_heading: "Prisreglering – flödet",
    s4_step1: "Ladda upp\nOSDM-fil",
    s4_step2: "Ange\nprocenttal",
    s4_step3: "Fyll i\nleveransfält",
    s4_step4: "Klicka\nJustera",
    s4_step5: "Ladda ner\nfärdig fil",

    s5_heading: "Fyra verktyg i ett",
    s5_b1: "<strong>Prisreglering</strong> – justera alla priser med fast procentsats; vuxenpris skalas och alla kategorier beräknas automatiskt",
    s5_b2: "<strong>Priser från avståndsfil</strong> – hämtar valutakurs live, beräknar nya priser, genererar komplett leverans",
    s5_b3: "<strong>OSDM → Excel</strong> – konverterar leveransen till Excel för kontroll och arkivering",
    s5_b4: "<strong>Lägg till rabatt i OSDM</strong> – lägger in rabatterade priser för vald sträcka och transportör",

    s6_heading: "Prisreglering",
    s6_b1: "Ladda upp en befintlig OSDM fareDelivery-fil",
    s6_b2: "Ange önskad prisförändring i procent (t.ex. +4 %)",
    s6_b3: "Fyll i DeliveryId, giltighetsperiod och miljö",
    s6_b4: "Vuxenpriset skalas med faktorn och avrundas uppåt till närmaste 0,20 EUR",
    s6_b5: "Alla andra kategorier (barn, senior, FIP, hund…) beräknas från vuxenpriset",
    s6_b6: "Ladda ner uppdaterad OSDM-fil klar för leverans",

    s7_heading: "Priser från avståndsfil",
    s7_left_label: "Steg",
    s7_left_b1: "Ladda upp avståndsfil (TEN-CSV) med priser per sträcka",
    s7_left_b2: "Ladda upp befintlig OSDM-mall för validering",
    s7_left_b3: "Välj valuta och hämta live valutakurs från ECB",
    s7_left_b4: "Fyll i DeliveryId, giltighetsperiod och miljö",
    s7_left_b5: "Priser avrundas uppåt till närmaste 0,20 EUR",
    s7_left_b6: "Ladda ner färdig OSDM-fil och/eller Excel-översikt",
    s7_right_label: "Exempel – avståndsfil (från;till;pris;)",

    s8_heading: "Lägg till rabatt i OSDM",
    s8_b1: "Ladda upp en befintlig OSDM fareDelivery-fil",
    s8_b2: "Välj sträckningsbegränsning (alla sträckor, eller specifika stationspar)",
    s8_b3: "Välj transportör och eventuell RICS-kod",
    s8_b4: "Ange rabattnamn och procent (1–99 %)",
    s8_b5: "Välj passagerarkategorier och serviceklass",
    s8_b6: "Generera fil med nya rabatterade priser inlagda",

    s8b_heading: "Rensa OSDM",
    s8b_b1: "Ladda upp en OSDM fareDelivery-fil för automatisk rensning",
    s8b_b2: "Oanvända priser, passagerarkategorier och regionalbegränsningar tas bort",
    s8b_b3: "Ogiltiga stationsreferenser korrigeras automatiskt",
    s8b_b4: "Statistik över borttagna element visas efter nedladdning",

    s8c_heading: "OSDM-editor",
    s8c_b1: "Ladda upp en OSDM fareDelivery-fil för redigering",
    s8c_b2: "Redigera passagerarprofiler – ändra ratio och beräkna om alla priser",
    s8c_b3: "Lägg till nya streckrelasjoner med UIC-koder, vuxenpris och avstånd",
    s8c_b4: "Ladda ner den redigerade filen redo för användning",

    s9_heading: "Tekniskt",
    s9_left_label: "Backend",
    s9_left_b2: "SQLite (användare + logg)",
    s9_left_b3: "Körs på Railway (cloud)",
    s9_right_label: "Frontend",
    s9_right_b2: "Inget ramverk",
    s9_right_b3: "Flerspråkigt (no / en / de / sv / fr)",
    s9_right_b4: "Responsiv design",

    s10_heading: "Status",
    s10_num1_label: "valutor\nstödda",
    s10_num2_label: "språk\n(no/en/de/sv/fr)",
    s10_num3_label: "godkänd av\nUIC/DRTF",
    s10_b1: "I aktivt bruk – leveranser genererade och godkända av UIC/DRTF",
    s10_b2: "Validering med varningar och automatisk rensning av OSDM-strukturen",
    s10_b3: "Aktivitetslogg med alla händelser per användare",

    keyhint: "← → &nbsp;·&nbsp; Home End &nbsp;·&nbsp; F = helskärm",
  },

  fr: {
    cover_subtitle: "Génération automatisée de fichiers OSDM fareDelivery",
    cover_subnote:  "pour les opérateurs ferroviaires européens",

    s2_heading: "Qu'est-ce que l'OSDM ?",
    s2_b1: "Open Sales and Distribution Model – norme ferroviaire européenne (UIC/ERA)",
    s2_b2: "Les opérateurs livrent des fichiers <em>fareDelivery</em> à UIC/DRTF au moins une fois par an",
    s2_b3: "Le fichier définit les prix, itinéraires, catégories de passagers et périodes de validité",
    s2_b4: "Un fichier approuvé est la base du partage de billets entre opérateurs dans CIT/DRTF",

    s3_heading: "Le défi",
    s3_b1: "Le point de départ était les fichiers Legacy 108 – un format texte positionnel où un caractère mal placé pouvait invalider l'ensemble des données",
    s3_b2: "La conversion en JSON OSDM impliquait de nombreuses étapes – validation des prix, ajustements et corrections répétées dans un flux de travail exigeant",
    s3_b3: "Le fichier OSDM finalisé devait être reconverti en Legacy 108 – comme base pour l'année suivante, avec risque d'erreurs à chaque étape",
    s3_b4: "Les erreurs n'étaient souvent découvertes que tardivement – et les corriger nécessitait fréquemment une assistance externe",
    s3_b5: "Processus chronophage avec peu de marge d'erreur – particulièrement exigeant à l'approche des délais de soumission à l'UIC",

    s4_heading: "Ajustement de prix – le flux",
    s4_step1: "Télécharger\nle fichier OSDM",
    s4_step2: "Saisir\nle pourcentage",
    s4_step3: "Remplir les\nchamps de livraison",
    s4_step4: "Cliquer sur\nAjuster",
    s4_step5: "Télécharger\nle fichier final",

    s5_heading: "Quatre outils en un",
    s5_b1: "<strong>Ajustement de prix</strong> – ajuster tous les prix avec un pourcentage fixe ; le prix adulte est mis à l'échelle et toutes les catégories calculées automatiquement",
    s5_b2: "<strong>Prix depuis fichier de distances</strong> – récupère le taux de change en direct, calcule de nouveaux prix, génère une livraison complète",
    s5_b3: "<strong>OSDM → Excel</strong> – convertit la livraison en Excel pour contrôle et archivage",
    s5_b4: "<strong>Ajouter une réduction à l'OSDM</strong> – ajoute des prix réduits pour l'itinéraire et l'opérateur sélectionnés",

    s6_heading: "Ajustement de prix",
    s6_b1: "Télécharger un fichier OSDM fareDelivery existant",
    s6_b2: "Saisir la variation de prix souhaitée en pourcentage (ex. +4 %)",
    s6_b3: "Remplir DeliveryId, période de validité et environnement",
    s6_b4: "Le prix adulte est mis à l'échelle par le facteur et arrondi au 0,20 EUR supérieur",
    s6_b5: "Toutes les autres catégories (enfants, senior, FIP, animal…) sont calculées à partir du prix adulte",
    s6_b6: "Télécharger le fichier OSDM mis à jour, prêt pour la livraison",

    s7_heading: "Prix depuis fichier de distances",
    s7_left_label: "Étapes",
    s7_left_b1: "Télécharger le fichier de distances (TEN-CSV) avec prix par itinéraire",
    s7_left_b2: "Télécharger le modèle OSDM existant pour validation",
    s7_left_b3: "Sélectionner la devise et récupérer le taux de change en direct depuis la BCE",
    s7_left_b4: "Remplir DeliveryId, période de validité et environnement",
    s7_left_b5: "Prix arrondis au 0,20 EUR supérieur",
    s7_left_b6: "Télécharger le fichier OSDM final et/ou l'aperçu Excel",
    s7_right_label: "Exemple – fichier de distances (de;à;prix;)",

    s8_heading: "Ajouter une réduction à l'OSDM",
    s8_b1: "Télécharger un fichier OSDM fareDelivery existant",
    s8_b2: "Sélectionner la contrainte d'itinéraire (tous itinéraires, ou paires de gares spécifiques)",
    s8_b3: "Sélectionner l'opérateur et le code RICS optionnel",
    s8_b4: "Saisir le nom et le pourcentage de réduction (1–99 %)",
    s8_b5: "Sélectionner les catégories de passagers et la classe de service",
    s8_b6: "Générer le fichier avec les nouveaux prix réduits ajoutés",

    s8b_heading: "Nettoyer OSDM",
    s8b_b1: "Téléverser un fichier OSDM fareDelivery pour un nettoyage automatique",
    s8b_b2: "Les prix, contraintes passagers et contraintes régionales inutilisés sont supprimés",
    s8b_b3: "Les références de gare invalides sont corrigées automatiquement",
    s8b_b4: "Les statistiques sur les éléments supprimés sont affichées après le téléchargement",

    s8c_heading: "Éditeur OSDM",
    s8c_b1: "Téléverser un fichier OSDM fareDelivery pour modification",
    s8c_b2: "Modifier les profils passagers – changer le ratio et recalculer tous les prix",
    s8c_b3: "Ajouter de nouvelles relations de trajet avec codes UIC, prix adulte et distance",
    s8c_b4: "Télécharger le fichier modifié prêt à l'emploi",

    s9_heading: "Technique",
    s9_left_label: "Backend",
    s9_left_b2: "SQLite (utilisateurs + journal)",
    s9_left_b3: "Exécuté sur Railway (cloud)",
    s9_right_label: "Frontend",
    s9_right_b2: "Sans framework",
    s9_right_b3: "Multilingue (no / en / de / sv / fr)",
    s9_right_b4: "Design responsive",

    s10_heading: "Statut",
    s10_num1_label: "devises\nsupportées",
    s10_num2_label: "langues\n(no/en/de/sv/fr)",
    s10_num3_label: "approuvé par\nUIC/DRTF",
    s10_b1: "En cours d'utilisation – livraisons générées et approuvées par UIC/DRTF",
    s10_b2: "Validation avec avertissements et nettoyage automatique de la structure OSDM",
    s10_b3: "Journal d'activité avec tous les événements par utilisateur",

    keyhint: "← → &nbsp;·&nbsp; Home End &nbsp;·&nbsp; F = plein écran",
  },
};

// ── Språkvalg ─────────────────────────────────────────────────────────────────

let lang = localStorage.getItem("poptoosdm_lang") || "no";
if (!T[lang]) lang = "no";

function L(key) { return (T[lang] || T.no)[key] ?? key; }

function setLang(newLang) {
  lang = newLang;
  localStorage.setItem("poptoosdm_lang", lang);
  document.querySelectorAll(".pres-lang-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.lang === lang);
  });
  const hint = document.getElementById("keyHint");
  if (hint) hint.innerHTML = L("keyhint");
  renderSlide(current);
}

// ── Lysbilder ─────────────────────────────────────────────────────────────────

function getSlides() {
  return [
    // 1. Cover
    {
      type: "cover",
      title: "OSDMTools",
      subtitle: L("cover_subtitle"),
      subnote: L("cover_subnote"),
    },
    // 2. Hva er OSDM?
    {
      type: "bullets",
      heading: L("s2_heading"),
      bullets: [L("s2_b1"), L("s2_b2"), L("s2_b3"), L("s2_b4")],
    },
    // 3. Utfordringen
    {
      type: "bullets",
      heading: L("s3_heading"),
      bullets: [L("s3_b1"), L("s3_b2"), L("s3_b3"), L("s3_b4"), L("s3_b5")],
    },
    // 4. Flyten
    {
      type: "flow",
      heading: L("s4_heading"),
      steps: [
        { num: "1", label: L("s4_step1") },
        { num: "2", label: L("s4_step2") },
        { num: "3", label: L("s4_step3") },
        { num: "4", label: L("s4_step4") },
        { num: "5", label: L("s4_step5") },
      ],
    },
    // 5. Fire verktøy i ett
    {
      type: "bullets",
      heading: L("s5_heading"),
      bullets: [L("s5_b1"), L("s5_b2"), L("s5_b3"), L("s5_b4")],
    },
    // 6. Prisregulering
    {
      type: "bullets",
      heading: L("s6_heading"),
      bullets: [L("s6_b1"), L("s6_b2"), L("s6_b3"), L("s6_b4"), L("s6_b5"), L("s6_b6")],
    },
    // 7. Priser fra avstandsfil
    {
      type: "twocol",
      heading: L("s7_heading"),
      left: {
        label: L("s7_left_label"),
        bullets: [L("s7_left_b1"), L("s7_left_b2"), L("s7_left_b3"), L("s7_left_b4"), L("s7_left_b5"), L("s7_left_b6")],
      },
      right: {
        label: L("s7_right_label"),
        code: "1;2;50;\n2;3;60;\n3;4;70;\n4;5;80;",
      },
    },
    // 8. Legg til rabatt
    {
      type: "bullets",
      heading: L("s8_heading"),
      bullets: [L("s8_b1"), L("s8_b2"), L("s8_b3"), L("s8_b4"), L("s8_b5"), L("s8_b6")],
    },
    // 8b. Rydd opp i OSDM
    {
      type: "bullets",
      heading: L("s8b_heading"),
      bullets: [L("s8b_b1"), L("s8b_b2"), L("s8b_b3"), L("s8b_b4")],
    },
    // 8c. OSDM-editor
    {
      type: "bullets",
      heading: L("s8c_heading"),
      bullets: [L("s8c_b1"), L("s8c_b2"), L("s8c_b3"), L("s8c_b4")],
    },
    // 9. Teknisk
    {
      type: "twocol",
      heading: L("s9_heading"),
      left: {
        label: L("s9_left_label"),
        bullets: ["Python / FastAPI", L("s9_left_b2"), L("s9_left_b3"), "Auto-deploy fra GitHub"],
      },
      right: {
        label: L("s9_right_label"),
        bullets: ["Vanilla JS / HTML / CSS", L("s9_right_b2"), L("s9_right_b3"), L("s9_right_b4")],
      },
    },
    // 10. Status
    {
      type: "stats",
      heading: L("s10_heading"),
      stats: [
        { num: "14", label: L("s10_num1_label") },
        { num: "5",  label: L("s10_num2_label") },
        { num: "✓",  label: L("s10_num3_label") },
      ],
      bullets: [L("s10_b1"), L("s10_b2"), L("s10_b3")],
    },
  ];
}

// ── Renderer ──────────────────────────────────────────────────────────────────

let current = 0;
let direction = 1;

function renderSlide(idx) {
  const SLIDES = getSlides();
  const s = SLIDES[idx];
  const el = document.getElementById("slide");
  const label = `OSDMTools  ·  ${idx} / ${SLIDES.length - 1}`;

  el.className = direction >= 0 ? "anim-forward" : "anim-backward";
  void el.offsetWidth;
  el.className = direction >= 0 ? "anim-forward" : "anim-backward";

  if (s.type === "cover") {
    el.innerHTML = `
      <div class="slide-cover">
        <div class="logo">${SVG_LOGO}</div>
        <h1>${s.title}</h1>
        <div class="subtitle">${s.subtitle}</div>
        ${s.subnote ? `<div class="subnote">${s.subnote}</div>` : ""}
      </div>`;
  }
  else if (s.type === "bullets") {
    el.innerHTML = `
      <div class="slide-label">${label}</div>
      <h2 class="slide-heading">${s.heading}</h2>
      <div class="slide-rule"></div>
      <ul class="bullet-list">${s.bullets.map(b => `<li><span>${b}</span></li>`).join("")}</ul>`;
  }
  else if (s.type === "flow") {
    const steps = s.steps.map((step, i) => {
      const arrow = i < s.steps.length - 1 ? `<div class="flow-arrow">→</div>` : "";
      return `<div class="flow-box"><span class="step-num">${step.num}</span>${step.label.replace(/\n/g, "<br>")}</div>${arrow}`;
    }).join("");
    el.innerHTML = `
      <div class="slide-label">${label}</div>
      <h2 class="slide-heading">${s.heading}</h2>
      <div class="slide-rule"></div>
      <div class="flow-row">${steps}</div>`;
  }
  else if (s.type === "twocol") {
    const col = (c) => {
      const body = c.code != null
        ? `<pre class="code-block">${c.code}</pre>`
        : `<ul class="bullet-list">${c.bullets.map(b => `<li><span>${b}</span></li>`).join("")}</ul>`;
      return `<div><div class="slide-label" style="margin-bottom:0.75rem;">${c.label}</div>${body}</div>`;
    };
    el.innerHTML = `
      <div class="slide-label">${label}</div>
      <h2 class="slide-heading">${s.heading}</h2>
      <div class="slide-rule"></div>
      <div class="two-col">${col(s.left)}${col(s.right)}</div>`;
  }
  else if (s.type === "stats") {
    const statBoxes = s.stats.map(st =>
      `<div class="stat-box">
        <span class="stat-num">${st.num}</span>
        <span class="stat-label">${st.label.replace(/\n/g, "<br>")}</span>
      </div>`
    ).join("");
    el.innerHTML = `
      <div class="slide-label">${label}</div>
      <h2 class="slide-heading">${s.heading}</h2>
      <div class="slide-rule"></div>
      <div class="stat-row">${statBoxes}</div>
      <ul class="bullet-list" style="margin-top:2rem;">
        ${s.bullets.map(b => `<li><span>${b}</span></li>`).join("")}
      </ul>`;
  }

  document.getElementById("counter").textContent = `${idx + 1} / ${SLIDES.length}`;
  document.getElementById("progressBar").style.width = `${((idx + 1) / SLIDES.length) * 100}%`;
  document.getElementById("btnPrev").disabled = idx === 0;
  document.getElementById("btnNext").disabled = idx === SLIDES.length - 1;
}

function goTo(idx) {
  const SLIDES = getSlides();
  if (idx < 0 || idx >= SLIDES.length) return;
  direction = idx >= current ? 1 : -1;
  current = idx;
  renderSlide(current);
}

function nextSlide() { goTo(current + 1); }
function prevSlide() { goTo(current - 1); }

// ── Keyboard ──────────────────────────────────────────────────────────────────

document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
    e.preventDefault(); nextSlide();
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
    e.preventDefault(); prevSlide();
  } else if (e.key === "Home") {
    e.preventDefault(); goTo(0);
  } else if (e.key === "End") {
    e.preventDefault(); goTo(getSlides().length - 1);
  } else if (e.key === "f" || e.key === "F") {
    toggleFullscreen();
  }
});

// ── Fullscreen ────────────────────────────────────────────────────────────────

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.getElementById("keyHint").innerHTML = L("keyhint");
document.querySelectorAll(".pres-lang-btn").forEach(b => {
  b.classList.toggle("active", b.dataset.lang === lang);
});
renderSlide(0);
