/* OSDM Editor – frontend logic */

let _summary = null;
const maxMb = 5000;

// ---------------------------------------------------------------------------
// File handling
// ---------------------------------------------------------------------------

function onFileChange() {
  const input = document.getElementById("editorFile");
  const btn = document.getElementById("loadBtn");
  btn.disabled = !input.files || !input.files.length;
}

async function loadFile() {
  const input = document.getElementById("editorFile");
  if (!input.files || !input.files.length) return;
  const file = input.files[0];

  if (file.size > maxMb * 1024 * 1024) {
    showMsg("loadMsg", `Filen er for stor (maks ${maxMb} MB)`, "err");
    return;
  }

  const btn = document.getElementById("loadBtn");
  btn.disabled = true;
  showProgressBar("loadProgress", "loadProgressFill", "loadProgressPct", 0);
  document.getElementById("loadProgress").style.display = "block";
  document.getElementById("loadMsg").innerHTML = "";
  document.getElementById("editorBody").style.display = "none";

  // Fake progress while uploading
  let pct = 0;
  const ticker = setInterval(() => {
    pct = Math.min(pct + 3, 90);
    showProgressBar("loadProgress", "loadProgressFill", "loadProgressPct", pct);
  }, 200);

  try {
    const fd = new FormData();
    fd.append("osdmFile", file);
    const resp = await fetch("/osdm-editor/load", { method: "POST", body: fd });
    clearInterval(ticker);
    showProgressBar("loadProgress", "loadProgressFill", "loadProgressPct", 100);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || resp.statusText);
    }
    _summary = await resp.json();
    document.getElementById("loadProgress").style.display = "none";
    renderSummary(_summary);
    document.getElementById("editorBody").style.display = "block";
    showTab("overview");
  } catch (e) {
    clearInterval(ticker);
    document.getElementById("loadProgress").style.display = "none";
    showMsg("loadMsg", e.message, "err");
  } finally {
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------

function showTab(name) {
  ["overview", "passengers", "relations", "download"].forEach(n => {
    document.getElementById("pane" + cap(n)).classList.toggle("active", n === name);
    document.getElementById("tab" + cap(n)).classList.toggle("active", n === name);
  });
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------------------------------------------------------------------------
// Render summary
// ---------------------------------------------------------------------------

function renderSummary(s) {
  // Stats chips
  const statsEl = document.getElementById("overviewStats");
  statsEl.innerHTML = `
    <div class="stat-chip"><strong>${s.stats.rc_count}</strong> RC</div>
    <div class="stat-chip"><strong>${s.stats.fare_count}</strong> fares</div>
    <div class="stat-chip"><strong>${s.stats.price_count}</strong> prices</div>
    <div class="stat-chip"><strong>${s.passenger_types.length}</strong> passenger types</div>
  `;

  // Metadata fields
  document.getElementById("metaDeliveryId").value = s.delivery.deliveryId || "";
  document.getElementById("metaPrevDeliveryId").value = s.delivery.previousDeliveryId || "";
  document.getElementById("metaUsage").value = s.delivery.usage || "PRODUCTION";
  document.getElementById("metaOptional").checked = !!s.delivery.optionalDelivery;

  // Passenger profiles
  renderPassengers(s);

  // Relations table
  renderRcTable(s);
}

function renderPassengers(s) {
  const el = document.getElementById("pcList");
  if (!s.passenger_types.length) { el.innerHTML = "<p>–</p>"; return; }
  el.innerHTML = s.passenger_types.map(pc => `
    <div class="pc-row" id="pcrow-${pc.id}">
      <div>
        <div class="pc-name">${escHtml(pc.name || pc.id)}</div>
        ${pc.is_adult ? `<div class="pc-adult">${t("editor_adult_label")}</div>` : ""}
        ${!pc.is_adult ? `<div style="font-size:0.75rem;color:var(--text-muted);">${t("editor_ratio_label")}</div>` : ""}
      </div>
      <div style="text-align:right;">
        ${pc.is_adult
          ? `<input type="number" value="1.00" disabled style="width:80px; opacity:0.5;">`
          : `<input class="pc-ratio-input" id="ratio-${pc.id}" type="number" min="0" max="2" step="0.01" value="${pc.ratio.toFixed(4)}">`
        }
      </div>
      <div>
        ${pc.is_adult
          ? `<button disabled style="opacity:0.4;" data-i18n="btn_save_ratio">${t("btn_save_ratio")}</button>`
          : `<button onclick="saveRatio('${pc.id}')" data-i18n="btn_save_ratio">${t("btn_save_ratio")}</button>`
        }
      </div>
    </div>
    ${pc.is_adult ? "" : `<div id="ratioMsg-${pc.id}" style="font-size:0.8rem; padding-left:0; margin-bottom:0.25rem;"></div>`}
  `).join("");
}

function renderRcTable(s) {
  const wrap = document.getElementById("rcTableWrap");
  if (!s.rc_list.length) { wrap.innerHTML = ""; return; }
  const truncNote = s.stats.rc_list_truncated
    ? `<p class="truncated-note">Viser de første 500 av ${s.stats.rc_count} relasjoner.</p>` : "";
  wrap.innerHTML = `
    ${truncNote}
    <table class="rc-table">
      <thead><tr>
        <th>Fra UIC</th><th>Fra navn</th><th>Til UIC</th><th>Til navn</th><th>Avstand</th>
      </tr></thead>
      <tbody>${s.rc_list.map(rc => `
        <tr>
          <td>${escHtml(rc.from_uic)}</td>
          <td>${escHtml(rc.from_name || "–")}</td>
          <td>${escHtml(rc.to_uic)}</td>
          <td>${escHtml(rc.to_name || "–")}</td>
          <td>${rc.distance} km</td>
        </tr>`).join("")}
      </tbody>
    </table>`;
}

// ---------------------------------------------------------------------------
// Metadata save
// ---------------------------------------------------------------------------

async function saveMetadata() {
  const body = {
    deliveryId:         document.getElementById("metaDeliveryId").value.trim(),
    previousDeliveryId: document.getElementById("metaPrevDeliveryId").value.trim(),
    usage:              document.getElementById("metaUsage").value,
    optionalDelivery:   document.getElementById("metaOptional").checked,
  };
  try {
    const resp = await fetch("/osdm-editor/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail || resp.statusText);
    showMsg("metaMsg", t("editor_metadata_saved"), "ok");
    if (_summary) _summary.delivery = { ..._summary.delivery, ...body };
  } catch (e) {
    showMsg("metaMsg", e.message, "err");
  }
}

// ---------------------------------------------------------------------------
// Passenger ratio save
// ---------------------------------------------------------------------------

async function saveRatio(pcId) {
  const input = document.getElementById(`ratio-${pcId}`);
  const ratio = parseFloat(input.value);
  if (isNaN(ratio) || ratio < 0 || ratio > 2) {
    showMsg(`ratioMsg-${pcId}`, t("editor_ratio_label") + " (0–2)", "err");
    return;
  }
  try {
    const resp = await fetch(`/osdm-editor/passenger/${encodeURIComponent(pcId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratio }),
    });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail || resp.statusText);
    const data = await resp.json();
    showMsg(`ratioMsg-${pcId}`, `${data.updated_fares} ${t("editor_updated_fares")}`, "ok");
    if (_summary) {
      const pc = _summary.passenger_types.find(p => p.id === pcId);
      if (pc) pc.ratio = ratio;
    }
  } catch (e) {
    showMsg(`ratioMsg-${pcId}`, e.message, "err");
  }
}

// ---------------------------------------------------------------------------
// Add relation
// ---------------------------------------------------------------------------

async function addRelation() {
  const fromUic      = document.getElementById("relFromUic").value.trim();
  const toUic        = document.getElementById("relToUic").value.trim();
  const adultPrice   = parseFloat(document.getElementById("relAdultPrice").value);
  const distance     = parseInt(document.getElementById("relDistance").value, 10);

  if (!fromUic || !toUic) { showMsg("relMsg", "UIC-koder mangler", "err"); return; }
  if (isNaN(adultPrice) || adultPrice <= 0) { showMsg("relMsg", t("editor_adult_price") + " > 0", "err"); return; }
  if (isNaN(distance) || distance < 0) { showMsg("relMsg", t("editor_distance") + " >= 0", "err"); return; }

  try {
    const resp = await fetch("/osdm-editor/relation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_uic: fromUic, to_uic: toUic, adult_price_eur: adultPrice, distance }),
    });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail || resp.statusText);
    const data = await resp.json();
    showMsg("relMsg", `${data.fares_created} ${t("editor_fares_created")}`, "ok");

    // Refresh summary from server to get updated rc_list
    const sumResp = await fetch("/osdm-editor/summary");
    if (sumResp.ok) {
      _summary = await sumResp.json();
      renderRcTable(_summary);
      const statsEl = document.getElementById("overviewStats");
      statsEl.innerHTML = `
        <div class="stat-chip"><strong>${_summary.stats.rc_count}</strong> RC</div>
        <div class="stat-chip"><strong>${_summary.stats.fare_count}</strong> fares</div>
        <div class="stat-chip"><strong>${_summary.stats.price_count}</strong> prices</div>
        <div class="stat-chip"><strong>${_summary.passenger_types.length}</strong> passenger types</div>
      `;
    }

    // Clear inputs
    document.getElementById("relFromUic").value = "";
    document.getElementById("relToUic").value = "";
    document.getElementById("relAdultPrice").value = "";
    document.getElementById("relDistance").value = "";
  } catch (e) {
    showMsg("relMsg", e.message, "err");
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = type === "ok" ? "msg-ok" : "msg-err";
  el.textContent = text;
}

function showProgressBar(wrapperId, fillId, pctId, pct) {
  document.getElementById(fillId).style.width = pct + "%";
  document.getElementById(pctId).textContent = pct + "%";
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
