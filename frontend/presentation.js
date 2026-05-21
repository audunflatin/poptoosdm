// OSDMTools – Presentasjon
// Rediger SLIDES-arrayen nedenfor for å endre innhold

const SVG_LOGO = `<svg width="260" height="52" viewBox="0 0 220 44" xmlns="http://www.w3.org/2000/svg">
  <circle cx="14" cy="22" r="9" fill="#ff5959"/>
  <line x1="23" y1="22" x2="35" y2="22" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" stroke-dasharray="3 2"/>
  <circle cx="44" cy="22" r="7" fill="none" stroke="white" stroke-width="2.5"/>
  <text x="60" y="29" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-weight="800" font-size="21" fill="white"><tspan fill="#ff5959">OSDM</tspan>Tools</text>
</svg>`;

const SLIDES = [
  // ── 1. Tittel ──────────────────────────────────────────────────────────────
  {
    type: "cover",
    title: "OSDMTools",
    subtitle: "Automatisert generering av OSDM fareDelivery-filer",
    subnote: "for europeiske jernbaneoperatører",
  },

  // ── 2. Bakgrunn ────────────────────────────────────────────────────────────
  {
    type: "bullets",
    heading: "Hva er OSDM?",
    bullets: [
      "Open Sales and Distribution Model – europeisk jernbanestandard (UIC/ERA)",
      "Operatører leverer <em>fareDelivery</em>-filer til UIC/DRTF minst én gang i året",
      "Filen definerer priser, strekninger, passasjerkategorier og gyldighetsperioder",
      "Godkjent fil er grunnlaget for billettdeling mellom operatører i CIT/DRTF",
    ],
  },

  // ── 3. Problemet ───────────────────────────────────────────────────────────
  {
    type: "bullets",
    heading: "Utfordringen",
    bullets: [
      "TEN-tabellen (Excel) med 100+ strekninger måtte oversettes manuelt til JSON",
      "Valutakurser, avrunding og alle ID-referanser måtte håndteres for hånd",
      "Én skrivefeil brøt hele leveransen – validering tok lang tid",
      "Å legge til rabatter krevde dyp kjennskap til OSDM-strukturen",
    ],
  },

  // ── 4. Flyten ──────────────────────────────────────────────────────────────
  {
    type: "flow",
    heading: "Løsningen – én flyt",
    steps: [
      { num: "1", label: "Last opp\nTEN-CSV" },
      { num: "2", label: "Last opp\nOSDM-mal" },
      { num: "3", label: "Velg valuta\nog periode" },
      { num: "4", label: "Klikk\nGenerer" },
      { num: "5", label: "Last ned\nferdig fil" },
    ],
  },

  // ── 5. Funksjoner ──────────────────────────────────────────────────────────
  {
    type: "bullets",
    heading: "Tre verktøy i ett",
    bullets: [
      "<strong>Oppdater OSDM-priser</strong> – henter valutakurs live, beregner nye priser, genererer komplett leveranse",
      "<strong>OSDM → Excel</strong> – konverterer leveransen til Excel for kontroll og arkivering",
      "<strong>Legg til rabatt i OSDM</strong> – legger inn rabatterte priser for valgt strekning og transportør",
    ],
  },

  // ── 6. Rabatt-funksjonen ───────────────────────────────────────────────────
  {
    type: "bullets",
    heading: "Legg til rabatt i OSDM",
    bullets: [
      "Last opp en eksisterende OSDM fareDelivery-fil",
      "Velg strekningsbegrensning (alle strekninger, eller spesifikke stasjonspar)",
      "Velg transportør og eventuell RICS-kode",
      "Oppgi rabattnavn og prosent (1–99 %)",
      "Velg passasjerkategorier og serviceklasse",
      "Generer fil med nye rabatterte priser innlagt",
    ],
  },

  // ── 7. Teknisk ─────────────────────────────────────────────────────────────
  {
    type: "twocol",
    heading: "Teknisk",
    left: {
      label: "Backend",
      bullets: ["Python / FastAPI", "SQLite (brukere + logg)", "Kjøres på Render (cloud)", "Auto-deploy fra GitHub"],
    },
    right: {
      label: "Frontend",
      bullets: ["Vanilla JS / HTML / CSS", "Ingen rammeverk", "Flerspråklig (no / en / de / sv)", "Responsivt design"],
    },
  },

  // ── 8. Status ──────────────────────────────────────────────────────────────
  {
    type: "stats",
    heading: "Status",
    stats: [
      { num: "14", label: "valutaer\nstøttet" },
      { num: "4", label: "språk\n(no/en/de/sv)" },
      { num: "✓", label: "godkjent av\nUIC/DRTF" },
    ],
    bullets: [
      "I aktiv bruk – leveranser generert og godkjent av UIC/DRTF",
      "Validering med advarsler og automatisk rydding av OSDM-strukturen",
      "Aktivitetslogg med alle hendelser per bruker",
    ],
  },
];

// ── Renderer ──────────────────────────────────────────────────────────────────

let current = 0;
let direction = 1; // 1 = forover, -1 = bakover

function renderSlide(idx) {
  const s = SLIDES[idx];
  const el = document.getElementById("slide");
  const label = `OSDMTools  ·  ${idx} / ${SLIDES.length - 1}`;

  el.className = direction >= 0 ? "anim-forward" : "anim-backward";
  // Force reflow to restart animation
  void el.offsetWidth;
  el.className = direction >= 0 ? "anim-forward" : "anim-backward";

  if (s.type === "cover") {
    el.innerHTML = `
      <div class="slide-cover">
        <div class="logo">${SVG_LOGO}</div>
        <h1>${s.title}</h1>
        <div class="subtitle">${s.subtitle}</div>
        ${s.subnote ? `<div class="subnote">${s.subnote}</div>` : ""}
      </div>`;
  }
  else if (s.type === "bullets") {
    el.innerHTML = `
      <div class="slide-label">${label}</div>
      <h2 class="slide-heading">${s.heading}</h2>
      <div class="slide-rule"></div>
      <ul class="bullet-list">${s.bullets.map(b => `<li><span>${b}</span></li>`).join("")}</ul>`;
  }
  else if (s.type === "flow") {
    const steps = s.steps.map((step, i) => {
      const arrow = i < s.steps.length - 1
        ? `<div class="flow-arrow">→</div>` : "";
      return `<div class="flow-box"><span class="step-num">${step.num}</span>${step.label.replace(/\n/g, "<br>")}</div>${arrow}`;
    }).join("");
    el.innerHTML = `
      <div class="slide-label">${label}</div>
      <h2 class="slide-heading">${s.heading}</h2>
      <div class="slide-rule"></div>
      <div class="flow-row">${steps}</div>`;
  }
  else if (s.type === "twocol") {
    const col = (c) => `
      <div>
        <div class="slide-label" style="margin-bottom:0.75rem;">${c.label}</div>
        <ul class="bullet-list">${c.bullets.map(b => `<li><span>${b}</span></li>`).join("")}</ul>
      </div>`;
    el.innerHTML = `
      <div class="slide-label">${label}</div>
      <h2 class="slide-heading">${s.heading}</h2>
      <div class="slide-rule"></div>
      <div class="two-col">${col(s.left)}${col(s.right)}</div>`;
  }
  else if (s.type === "stats") {
    const statBoxes = s.stats.map(st =>
      `<div class="stat-box">
        <span class="stat-num">${st.num}</span>
        <span class="stat-label">${st.label.replace(/\n/g, "<br>")}</span>
      </div>`
    ).join("");
    el.innerHTML = `
      <div class="slide-label">${label}</div>
      <h2 class="slide-heading">${s.heading}</h2>
      <div class="slide-rule"></div>
      <div class="stat-row">${statBoxes}</div>
      <ul class="bullet-list" style="margin-top:2rem;">
        ${s.bullets.map(b => `<li><span>${b}</span></li>`).join("")}
      </ul>`;
  }

  // Counter + progress bar
  document.getElementById("counter").textContent = `${idx + 1} / ${SLIDES.length}`;
  document.getElementById("progressBar").style.width =
    `${((idx + 1) / SLIDES.length) * 100}%`;
  document.getElementById("btnPrev").disabled = idx === 0;
  document.getElementById("btnNext").disabled = idx === SLIDES.length - 1;
}

function goTo(idx) {
  if (idx < 0 || idx >= SLIDES.length) return;
  direction = idx >= current ? 1 : -1;
  current = idx;
  renderSlide(current);
}

function nextSlide() { goTo(current + 1); }
function prevSlide() { goTo(current - 1); }

// ── Keyboard ──────────────────────────────────────────────────────────────────

document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
    e.preventDefault(); nextSlide();
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
    e.preventDefault(); prevSlide();
  } else if (e.key === "Home") {
    e.preventDefault(); goTo(0);
  } else if (e.key === "End") {
    e.preventDefault(); goTo(SLIDES.length - 1);
  } else if (e.key === "f" || e.key === "F") {
    toggleFullscreen();
  }
});

// ── Fullscreen ────────────────────────────────────────────────────────────────

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

renderSlide(0);
