// admin-log.js – Aktivitetslogg

const LOG_PAGE_SIZE = 50;
let logPage  = 1;
let logTotal = 0;

const EVENT_LABELS = {
  login_success:        "Innlogging",
  login_failed:         "Mislykket innlogging",
  logout:               "Utlogging",
  password_changed:     "Passord endret",
  osdm_generated:       "OSDM generert",
  discount_applied:     "Rabatt lagt til",
  excel_exported:       "Excel-eksport",
  contact_sent:         "Kontaktmelding",
  admin_user_created:   "Bruker opprettet",
  admin_user_deleted:   "Bruker slettet",
  admin_password_reset: "Passord nullstilt (admin)",
  admin_set_admin:      "Admin-status endret",
};

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleString("no-NO", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatDetail(event_type, detail) {
  if (!detail || Object.keys(detail).length === 0) return "";
  switch (event_type) {
    case "login_success":
    case "login_failed":
      return detail.ip ? `IP: ${detail.ip}` : "";
    case "osdm_generated":
      return [
        detail.deliveryId && `Delivery: ${detail.deliveryId}`,
        detail.environment && `Miljø: ${detail.environment}`,
        detail.validFrom   && `${detail.validFrom} → ${detail.validTo}`,
        detail.priceCount  != null && `${detail.priceCount} priser`,
      ].filter(Boolean).join(" · ");
    case "discount_applied":
      return [
        detail.deliveryId  && `Delivery: ${detail.deliveryId}`,
        (detail.fromUic && detail.toUic) && `UIC ${detail.fromUic} → ${detail.toUic}`,
        detail.discountPct != null && `${detail.discountPct}%`,
        detail.carrierCodes?.length && `Transportør: ${detail.carrierCodes.join(", ")}`,
        detail.fareCount   != null && `${detail.fareCount} farer`,
      ].filter(Boolean).join(" · ");
    case "excel_exported":
      return [
        detail.filename && detail.filename,
        detail.rows != null && `${detail.rows} rader`,
      ].filter(Boolean).join(" · ");
    case "contact_sent":
      return detail.name ? `Fra: ${detail.name}` : "";
    case "admin_user_created":
      return [
        detail.email,
        detail.is_admin && "Admin",
      ].filter(Boolean).join(" · ");
    case "admin_user_deleted":
    case "admin_password_reset":
      return detail.email || "";
    case "admin_set_admin":
      return detail.email
        ? `${detail.email} → ${detail.is_admin ? "admin" : "ikke admin"}`
        : "";
    case "password_changed":
      return detail.via === "reset_link" ? "Via tilbakestillingslenke" : "";
    default:
      return JSON.stringify(detail);
  }
}

async function loadLog() {
  const tbody    = document.getElementById("logTableBody");
  tbody.innerHTML = `<tr><td colspan="5" style="padding:8px; color:#888;">Laster…</td></tr>`;

  const search    = document.getElementById("logSearch").value.trim();
  const dateFrom  = document.getElementById("logDateFrom").value;
  const dateTo    = document.getElementById("logDateTo").value;
  const eventType = document.getElementById("logEventType").value;
  const status    = document.getElementById("logStatus").value;

  const params = new URLSearchParams({ page: logPage, page_size: LOG_PAGE_SIZE });
  if (search)    params.set("search",     search);
  if (dateFrom)  params.set("date_from",  dateFrom);
  if (dateTo)    params.set("date_to",    dateTo);
  if (eventType) params.set("event_type", eventType);
  if (status)    params.set("status",     status);

  const r = await fetch(`/admin/event-log?${params}`);
  if (!r.ok) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#ff5959;">Kunne ikke hente logg.</td></tr>`;
    return;
  }

  const data = await r.json();
  logTotal = data.total;
  const totalPages = Math.max(1, Math.ceil(logTotal / LOG_PAGE_SIZE));

  if (!data.entries.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:8px; color:rgba(255,255,255,0.5);">Ingen treff.</td></tr>`;
  } else {
    tbody.innerHTML = data.entries.map((e, i) => {
      const isError = e.status === "error";
      const rowBg = isError
        ? (i % 2 === 0 ? "rgba(255,89,89,0.13)" : "rgba(255,89,89,0.07)")
        : (i % 2 === 0 ? "rgba(255,255,255,0.05)" : "transparent");
      const badge = isError
        ? `<span class="badge-error">FEIL</span>`
        : `<span class="badge-ok">OK</span>`;
      const label  = EVENT_LABELS[e.event_type] || e.event_type;
      const detail = formatDetail(e.event_type, e.detail);
      return `<tr style="background:${rowBg}">
        <td style="padding:6px 8px; color:rgba(255,255,255,0.85); white-space:nowrap;">${formatDate(e.logged_at)}</td>
        <td style="padding:6px 8px; color:white;">${e.user_email}</td>
        <td style="padding:6px 8px; color:white;">${label}</td>
        <td style="padding:6px 8px; text-align:center;">${badge}</td>
        <td style="padding:6px 8px;" class="detail-text">${detail}</td>
      </tr>`;
    }).join("");
  }

  const paginationEl = document.getElementById("logPagination");
  const pageInfoEl   = document.getElementById("logPageInfo");
  const prevBtn      = document.getElementById("logPrev");
  const nextBtn      = document.getElementById("logNext");
  document.getElementById("logTotal").innerText = `Totalt: ${logTotal} hendelser`;

  if (totalPages > 1) {
    paginationEl.style.display = "flex";
    pageInfoEl.innerText = `Side ${logPage} av ${totalPages}`;
    prevBtn.disabled = logPage <= 1;
    nextBtn.disabled = logPage >= totalPages;
  } else {
    paginationEl.style.display = "none";
  }
}

function onSearch() {
  logPage = 1;
  loadLog();
}

function changePage(delta) {
  const totalPages = Math.max(1, Math.ceil(logTotal / LOG_PAGE_SIZE));
  logPage = Math.max(1, Math.min(totalPages, logPage + delta));
  loadLog();
}

function resetFilter() {
  document.getElementById("logSearch").value    = "";
  document.getElementById("logDateFrom").value  = "";
  document.getElementById("logDateTo").value    = "";
  document.getElementById("logEventType").value = "";
  document.getElementById("logStatus").value    = "";
  logPage = 1;
  loadLog();
}

loadLog();
