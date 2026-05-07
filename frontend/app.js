let lastGeneratedFile = null;

function show(id){document.getElementById(id).style.display="block";}
function hide(id){document.getElementById(id).style.display="none";}

function validateGenerateInputs() {
  const errorEl = document.getElementById("validationError");

  errorEl.style.display = "none";
  errorEl.innerText = "";

  const datasetId = document.getElementById("datasetId").value.trim();
  const exchangeRate = parseFloat(document.getElementById("exchangeRate").value);
  const validFrom = document.getElementById("validFrom").value;
  const validTo = document.getElementById("validTo").value;

  if (!datasetId) {
    errorEl.innerText = t("err_delivery_id");
  } else if (!exchangeRate || exchangeRate <= 0) {
    errorEl.innerText = t("err_exchange_rate");
  } else if (!validFrom || !validTo) {
    errorEl.innerText = t("err_valid_dates");
  } else if (validFrom > validTo) {
    errorEl.innerText = t("err_date_order");
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

  statusEl.className = "";
  generateBtn.disabled = true;

  if (!tenFile.files.length) {
    statusEl.innerText = t("err_no_ten");
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
    statusEl.innerText = t("ten_validated");
    statusEl.classList.add("status-ok");
    generateBtn.disabled = false;
  } else {
    statusEl.innerText =
      `${t("err_ten_failed")}\n${res.error || t("unknown_error")}`;
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
      document.getElementById("optionalDelivery").value === "true" ? t("yes") : t("no_text");
    const sommertid = res.summary.utcOffset === 120 ? t("yes") : t("no_text");

    finalStatus.innerText =
      `${t("osdm_generated")}\n` +
      `${t("label_file")}: ${res.outputFile}\n` +
      `${t("label_env")}: ${res.summary.environment}\n` +
      `${t("label_optional_del")}: ${optionalText}\n` +
      `${t("label_valid_period")}: ${document.getElementById("validFrom").value} → ${document.getElementById("validTo").value}\n` +
      `${t("label_summer_time")}: ${sommertid}\n` +
      `${t("label_price_count")}: ${res.summary.pricesUpdated}`;

    finalStatus.className = "";
    document.getElementById("resultBox").style.display = "block";
    downloadBtn.disabled = false;
    renderExampleTable(res.summary.exampleFares);

  } else {
    finalStatus.innerText = t("err_osdm_failed");
    document.getElementById("resultBox").style.display = "block";
  }
}

function downloadOsdm(){
  window.location.href=`/ui/download-osdm/${lastGeneratedFile}`;
}

function startProgress(){
  const bar=progressBar;
  bar.style.display="block";
  const t_=setInterval(async()=>{
    const p=(await (await fetch("/ui/progress")).json());
    bar.value=p.percent;
    if(p.status==="done"){clearInterval(t_);bar.style.display="none";}
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
    `<div class='example-panel-title'>${t("example_prices")}</div>` +
    "<table>" +
    "<tr>" +
    `<th align='left'>${t("col_route")}</th>` +
    `<th align='right'>${t("col_price_eur")}</th>` +
    `<th align='right'>${t("col_price_nok")}</th>` +
    `<th align='right'>${t("col_km")}</th>` +
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



if (window.IS_ADMIN) {
  const adminLink = document.getElementById("adminLink");
  if (adminLink) adminLink.style.display = "";
}

["datasetId", "exchangeRate", "validFrom", "validTo"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => {
    const errorEl = document.getElementById("validationError");
    errorEl.style.display = "none";
    errorEl.innerText = "";
  });
});
