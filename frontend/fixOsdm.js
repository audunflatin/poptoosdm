// fixOsdm.js — Rydd opp i OSDM

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
    return `<div class="check-ok">${t("fix_osdm_nothing")}</div>`;
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

async function doFix() {
  const fileInput = document.getElementById("fixOsdmFile");
  if (!fileInput.files.length) return;

  const btn     = document.getElementById("fixBtn");
  const spinner = document.getElementById("spinner");
  const result  = document.getElementById("fixResult");

  btn.disabled = true;
  spinner.style.display = "block";
  result.innerHTML = "";

  try {
    const fd = new FormData();
    fd.append("osdmFile", fileInput.files[0]);

    const r = await fetch("/ui/fix-osdm", { method: "POST", body: fd });
    if (!r.ok) throw new Error(await r.text());

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

    result.innerHTML = buildFixSuccessHtml(stats);
  } catch (err) {
    result.innerHTML = `<div class="status-error">${err.message || t("unknown_error")}</div>`;
  } finally {
    spinner.style.display = "none";
    btn.disabled = false;
  }
}

document.getElementById("fixOsdmFile").addEventListener("change", function () {
  document.getElementById("fixBtn").disabled = !this.files.length;
});
