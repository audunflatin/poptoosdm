// fareDiscount.js – Legg til rabattert fare i OSDM JSON

let osdmStations = [];            // [{cp_id, uic, name, country}]
let osdmCarriers = [];            // [{code, name, constraint_id}]
let osdmPassengers = [];          // [{nameRef, name, ids[]}]
let osdmServiceClasses = [];      // [{id, name}]

// Picker-tilstand per retning
const picker = {
  from: { selected: null, activeIdx: -1, matches: [] },
  to:   { selected: null, activeIdx: -1, matches: [] },
};

// ---------------------------------------------------------------------------
// Fil-opplasting og parsing
// ---------------------------------------------------------------------------

async function onFileChange() {
  const file = document.getElementById("discountFile").files[0];
  const fileInfo  = document.getElementById("fileInfo");
  const stepForm  = document.getElementById("stepForm");
  const result    = document.getElementById("discountResult");

  osdmStations = [];
  osdmCarriers = [];
  pickerClear("from");
  pickerClear("to");
  stepForm.style.display = "none";
  result.innerText = "";
  result.className = "";

  if (!file) { fileInfo.style.display = "none"; return; }

  const sizeMb = (file.size / 1024 / 1024).toFixed(1);
  fileInfo.innerText = `📄 ${file.name} (${sizeMb} MB)`;
  fileInfo.style.display = "block";

  result.innerText = "Leser fil…";
  result.className = "";

  const fd = new FormData();
  fd.append("osdmFile", file);

  try {
    const r = await fetch("/fare-discount/parse", { method: "POST", body: fd });
    const res = await r.json();
    if (!r.ok) {
      result.innerText = `❌ ${res.detail || "Ukjent feil"}`;
      result.className = "status-error";
      return;
    }
    osdmStations = res.stations;
    osdmCarriers = res.carriers;
    osdmPassengers = res.passengerConstraints;
    osdmServiceClasses = res.serviceClasses;

    document.getElementById("parsedInfo").innerText =
      `DeliveryId: ${res.deliveryId} · ${res.stations.length} stasjoner · ${res.carriers.length} transportører`;

    renderCarrierSelect();
    renderPassengerCheckboxes();
    renderServiceClassCheckboxes();

    result.innerText = "";
    stepForm.style.display = "block";
  } catch (err) {
    result.innerText = `❌ Nettverksfeil: ${err.message}`;
    result.className = "status-error";
  }
}

// ---------------------------------------------------------------------------
// Stasjonsvelger
// ---------------------------------------------------------------------------

function pickerFilter(dir) {
  const input = document.getElementById(dir === "from" ? "inputFrom" : "inputTo");
  const q = input.value.trim().toLowerCase();

  if (picker[dir].selected) pickerClear(dir);

  const matches = q.length === 0
    ? osdmStations.slice(0, 80)
    : osdmStations.filter(s =>
        s.name.toLowerCase().includes(q) || s.uic.includes(q)
      ).slice(0, 80);

  picker[dir].activeIdx = -1;
  pickerRenderDrop(dir, matches);
}

function pickerOpen(dir) {
  if (picker[dir].selected) return;
  pickerFilter(dir);
}

function pickerRenderDrop(dir, matches) {
  picker[dir].matches = matches;
  const drop = document.getElementById(dir === "from" ? "dropFrom" : "dropTo");
  if (matches.length === 0) { drop.style.display = "none"; return; }

  drop.innerHTML = matches.map((s, i) =>
    `<div class="picker-option" data-idx="${i}">
      ${s.name}<span class="uic">${s.uic}</span>
    </div>`
  ).join("");

  drop.querySelectorAll(".picker-option").forEach((el, i) => {
    el.addEventListener("mousedown", e => {
      e.preventDefault();
      pickerSelect(dir, picker[dir].matches[i]);
    });
    el.addEventListener("mouseover", () => pickerActivate(dir, i));
  });

  drop.style.display = "block";
}

function pickerActivate(dir, idx) {
  picker[dir].activeIdx = idx;
  const drop = document.getElementById(dir === "from" ? "dropFrom" : "dropTo");
  drop.querySelectorAll(".picker-option").forEach((el, i) =>
    el.classList.toggle("active", i === idx)
  );
}

function pickerKey(e, dir) {
  const drop = document.getElementById(dir === "from" ? "dropFrom" : "dropTo");
  const opts = drop.querySelectorAll(".picker-option");
  if (!opts.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    picker[dir].activeIdx = Math.min(picker[dir].activeIdx + 1, opts.length - 1);
    pickerActivate(dir, picker[dir].activeIdx);
    opts[picker[dir].activeIdx]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    picker[dir].activeIdx = Math.max(picker[dir].activeIdx - 1, 0);
    pickerActivate(dir, picker[dir].activeIdx);
    opts[picker[dir].activeIdx]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter" && picker[dir].activeIdx >= 0) {
    e.preventDefault();
    pickerSelect(dir, picker[dir].matches[picker[dir].activeIdx]);
  } else if (e.key === "Escape") {
    drop.style.display = "none";
  }
}

function pickerSelect(dir, station) {
  picker[dir].selected = station;
  picker[dir].activeIdx = -1;

  const isFrom = dir === "from";
  document.getElementById(isFrom ? "inputFrom" : "inputTo").value = "";
  document.getElementById(isFrom ? "inputFrom" : "inputTo").style.display = "none";
  document.getElementById(isFrom ? "dropFrom"  : "dropTo").style.display  = "none";
  document.getElementById(isFrom ? "fromCpId"  : "toCpId").value   = station.cp_id;
  document.getElementById(isFrom ? "fromUic"   : "toUic").value    = station.uic;

  const chip = document.getElementById(isFrom ? "chipFrom" : "chipTo");
  chip.innerHTML =
    `<div class="picker-chip">
      ${station.name} <span style="color:rgba(255,255,255,0.4)">${station.uic}</span>
      <button onclick="pickerClear('${dir}')" title="Fjern">✕</button>
    </div>`;
  chip.style.display = "block";
}

function pickerClear(dir) {
  picker[dir].selected = null;
  picker[dir].activeIdx = -1;
  const isFrom = dir === "from";
  const input = document.getElementById(isFrom ? "inputFrom" : "inputTo");
  input.value = "";
  input.style.display = "";
  document.getElementById(isFrom ? "dropFrom"  : "dropTo").style.display  = "none";
  document.getElementById(isFrom ? "fromCpId"  : "toCpId").value   = "";
  document.getElementById(isFrom ? "fromUic"   : "toUic").value    = "";
  const chip = document.getElementById(isFrom ? "chipFrom" : "chipTo");
  chip.innerHTML = "";
  chip.style.display = "none";
}

// Lukk dropdown ved klikk utenfor
document.addEventListener("click", e => {
  ["from", "to"].forEach(dir => {
    const wrap = document.getElementById(dir === "from" ? "wrapFrom" : "wrapTo");
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById(dir === "from" ? "dropFrom" : "dropTo").style.display = "none";
    }
  });
});

// ---------------------------------------------------------------------------
// Transportør, passasjerkategorier, serviceklasse
// ---------------------------------------------------------------------------

function renderCarrierSelect() {
  const sel = document.getElementById("carrierSelect");
  sel.innerHTML = '<option value="">— velg transportør —</option>';
  osdmCarriers.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.code;
    opt.textContent = `${c.name} (${c.code})`;
    sel.appendChild(opt);
  });
  const opt = document.createElement("option");
  opt.value = "__manual__";
  opt.textContent = "Angi RICS-kode manuelt…";
  sel.appendChild(opt);
}

function onCarrierSelectChange() {
  const sel = document.getElementById("carrierSelect");
  document.getElementById("carrierManualWrap").style.display =
    sel.value === "__manual__" ? "block" : "none";
}

function renderPassengerCheckboxes() {
  const wrap = document.getElementById("passengerCheckboxes");
  wrap.innerHTML = osdmPassengers.map(pc =>
    `<label class="checkbox-label">
      <input type="checkbox" name="passengerRef" value="${pc.nameRef}" checked>
      ${pc.name}
    </label>`
  ).join("");
}

function renderServiceClassCheckboxes() {
  const wrap = document.getElementById("serviceClassCheckboxes");
  wrap.innerHTML = osdmServiceClasses.map(sc =>
    `<label class="checkbox-label">
      <input type="checkbox" name="serviceClassId" value="${sc.id}" checked>
      ${sc.name}
    </label>`
  ).join("");
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

async function applyDiscount() {
  const result  = document.getElementById("discountResult");
  const fromCpId = document.getElementById("fromCpId").value;
  const toCpId   = document.getElementById("toCpId").value;
  const fromUic  = document.getElementById("fromUic").value;
  const toUic    = document.getElementById("toUic").value;

  if (!fromCpId || !toCpId) {
    result.innerText = "❌ Velg både fra- og til-stasjon.";
    result.className = "status-error";
    return;
  }

  const discountName = document.getElementById("discountName").value.trim();
  if (!discountName) {
    result.innerText = "❌ Skriv inn et rabattnavn.";
    result.className = "status-error";
    return;
  }

  const sel = document.getElementById("carrierSelect");
  let carrierCode = sel.value;
  if (carrierCode === "__manual__") {
    carrierCode = document.getElementById("carrierManual").value.trim();
  }
  if (!carrierCode) {
    result.innerText = "❌ Velg eller oppgi en transportør.";
    result.className = "status-error";
    return;
  }

  const discountPct = parseFloat(document.getElementById("discountPct").value);
  if (isNaN(discountPct) || discountPct <= 0 || discountPct >= 100) {
    result.innerText = "❌ Rabattprosent må være mellom 1 og 99.";
    result.className = "status-error";
    return;
  }

  const passengerRefs = [...document.querySelectorAll("input[name=passengerRef]:checked")]
    .map(el => el.value);
  const serviceClassIds = [...document.querySelectorAll("input[name=serviceClassId]:checked")]
    .map(el => el.value);

  if (!passengerRefs.length || !serviceClassIds.length) {
    result.innerText = "❌ Velg minst én passasjerkategori og én serviceklasse.";
    result.className = "status-error";
    return;
  }

  result.innerText = "Bearbeider fil…";
  result.className = "";
  document.getElementById("applyBtn").disabled = true;

  const file = document.getElementById("discountFile").files[0];
  const fd = new FormData();
  fd.append("osdmFile", file);
  fd.append("fromCpId", fromCpId);
  fd.append("toCpId", toCpId);
  fd.append("fromUic", fromUic);
  fd.append("toUic", toUic);
  fd.append("discountName", discountName);
  fd.append("carrierCode", carrierCode);
  fd.append("discountPct", discountPct);
  passengerRefs.forEach(r => fd.append("passengerRefs", r));
  serviceClassIds.forEach(s => fd.append("serviceClassIds", s));

  try {
    const r = await fetch("/fare-discount/apply", { method: "POST", body: fd });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      result.innerText = `❌ ${err.detail || "Ukjent feil"}`;
      result.className = "status-error";
      return;
    }

    const fareCount  = r.headers.get("X-Fare-Count")  || "?";
    const priceCount = r.headers.get("X-Price-Count") || "?";

    const disposition = r.headers.get("Content-Disposition") || "";
    const m = disposition.match(/filename="(.+?)"/);
    const filename = m ? m[1] : "fareDelivery_discount.json";

    const blob = await r.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    result.innerHTML =
      `✅ ${fareCount} nye farer og ${priceCount} nye priser lagt til.<br>` +
      `<span style="color:rgba(255,255,255,0.5); font-size:0.85rem;">Filen lastes ned som <em>${filename}</em></span>`;
    result.className = "status-ok";
  } catch (err) {
    result.innerText = `❌ Nettverksfeil: ${err.message}`;
    result.className = "status-error";
  } finally {
    document.getElementById("applyBtn").disabled = false;
  }
}
