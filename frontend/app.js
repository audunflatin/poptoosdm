let lastGeneratedFile = null;

function show(id){document.getElementById(id).style.display="block";}
function hide(id){document.getElementById(id).style.display="none";}

function validateGenerateInputs() {
  const errorEl = document.getElementById("validationError");

  // reset
  errorEl.style.display = "none";
  errorEl.innerText = "";

  const datasetId = document.getElementById("datasetId").value.trim();
  const exchangeRate = parseFloat(document.getElementById("exchangeRate").value);
  const validFrom = document.getElementById("validFrom").value;
  const validTo = document.getElementById("validTo").value;

  if (!datasetId) {
    errorEl.innerText = "❌ DeliveryId må fylles ut før generering.";
  } else if (!exchangeRate || exchangeRate <= 0) {
    errorEl.innerText = "❌ Valutakurs må være større enn 0.";
  } else if (!validFrom || !validTo) {
    errorEl.innerText = "❌ Gyldig fra og til må settes.";
  } else if (validFrom > validTo) {
    errorEl.innerText = "❌ Gyldig fra kan ikke være etter gyldig til.";
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

  // reset
  statusEl.className = "";
  generateBtn.disabled = true;

  if (!tenFile.files.length) {
    statusEl.innerText = "❌ Ingen TEN‑CSV valgt";
    statusEl.classList.add("status-error");
    return;
  }

  show("spinnerTen");

  const fd = new FormData();
  fd.append("tenFile", tenFile.files[0]);

  const r = await fetch("/ui/validate-ten", {
    method: "POST",
    body: fd
  });
  const res = await r.json();

  hide("spinnerTen");

  if (res.ok === true) {
    statusEl.innerText =
      `TEN‑tabell validert\n` +
      `Status: OK`;
    statusEl.classList.add("status-ok");
    generateBtn.disabled = false;
  } else {
    statusEl.innerText =
      `❌ TEN‑validering feilet\n` +
      `${res.error || "Ukjent feil"}`;
    statusEl.classList.add("status-error");
    generateBtn.disabled = true;
  }
}

async function generateOsdm(){
  document.getElementById("resultBox").style.display = "none";
  if(!validateGenerateInputs()) return;

  show("spinnerOsdm");
  startProgress();

  const fd=new FormData();
  ["exchangeRate","validFrom","validTo","datasetId","environment","optionalDelivery"]
    .forEach(id=>fd.append(id,document.getElementById(id).value));

  const r=await fetch("/ui/generate-osdm",{method:"POST",body:fd});
  const res=await r.json();
  hide("spinnerOsdm");

  if(res.ok && res.outputFile){
    lastGeneratedFile=res.outputFile;
    
const optionalText =
  document.getElementById("optionalDelivery").value === "true" ? "Ja" : "Nei";
  const sommertid = res.summary.utcOffset === 120 ? "Ja" : "Nei";

  finalStatus.innerText =
    `OSDM generert\n` +
    `Fil: ${res.outputFile}\n` +
    `Miljø: ${res.summary.environment}\n` +
    `Optional delivery: ${optionalText}\n` +
    `Gyldig periode: ${document.getElementById("validFrom").value} → ${document.getElementById("validTo").value}\n` +
    `Sommertid: ${sommertid}\n` +
    `Antall priser: ${res.summary.pricesUpdated}`;

    finalStatus.className = "";
    document.getElementById("resultBox").style.display = "block";
    downloadBtn.disabled = false;
    renderExampleTable(res.summary.exampleFares);

  } else {
    finalStatus.innerText="❌ OSDM kunne ikke genereres";
    document.getElementById("resultBox").style.display = "block";
  }
}

function downloadOsdm(){
  window.location.href=`/ui/download-osdm/${lastGeneratedFile}`;
}

function startProgress(){
  const bar=progressBar;
  bar.style.display="block";
  const t=setInterval(async()=>{
    const p=(await (await fetch("/ui/progress")).json());
    bar.value=p.percent;
    if(p.status==="done"){clearInterval(t);bar.style.display="none";}
  },500);
}

function renderExampleTable(data){
  const panel = document.getElementById("examplePanel");
  if(!data){
    panel.style.display = "none";
    panel.innerHTML = "";
    return;
  }

  const exchangeRate = parseFloat(document.getElementById("exchangeRate").value);

  let html =
    "<div class='example-panel'>" +
    "<div class='example-panel-title'>Eksempelpriser</div>" +
    "<table>" +
    "<tr>" +
    "<th align='left'>Strekning</th>" +
    "<th align='right'>Pris EUR</th>" +
    "<th align='right'>Pris NOK</th>" +
    "<th align='right'>Km</th>" +
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



if (!window.IS_ADMIN) {
  document.querySelectorAll(".admin-only").forEach(e => e.style.display = "none");
} else {
  loadUserList();
}

// --- Brukerliste ---

async function loadUserList() {
  const tbody = document.getElementById("userTableBody");
  const resultEl = document.getElementById("userActionResult");
  resultEl.innerText = "";

  const r = await fetch("/admin/list-users");
  if (!r.ok) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:red;">Kunne ikke hente brukere.</td></tr>`;
    return;
  }
  const users = await r.json();

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding:8px; color:#888;">Ingen brukere funnet.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map((u, i) => {
    const rowBg = i % 2 === 0 ? "#f9f9f9" : "#fff";
    return `
      <tr style="background:${rowBg}">
        <td style="padding:6px 8px;">${u.email}</td>
        <td style="text-align:center; padding:6px 8px;">${u.is_admin ? "✅" : "—"}</td>
        <td style="text-align:center; padding:6px 8px;">${u.is_active ? "✅" : "❌"}</td>
        <td style="text-align:center; padding:6px 8px;">
          <button onclick="resetPassword('${u.email}')">🔑 Nytt passord</button>
          <button onclick="deleteUser('${u.email}')" style="margin-left:6px; color:#c00;">🗑 Slett</button>
        </td>
      </tr>`;
  }).join("");
}

async function resetPassword(email) {
  const resultEl = document.getElementById("userActionResult");
  const fd = new FormData();
  fd.append("email", email);
  const r = await fetch("/admin/reset-password", { method: "POST", body: fd });
  const res = await r.json();
  if (res.ok) {
    resultEl.innerText = `✅ Nytt passord for ${res.email}:\n${res.password}`;
  } else {
    resultEl.innerText = `❌ Feil: ${res.detail || "Ukjent feil"}`;
  }
}

async function deleteUser(email) {
  if (!confirm(`Sikker på at du vil slette ${email}?`)) return;
  const resultEl = document.getElementById("userActionResult");
  const fd = new FormData();
  fd.append("email", email);
  const r = await fetch("/admin/delete-user", { method: "POST", body: fd });
  const res = await r.json();
  if (res.ok) {
    resultEl.innerText = `✅ ${res.deleted} er slettet.`;
    loadUserList();
  } else {
    resultEl.innerText = `❌ Feil: ${res.detail || "Ukjent feil"}`;
  }
}

// --- Legg til bruker ---

addUserForm.onsubmit = async e => {
  e.preventDefault();
  const fd = new FormData();
  fd.append("email", newUserEmail.value);
  const r = await fetch("/admin/add-user", { method: "POST", body: fd });
  const res = await r.json();
  if (res.ok) {
    addUserResult.innerText = `✅ Bruker opprettet\nE-post: ${res.email}\nPassord: ${res.password}`;
    newUserEmail.value = "";
    loadUserList();
  } else {
    addUserResult.innerText = `❌ Feil: ${res.detail || "Ukjent feil"}`;
  }
};

["datasetId", "exchangeRate", "validFrom", "validTo"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => {
    const errorEl = document.getElementById("validationError");
    errorEl.style.display = "none";
    errorEl.innerText = "";
  });
});