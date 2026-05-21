// =============================================================================
// i18n.js — Oversettelser for OSDMTools
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
    nav_generate:        "Oppdater OSDM-priser",
    nav_osdm_excel:      "OSDM → Excel",
    nav_admin:           "Admin",
    heading_admin:       "Admin",
    link_back:           "← OSDMTools",
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
    section_generate:    "Oppdater OSDM-priser",
    generate_desc:       "Last opp avstandsfilen (TEN-CSV-format) og den eksisterende OSDM-filen. Prisene beregnes på nytt fra avstandsfilen og valutakursen, og du får en oppdatert OSDM-leveranse tilbake.",
    label_ten_csv:       "Avstandsfil",
    label_osdm_val_file: "OSDM-fil (validering)",
    osdm_validated:      "OSDM validert",
    osdm_no_warnings:    "Ingen forslag — strukturen ser OK ut",
    osdm_warnings_title: "Forslag til forbedringer",
    osdm_warnings_note:  "Dette er forslag, ikke feil. Filen godtas sannsynligvis som den er.",
    label_distance_check:"Avstandsdekning",
    distance_ok:         "Alle OSDM-avstandsverdier dekkes av tabellen ({rows} intervaller, {rc} RC-er)",
    distance_stats:      "{covered} av {total} RC-er dekket",
    btn_fetch_rate:      "Hent live",
    rate_fetching:       "Henter kurs…",
    rate_fetched:        "Live: 1 EUR = {rate} {currency} (per {date})",
    rate_eur_no_conversion: "1 EUR = 1 EUR (ingen konvertering)",
    rate_fetch_failed:   "Kunne ikke hente kurs automatisk",
    label_provider:      "Leverandør",
    label_fare_count_short:  "Farer",
    label_price_count_short: "Priser",
    label_station_count:     "Stasjoner",
    label_delivery_id:   "DeliveryId",
    label_previous_delivery_id: "Previous DeliveryId",
    placeholder_previous_delivery_id: "Autofylles fra opplastet OSDM-fil (valgfri)",
    label_environment:   "Miljø",
    opt_production:      "Produksjon",
    opt_test:            "Test",
    label_optional_delivery: "Optional delivery",
    opt_no:              "Nei",
    opt_yes:             "Ja",
    label_distance_currency: "Valuta i avstandsfilen",
    opt_eur:             "Euro (EUR)",
    opt_nok:             "Norske kroner (NOK)",
    opt_sek:             "Svenske kroner (SEK)",
    opt_dkk:             "Danske kroner (DKK)",
    opt_chf:             "Sveitserfranc (CHF)",
    opt_gbp:             "Britiske pund (GBP)",
    opt_bgn:             "Bulgarske lev (BGN)",
    opt_czk:             "Tsjekkiske koruna (CZK)",
    opt_huf:             "Ungarske forint (HUF)",
    opt_isk:             "Islandske kroner (ISK)",
    opt_pln:             "Polske zloty (PLN)",
    opt_ron:             "Rumenske leu (RON)",
    opt_try:             "Tyrkiske lira (TRY)",
    label_exchange_rate: "Valutakurs NOK → EUR",
    label_exchange_rate_eur: "Ingen konvertering (avstandsfilen er i EUR)",
    label_exchange_rate_nok: "Valutakurs NOK → EUR",
    label_exchange_rate_sek: "Valutakurs SEK → EUR",
    label_exchange_rate_dkk: "Valutakurs DKK → EUR",
    label_exchange_rate_chf: "Valutakurs CHF → EUR",
    label_exchange_rate_gbp: "Valutakurs GBP → EUR",
    label_exchange_rate_bgn: "Valutakurs BGN → EUR",
    label_exchange_rate_czk: "Valutakurs CZK → EUR",
    label_exchange_rate_huf: "Valutakurs HUF → EUR",
    label_exchange_rate_isk: "Valutakurs ISK → EUR",
    label_exchange_rate_pln: "Valutakurs PLN → EUR",
    label_exchange_rate_ron: "Valutakurs RON → EUR",
    label_exchange_rate_try: "Valutakurs TRY → EUR",
    btn_fix_osdm:        "Fiks OSDM-filen automatisk",
    fix_osdm_success:    "Filen er fikset og lastet ned",
    fix_osdm_nothing:    "Ingen endringer nødvendig — filen var allerede OK",
    fix_stat_bad_rcs:    "RC-er med ugyldig stasjonskryss fjernet",
    fix_stat_bad_fares:  "farer med manglende referanser fjernet",
    fix_stat_unused_prices: "ubrukte priser fjernet",
    fix_stat_unused_pcs: "ubrukte passasjerkategorier fjernet",
    fix_stat_unused_rcs: "ubrukte RC-er fjernet",
    label_valid_from:    "Gyldig fra",
    label_valid_to:      "Gyldig til",
    btn_generate:        "Oppdater priser",
    btn_download:        "Last ned oppdatert OSDM JSON",

    // Seksjon 3 – Admin
    section_admin:       "3. Admin",
    heading_users:       "Brukere",
    col_email:           "E-post",
    col_admin:           "Admin",
    col_active:          "Aktiv",
    col_logged_in:       "Innlogget",
    col_awaiting:        "Avventer",
    col_actions:         "Handlinger",
    loading_users:       "Laster brukere…",
    search_users:        "Søk e-post…",
    no_search_results:   "Ingen treff.",
    page_label:          "Side",
    of_label:            "av",
    heading_add_user:    "Legg til bruker",
    placeholder_email:   "E‑post",
    btn_add_user:        "Legg til bruker",
    email_sent_ok:       "invitasjon sendt på e-post",
    email_sent_fail:     "e-post kunne ikke sendes – sjekk serverlogg",

    // Glemt / tilbakestill passord
    forgot_pw_title:     "Glemt passord",
    forgot_pw_desc:      "Skriv inn e-postadressen din, så sender vi en lenke for å tilbakestille passordet.",
    forgot_pw_btn:       "Send tilbakestillingslenke",
    forgot_pw_sent:      "Hvis e-postadressen finnes, har du fått en e-post med en lenke. Sjekk innboksen din.",
    forgot_pw_back:      "← Tilbake til innlogging",
    forgot_pw_link:      "Glemt passord?",
    reset_pw_title:      "Velg nytt passord",

    // Bytt passord
    change_pw_title:     "Velg nytt passord",
    change_pw_notice:    "Du må velge et nytt passord før du kan fortsette.",
    change_pw_label:     "Nytt passord",
    change_pw_confirm:   "Bekreft passord",
    change_pw_btn:       "Lagre passord",
    change_pw_mismatch:  "Passordene er ikke like.",

    // OSDM til Excel-side
    heading_osdm_excel:  "OSDM til Excel",
    section_upload:      "Last opp OSDM-fil",
    upload_description:  "Last opp en OSDM fareDelivery JSON-fil for å konvertere den til Excel. Tjenesten håndterer filer opp til 100 MB. Har du en større fil? Bruk kontaktskjemaet i venstremenyen, så tar jeg meg av konverteringen for deg!",
    contact_heading:     "Kontakt",
    contact_name:        "Navn",
    contact_email:       "E-post",
    contact_message:     "Melding",
    contact_placeholder: "Beskriv gjerne hva du trenger hjelp med...",
    contact_btn:         "Send melding",
    contact_sent:        "Takk! Jeg tar kontakt med deg så snart som mulig.",
    contact_error:       "Noe gikk galt - prøv igjen eller send e-post direkte.",
    label_osdm_file:     "OSDM JSON-fil",
    btn_convert:         "Konverter til Excel",
    btn_download_excel:  "Last ned Excel",

    // Valideringsfeil – app.js
    err_delivery_id:     "❌ DeliveryId må fylles ut før generering.",
    err_exchange_rate:   "❌ Valutakurs må være større enn 0.",
    err_valid_dates:     "❌ Gyldig fra og til må settes.",
    err_date_order:      "❌ Gyldig fra kan ikke være etter gyldig til.",
    err_no_ten:          "❌ Ingen avstandsfil valgt",
    ten_validated:       "Avstandsfil validert\nStatus: OK",
    err_ten_failed:      "❌ Validering av avstandsfil feilet",

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
    btn_new_password:    "Nytt passord",
    btn_delete:          "Slett",
    btn_make_admin:      "Gjør til admin",
    btn_remove_admin:    "Fjern admin",
    confirm_delete:      "Sikker på at du vil slette",
    password_reset_ok:   "Nytt passord for",
    user_deleted:        "er slettet.",
    user_created:        "Bruker opprettet",
    admin_granted:       "er nå admin.",
    admin_removed:       "er ikke lenger admin.",
    email_label:         "E-post",
    password_label:      "Passord",

    // Innloggingslogg – admin.js
    btn_show_log:        "Vis innloggingslogg",
    btn_hide_log:        "Skjul innloggingslogg",
    heading_login_log:   "Innloggingslogg",
    log_search_ph:       "Søk e-post…",
    log_date_from:       "Fra dato",
    log_date_to:         "Til dato",
    log_reset_filter:    "Nullstill filter",
    loading_log:         "Laster logg…",
    no_log_results:      "Ingen innlogginger funnet.",
    col_time:            "Tidspunkt",
    col_ip:              "IP-adresse",
    log_total:           "Totalt:",

    // osdmtoExcel.js
    file_too_large:      "⚠️ Filen er {size} MB — maks er {max} MB på denne tjenesten. Last ned og kjør konverteringen lokalt for store filer.",
    err_network:         "❌ Nettverksfeil",
    convert_success:     "Konvertering vellykket",
    label_rows:          "Antall relasjoner",
    err_convert_failed:  "❌ Konvertering feilet",

    nav_contact:              "Kontakt",
    nav_change_password:      "Endre passord",
    change_pw_success:        "Passordet er oppdatert.",
    nav_admin_users:          "Brukere",
    nav_admin_log:            "Logg",

    // fare-discount.html
    nav_fare_discount:        "Legg til rabatt",
    heading_fare_discount:    "Legg til rabatt",
    fare_discount_desc:       "Last opp en OSDM fareDelivery JSON-fil for å legge til en ny rabattert fare. Tjenesten håndterer filer opp til 100 MB.",
    label_osdm_file_discount: "OSDM JSON-fil",
  },

  // ---------------------------------------------------------------------------
  // ENGELSK
  // ---------------------------------------------------------------------------
  en: {
    // Felles
    logout:              "Log out",
    nav_generate:        "Update OSDM prices",
    nav_osdm_excel:      "OSDM → Excel",
    nav_admin:           "Admin",
    heading_admin:       "Admin",
    link_back:           "← OSDMTools",
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
    section_generate:    "Update OSDM prices",
    generate_desc:       "Upload the distance file (TEN-CSV format) and the existing OSDM file. Prices are recalculated from the distance file and exchange rate, and you get an updated OSDM delivery back.",
    label_ten_csv:       "Distance file",
    label_osdm_val_file: "OSDM file (validation)",
    osdm_validated:      "OSDM validated",
    osdm_no_warnings:    "No suggestions — structure looks OK",
    osdm_warnings_title: "Suggestions",
    osdm_warnings_note:  "These are suggestions, not errors. The file will most likely be accepted as-is.",
    label_distance_check:"Distance coverage",
    distance_ok:         "All OSDM distances are covered by the table ({rows} intervals, {rc} RCs)",
    distance_stats:      "{covered} of {total} RCs covered",
    btn_fetch_rate:      "Get live",
    rate_fetching:       "Fetching rate…",
    rate_fetched:        "Live: 1 EUR = {rate} {currency} (as of {date})",
    rate_eur_no_conversion: "1 EUR = 1 EUR (no conversion)",
    rate_fetch_failed:   "Could not fetch rate automatically",
    label_provider:      "Provider",
    label_fare_count_short:  "Fares",
    label_price_count_short: "Prices",
    label_station_count:     "Stations",
    label_delivery_id:   "DeliveryId",
    label_previous_delivery_id: "Previous DeliveryId",
    placeholder_previous_delivery_id: "Auto-filled from uploaded OSDM file (optional)",
    label_environment:   "Environment",
    opt_production:      "Production",
    opt_test:            "Test",
    label_optional_delivery: "Optional delivery",
    opt_no:              "No",
    opt_yes:             "Yes",
    label_distance_currency: "Distance file currency",
    opt_eur:             "Euro (EUR)",
    opt_nok:             "Norwegian krone (NOK)",
    opt_sek:             "Swedish krona (SEK)",
    opt_dkk:             "Danish krone (DKK)",
    opt_chf:             "Swiss franc (CHF)",
    opt_gbp:             "British pound (GBP)",
    opt_bgn:             "Bulgarian lev (BGN)",
    opt_czk:             "Czech koruna (CZK)",
    opt_huf:             "Hungarian forint (HUF)",
    opt_isk:             "Icelandic króna (ISK)",
    opt_pln:             "Polish zloty (PLN)",
    opt_ron:             "Romanian leu (RON)",
    opt_try:             "Turkish lira (TRY)",
    label_exchange_rate: "Exchange rate NOK → EUR",
    label_exchange_rate_eur: "No conversion (distance file is in EUR)",
    label_exchange_rate_nok: "Exchange rate NOK → EUR",
    label_exchange_rate_sek: "Exchange rate SEK → EUR",
    label_exchange_rate_dkk: "Exchange rate DKK → EUR",
    label_exchange_rate_chf: "Exchange rate CHF → EUR",
    label_exchange_rate_gbp: "Exchange rate GBP → EUR",
    label_exchange_rate_bgn: "Exchange rate BGN → EUR",
    label_exchange_rate_czk: "Exchange rate CZK → EUR",
    label_exchange_rate_huf: "Exchange rate HUF → EUR",
    label_exchange_rate_isk: "Exchange rate ISK → EUR",
    label_exchange_rate_pln: "Exchange rate PLN → EUR",
    label_exchange_rate_ron: "Exchange rate RON → EUR",
    label_exchange_rate_try: "Exchange rate TRY → EUR",
    btn_fix_osdm:        "Fix OSDM file automatically",
    fix_osdm_success:    "File fixed and downloaded",
    fix_osdm_nothing:    "No changes needed — file was already OK",
    fix_stat_bad_rcs:    "RCs with invalid station reference removed",
    fix_stat_bad_fares:  "fares with missing references removed",
    fix_stat_unused_prices: "unused prices removed",
    fix_stat_unused_pcs: "unused passenger constraints removed",
    fix_stat_unused_rcs: "unused regional constraints removed",
    label_valid_from:    "Valid from",
    label_valid_to:      "Valid to",
    btn_generate:        "Update prices",
    btn_download:        "Download updated OSDM JSON",

    // Seksjon 3 – Admin
    section_admin:       "3. Admin",
    heading_users:       "Users",
    col_email:           "Email",
    col_admin:           "Admin",
    col_active:          "Active",
    col_logged_in:       "Logged in",
    col_awaiting:        "Pending",
    col_actions:         "Actions",
    loading_users:       "Loading users…",
    search_users:        "Search email…",
    no_search_results:   "No results.",
    page_label:          "Page",
    of_label:            "of",
    heading_add_user:    "Add user",
    placeholder_email:   "Email",
    btn_add_user:        "Add user",
    email_sent_ok:       "invitation sent by email",
    email_sent_fail:     "email could not be sent – check server log",

    // Forgot / reset password
    forgot_pw_title:     "Forgot password",
    forgot_pw_desc:      "Enter your email address and we'll send you a link to reset your password.",
    forgot_pw_btn:       "Send reset link",
    forgot_pw_sent:      "If the email address exists, you will receive an email with a link. Check your inbox.",
    forgot_pw_back:      "← Back to login",
    forgot_pw_link:      "Forgot password?",
    reset_pw_title:      "Choose new password",

    // Change password
    change_pw_title:     "Choose new password",
    change_pw_notice:    "You must choose a new password before continuing.",
    change_pw_label:     "New password",
    change_pw_confirm:   "Confirm password",
    change_pw_btn:       "Save password",
    change_pw_mismatch:  "Passwords do not match.",

    // OSDM to Excel-side
    heading_osdm_excel:  "OSDM to Excel",
    section_upload:      "Upload OSDM file",
    upload_description:  "Upload an OSDM fareDelivery JSON file to convert it to Excel. The service handles files up to 100 MB. Have a larger file? Use the contact form in the left menu, and I'll take care of the conversion for you!",
    contact_heading:     "Contact",
    contact_name:        "Name",
    contact_email:       "Email",
    contact_message:     "Message",
    contact_placeholder: "Describe what you need help with...",
    contact_btn:         "Send message",
    contact_sent:        "Thank you! I will get back to you as soon as possible.",
    contact_error:       "Something went wrong - please try again or send an email directly.",
    label_osdm_file:     "OSDM JSON file",
    btn_convert:         "Convert to Excel",
    btn_download_excel:  "Download Excel",

    // Validation errors – app.js
    err_delivery_id:     "❌ DeliveryId must be filled in before generating.",
    err_exchange_rate:   "❌ Exchange rate must be greater than 0.",
    err_valid_dates:     "❌ Valid from and to must be set.",
    err_date_order:      "❌ Valid from cannot be after valid to.",
    err_no_ten:          "❌ No distance file selected",
    ten_validated:       "Distance file validated\nStatus: OK",
    err_ten_failed:      "❌ Distance file validation failed",

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
    btn_new_password:    "New password",
    btn_delete:          "Delete",
    btn_make_admin:      "Make admin",
    btn_remove_admin:    "Remove admin",
    confirm_delete:      "Are you sure you want to delete",
    password_reset_ok:   "New password for",
    user_deleted:        "has been deleted.",
    user_created:        "User created",
    admin_granted:       "is now admin.",
    admin_removed:       "is no longer admin.",
    email_label:         "Email",
    password_label:      "Password",

    // Login log – admin.js
    btn_show_log:        "Show login log",
    btn_hide_log:        "Hide login log",
    heading_login_log:   "Login log",
    log_search_ph:       "Search email…",
    log_date_from:       "From date",
    log_date_to:         "To date",
    log_reset_filter:    "Reset filter",
    loading_log:         "Loading log…",
    no_log_results:      "No logins found.",
    col_time:            "Time",
    col_ip:              "IP address",
    log_total:           "Total:",

    // osdmtoExcel.js
    file_too_large:      "⚠️ The file is {size} MB — max is {max} MB on this service. Download and run the conversion locally for large files.",
    err_network:         "❌ Network error",
    convert_success:     "Conversion successful",
    label_rows:          "Number of relations",
    err_convert_failed:  "❌ Conversion failed",

    nav_contact:              "Contact",
    nav_change_password:      "Change password",
    change_pw_success:        "Password updated.",
    nav_admin_users:          "Users",
    nav_admin_log:            "Log",

    // fare-discount.html
    nav_fare_discount:        "Add discount",
    heading_fare_discount:    "Add discount",
    fare_discount_desc:       "Upload an OSDM fareDelivery JSON file to add a new discounted fare. The service handles files up to 100 MB.",
    label_osdm_file_discount: "OSDM JSON file",
  },

  // ---------------------------------------------------------------------------
  // TYSK
  // ---------------------------------------------------------------------------
  de: {
    // Felles
    logout:              "Abmelden",
    nav_generate:        "OSDM-Preise aktualisieren",
    nav_osdm_excel:      "OSDM → Excel",
    nav_admin:           "Admin",
    heading_admin:       "Admin",
    link_back:           "← OSDMTools",
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
    section_generate:    "OSDM-Preise aktualisieren",
    generate_desc:       "Laden Sie die Entfernungsdatei (TEN-CSV-Format) und die vorhandene OSDM-Datei hoch. Die Preise werden anhand der Entfernungsdatei und des Wechselkurses neu berechnet und Sie erhalten eine aktualisierte OSDM-Lieferung zurück.",
    label_ten_csv:       "Entfernungsdatei",
    label_osdm_val_file: "OSDM-Datei (Validierung)",
    osdm_validated:      "OSDM validiert",
    osdm_no_warnings:    "Keine Hinweise — Struktur sieht OK aus",
    osdm_warnings_title: "Verbesserungsvorschläge",
    osdm_warnings_note:  "Dies sind Hinweise, keine Fehler. Die Datei wird wahrscheinlich so akzeptiert.",
    label_distance_check:"Entfernungsabdeckung",
    distance_ok:         "Alle OSDM-Entfernungen werden von der Tabelle abgedeckt ({rows} Intervalle, {rc} RCs)",
    distance_stats:      "{covered} von {total} RCs abgedeckt",
    btn_fetch_rate:      "Live holen",
    rate_fetching:       "Kurs wird geholt…",
    rate_fetched:        "Live: 1 EUR = {rate} {currency} (Stand {date})",
    rate_eur_no_conversion: "1 EUR = 1 EUR (keine Konvertierung)",
    rate_fetch_failed:   "Kurs konnte nicht automatisch abgerufen werden",
    label_provider:      "Anbieter",
    label_fare_count_short:  "Tarife",
    label_price_count_short: "Preise",
    label_station_count:     "Stationen",
    label_delivery_id:   "DeliveryId",
    label_previous_delivery_id: "Previous DeliveryId",
    placeholder_previous_delivery_id: "Wird automatisch aus der hochgeladenen OSDM-Datei befüllt (optional)",
    label_environment:   "Umgebung",
    opt_production:      "Produktion",
    opt_test:            "Test",
    label_optional_delivery: "Optionale Lieferung",
    opt_no:              "Nein",
    opt_yes:             "Ja",
    label_distance_currency: "Währung in der Entfernungsdatei",
    opt_eur:             "Euro (EUR)",
    opt_nok:             "Norwegische Krone (NOK)",
    opt_sek:             "Schwedische Krone (SEK)",
    opt_dkk:             "Dänische Krone (DKK)",
    opt_chf:             "Schweizer Franken (CHF)",
    opt_gbp:             "Britisches Pfund (GBP)",
    opt_bgn:             "Bulgarischer Lew (BGN)",
    opt_czk:             "Tschechische Krone (CZK)",
    opt_huf:             "Ungarischer Forint (HUF)",
    opt_isk:             "Isländische Krone (ISK)",
    opt_pln:             "Polnischer Zloty (PLN)",
    opt_ron:             "Rumänischer Leu (RON)",
    opt_try:             "Türkische Lira (TRY)",
    label_exchange_rate: "Wechselkurs NOK → EUR",
    label_exchange_rate_eur: "Keine Konvertierung (Entfernungsdatei in EUR)",
    label_exchange_rate_nok: "Wechselkurs NOK → EUR",
    label_exchange_rate_sek: "Wechselkurs SEK → EUR",
    label_exchange_rate_dkk: "Wechselkurs DKK → EUR",
    label_exchange_rate_chf: "Wechselkurs CHF → EUR",
    label_exchange_rate_gbp: "Wechselkurs GBP → EUR",
    label_exchange_rate_bgn: "Wechselkurs BGN → EUR",
    label_exchange_rate_czk: "Wechselkurs CZK → EUR",
    label_exchange_rate_huf: "Wechselkurs HUF → EUR",
    label_exchange_rate_isk: "Wechselkurs ISK → EUR",
    label_exchange_rate_pln: "Wechselkurs PLN → EUR",
    label_exchange_rate_ron: "Wechselkurs RON → EUR",
    label_exchange_rate_try: "Wechselkurs TRY → EUR",
    btn_fix_osdm:        "OSDM-Datei automatisch korrigieren",
    fix_osdm_success:    "Datei korrigiert und heruntergeladen",
    fix_osdm_nothing:    "Keine Änderungen nötig — Datei war bereits OK",
    fix_stat_bad_rcs:    "RCs mit ungültiger Stationsreferenz entfernt",
    fix_stat_bad_fares:  "Tarife mit fehlenden Referenzen entfernt",
    fix_stat_unused_prices: "unbenutzte Preise entfernt",
    fix_stat_unused_pcs: "unbenutzte Fahrgastgruppen entfernt",
    fix_stat_unused_rcs: "unbenutzte RCs entfernt",
    label_valid_from:    "Gültig von",
    label_valid_to:      "Gültig bis",
    btn_generate:        "Preise aktualisieren",
    btn_download:        "Aktualisierte OSDM JSON herunterladen",

    // Seksjon 3 – Admin
    section_admin:       "3. Admin",
    heading_users:       "Benutzer",
    col_email:           "E-Mail",
    col_admin:           "Admin",
    col_active:          "Aktiv",
    col_logged_in:       "Eingeloggt",
    col_awaiting:        "Ausstehend",
    col_actions:         "Aktionen",
    loading_users:       "Benutzer laden…",
    search_users:        "E-Mail suchen…",
    no_search_results:   "Keine Treffer.",
    page_label:          "Seite",
    of_label:            "von",
    heading_add_user:    "Benutzer hinzufügen",
    placeholder_email:   "E-Mail",
    btn_add_user:        "Benutzer hinzufügen",
    email_sent_ok:       "Einladung per E-Mail gesendet",
    email_sent_fail:     "E-Mail konnte nicht gesendet werden – Serverprotokoll prüfen",

    // Passwort vergessen / zurücksetzen
    forgot_pw_title:     "Passwort vergessen",
    forgot_pw_desc:      "Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen.",
    forgot_pw_btn:       "Link senden",
    forgot_pw_sent:      "Falls die E-Mail-Adresse existiert, erhalten Sie eine E-Mail mit einem Link.",
    forgot_pw_back:      "← Zurück zur Anmeldung",
    forgot_pw_link:      "Passwort vergessen?",
    reset_pw_title:      "Neues Passwort wählen",

    // Passwort ändern
    change_pw_title:     "Neues Passwort wählen",
    change_pw_notice:    "Sie müssen ein neues Passwort wählen, bevor Sie fortfahren können.",
    change_pw_label:     "Neues Passwort",
    change_pw_confirm:   "Passwort bestätigen",
    change_pw_btn:       "Passwort speichern",
    change_pw_mismatch:  "Die Passwörter stimmen nicht überein.",

    // OSDM zu Excel-side
    heading_osdm_excel:  "OSDM zu Excel",
    section_upload:      "OSDM-Datei hochladen",
    upload_description:  "Laden Sie eine OSDM fareDelivery JSON-Datei hoch, um sie in Excel zu konvertieren. Der Dienst verarbeitet Dateien bis zu 100 MB. Haben Sie eine größere Datei? Nutzen Sie das Kontaktformular im linken Menü, und ich kümmere mich um die Konvertierung!",
    contact_heading:     "Kontakt",
    contact_name:        "Name",
    contact_email:       "E-Mail",
    contact_message:     "Nachricht",
    contact_placeholder: "Beschreiben Sie, womit Sie Hilfe benötigen...",
    contact_btn:         "Nachricht senden",
    contact_sent:        "Danke! Ich melde mich so bald wie möglich.",
    contact_error:       "Etwas ist schiefgelaufen - bitte versuchen Sie es erneut.",
    label_osdm_file:     "OSDM JSON-Datei",
    btn_convert:         "In Excel konvertieren",
    btn_download_excel:  "Excel herunterladen",

    // Valideringsfeil – app.js
    err_delivery_id:     "❌ DeliveryId muss vor der Generierung ausgefüllt werden.",
    err_exchange_rate:   "❌ Wechselkurs muss größer als 0 sein.",
    err_valid_dates:     "❌ Gültig von und bis müssen gesetzt werden.",
    err_date_order:      "❌ Gültig von darf nicht nach gültig bis sein.",
    err_no_ten:          "❌ Keine Entfernungsdatei ausgewählt",
    ten_validated:       "Entfernungsdatei validiert\nStatus: OK",
    err_ten_failed:      "❌ Validierung der Entfernungsdatei fehlgeschlagen",

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
    btn_new_password:    "Neues Passwort",
    btn_delete:          "Löschen",
    btn_make_admin:      "Zum Admin machen",
    btn_remove_admin:    "Admin entfernen",
    confirm_delete:      "Sind Sie sicher, dass Sie löschen möchten",
    password_reset_ok:   "Neues Passwort für",
    user_deleted:        "wurde gelöscht.",
    user_created:        "Benutzer erstellt",
    admin_granted:       "ist jetzt Admin.",
    admin_removed:       "ist kein Admin mehr.",
    email_label:         "E-Mail",
    password_label:      "Passwort",

    // Anmeldungsprotokoll – admin.js
    btn_show_log:        "Anmeldungsprotokoll anzeigen",
    btn_hide_log:        "Anmeldungsprotokoll verbergen",
    heading_login_log:   "Anmeldungsprotokoll",
    log_search_ph:       "E-Mail suchen…",
    log_date_from:       "Von Datum",
    log_date_to:         "Bis Datum",
    log_reset_filter:    "Filter zurücksetzen",
    loading_log:         "Protokoll laden…",
    no_log_results:      "Keine Anmeldungen gefunden.",
    col_time:            "Zeitpunkt",
    col_ip:              "IP-Adresse",
    log_total:           "Gesamt:",

    // osdmtoExcel.js
    file_too_large:      "⚠️ Die Datei ist {size} MB — Maximum ist {max} MB auf diesem Dienst. Laden Sie sie herunter und führen Sie die Konvertierung lokal für große Dateien durch.",
    err_network:         "❌ Netzwerkfehler",
    convert_success:     "Konvertierung erfolgreich",
    label_rows:          "Anzahl Relationen",
    err_convert_failed:  "❌ Konvertierung fehlgeschlagen",

    nav_contact:              "Kontakt",
    nav_change_password:      "Passwort ändern",
    change_pw_success:        "Passwort wurde aktualisiert.",
    nav_admin_users:          "Benutzer",
    nav_admin_log:            "Protokoll",

    // fare-discount.html
    nav_fare_discount:        "Rabatt hinzufügen",
    heading_fare_discount:    "Rabatt hinzufügen",
    fare_discount_desc:       "Laden Sie eine OSDM fareDelivery JSON-Datei hoch, um einen neuen rabattierten Tarif hinzuzufügen. Der Dienst verarbeitet Dateien bis zu 100 MB.",
    label_osdm_file_discount: "OSDM JSON-Datei",
  },

  // ---------------------------------------------------------------------------
  // SVENSK
  // ---------------------------------------------------------------------------
  sv: {
    // Felles
    logout:              "Logga ut",
    nav_generate:        "Uppdatera OSDM-priser",
    nav_osdm_excel:      "OSDM → Excel",
    nav_admin:           "Admin",
    heading_admin:       "Admin",
    link_back:           "← OSDMTools",
    yes:                 "Ja",
    no_text:             "Nej",
    unknown_error:       "Okänt fel",

    // Login-side
    login_title:         "Logga in",
    label_email:         "E-post",
    label_password:      "Lösenord",
    btn_login:           "Logga in",

    // Advarsel – kun for Norge
    norway_warning_title: "Endast för Norge",
    norway_warning_text:  "Det här verktyget är uteslutande avsett för norska järnvägsoperatörer och hanterar endast norska priser och data.",

    // Seksjon 1 – Indata
    section_generate:    "Uppdatera OSDM-priser",
    generate_desc:       "Ladda upp avståndsfilen (TEN-CSV-format) och den befintliga OSDM-filen. Priserna beräknas om utifrån avståndsfilen och växelkursen, och du får en uppdaterad OSDM-leverans tillbaka.",
    label_ten_csv:       "Avståndsfil",
    label_osdm_val_file: "OSDM-fil (validering)",
    osdm_validated:      "OSDM validerad",
    osdm_no_warnings:    "Inga förslag — strukturen ser OK ut",
    osdm_warnings_title: "Förbättringsförslag",
    osdm_warnings_note:  "Det här är förslag, inte fel. Filen godkänns troligtvis som den är.",
    label_distance_check:"Avståndstäckning",
    distance_ok:         "Alla OSDM-avstånd täcks av tabellen ({rows} intervall, {rc} RC:er)",
    distance_stats:      "{covered} av {total} RC:er täckta",
    btn_fetch_rate:      "Hämta live",
    rate_fetching:       "Hämtar kurs…",
    rate_fetched:        "Live: 1 EUR = {rate} {currency} (per {date})",
    rate_eur_no_conversion: "1 EUR = 1 EUR (ingen konvertering)",
    rate_fetch_failed:   "Kunde inte hämta kurs automatiskt",
    label_provider:      "Leverantör",
    label_fare_count_short:  "Tariffer",
    label_price_count_short: "Priser",
    label_station_count:     "Stationer",
    label_delivery_id:   "DeliveryId",
    label_previous_delivery_id: "Previous DeliveryId",
    placeholder_previous_delivery_id: "Fylls i automatiskt från uppladdad OSDM-fil (valfri)",
    label_environment:   "Miljö",
    opt_production:      "Produktion",
    opt_test:            "Test",
    label_optional_delivery: "Valfri leverans",
    opt_no:              "Nej",
    opt_yes:             "Ja",
    label_distance_currency: "Valuta i avståndsfilen",
    opt_eur:             "Euro (EUR)",
    opt_nok:             "Norska kronor (NOK)",
    opt_sek:             "Svenska kronor (SEK)",
    opt_dkk:             "Danska kronor (DKK)",
    opt_chf:             "Schweizisk franc (CHF)",
    opt_gbp:             "Brittiska pund (GBP)",
    opt_bgn:             "Bulgariska lev (BGN)",
    opt_czk:             "Tjeckiska kronor (CZK)",
    opt_huf:             "Ungerska forint (HUF)",
    opt_isk:             "Isländska kronor (ISK)",
    opt_pln:             "Polska zloty (PLN)",
    opt_ron:             "Rumänska leu (RON)",
    opt_try:             "Turkiska lira (TRY)",
    label_exchange_rate: "Växelkurs NOK → EUR",
    label_exchange_rate_eur: "Ingen konvertering (avståndsfilen är i EUR)",
    label_exchange_rate_nok: "Växelkurs NOK → EUR",
    label_exchange_rate_sek: "Växelkurs SEK → EUR",
    label_exchange_rate_dkk: "Växelkurs DKK → EUR",
    label_exchange_rate_chf: "Växelkurs CHF → EUR",
    label_exchange_rate_gbp: "Växelkurs GBP → EUR",
    label_exchange_rate_bgn: "Växelkurs BGN → EUR",
    label_exchange_rate_czk: "Växelkurs CZK → EUR",
    label_exchange_rate_huf: "Växelkurs HUF → EUR",
    label_exchange_rate_isk: "Växelkurs ISK → EUR",
    label_exchange_rate_pln: "Växelkurs PLN → EUR",
    label_exchange_rate_ron: "Växelkurs RON → EUR",
    label_exchange_rate_try: "Växelkurs TRY → EUR",
    btn_fix_osdm:        "Korrigera OSDM-filen automatiskt",
    fix_osdm_success:    "Filen är korrigerad och nedladdad",
    fix_osdm_nothing:    "Inga ändringar behövdes — filen var redan OK",
    fix_stat_bad_rcs:    "RC:er med ogiltig stationsreferens borttagna",
    fix_stat_bad_fares:  "tariffer med saknade referenser borttagna",
    fix_stat_unused_prices: "oanvända priser borttagna",
    fix_stat_unused_pcs: "oanvända passagerarkategorier borttagna",
    fix_stat_unused_rcs: "oanvända RC:er borttagna",
    label_valid_from:    "Giltig från",
    label_valid_to:      "Giltig till",
    btn_generate:        "Uppdatera priser",
    btn_download:        "Ladda ner uppdaterad OSDM JSON",

    // Seksjon 3 – Admin
    section_admin:       "3. Admin",
    heading_users:       "Användare",
    col_email:           "E-post",
    col_admin:           "Admin",
    col_active:          "Aktiv",
    col_logged_in:       "Inloggad",
    col_awaiting:        "Inväntar",
    col_actions:         "Åtgärder",
    loading_users:       "Laddar användare…",
    search_users:        "Sök e-post…",
    no_search_results:   "Inga träffar.",
    page_label:          "Sida",
    of_label:            "av",
    heading_add_user:    "Lägg till användare",
    placeholder_email:   "E-post",
    btn_add_user:        "Lägg till användare",
    email_sent_ok:       "inbjudan skickad via e-post",
    email_sent_fail:     "e-post kunde inte skickas – kontrollera serverloggen",

    // Glömt / återställ lösenord
    forgot_pw_title:     "Glömt lösenord",
    forgot_pw_desc:      "Ange din e-postadress så skickar vi en länk för att återställa lösenordet.",
    forgot_pw_btn:       "Skicka återställningslänk",
    forgot_pw_sent:      "Om e-postadressen finns har du fått ett e-postmeddelande med en länk.",
    forgot_pw_back:      "← Tillbaka till inloggning",
    forgot_pw_link:      "Glömt lösenord?",
    reset_pw_title:      "Välj nytt lösenord",

    // Bytt passord
    change_pw_title:     "Välj nytt lösenord",
    change_pw_notice:    "Du måste välja ett nytt lösenord innan du kan fortsätta.",
    change_pw_label:     "Nytt lösenord",
    change_pw_confirm:   "Bekräfta lösenord",
    change_pw_btn:       "Spara lösenord",
    change_pw_mismatch:  "Lösenorden stämmer inte överens.",

    // OSDM till Excel-side
    heading_osdm_excel:  "OSDM till Excel",
    section_upload:      "Ladda upp OSDM-fil",
    upload_description:  "Ladda upp en OSDM fareDelivery JSON-fil för att konvertera den till Excel. Tjänsten hanterar filer upp till 100 MB. Har du en större fil? Använd kontaktformuläret i vänstermenyn, så tar jag hand om konverteringen åt dig!",
    contact_heading:     "Kontakt",
    contact_name:        "Namn",
    contact_email:       "E-post",
    contact_message:     "Meddelande",
    contact_placeholder: "Beskriv gärna vad du behöver hjälp med...",
    contact_btn:         "Skicka meddelande",
    contact_sent:        "Tack! Jag återkommer till dig så snart som möjligt.",
    contact_error:       "Något gick fel - försök igen eller skicka e-post direkt.",
    label_osdm_file:     "OSDM JSON-fil",
    btn_convert:         "Konvertera till Excel",
    btn_download_excel:  "Ladda ner Excel",

    // Valideringsfeil – app.js
    err_delivery_id:     "❌ DeliveryId måste fyllas i innan generering.",
    err_exchange_rate:   "❌ Växelkurs måste vara större än 0.",
    err_valid_dates:     "❌ Giltig från och till måste anges.",
    err_date_order:      "❌ Giltig från kan inte vara efter giltig till.",
    err_no_ten:          "❌ Ingen avståndsfil vald",
    ten_validated:       "Avståndsfil validerad\nStatus: OK",
    err_ten_failed:      "❌ Validering av avståndsfil misslyckades",

    // Resultat – app.js
    osdm_generated:      "OSDM genererad",
    label_file:          "Fil",
    label_env:           "Miljö",
    label_optional_del:  "Valfri leverans",
    label_valid_period:  "Giltig period",
    label_summer_time:   "Sommartid",
    label_price_count:   "Antal priser",
    err_osdm_failed:     "❌ OSDM kunde inte genereras",

    // Eksempelpriser – app.js
    example_prices:      "Exempelpriser",
    col_route:           "Sträcka",
    col_price_eur:       "Pris EUR",
    col_price_nok:       "Pris NOK",
    col_km:              "Km",

    // Brukeradmin – app.js
    err_load_users:      "Kunde inte hämta användare.",
    no_users:            "Inga användare hittades.",
    btn_new_password:    "Nytt lösenord",
    btn_delete:          "Ta bort",
    btn_make_admin:      "Gör till admin",
    btn_remove_admin:    "Ta bort admin",
    confirm_delete:      "Är du säker på att du vill ta bort",
    password_reset_ok:   "Nytt lösenord för",
    user_deleted:        "har tagits bort.",
    user_created:        "Användare skapad",
    admin_granted:       "är nu admin.",
    admin_removed:       "är inte längre admin.",
    email_label:         "E-post",
    password_label:      "Lösenord",

    // Inloggningslogg – admin.js
    btn_show_log:        "Visa inloggningslogg",
    btn_hide_log:        "Dölj inloggningslogg",
    heading_login_log:   "Inloggningslogg",
    log_search_ph:       "Sök e-post…",
    log_date_from:       "Från datum",
    log_date_to:         "Till datum",
    log_reset_filter:    "Återställ filter",
    loading_log:         "Laddar logg…",
    no_log_results:      "Inga inloggningar hittades.",
    col_time:            "Tidpunkt",
    col_ip:              "IP-adress",
    log_total:           "Totalt:",

    // osdmtoExcel.js
    file_too_large:      "⚠️ Filen är {size} MB — max är {max} MB på den här tjänsten. Ladda ner och kör konverteringen lokalt för stora filer.",
    err_network:         "❌ Nätverksfel",
    convert_success:     "Konvertering lyckades",
    label_rows:          "Antal relationer",
    err_convert_failed:  "❌ Konvertering misslyckades",

    nav_contact:              "Kontakt",
    nav_change_password:      "Ändra lösenord",
    change_pw_success:        "Lösenordet har uppdaterats.",
    nav_admin_users:          "Användare",
    nav_admin_log:            "Logg",

    // fare-discount.html
    nav_fare_discount:        "Lägg till rabatt",
    heading_fare_discount:    "Lägg till rabatt",
    fare_discount_desc:       "Ladda upp en OSDM fareDelivery JSON-fil för att lägga till en ny rabatterad taxa. Tjänsten hanterar filer upp till 100 MB.",
    label_osdm_file_discount: "OSDM JSON-fil",
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
  if (typeof loadUserList === "function") {
    loadUserList();
  }
}

// Init – kjører straks scriptet lastes (DOM er klar siden script er nederst i body)
currentLang = detectLanguage();
applyTranslations();
