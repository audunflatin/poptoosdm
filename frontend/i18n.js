// =============================================================================
// i18n.js — Oversettelser for PopToOSDM
//
// Legg til nye nøkler i ALLE tre språk (no, en, de) under riktig seksjon.
// Bruk t('nokkel') i JavaScript. Bruk data-i18n="nokkel" i HTML.
// =============================================================================

const translations = {

  // ---------------------------------------------------------------------------
  // NORSK
  // ---------------------------------------------------------------------------
  no: {
    // Felles
    logout:              "Logg ut",
    nav_osdm_excel:      "OSDM → Excel",
    link_back:           "← PopToOSDM",
    yes:                 "Ja",
    no_text:             "Nei",
    unknown_error:       "Ukjent feil",

    // Login-side
    login_title:         "Logg inn",
    label_email:         "E‑post",
    label_password:      "Passord",
    btn_login:           "Logg inn",

    // Advarsel – kun for Norge
    norway_warning_title: "Kun for Norge",
    norway_warning_text:  "Dette verktøyet er utelukkende beregnet for norske jernbaneoperatører og håndterer kun norske priser og data.",

    // Seksjon 1 – Input
    section_input:       "1. Input",
    label_ten_csv:       "TEN‑CSV",

    // Seksjon 2 – Generer OSDM
    section_generate:    "2. Generer OSDM",
    label_delivery_id:   "DeliveryId",
    label_environment:   "Miljø",
    opt_production:      "Produksjon",
    opt_test:            "Test",
    label_optional_delivery: "Optional delivery",
    opt_no:              "Nei",
    opt_yes:             "Ja",
    label_exchange_rate: "Valutakurs NOK → EUR",
    label_valid_from:    "Gyldig fra",
    label_valid_to:      "Gyldig til",
    btn_generate:        "Generer OSDM JSON",
    btn_download:        "Last ned OSDM JSON",

    // Seksjon 3 – Admin
    section_admin:       "3. Admin",
    heading_users:       "Brukere",
    col_email:           "E-post",
    col_admin:           "Admin",
    col_active:          "Aktiv",
    col_actions:         "Handlinger",
    loading_users:       "Laster brukere…",
    heading_add_user:    "Legg til bruker",
    placeholder_email:   "E‑post",
    btn_add_user:        "Legg til bruker",

    // OSDM til Excel-side
    heading_osdm_excel:  "OSDM til Excel",
    section_upload:      "Last opp OSDM-fil",
    upload_description:  "Last opp en generert OSDM fareDelivery JSON-fil. Filen konverteres til en Excel-fil med alle stasjonsrelasjoner og priser per billettkategori.",
    label_osdm_file:     "OSDM JSON-fil",
    btn_convert:         "Konverter til Excel",
    btn_download_excel:  "Last ned Excel",

    // Valideringsfeil – app.js
    err_delivery_id:     "❌ DeliveryId må fylles ut før generering.",
    err_exchange_rate:   "❌ Valutakurs må være større enn 0.",
    err_valid_dates:     "❌ Gyldig fra og til må settes.",
    err_date_order:      "❌ Gyldig fra kan ikke være etter gyldig til.",
    err_no_ten:          "❌ Ingen TEN‑CSV valgt",
    ten_validated:       "TEN‑tabell validert\nStatus: OK",
    err_ten_failed:      "❌ TEN‑validering feilet",

    // Resultat – app.js
    osdm_generated:      "OSDM generert",
    label_file:          "Fil",
    label_env:           "Miljø",
    label_optional_del:  "Optional delivery",
    label_valid_period:  "Gyldig periode",
    label_summer_time:   "Sommertid",
    label_price_count:   "Antall priser",
    err_osdm_failed:     "❌ OSDM kunne ikke genereres",

    // Eksempelpriser – app.js
    example_prices:      "Eksempelpriser",
    col_route:           "Strekning",
    col_price_eur:       "Pris EUR",
    col_price_nok:       "Pris NOK",
    col_km:              "Km",

    // Brukeradmin – app.js
    err_load_users:      "Kunne ikke hente brukere.",
    no_users:            "Ingen brukere funnet.",
    btn_new_password:    "🔑 Nytt passord",
    btn_delete:          "🗑 Slett",
    confirm_delete:      "Sikker på at du vil slette",
    password_reset_ok:   "✅ Nytt passord for",
    user_deleted:        "er slettet.",
    user_created:        "✅ Bruker opprettet",
    email_label:         "E-post",
    password_label:      "Passord",

    // osdmtoExcel.js
    file_too_large:      "⚠️ Filen er {size} MB — maks er {max} MB på denne tjenesten. Last ned og kjør konverteringen lokalt for store filer.",
    err_network:         "❌ Nettverksfeil",
    convert_success:     "✅ Konvertering vellykket",
    label_rows:          "Antall relasjoner",
    err_convert_failed:  "❌ Konvertering feilet",
  },

  // ---------------------------------------------------------------------------
  // ENGELSK
  // ---------------------------------------------------------------------------
  en: {
    // Felles
    logout:              "Log out",
    nav_osdm_excel:      "OSDM → Excel",
    link_back:           "← PopToOSDM",
    yes:                 "Yes",
    no_text:             "No",
    unknown_error:       "Unknown error",

    // Login-side
    login_title:         "Log in",
    label_email:         "Email",
    label_password:      "Password",
    btn_login:           "Log in",

    // Warning – Norway only
    norway_warning_title: "Norway only",
    norway_warning_text:  "This tool is exclusively intended for Norwegian railway operators and handles Norwegian prices and data only.",

    // Seksjon 1 – Input
    section_input:       "1. Input",
    label_ten_csv:       "TEN‑CSV",

    // Seksjon 2 – Generate OSDM
    section_generate:    "2. Generate OSDM",
    label_delivery_id:   "DeliveryId",
    label_environment:   "Environment",
    opt_production:      "Production",
    opt_test:            "Test",
    label_optional_delivery: "Optional delivery",
    opt_no:              "No",
    opt_yes:             "Yes",
    label_exchange_rate: "Exchange rate NOK → EUR",
    label_valid_from:    "Valid from",
    label_valid_to:      "Valid to",
    btn_generate:        "Generate OSDM JSON",
    btn_download:        "Download OSDM JSON",

    // Seksjon 3 – Admin
    section_admin:       "3. Admin",
    heading_users:       "Users",
    col_email:           "Email",
    col_admin:           "Admin",
    col_active:          "Active",
    col_actions:         "Actions",
    loading_users:       "Loading users…",
    heading_add_user:    "Add user",
    placeholder_email:   "Email",
    btn_add_user:        "Add user",

    // OSDM to Excel-side
    heading_osdm_excel:  "OSDM to Excel",
    section_upload:      "Upload OSDM file",
    upload_description:  "Upload a generated OSDM fareDelivery JSON file. The file is converted to an Excel file with all station relations and prices per ticket category.",
    label_osdm_file:     "OSDM JSON file",
    btn_convert:         "Convert to Excel",
    btn_download_excel:  "Download Excel",

    // Validation errors – app.js
    err_delivery_id:     "❌ DeliveryId must be filled in before generating.",
    err_exchange_rate:   "❌ Exchange rate must be greater than 0.",
    err_valid_dates:     "❌ Valid from and to must be set.",
    err_date_order:      "❌ Valid from cannot be after valid to.",
    err_no_ten:          "❌ No TEN‑CSV selected",
    ten_validated:       "TEN table validated\nStatus: OK",
    err_ten_failed:      "❌ TEN validation failed",

    // Result – app.js
    osdm_generated:      "OSDM generated",
    label_file:          "File",
    label_env:           "Environment",
    label_optional_del:  "Optional delivery",
    label_valid_period:  "Valid period",
    label_summer_time:   "Summer time",
    label_price_count:   "Number of prices",
    err_osdm_failed:     "❌ OSDM could not be generated",

    // Example prices – app.js
    example_prices:      "Example prices",
    col_route:           "Route",
    col_price_eur:       "Price EUR",
    col_price_nok:       "Price NOK",
    col_km:              "Km",

    // User admin – app.js
    err_load_users:      "Could not load users.",
    no_users:            "No users found.",
    btn_new_password:    "🔑 New password",
    btn_delete:          "🗑 Delete",
    confirm_delete:      "Are you sure you want to delete",
    password_reset_ok:   "✅ New password for",
    user_deleted:        "has been deleted.",
    user_created:        "✅ User created",
    email_label:         "Email",
    password_label:      "Password",

    // osdmtoExcel.js
    file_too_large:      "⚠️ The file is {size} MB — max is {max} MB on this service. Download and run the conversion locally for large files.",
    err_network:         "❌ Network error",
    convert_success:     "✅ Conversion successful",
    label_rows:          "Number of relations",
    err_convert_failed:  "❌ Conversion failed",
  },

  // ---------------------------------------------------------------------------
  // TYSK
  // ---------------------------------------------------------------------------
  de: {
    // Felles
    logout:              "Abmelden",
    nav_osdm_excel:      "OSDM → Excel",
    link_back:           "← PopToOSDM",
    yes:                 "Ja",
    no_text:             "Nein",
    unknown_error:       "Unbekannter Fehler",

    // Login-side
    login_title:         "Anmelden",
    label_email:         "E-Mail",
    label_password:      "Passwort",
    btn_login:           "Anmelden",

    // Warnung – nur für Norwegen
    norway_warning_title: "Nur für Norwegen",
    norway_warning_text:  "Dieses Tool ist ausschließlich für norwegische Eisenbahnbetreiber gedacht und verarbeitet ausschließlich norwegische Preise und Daten.",

    // Seksjon 1 – Eingabe
    section_input:       "1. Eingabe",
    label_ten_csv:       "TEN‑CSV",

    // Seksjon 2 – OSDM generieren
    section_generate:    "2. OSDM generieren",
    label_delivery_id:   "DeliveryId",
    label_environment:   "Umgebung",
    opt_production:      "Produktion",
    opt_test:            "Test",
    label_optional_delivery: "Optionale Lieferung",
    opt_no:              "Nein",
    opt_yes:             "Ja",
    label_exchange_rate: "Wechselkurs NOK → EUR",
    label_valid_from:    "Gültig von",
    label_valid_to:      "Gültig bis",
    btn_generate:        "OSDM JSON generieren",
    btn_download:        "OSDM JSON herunterladen",

    // Seksjon 3 – Admin
    section_admin:       "3. Admin",
    heading_users:       "Benutzer",
    col_email:           "E-Mail",
    col_admin:           "Admin",
    col_active:          "Aktiv",
    col_actions:         "Aktionen",
    loading_users:       "Benutzer laden…",
    heading_add_user:    "Benutzer hinzufügen",
    placeholder_email:   "E-Mail",
    btn_add_user:        "Benutzer hinzufügen",

    // OSDM zu Excel-side
    heading_osdm_excel:  "OSDM zu Excel",
    section_upload:      "OSDM-Datei hochladen",
    upload_description:  "Laden Sie eine generierte OSDM fareDelivery JSON-Datei hoch. Die Datei wird in eine Excel-Datei mit allen Stationsbeziehungen und Preisen pro Ticketkategorie konvertiert.",
    label_osdm_file:     "OSDM JSON-Datei",
    btn_convert:         "In Excel konvertieren",
    btn_download_excel:  "Excel herunterladen",

    // Valideringsfeil – app.js
    err_delivery_id:     "❌ DeliveryId muss vor der Generierung ausgefüllt werden.",
    err_exchange_rate:   "❌ Wechselkurs muss größer als 0 sein.",
    err_valid_dates:     "❌ Gültig von und bis müssen gesetzt werden.",
    err_date_order:      "❌ Gültig von darf nicht nach gültig bis sein.",
    err_no_ten:          "❌ Keine TEN‑CSV ausgewählt",
    ten_validated:       "TEN-Tabelle validiert\nStatus: OK",
    err_ten_failed:      "❌ TEN-Validierung fehlgeschlagen",

    // Resultat – app.js
    osdm_generated:      "OSDM generiert",
    label_file:          "Datei",
    label_env:           "Umgebung",
    label_optional_del:  "Optionale Lieferung",
    label_valid_period:  "Gültigkeitszeitraum",
    label_summer_time:   "Sommerzeit",
    label_price_count:   "Anzahl Preise",
    err_osdm_failed:     "❌ OSDM konnte nicht generiert werden",

    // Eksempelpriser – app.js
    example_prices:      "Beispielpreise",
    col_route:           "Strecke",
    col_price_eur:       "Preis EUR",
    col_price_nok:       "Preis NOK",
    col_km:              "Km",

    // Brukeradmin – app.js
    err_load_users:      "Benutzer konnten nicht geladen werden.",
    no_users:            "Keine Benutzer gefunden.",
    btn_new_password:    "🔑 Neues Passwort",
    btn_delete:          "🗑 Löschen",
    confirm_delete:      "Sind Sie sicher, dass Sie löschen möchten",
    password_reset_ok:   "✅ Neues Passwort für",
    user_deleted:        "wurde gelöscht.",
    user_created:        "✅ Benutzer erstellt",
    email_label:         "E-Mail",
    password_label:      "Passwort",

    // osdmtoExcel.js
    file_too_large:      "⚠️ Die Datei ist {size} MB — Maximum ist {max} MB auf diesem Dienst. Laden Sie sie herunter und führen Sie die Konvertierung lokal für große Dateien durch.",
    err_network:         "❌ Netzwerkfehler",
    convert_success:     "✅ Konvertierung erfolgreich",
    label_rows:          "Anzahl Relationen",
    err_convert_failed:  "❌ Konvertierung fehlgeschlagen",
  },
};

// =============================================================================
// Kjerne-logikk – ikke rediger under her med mindre du vet hva du gjør
// =============================================================================

let currentLang = "no";

function detectLanguage() {
  const saved = localStorage.getItem("poptoosdm_lang");
  if (saved && translations[saved]) return saved;
  const langs = navigator.languages || [navigator.language || "no"];
  for (const l of langs) {
    const code = l.split("-")[0].toLowerCase();
    if (translations[code]) return code;
  }
  return "no";
}

function t(key) {
  return (translations[currentLang] && translations[currentLang][key])
    || (translations["no"] && translations["no"][key])
    || key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });
  document.documentElement.lang = currentLang;
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("lang-active", btn.dataset.lang === currentLang);
  });
}

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem("poptoosdm_lang", lang);
  applyTranslations();
  // Last brukerliste på nytt om admin er innlogget (for å oppdatere knapper)
  if (typeof loadUserList === "function" && window.IS_ADMIN) {
    loadUserList();
  }
}

// Init – kjører straks scriptet lastes (DOM er klar siden script er nederst i body)
currentLang = detectLanguage();
applyTranslations();
