// priceAdjust.js – Prisregulering: skaler OSDM-priser med fast faktor

const osdmFileInput = document.getElementById("osdmFile");
const adjustPctInput = document.getElementById("adjustPct");
const adjustBtn      = document.getElementById("adjustBtn");
const statusMsg      = document.getElementById("statusMsg");
const factorDisplay  = document.getElementById("factorDisplay");
const factorVal      = document.getElementById("factorVal");

adjustPctInput.addEventListener("input", () => {
  const pct = parseFloat(adjustPctInput.value);
  if (!isNaN(pct) && pct !== 0) {
    const factor = (1 + pct / 100).toFixed(4).replace(/\.?0+$/, "");
    factorVal.textContent = factor;
    factorDisplay.style.display = "";
  } else {
    factorDisplay.style.display = "none";
  }
});

adjustBtn.addEventListener("click", async () => {
  hideStatus();

  if (!osdmFileInput.files[0]) {
    showStatus(t("adjust_error_no_file"), "error");
    return;
  }

  const pct = parseFloat(adjustPctInput.value);
  if (isNaN(pct)) {
    showStatus(t("adjust_error_no_pct"), "error");
    return;
  }
  if (pct === 0) {
    showStatus(t("adjust_error_pct_zero"), "error");
    return;
  }

  adjustBtn.disabled = true;
  adjustBtn.textContent = t("adjust_processing");

  try {
    const fd = new FormData();
    fd.append("osdm_file", osdmFileInput.files[0]);
    fd.append("pct", pct);

    const r = await fetch("/price-adjust", { method: "POST", body: fd });

    if (!r.ok) {
      showStatus(t("adjust_error_failed"), "error");
      return;
    }

    const blob = await r.blob();
    const disposition = r.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : "adjusted.json";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus(t("adjust_success"), "success");
  } catch {
    showStatus(t("adjust_error_failed"), "error");
  } finally {
    adjustBtn.disabled = false;
    adjustBtn.textContent = t("btn_adjust");
  }
});

function showStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.style.display = "block";
  if (type === "error") {
    statusMsg.style.background = "rgba(255,89,89,0.15)";
    statusMsg.style.borderLeft = "4px solid #ff5959";
    statusMsg.style.color = "#ff5959";
  } else {
    statusMsg.style.background = "rgba(90,195,154,0.12)";
    statusMsg.style.borderLeft = "4px solid #5ac39a";
    statusMsg.style.color = "#5ac39a";
  }
}

function hideStatus() {
  statusMsg.style.display = "none";
}
