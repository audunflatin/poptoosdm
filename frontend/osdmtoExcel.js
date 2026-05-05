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

  if (!fileInput.files.length) {
    convertBtn.disabled = true;
    fileInfo.style.display = "none";
    return;
  }

  const file = fileInput.files[0];
  const sizeMb = (file.size / 1024 / 1024).toFixed(1);
  fileInfo.innerText = `📄 ${file.name} (${sizeMb} MB)`;
  fileInfo.style.display = "block";
  convertBtn.disabled = false;
});

async function convert() {
  csvBlob = null;
  downloadBtn.style.display = "none";
  resultBox.style.display = "none";
  resultStatus.innerHTML = "";

  spinner.style.display = "block";
  convertBtn.disabled = true;

  const fd = new FormData();
  fd.append("osdmFile", fileInput.files[0]);

  try {
    const r = await fetch("/frontend/osdm-to-csv", { method: "POST", body: fd });

    spinner.style.display = "none";
    resultBox.style.display = "block";

    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: "Ukjent feil" }));
      resultStatus.className = "status-error";
      resultStatus.innerHTML =
        `<pre style="margin:0; background:transparent; border:none; padding:0.5rem 0;">` +
        `❌ Konvertering feilet\n${err.detail || "Ukjent feil"}</pre>`;
      convertBtn.disabled = false;
      return;
    }

    // Hent CSV som blob
    csvBlob = await r.blob();

    // Hent filnavn fra Content-Disposition
    const cd = r.headers.get("Content-Disposition") || "";
    const match = cd.match(/filename=(.+)/);
    if (match) csvFilename = match[1].trim();

    resultStatus.className = "status-ok";
    resultStatus.innerHTML =
      `<pre style="margin:0; background:transparent; border:none; padding:0.5rem 0.75rem;">` +
      `✅ Konvertering vellykket\nFil: ${csvFilename}</pre>`;

    downloadBtn.style.display = "block";

  } catch (err) {
    spinner.style.display = "none";
    resultBox.style.display = "block";
    resultStatus.className = "status-error";
    resultStatus.innerHTML =
      `<pre style="margin:0; background:transparent; border:none; padding:0.5rem 0;">` +
      `❌ Nettverksfeil: ${err.message}</pre>`;
    convertBtn.disabled = false;
  }

  convertBtn.disabled = false;
}

function download() {
  if (!csvBlob) return;
  const url = URL.createObjectURL(csvBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = csvFilename;
  a.click();
  URL.revokeObjectURL(url);
}
