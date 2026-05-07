let csvBlob = null;
let csvFilename = "osdm_priser.csv";

const fileInput   = document.getElementById("osdmFile");
const convertBtn  = document.getElementById("convertBtn");
const spinner     = document.getElementById("spinner");
const resultBox   = document.getElementById("resultBox");
const resultStatus = document.getElementById("resultStatus");
const downloadBtn = document.getElementById("downloadBtn");
const fileInfo    = document.getElementById("fileInfo");

fileInput.addEventListener("change", () => {
  csvBlob = null;
  downloadBtn.style.display = "none";
  resultBox.style.display = "none";
  resultStatus.innerHTML = "";
  currentJobId = null;

  if (!fileInput.files.length) {
    convertBtn.disabled = true;
    fileInfo.style.display = "none";
    return;
  }

  const file = fileInput.files[0];
  const sizeMb = (file.size / 1024 / 1024).toFixed(1);
  const isLocal = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
  const maxMb = isLocal ? 5000 : 100;

  if (file.size > maxMb * 1024 * 1024) {
    fileInfo.innerText = t("file_too_large").replace("{size}", sizeMb).replace("{max}", maxMb);
    fileInfo.style.display = "block";
    fileInfo.style.color = "#c00";
    convertBtn.disabled = true;
    return;
  }

  fileInfo.innerText = `📄 ${file.name} (${sizeMb} MB)`;
  fileInfo.style.display = "block";
  fileInfo.style.color = "#555";
  convertBtn.disabled = false;
});

let currentJobId = null;

async function convert() {
  csvBlob = null;
  downloadBtn.style.display = "none";
  resultBox.style.display = "none";
  resultStatus.innerHTML = "";
  currentJobId = null;

  spinner.style.display = "block";
  convertBtn.disabled = true;
  const bar = document.getElementById("progressBar");
  if (bar) {
      bar.style.display = "block";
      bar.value = 0;
      bar.max = 100;
  }
  const fd = new FormData();
  fd.append("osdmFile", fileInput.files[0]);

  try {
    const r = await fetch("/frontend/osdm-to-csv", { method: "POST", body: fd });

    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: t("unknown_error") }));
      spinner.style.display = "none";
      resultBox.style.display = "block";
      resultStatus.className = "status-error";
      resultStatus.innerHTML =
        `<pre style="margin:0; background:transparent; border:none; padding:0.5rem 0;">` +
        `❌ ${err.detail || t("unknown_error")}</pre>`;
      convertBtn.disabled = false;
      return;
    }

    const { jobId } = await r.json();
    currentJobId = jobId;
    pollStatus(jobId);

  } catch (err) {
    spinner.style.display = "none";
    resultBox.style.display = "block";
    resultStatus.className = "status-error";
    resultStatus.innerHTML =
      `<pre style="margin:0; background:transparent; border:none; padding:0.5rem 0;">` +
      `${t("err_network")}: ${err.message}</pre>`;
    convertBtn.disabled = false;
  }
}

function pollStatus(jobId) {
  const bar = document.getElementById("progressBar");
  const pct = document.getElementById("progressPercent");
  if (bar) {
    bar.style.display = "block";
    bar.value = 0;
    bar.max = 100;
  }
  if (pct) {
    pct.style.display = "inline";
    pct.innerText = "0%";
  }

  const interval = setInterval(async () => {
    try {
      const r = await fetch(`/frontend/osdm-to-csv-status/${jobId}`);
      const res = await r.json();

      if (bar) bar.value = res.percent || 0;
      if (pct) pct.innerText = (res.percent || 0) + "%";

      if (res.status === "done") {
        clearInterval(interval);
        spinner.style.display = "none";
        if (bar) bar.style.display = "none";
        if (pct) pct.style.display = "none";
        resultBox.style.display = "block";
        resultStatus.className = "status-ok";
        resultStatus.innerHTML =
          `<pre style="margin:0; background:transparent; border:none; padding:0.5rem 0.75rem;">` +
          `${t("convert_success")}\n${t("label_file")}: ${res.filename}\n${t("label_rows")}: ${res.rows}</pre>`;
        downloadBtn.style.display = "block";
        convertBtn.disabled = false;

      } else if (res.status === "error") {
        clearInterval(interval);
        spinner.style.display = "none";
        if (bar) bar.style.display = "none";
        if (pct) pct.style.display = "none";
        resultBox.style.display = "block";
        resultStatus.className = "status-error";
        resultStatus.innerHTML =
          `<pre style="margin:0; background:transparent; border:none; padding:0.5rem 0;">` +
          `${t("err_convert_failed")}: ${res.error || t("unknown_error")}</pre>`;
        convertBtn.disabled = false;
      }

    } catch (err) {
      clearInterval(interval);
      spinner.style.display = "none";
      if (bar) bar.style.display = "none";
      convertBtn.disabled = false;
    }
  }, 300);
}

function download() {
  if (!currentJobId) return;
  window.location.href = `/frontend/osdm-to-csv-download/${currentJobId}`;
}
