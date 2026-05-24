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

function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();
    let hasRealProgress = false;

    const timer = setInterval(() => {
      if (!hasRealProgress) {
        const elapsed = (Date.now() - startTime) / 1000;
        onProgress(0.48 * (1 - Math.exp(-elapsed / 60)));
      }
    }, 500);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && e.total > 0) {
        hasRealProgress = true;
        onProgress(e.loaded / e.total);
      }
    };
    xhr.onload = () => {
      clearInterval(timer);
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(e); }
      } else { reject(new Error(xhr.statusText || `HTTP ${xhr.status}`)); }
    };
    xhr.onerror = () => { clearInterval(timer); reject(new Error("Network error")); };
    xhr.open("POST", url);
    xhr.send(formData);
  });
}

async function convert() {
  csvBlob = null;
  downloadBtn.style.display = "none";
  resultBox.style.display = "none";
  resultStatus.innerHTML = "";
  currentJobId = null;

  spinner.style.display = "block";
  convertBtn.disabled = true;
  updateExcelProgress(0);

  const fd = new FormData();
  fd.append("osdmFile", fileInput.files[0]);

  try {
    const { jobId } = await uploadWithProgress("/frontend/osdm-to-csv", fd, frac =>
      updateExcelProgress(Math.round(frac * 50))
    );
    currentJobId = jobId;
    pollStatus(jobId);

  } catch (err) {
    spinner.style.display = "none";
    hideExcelProgress();
    resultBox.style.display = "block";
    resultStatus.className = "status-error";
    resultStatus.innerHTML =
      `<pre style="margin:0; background:transparent; border:none; padding:0.5rem 0;">` +
      `${t("err_network")}: ${err.message}</pre>`;
    convertBtn.disabled = false;
  }
}

function updateExcelProgress(pct) {
  const bar = document.getElementById("progressBar");
  const pctEl = document.getElementById("progressPercent");
  if (bar) {
    bar.style.display = "block";
    const fill = bar.querySelector(".progress-fill");
    if (fill) fill.style.width = pct + "%";
  }
  if (pctEl) pctEl.textContent = pct + "%";
}

function hideExcelProgress() {
  const bar = document.getElementById("progressBar");
  if (bar) bar.style.display = "none";
}

function pollStatus(jobId) {
  const interval = setInterval(async () => {
    try {
      const r = await fetch(`/frontend/osdm-to-csv-status/${jobId}`);
      const res = await r.json();

      updateExcelProgress(50 + Math.round((res.percent || 0) / 100 * 50));

      if (res.status === "done") {
        clearInterval(interval);
        spinner.style.display = "none";
        hideExcelProgress();
        resultBox.style.display = "block";
        resultStatus.className = "status-ok";
        resultStatus.innerHTML =
          `<pre style="margin:0; background:transparent; border:none; padding:0.5rem 0.75rem;">` +
          `<span data-i18n="convert_success">${t("convert_success")}</span>\n` +
          `<span data-i18n="label_file">${t("label_file")}</span>: ${res.filename}\n` +
          `<span data-i18n="label_rows">${t("label_rows")}</span>: ${res.rows}</pre>`;
        downloadBtn.style.display = "block";
        convertBtn.disabled = false;

      } else if (res.status === "error") {
        clearInterval(interval);
        spinner.style.display = "none";
        hideExcelProgress();
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
      hideExcelProgress();
      convertBtn.disabled = false;
    }
  }, 300);
}

function download() {
  if (!currentJobId) return;
  window.location.href = `/frontend/osdm-to-csv-download/${currentJobId}`;
}
