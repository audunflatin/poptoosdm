let lastGeneratedFile = null;

function show(id){document.getElementById(id).style.display="block";}
function hide(id){document.getElementById(id).style.display="none";}

function validateGenerateInputs() {
  const errorEl = document.getElementById("validationError");
  errorEl.style.display = "none";
  errorEl.innerText = "";

  const datasetId = document.getElementById("datasetId").value.trim();
  const exchangeRate = parseFloat(document.getElementById("exchangeRate").value);
  const validFrom = document.getElementById("validFrom").value;
  const validTo = document.getElementById("validTo").value;

  if (!datasetId) {
    errorEl.innerText = t("err_delivery_id");
  } else if (!exchangeRate || exchangeRate <= 0) {
    errorEl.innerText = t("err_exchange_rate");
  } else if (!validFrom || !validTo) {
    errorEl.innerText = t("err_valid_dates");
  } else if (validFrom > validTo) {
    errorEl.innerText = t("err_date_order");
  }

  if (errorEl.innerText) {
    errorEl.style.display = "block";
    return false;
  }
  return true;
}

async function validateTen() {
  const statusEl = document.getElementById("tenStatus");
  const generateBtn = document.getElementById("generateBtn");

  statusEl.className = "";
  statusEl.innerText = "";
  generateBtn.disabled = true;
  hide("stepOsdm");
  hide("generateForm");

  if (!tenFile.files.length) return;

  show("spinnerTen");

  const fd = new FormData();
  fd.append("tenFile", tenFile.files[0]);

  const r = await fetch("/ui/validate-ten", { method: "POST", body: fd });
  const res = await r.json();

  hide("spinnerTen");

  if (res.ok === true) {
    statusEl.innerText = t("ten_validated");
    statusEl.classList.add("status-ok");
    // Reset OSDM step
    document.getElementById("osdmValFile").value = "";
    document.getElementById("osdmSummary").innerHTML = "";
    document.getElementById("osdmWarnings").innerHTML = "";
    document.getElementById("distanceSummary").innerHTML = "";
    show("stepOsdm");
  } else {
    statusEl.innerText = `${t("err_ten_failed")}\n${res.error || t("unknown_error")}`;
    statusEl.classList.add("status-error");
  }
}

async function validateOsdm() {
  const summaryEl   = document.getElementById("osdmSummary");
  const warningsEl  = document.getElementById("osdmWarnings");
  const distEl      = document.getElementById("distanceSummary");
  const generateBtn = document.getElementById("generateBtn");

  summaryEl.innerHTML  = "";
  warningsEl.innerHTML = "";
  distEl.innerHTML     = "";
  generateBtn.disabled = true;
  hide("generateForm");

  const fileInput = document.getElementById("osdmValFile");
  if (!fileInput.files.length) return;

  const file = fileInput.files[0];
  const maxMb = window.location.hostname === "localhost" ? 5000 : 100;
  const sizeMb = (file.size / 1024 / 1024).toFixed(1);
  if (file.size > maxMb * 1024 * 1024) {
    summaryEl.innerHTML = `<pre class="status-error">${t("file_too_large").replace("{size}", sizeMb).replace("{max}", maxMb)}</pre>`;
    return;
  }

  show("spinnerOsdmVal");

  const fd = new FormData();
  fd.append("osdmFile", fileInput.files[0]);

  const r = await fetch("/ui/validate-osdm", { method: "POST", body: fd });
  const res = await r.json();

  hide("spinnerOsdmVal");

  if (!res.ok) {
    summaryEl.innerHTML = `<pre class="status-error">${res.error || t("unknown_error")}</pre>`;
    return;
  }

  // OSDM summary
  summaryEl.innerHTML = `
    <div class="info-box">
      <div>
        <strong>${t("osdm_validated")}</strong>
        <div class="info-meta">
          ${t("label_delivery_id")}: <b>${res.deliveryId}</b> &nbsp;·&nbsp;
          ${t("label_provider")}: <b>${res.fareProvider || "—"}</b> &nbsp;·&nbsp;
          ${t("label_fare_count_short")}: <b>${res.fareCount.toLocaleString()}</b> &nbsp;·&nbsp;
          ${t("label_price_count_short")}: <b>${res.priceCount.toLocaleString()}</b> &nbsp;·&nbsp;
          ${t("label_station_count")}: <b>${res.stationCount}</b>
        </div>
      </div>
    </div>`;

  // Warnings / suggestions
  if (res.warnings && res.warnings.length > 0) {
    warningsEl.innerHTML = renderWarnings(res.warnings, t("osdm_warnings_title"), null, true);
  } else {
    warningsEl.innerHTML = `<div class="check-ok">✓ ${t("osdm_no_warnings")}</div>`;
  }

  // Distance coverage check (run automatically if TEN file is available)
  if (tenFile.files.length) {
    show("spinnerDistances");
    const fd2 = new FormData();
    fd2.append("distanceFile", tenFile.files[0]);
    fd2.append("osdmFile", fileInput.files[0]);

    try {
      const r2  = await fetch("/ui/validate-distances", { method: "POST", body: fd2 });
      const res2 = await r2.json();
      hide("spinnerDistances");

      if (res2.ok) {
        if (res2.warnings && res2.warnings.length > 0) {
          distEl.innerHTML = renderWarnings(res2.warnings, t("label_distance_check"),
            `${t("distance_stats").replace("{covered}", res2.osdmRcCount - res2.uncoveredCount).replace("{total}", res2.osdmRcCount)}`);
        } else {
          distEl.innerHTML = `<div class="check-ok">✓ ${t("distance_ok").replace("{rows}", res2.tenRows).replace("{rc}", res2.osdmRcCount)}</div>`;
        }
      } else if (res2.error) {
        distEl.innerHTML = `<div style="color:var(--text-muted);font-size:0.82rem;margin-top:0.5rem;">${t("label_distance_check")}: ${res2.error}</div>`;
      }
    } catch {
      hide("spinnerDistances");
    }
  }

  // Autofyll previousDeliveryId med deliveryId fra opplastet fil
  const prevEl = document.getElementById("previousDeliveryId");
  if (prevEl && res.deliveryId) prevEl.value = res.deliveryId;

  // Show generate form and auto-fetch exchange rate
  show("generateForm");
  generateBtn.disabled = false;
  fetchExchangeRate();
}

function renderWarnings(warnings, title, footer, showFix = false) {
  const items = warnings.map(w => `<li>${w}</li>`).join("");
  const footerHtml = footer
    ? `<div class="warnings-note">${footer}</div>`
    : `<div class="warnings-note">${t("osdm_warnings_note")}</div>`;
  const fixHtml = showFix
    ? `<div style="margin-top:0.75rem;display:flex;align-items:center;gap:0.75rem;">
        <button id="fixOsdmBtn" class="btn-sm" onclick="fixOsdmFile()">${t("btn_fix_osdm")}</button>
        <div id="spinnerFix" class="spinner" style="display:none;margin:0;"></div>
      </div>`
    : "";
  return `<div class="warnings-box">
    <div class="warnings-title">⚠ ${title} (${warnings.length})</div>
    <ul class="warnings-list">${items}</ul>
    ${footerHtml}
    ${fixHtml}
  </div>`;
}

function buildFixSuccessHtml(stats) {
  const statLabels = {
    removed_bad_rcs:       t("fix_stat_bad_rcs"),
    removed_bad_fares:     t("fix_stat_bad_fares"),
    removed_unused_prices: t("fix_stat_unused_prices"),
    removed_unused_pcs:    t("fix_stat_unused_pcs"),
    removed_unused_rcs:    t("fix_stat_unused_rcs"),
  };

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return `<div class="check-ok">✓ ${t("fix_osdm_nothing")}</div>`;
  }

  const items = Object.entries(stats)
    .filter(([, n]) => n > 0)
    .map(([key, n]) => `<li><b>${n}</b> ${statLabels[key] || key}</li>`)
    .join("");

  return `<div class="info-box">
    <div>
      <strong style="color:var(--success);">✓ ${t("fix_osdm_success")}</strong>
      <ul style="margin:0.4rem 0 0;padding-left:1.2rem;font-size:0.85rem;opacity:0.85;">${items}</ul>
    </div>
  </div>`;
}

async function fixOsdmFile() {
  const fileInput = document.getElementById("osdmValFile");
  if (!fileInput.files.length) return;

  const btn     = document.getElementById("fixOsdmBtn");
  const spinner = document.getElementById("spinnerFix");

  if (btn)     btn.disabled = true;
  if (spinner) spinner.style.display = "block";

  try {
    const fd = new FormData();
    fd.append("osdmFile", fileInput.files[0]);

    const r = await fetch("/ui/fix-osdm", { method: "POST", body: fd });
    if (!r.ok) throw new Error();

    const statsRaw = r.headers.get("X-Fix-Stats");
    const stats    = statsRaw ? JSON.parse(statsRaw) : {};

    const blob = await r.blob();
    const cd   = r.headers.get("Content-Disposition") || "";
    const m    = cd.match(/filename="?([^"]+)"?/);
    const filename = m ? m[1] : "osdm_fixed.json";

    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);

    document.getElementById("osdmWarnings").innerHTML = buildFixSuccessHtml(stats);
  } catch {
    if (spinner) spinner.style.display = "none";
    if (btn) { btn.disabled = false; }
  }
}

function updateExchangeRateLabel() {
  const sel = document.getElementById("distanceCurrency");
  if (!sel) return;
  const key = "label_exchange_rate_" + sel.value.toLowerCase();
  const lbl = document.getElementById("exchangeRateLabel");
  if (lbl) {
    lbl.setAttribute("data-i18n", key);
    lbl.textContent = t(key);
  }
}

function onCurrencyChange() {
  updateExchangeRateLabel();
  fetchExchangeRate();
}

async function fetchExchangeRate() {
  const rateInput  = document.getElementById("exchangeRate");
  const rateStatus = document.getElementById("rateStatus");
  const currency   = document.getElementById("distanceCurrency")?.value || "EUR";

  if (currency === "EUR") {
    rateInput.value = "1";
    rateStatus.innerHTML = `<span style="color:var(--success);">✓</span> ${t("rate_eur_no_conversion")}`;
    return;
  }

  rateStatus.innerHTML = `<span style="opacity:0.5;">${t("rate_fetching")}</span>`;

  try {
    const r   = await fetch(`/ui/exchange-rate?from_=EUR&to=${currency}`);
    const res = await r.json();
    if (res.ok) {
      const currPerEur = res.rate;
      const eurPerCurr = (1 / currPerEur).toFixed(6);
      rateInput.value  = eurPerCurr;
      rateStatus.innerHTML =
        `<span style="color:var(--success);">✓</span> ` +
        `${t("rate_fetched")
          .replace("{rate}", currPerEur.toFixed(4))
          .replace("{currency}", currency)
          .replace("{date}", res.date)}`;
    } else {
      rateStatus.innerHTML = `<span style="opacity:0.45;">${t("rate_fetch_failed")}</span>`;
    }
  } catch {
    rateStatus.innerHTML = `<span style="opacity:0.45;">${t("rate_fetch_failed")}</span>`;
  }
}

async function generateOsdm(){
  document.getElementById("resultBox").style.display = "none";
  if(!validateGenerateInputs()) return;

  show("spinnerGenerate");
  startProgress();

  const fd = new FormData();
  ["exchangeRate","validFrom","validTo","datasetId","environment","optionalDelivery","previousDeliveryId"]
    .forEach(id => fd.append(id, document.getElementById(id).value));

  const r   = await fetch("/ui/generate-osdm", { method: "POST", body: fd });
  const res = await r.json();
  hide("spinnerGenerate");

  if(res.ok && res.outputFile){
    lastGeneratedFile = res.outputFile;

    const optionalText =
      document.getElementById("optionalDelivery").value === "true" ? t("yes") : t("no_text");
    const sommertid = res.summary.utcOffset === 120 ? t("yes") : t("no_text");

    finalStatus.innerText =
      `${t("osdm_generated")}\n` +
      `${t("label_file")}: ${res.outputFile}\n` +
      `${t("label_env")}: ${res.summary.environment}\n` +
      `${t("label_optional_del")}: ${optionalText}\n` +
      `${t("label_valid_period")}: ${document.getElementById("validFrom").value} → ${document.getElementById("validTo").value}\n` +
      `${t("label_summer_time")}: ${sommertid}\n` +
      `${t("label_price_count")}: ${res.summary.pricesUpdated}`;

    finalStatus.className = "";
    document.getElementById("resultBox").style.display = "block";
    downloadBtn.disabled = false;
    document.getElementById("downloadExcelBtn").disabled = false;
    renderExampleTable(res.summary.exampleFares);
  } else {
    finalStatus.innerText = t("err_osdm_failed");
    document.getElementById("resultBox").style.display = "block";
  }
}

function downloadOsdm(){
  window.location.href = `/ui/download-osdm/${lastGeneratedFile}`;
}

async function downloadAsExcel() {
  const btn = document.getElementById("downloadExcelBtn");
  btn.disabled = true;
  show("spinnerExcel");

  try {
    const r   = await fetch("/ui/excel-from-generated", { method: "POST" });
    const res = await r.json();
    if (!res.jobId) throw new Error();
    await _pollExcelJob(res.jobId);
  } catch {
    hide("spinnerExcel");
    btn.disabled = false;
  }
}

async function _pollExcelJob(jobId) {
  while (true) {
    await new Promise(r => setTimeout(r, 800));
    const res = await (await fetch(`/frontend/osdm-to-csv-status/${jobId}`)).json();
    if (res.status === "done") {
      hide("spinnerExcel");
      document.getElementById("downloadExcelBtn").disabled = false;
      window.location.href = `/frontend/osdm-to-csv-download/${jobId}`;
      return;
    }
    if (res.status === "error") {
      hide("spinnerExcel");
      document.getElementById("downloadExcelBtn").disabled = false;
      return;
    }
  }
}

function startProgress(){
  const bar = progressBar;
  bar.style.display = "block";
  const t_ = setInterval(async () => {
    const p = await (await fetch("/ui/progress")).json();
    bar.value = p.percent;
    if(p.status === "done"){ clearInterval(t_); bar.style.display = "none"; }
  }, 500);
}

function renderExampleTable(data){
  const panel = document.getElementById("examplePanel");
  if(!data){
    panel.style.display = "none";
    panel.innerHTML = "";
    return;
  }

  const exchangeRate = parseFloat(document.getElementById("exchangeRate").value);

  const distCurrency = document.getElementById("distanceCurrency")?.value || "NOK";

  let html =
    "<div class='example-panel'>" +
    `<div class='example-panel-title'>${t("example_prices")}</div>` +
    "<table>" +
    "<tr>" +
    `<th align='left'>${t("col_route")}</th>` +
    `<th align='right'>${t("col_price_eur")}</th>` +
    `<th align='right'>${distCurrency}</th>` +
    `<th align='right'>${t("col_km")}</th>` +
    "</tr>";

  let row = 0;

  for (const v of Object.values(data)) {
    const [route, rest] = v.split(": ");
    const [pricePart, kmPart] = rest.split(" (");

    const eur = parseFloat(pricePart.replace(" EUR",""));
    const nok = eur / exchangeRate;
    const km  = kmPart.replace(")","");

    const rowClass = row++ % 2 === 0 ? "example-row-even" : "example-row-odd";

    html +=
      `<tr class="${rowClass}">` +
      `<td>${route}</td>` +
      `<td align="right">${eur.toFixed(2)}</td>` +
      `<td align="right">${nok.toFixed(2)}</td>` +
      `<td align="right">${km}</td>` +
      `</tr>`;
  }

  html += "</table></div>";

  panel.innerHTML = html;
  panel.style.display = "block";
}


if (window.IS_ADMIN) {
  const adminLink = document.getElementById("adminLink");
  if (adminLink) adminLink.style.display = "";
  const adminSubmenu = document.getElementById("adminSubmenu");
  if (adminSubmenu) adminSubmenu.style.display = "flex";
}

["datasetId", "exchangeRate"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => {
    const errorEl = document.getElementById("validationError");
    errorEl.style.display = "none";
    errorEl.innerText = "";
  });
});

const fpOnChange = () => {
  const errorEl = document.getElementById("validationError");
  errorEl.style.display = "none";
  errorEl.innerText = "";
};

flatpickr("#validFrom", {
  dateFormat: "Y-m-d",
  locale: "no",
  onChange: fpOnChange,
});

flatpickr("#validTo", {
  dateFormat: "Y-m-d",
  locale: "no",
  onChange: fpOnChange,
});

// Oppdater valutakurs-etikett ved språkbytte
const _prevSetLanguage = window.setLanguage;
window.setLanguage = function(lang) {
  _prevSetLanguage(lang);
  updateExchangeRateLabel();
};
