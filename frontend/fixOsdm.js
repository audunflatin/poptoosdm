// fixOsdm.js — Rydd opp i OSDM (to-stegs flyt: analyser → bekreft → last ned)

let _fixProgressTimer = null;
let _fixPct = 0;

function _startProgress() {
  _fixPct = 0;
  document.getElementById("fixProgressFill").style.width = "0%";
  document.getElementById("fixProgressPct").textContent = "0%";
  document.getElementById("fixProgressStage").textContent = t("validate_stage_uploading");
  document.getElementById("fixProgress").style.display = "";

  _fixProgressTimer = setInterval(() => {
    _fixPct += _fixPct < 15 ? 3 : _fixPct < 50 ? 1.5 : 0.5;
    if (_fixPct >= 88) _fixPct = 88;
    document.getElementById("fixProgressFill").style.width = _fixPct + "%";
    document.getElementById("fixProgressPct").textContent = Math.round(_fixPct) + "%";
    if (_fixPct >= 50) document.getElementById("fixProgressStage").textContent = t("validate_stage_validating");
    else if (_fixPct >= 15) document.getElementById("fixProgressStage").textContent = t("validate_stage_reading");
  }, 300);
}

function _completeProgress() {
  clearInterval(_fixProgressTimer);
  document.getElementById("fixProgressFill").style.width = "100%";
  document.getElementById("fixProgressPct").textContent = "100%";
  setTimeout(() => { document.getElementById("fixProgress").style.display = "none"; }, 500);
}

const _STAT_LABELS = () => ({
  removed_bad_rcs:       t("fix_stat_bad_rcs"),
  removed_bad_fares:     t("fix_stat_bad_fares"),
  removed_unused_prices: t("fix_stat_unused_prices"),
  removed_unused_pcs:    t("fix_stat_unused_pcs"),
  removed_unused_rcs:    t("fix_stat_unused_rcs"),
});

function _buildPreviewHtml(stats) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return `<div class="check-ok">${t("fix_osdm_nothing")}</div>`;
  }

  const labels = _STAT_LABELS();
  const items = Object.entries(stats)
    .filter(([, n]) => n > 0)
    .map(([key, n]) => `<li><b>${n}</b> ${labels[key] || key}</li>`)
    .join("");

  return `
    <div class="info-box" style="margin-bottom:1rem;">
      <div>
        <strong>${t("fix_preview_heading")}</strong>
        <ul style="margin:0.4rem 0 0;padding-left:1.2rem;font-size:0.85rem;opacity:0.85;">${items}</ul>
      </div>
    </div>
    <button id="applyFixBtn" onclick="doDownload()" style="margin-top:0.25rem;">
      ${t("btn_apply_fix")}
    </button>`;
}

async function doAnalyze() {
  const fileInput = document.getElementById("fixOsdmFile");
  if (!fileInput.files.length) return;

  const btn    = document.getElementById("fixBtn");
  const result = document.getElementById("fixResult");

  btn.disabled = true;
  result.innerHTML = "";
  _startProgress();

  try {
    const fd = new FormData();
    fd.append("osdmFile", fileInput.files[0]);

    const r = await fetch("/ui/fix-osdm", { method: "POST", body: fd });
    if (!r.ok) throw new Error(await r.text());

    const data = await r.json();
    _completeProgress();
    result.innerHTML = _buildPreviewHtml(data.stats || {});
  } catch (err) {
    _completeProgress();
    result.innerHTML = `<div class="status-error">${err.message || t("unknown_error")}</div>`;
  } finally {
    btn.disabled = false;
  }
}

async function doDownload() {
  const applyBtn = document.getElementById("applyFixBtn");
  const result   = document.getElementById("fixResult");

  if (applyBtn) applyBtn.disabled = true;

  try {
    const r = await fetch("/ui/fix-osdm/download");
    if (!r.ok) throw new Error(await r.text());

    const blob = await r.blob();
    const cd   = r.headers.get("Content-Disposition") || "";
    const m    = cd.match(/filename="?([^"]+)"?/);
    const filename = m ? m[1] : "osdm_fixed.json";

    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);

    result.innerHTML = `<div class="check-ok">${t("fix_osdm_success")}</div>`;
  } catch (err) {
    result.innerHTML = `<div class="status-error">${err.message || t("unknown_error")}</div>`;
  }
}

document.getElementById("fixOsdmFile").addEventListener("change", function () {
  document.getElementById("fixBtn").disabled = !this.files.length;
  document.getElementById("fixResult").innerHTML = "";
});
