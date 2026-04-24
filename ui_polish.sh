#!/bin/bash
set -e

echo "🎨 Oppdaterer frontend med CSS, loading og sentrert layout"

mkdir -p frontend

# ---------- CSS ----------
cat > frontend/styles.css << 'CSS'
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  background: #f6f7f9;
  margin: 0;
  padding: 0;
}

.container {
  max-width: 720px;
  margin: 60px auto;
  background: #ffffff;
  padding: 32px;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
}

h1, h2 {
  text-align: center;
}

label {
  display: block;
  margin-top: 16px;
  font-weight: 600;
}

input, button {
  width: 100%;
  margin-top: 6px;
  padding: 10px;
  font-size: 1rem;
}

button {
  margin-top: 16px;
  background: #0057b8;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

button:hover {
  background: #00459a;
}

pre {
  background: #f0f1f3;
  padding: 12px;
  border-radius: 6px;
  margin-top: 12px;
  max-height: 240px;
  overflow: auto;
}

.section {
  margin-top: 32px;
}

.spinner {
  display: none;
  margin: 12px auto;
  width: 32px;
  height: 32px;
  border: 4px solid #ddd;
  border-top: 4px solid #0057b8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-ok {
  border-left: 6px solid #2ecc71;
}

.status-error {
  border-left: 6px solid #e74c3c;
}
CSS

# ---------- HTML ----------
cat > frontend/index.html << 'HTML'
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8" />
  <title>PopToOSDM</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>

<div class="container">
  <h1>PopToOSDM</h1>

  <div class="section">
    <h2>1. TEN‑tabell</h2>

    <label>TEN‑CSV</label>
    <input id="tenFile" type="file" accept=".csv" />

    <button onclick="validateTen()">Valider TEN‑tabell</button>
    <div id="spinnerTen" class="spinner"></div>
    <pre id="tenStatus"></pre>
  </div>

  <div class="section">
    <h2>2. Generer OSDM</h2>

    <label>Valutakurs NOK → EUR</label>
    <input id="exchangeRate" type="number" step="0.0001" value="0.091" />

    <label>Gyldig fra</label>
    <input id="validFrom" type="date" />

    <label>Gyldig til</label>
    <input id="validTo" type="date" />

    <button onclick="generateOsdm()">Generer OSDM JSON</button>
    <div id="spinnerOsdm" class="spinner"></div>
    <pre id="finalStatus"></pre>

    <button onclick="downloadOsdm()">Last ned OSDM JSON</button>
  </div>

  <div class="section">
    <h2>Status / Oppsummering</h2>
    <button onclick="loadSummary()">Vis oppsummering</button>
    <pre id="summaryStatus"></pre>
  </div>
</div>

<script>
function show(id) { document.getElementById(id).style.display = "block"; }
function hide(id) { document.getElementById(id).style.display = "none"; }

async function validateTen() {
  const f = document.getElementById("tenFile").files[0];
  if (!f) return alert("Velg TEN‑CSV først");

  show("spinnerTen");
  const fd = new FormData();
  fd.append("tenFile", f);

  const r = await fetch("http://127.0.0.1:8000/ui/validate-ten", {
    method: "POST",
    body: fd
  });

  hide("spinnerTen");
  document.getElementById("tenStatus").innerText =
    JSON.stringify(await r.json(), null, 2);
}

async function generateOsdm() {
  show("spinnerOsdm");
  const fd = new FormData();
  fd.append("exchangeRate", document.getElementById("exchangeRate").value);
  fd.append("validFrom", document.getElementById("validFrom").value);
  fd.append("validTo", document.getElementById("validTo").value);

  const r = await fetch("http://127.0.0.1:8000/ui/generate-osdm", {
    method: "POST",
    body: fd
  });

  hide("spinnerOsdm");
  document.getElementById("finalStatus").innerText =
    JSON.stringify(await r.json(), null, 2);
}

function downloadOsdm() {
  window.location.href = "http://127.0.0.1:8000/ui/download-osdm";
}

async function loadSummary() {
  const r = await fetch("http://127.0.0.1:8000/ui/summary");
  document.getElementById("summaryStatus").innerText =
    JSON.stringify(await r.json(), null, 2);
}
</script>

</body>
</html>
HTML

echo "✅ Frontend ferdig stylet og oppdatert"
echo "👉 Reload http://127.0.0.1:5173"
