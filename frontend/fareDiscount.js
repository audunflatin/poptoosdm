// fareDiscount.js – Legg til rabattert fare i OSDM JSON

const SVG_X = `<svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="1" y1="1" x2="8" y2="8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="1" x2="1" y2="8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

let osdmStations       = [];
let osdmPassengers     = [];
let osdmServiceClasses = [];
let ricsCodes          = [];

function carrierDisplayName(c) {
  return c.country ? `${c.name} (${c.country})` : c.name;
}

async function fetchRicsCodes() {
  if (ricsCodes.length) return;
  try {
    const r = await fetch("/fare-discount/rics");
    ricsCodes = await r.json();
  } catch (_) {}
}
fetchRicsCodes();

// ---------------------------------------------------------------------------
// Stasjonspar – støtter mange par
// ---------------------------------------------------------------------------

let stationPairs = [];   // [{from: null|stationObj, to: null|stationObj}]
const pairPS = {};       // "from_0", "to_0", … → {matches:[], activeIdx:-1}

function ps(dir, idx) {
  const k = `${dir}_${idx}`;
  if (!pairPS[k]) pairPS[k] = { matches: [], activeIdx: -1 };
  return pairPS[k];
}

function addPair() {
  stationPairs.push({ from: null, to: null });
  renderPairs();
}

function removePair(idx) {
  if (stationPairs.length <= 1) return;
  stationPairs.splice(idx, 1);
  delete pairPS[`from_${idx}`];
  delete pairPS[`to_${idx}`];
  renderPairs();
}

function renderPairHtml(pair, idx) {
  const removable = stationPairs.length > 1;
  return `
    <div class="pair-row" id="pairRow_${idx}">
      <div class="pair-col">
        <label>Fra stasjon</label>
        <div class="picker-wrap" id="wrap_from_${idx}">
          <input id="input_from_${idx}" type="text" autocomplete="off"
            placeholder="Søk stasjonsnavn eller UIC…"
            oninput="pickerFilter('from',${idx})"
            onkeydown="pickerKey(event,'from',${idx})"
            onfocus="pickerOpen('from',${idx})" />
          <button type="button" class="picker-clear-btn" id="clear_from_${idx}"
            onclick="pickerClear('from',${idx})" title="Fjern">${SVG_X}</button>
          <div id="drop_from_${idx}" class="picker-dropdown" style="display:none;"></div>
        </div>
      </div>
      <div class="pair-col">
        <label>Til stasjon</label>
        <div class="picker-wrap" id="wrap_to_${idx}">
          <input id="input_to_${idx}" type="text" autocomplete="off"
            placeholder="Søk stasjonsnavn eller UIC…"
            oninput="pickerFilter('to',${idx})"
            onkeydown="pickerKey(event,'to',${idx})"
            onfocus="pickerOpen('to',${idx})" />
          <button type="button" class="picker-clear-btn" id="clear_to_${idx}"
            onclick="pickerClear('to',${idx})" title="Fjern">${SVG_X}</button>
          <div id="drop_to_${idx}" class="picker-dropdown" style="display:none;"></div>
        </div>
      </div>
      <button type="button" class="btn-remove-pair"
        onclick="removePair(${idx})" title="Fjern stasjonpar"
        ${!removable ? 'style="visibility:hidden;"' : ''}>${SVG_X}</button>
    </div>`;
}

function applyPickerSelection(dir, idx, station) {
  const inputEl = document.getElementById(`input_${dir}_${idx}`);
  if (inputEl) {
    inputEl.value = `${station.name}  ·  ${station.uic}`;
    inputEl.readOnly = true;
  }
  const clearBtn = document.getElementById(`clear_${dir}_${idx}`);
  if (clearBtn) clearBtn.style.display = "inline-flex";
}

function renderPairs() {
  const container = document.getElementById("stationPairsContainer");
  if (!container) return;
  container.innerHTML = stationPairs.map((pair, idx) => renderPairHtml(pair, idx)).join("");
  stationPairs.forEach((pair, idx) => {
    if (pair.from) applyPickerSelection("from", idx, pair.from);
    if (pair.to)   applyPickerSelection("to",   idx, pair.to);
  });
}

function pickerFilter(dir, idx) {
  const input = document.getElementById(`input_${dir}_${idx}`);
  if (!input || input.readOnly) return;
  const q = input.value.trim().toLowerCase();
  const matches = q.length === 0
    ? osdmStations.slice(0, 80)
    : osdmStations.filter(s => s.name.toLowerCase().includes(q) || s.uic.includes(q)).slice(0, 80);
  ps(dir, idx).activeIdx = -1;
  pickerRenderDrop(dir, idx, matches);
}

function pickerOpen(dir, idx) {
  const input = document.getElementById(`input_${dir}_${idx}`);
  if (input?.readOnly) return;
  pickerFilter(dir, idx);
}

function pickerRenderDrop(dir, idx, matches) {
  const state = ps(dir, idx);
  state.matches = matches;
  const drop = document.getElementById(`drop_${dir}_${idx}`);
  if (!drop) return;
  if (matches.length === 0) { drop.style.display = "none"; return; }
  drop.innerHTML = matches.map((s, i) =>
    `<div class="picker-option" data-idx="${i}">
      ${s.name}<span class="uic">${s.uic}</span>
    </div>`
  ).join("");
  drop.querySelectorAll(".picker-option").forEach((el, i) => {
    el.addEventListener("mousedown", e => { e.preventDefault(); pickerSelect(dir, idx, state.matches[i]); });
    el.addEventListener("mouseover", () => pickerActivate(dir, idx, i));
  });
  drop.style.display = "block";
}

function pickerActivate(dir, idx, aIdx) {
  ps(dir, idx).activeIdx = aIdx;
  const drop = document.getElementById(`drop_${dir}_${idx}`);
  if (!drop) return;
  drop.querySelectorAll(".picker-option").forEach((el, i) =>
    el.classList.toggle("active", i === aIdx)
  );
}

function pickerKey(e, dir, idx) {
  const input = document.getElementById(`input_${dir}_${idx}`);
  if (input?.readOnly) return;
  const drop = document.getElementById(`drop_${dir}_${idx}`);
  if (!drop) return;
  const opts = drop.querySelectorAll(".picker-option");
  if (!opts.length) return;
  const state = ps(dir, idx);
  if (e.key === "ArrowDown") {
    e.preventDefault();
    state.activeIdx = Math.min(state.activeIdx + 1, opts.length - 1);
    pickerActivate(dir, idx, state.activeIdx);
    opts[state.activeIdx]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    state.activeIdx = Math.max(state.activeIdx - 1, 0);
    pickerActivate(dir, idx, state.activeIdx);
    opts[state.activeIdx]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter" && state.activeIdx >= 0) {
    e.preventDefault();
    pickerSelect(dir, idx, state.matches[state.activeIdx]);
  } else if (e.key === "Escape") {
    drop.style.display = "none";
  }
}

function pickerSelect(dir, idx, station) {
  stationPairs[idx][dir] = station;
  ps(dir, idx).activeIdx = -1;
  const dropEl = document.getElementById(`drop_${dir}_${idx}`);
  if (dropEl) dropEl.style.display = "none";
  applyPickerSelection(dir, idx, station);
}

function pickerClear(dir, idx) {
  stationPairs[idx][dir] = null;
  ps(dir, idx).activeIdx = -1;
  const inputEl = document.getElementById(`input_${dir}_${idx}`);
  if (inputEl) { inputEl.value = ""; inputEl.readOnly = false; }
  const clearBtn = document.getElementById(`clear_${dir}_${idx}`);
  if (clearBtn) clearBtn.style.display = "none";
  const dropEl = document.getElementById(`drop_${dir}_${idx}`);
  if (dropEl) dropEl.style.display = "none";
}

// Lukk dropdowns ved klikk utenfor
document.addEventListener("click", e => {
  document.querySelectorAll(".picker-wrap").forEach(wrap => {
    if (!wrap.contains(e.target)) {
      const drop = wrap.querySelector(".picker-dropdown");
      if (drop) drop.style.display = "none";
    }
  });
});

// ---------------------------------------------------------------------------
// Fil-opplasting og parsing
// ---------------------------------------------------------------------------

async function onFileChange() {
  const file     = document.getElementById("discountFile").files[0];
  const fileInfo = document.getElementById("fileInfo");
  const stepForm = document.getElementById("stepForm");
  const result   = document.getElementById("discountResult");

  osdmStations = [];
  stationPairs = [{ from: null, to: null }];
  Object.keys(pairPS).forEach(k => delete pairPS[k]);
  carrierClear();
  stepForm.style.display = "none";
  result.innerText = "";
  result.className = "";

  if (!file) { fileInfo.style.display = "none"; return; }

  const sizeMb = (file.size / 1024 / 1024).toFixed(1);
  const isLocal = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
  const maxMb = isLocal ? 5000 : 100;

  if (file.size > maxMb * 1024 * 1024) {
    fileInfo.innerText = t("file_too_large").replace("{size}", sizeMb).replace("{max}", maxMb);
    fileInfo.style.display = "block";
    fileInfo.style.color = "#c00";
    return;
  }

  fileInfo.innerText = `📄 ${file.name} (${sizeMb} MB)`;
  fileInfo.style.display = "block";
  fileInfo.style.color = "";

  result.innerText = "Leser fil…";

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
    osdmStations       = res.stations;
    osdmPassengers     = res.passengerConstraints;
    osdmServiceClasses = res.serviceClasses;

    document.getElementById("parsedInfo").innerText =
      `DeliveryId: ${res.deliveryId} · ${res.stations.length} stasjoner`;

    renderPairs();
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
// Transportørbegrensning – radio + flervalgs-picker
// ---------------------------------------------------------------------------

let selectedCarriers = [];
const carrierPicker = { activeIdx: -1, matches: [] };

function onCarrierModeChange() {
  const specific = document.querySelector("input[name=carrierMode]:checked").value === "specific";
  document.getElementById("carrierPickerWrap").style.display = specific ? "block" : "none";
  if (!specific) carrierClear();
}

function carrierFilter() {
  const q = document.getElementById("inputCarrier").value.trim().toLowerCase();
  const matches = q.length === 0
    ? ricsCodes.slice(0, 60)
    : ricsCodes.filter(c =>
        c.name.toLowerCase().includes(q) || c.code.includes(q) ||
        (c.country && c.country.toLowerCase().includes(q))
      ).slice(0, 60);
  carrierPicker.activeIdx = -1;
  carrierRenderDrop(matches);
}

function carrierOpen() { carrierFilter(); }

function carrierRenderDrop(matches) {
  carrierPicker.matches = matches;
  const drop = document.getElementById("dropCarrier");
  if (!matches.length) { drop.style.display = "none"; return; }
  drop.innerHTML = matches.map((c, i) =>
    `<div class="picker-option" data-idx="${i}">
      ${carrierDisplayName(c)}<span class="uic">${c.code}</span>
    </div>`
  ).join("");
  drop.querySelectorAll(".picker-option").forEach((el, i) => {
    el.addEventListener("mousedown", e => { e.preventDefault(); carrierSelect(carrierPicker.matches[i]); });
    el.addEventListener("mouseover", () => carrierActivate(i));
  });
  drop.style.display = "block";
}

function carrierActivate(idx) {
  carrierPicker.activeIdx = idx;
  document.getElementById("dropCarrier").querySelectorAll(".picker-option").forEach((el, i) =>
    el.classList.toggle("active", i === idx)
  );
}

function carrierKey(e) {
  const drop = document.getElementById("dropCarrier");
  const opts = drop.querySelectorAll(".picker-option");
  if (!opts.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    carrierPicker.activeIdx = Math.min(carrierPicker.activeIdx + 1, opts.length - 1);
    carrierActivate(carrierPicker.activeIdx);
    opts[carrierPicker.activeIdx]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    carrierPicker.activeIdx = Math.max(carrierPicker.activeIdx - 1, 0);
    carrierActivate(carrierPicker.activeIdx);
    opts[carrierPicker.activeIdx]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter" && carrierPicker.activeIdx >= 0) {
    e.preventDefault();
    carrierSelect(carrierPicker.matches[carrierPicker.activeIdx]);
  } else if (e.key === "Escape") {
    drop.style.display = "none";
  }
}

function carrierSelect(carrier) {
  if (selectedCarriers.some(c => c.code === carrier.code)) {
    document.getElementById("inputCarrier").value = "";
    document.getElementById("dropCarrier").style.display = "none";
    return;
  }
  selectedCarriers.push(carrier);
  renderCarrierChips();
  document.getElementById("inputCarrier").value = "";
  document.getElementById("dropCarrier").style.display = "none";
  carrierPicker.activeIdx = -1;
}

function carrierRemove(code) {
  selectedCarriers = selectedCarriers.filter(c => c.code !== code);
  renderCarrierChips();
}

function renderCarrierChips() {
  document.getElementById("carrierChips").innerHTML = selectedCarriers.map(c =>
    `<div class="picker-chip">
      <span>${carrierDisplayName(c)} <span style="color:rgba(255,255,255,0.4)">${c.code}</span></span>
      <button type="button" onclick="carrierRemove('${c.code}')" title="Fjern">${SVG_X}</button>
    </div>`
  ).join("");
}

function carrierClear() {
  selectedCarriers = [];
  carrierPicker.activeIdx = -1;
  const input = document.getElementById("inputCarrier");
  if (!input) return;
  input.value = "";
  document.getElementById("dropCarrier").style.display = "none";
  const chips = document.getElementById("carrierChips");
  if (chips) chips.innerHTML = "";
}

function renderPassengerCheckboxes() {
  document.getElementById("passengerCheckboxes").innerHTML = osdmPassengers.map(pc =>
    `<label class="checkbox-label">
      <input type="checkbox" name="passengerRef" value="${pc.nameRef}" checked>
      ${pc.name}
    </label>`
  ).join("");
}

function renderServiceClassCheckboxes() {
  document.getElementById("serviceClassCheckboxes").innerHTML = osdmServiceClasses.map(sc =>
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
  const result = document.getElementById("discountResult");

  const completePairs   = stationPairs.filter(p => p.from && p.to);
  const incompletePairs = stationPairs.filter(p => (p.from && !p.to) || (!p.from && p.to));

  if (completePairs.length === 0) {
    result.innerText = "❌ Velg minst ett stasjonspar (både fra og til).";
    result.className = "status-error";
    return;
  }
  if (incompletePairs.length > 0) {
    result.innerText = "❌ Alle stasjonspar må ha både fra- og til-stasjon valgt, eller fjernes.";
    result.className = "status-error";
    return;
  }

  const discountName = document.getElementById("discountName").value.trim();
  if (!discountName) {
    result.innerText = "❌ Skriv inn et rabattnavn.";
    result.className = "status-error";
    return;
  }

  const carrierMode = document.querySelector("input[name=carrierMode]:checked").value;
  if (carrierMode === "specific" && selectedCarriers.length === 0) {
    result.innerText = "❌ Velg minst én transportør, eller velg «Ingen begrensning».";
    result.className = "status-error";
    return;
  }

  const discountPct = parseFloat(document.getElementById("discountPct").value);
  if (isNaN(discountPct) || discountPct <= 0 || discountPct >= 100) {
    result.innerText = "❌ Rabattprosent må være mellom 1 og 99.";
    result.className = "status-error";
    return;
  }

  const passengerRefs   = [...document.querySelectorAll("input[name=passengerRef]:checked")].map(el => el.value);
  const serviceClassIds = [...document.querySelectorAll("input[name=serviceClassId]:checked")].map(el => el.value);

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
  fd.append("stationPairsJson", JSON.stringify(completePairs.map(p => ({
    fromCpId: p.from.cp_id, toCpId: p.to.cp_id,
    fromUic:  p.from.uic,   toUic:  p.to.uic,
  }))));
  fd.append("discountName", discountName);
  fd.append("discountPct",  discountPct);
  selectedCarriers.forEach(c => fd.append("carrierCodes", c.code));
  passengerRefs.forEach(r   => fd.append("passengerRefs", r));
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
