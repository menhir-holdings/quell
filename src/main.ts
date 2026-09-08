import { TwistyPlayer } from "cubing/twisty";
import { OLL, OLL_GROUPS } from "./data/oll";
import { PLL, PLL_GROUPS } from "./data/pll";
import { F2L } from "./data/f2l";
import { deal } from "./deal";
import { COLOR_LABEL, STICKER_HEX } from "./hold";
import { cycleState, getState } from "./progress";
import type { Deal, Mode, Settings } from "./types";
import "./style.css";

const SETTINGS_KEY = "quell.settings.v1";

const MODES: { id: Mode; label: string }[] = [
  { id: "oll", label: "OLL" },
  { id: "pll", label: "PLL" },
  { id: "twogen", label: "2-gen" },
  { id: "full", label: "Full" },
  { id: "f2l", label: "F2L" },
];

const DEFAULTS: Settings = {
  mode: "oll",
  skipTwoLook: true,
  randomHold: true,
  randomAuf: true,
  f2lPairs: "1",
  ollGroup: "all",
  pllGroup: "all",
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

const settings = loadSettings();
let current: Deal | null = null;
let revealed = false;

const modesEl = document.querySelector("#modes") as HTMLElement;
const filtersEl = document.querySelector("#filters") as HTMLElement;
const holdEl = document.querySelector("#hold") as HTMLElement;
const caseEl = document.querySelector("#case-label") as HTMLElement;
const scrambleEl = document.querySelector("#scramble") as HTMLElement;
const statusEl = document.querySelector("#status") as HTMLElement;
const algsEl = document.querySelector("#algs") as HTMLElement;
const gridEl = document.querySelector("#grid") as HTMLElement;
const gridWrap = document.querySelector("#grid-wrap") as HTMLElement;
const gridTitle = document.querySelector("#grid-title") as HTMLElement;
const btnNext = document.querySelector("#btn-next") as HTMLButtonElement;
const btnReveal = document.querySelector("#btn-reveal") as HTMLButtonElement;
const btnKnown = document.querySelector("#btn-known") as HTMLButtonElement;
const playerHost = document.querySelector("#player-host") as HTMLElement;

const player = new TwistyPlayer({
  puzzle: "3x3x3",
  visualization: "3D",
  background: "none",
  controlPanel: "none",
  hintFacelets: "none",
  viewerLink: "none",
  cameraLatitude: 35,
  cameraLongitude: 25,
});
player.style.width = "100%";
player.style.height = "100%";
playerHost.append(player);

function renderModes(): void {
  modesEl.innerHTML = "";
  for (const mode of MODES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mode-tab" + (settings.mode === mode.id ? " active" : "");
    btn.textContent = mode.label;
    btn.addEventListener("click", () => {
      settings.mode = mode.id;
      saveSettings(settings);
      renderModes();
      renderFilters();
      renderGrid();
      void nextDeal();
    });
    modesEl.append(btn);
  }
}

function checkbox(
  id: string,
  label: string,
  checked: boolean,
  onChange: (v: boolean) => void,
): HTMLLabelElement {
  const wrap = document.createElement("label");
  wrap.className = "check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  wrap.append(input, document.createTextNode(label));
  return wrap;
}

function select(
  id: string,
  label: string,
  value: string,
  options: { value: string; label: string }[],
  onChange: (v: string) => void,
): HTMLLabelElement {
  const wrap = document.createElement("label");
  wrap.className = "select";
  const span = document.createElement("span");
  span.textContent = label;
  const sel = document.createElement("select");
  sel.id = id;
  for (const opt of options) {
    const el = document.createElement("option");
    el.value = opt.value;
    el.textContent = opt.label;
    sel.append(el);
  }
  sel.value = value;
  sel.addEventListener("change", () => onChange(sel.value));
  wrap.append(span, sel);
  return wrap;
}

function persist(): void {
  saveSettings(settings);
  renderGrid();
  void nextDeal();
}

function renderFilters(): void {
  filtersEl.innerHTML = "";
  filtersEl.append(
    checkbox("random-hold", "Random hold", settings.randomHold, (v) => {
      settings.randomHold = v;
      persist();
    }),
  );

  if (settings.mode === "oll" || settings.mode === "pll") {
    filtersEl.append(
      checkbox("skip-2look", "Skip 2-look cases", settings.skipTwoLook, (v) => {
        settings.skipTwoLook = v;
        persist();
      }),
      checkbox("random-auf", "Random AUF", settings.randomAuf, (v) => {
        settings.randomAuf = v;
        persist();
      }),
    );
  }

  if (settings.mode === "oll") {
    filtersEl.append(
      select(
        "oll-group",
        "Group",
        settings.ollGroup,
        [{ value: "all", label: "All" }, ...OLL_GROUPS.map((g) => ({ value: g, label: g }))],
        (v) => {
          settings.ollGroup = v;
          persist();
        },
      ),
    );
  }

  if (settings.mode === "pll") {
    filtersEl.append(
      select(
        "pll-group",
        "Group",
        settings.pllGroup,
        [{ value: "all", label: "All" }, ...PLL_GROUPS.map((g) => ({ value: g, label: g }))],
        (v) => {
          settings.pllGroup = v;
          persist();
        },
      ),
    );
  }

  if (settings.mode === "f2l") {
    filtersEl.append(
      select(
        "f2l-pairs",
        "Pairs left",
        settings.f2lPairs,
        [
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
          { value: "random", label: "Random 1–4" },
        ],
        (v) => {
          settings.f2lPairs = v as Settings["f2lPairs"];
          persist();
        },
      ),
    );
  }
}

function swatch(color: keyof typeof STICKER_HEX): string {
  return `<span class="swatch" style="background:${STICKER_HEX[color]}"></span>`;
}

function showDeal(d: Deal): void {
  current = d;
  revealed = false;
  holdEl.innerHTML = `${swatch(d.hold.u)} <strong>U ${COLOR_LABEL[d.hold.u]}</strong>
    <span class="dot">·</span>
    ${swatch(d.hold.f)} <strong>F ${COLOR_LABEL[d.hold.f]}</strong>
    ${d.hold.wca ? '<span class="muted">WCA</span>' : ""}`;
  caseEl.textContent = d.group ? `${d.caseName} · ${d.group}` : d.caseName;
  scrambleEl.textContent = d.scramble;
  algsEl.hidden = true;
  algsEl.innerHTML = "";
  const canReveal = d.algs.length > 0;
  btnReveal.hidden = !canReveal;
  btnReveal.disabled = false;
  btnReveal.textContent = "Reveal alg";
  const track = d.caseId && (d.mode === "oll" || d.mode === "pll" || d.mode === "f2l");
  btnKnown.hidden = !track;
  if (track && d.caseId) {
    const state = getState(d.mode, d.caseId);
    btnKnown.textContent =
      state === "known" ? "Known" : state === "learning" ? "Learning" : "Unseen";
  }

  player.experimentalSetupAlg = d.setupAlg;
  player.alg = "";
  player.experimentalSetupAnchor = "start";
  player.experimentalStickering = d.stickering;
  player.controlPanel = "none";
  statusEl.textContent = d.caseName;
}

function reveal(): void {
  if (!current || current.algs.length === 0) return;
  revealed = true;
  btnReveal.textContent = "Algs shown";
  btnReveal.disabled = true;
  algsEl.hidden = false;
  algsEl.innerHTML = "";
  for (const alg of current.algs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "alg";
    btn.innerHTML = `<span class="alg-label">${alg.label}</span>
      <code>${alg.moves}</code>
      ${alg.notes ? `<span class="alg-notes">${alg.notes}</span>` : ""}`;
    btn.addEventListener("click", () => playAlg(alg.moves));
    algsEl.append(btn);
  }
}

function playAlg(moves: string): void {
  if (!current) return;
  player.experimentalSetupAlg = current.setupAlg;
  player.experimentalSetupAnchor = "start";
  player.alg = moves;
  player.controlPanel = "bottom-row";
  player.play();
}

async function nextDeal(forcedId?: string): Promise<void> {
  statusEl.textContent = "Dealing…";
  btnNext.disabled = true;
  try {
    const next = await deal(settings, forcedId);
    showDeal(next);
    renderGrid();
  } catch (err) {
    statusEl.textContent = "Deal failed";
    scrambleEl.textContent = err instanceof Error ? err.message : String(err);
  } finally {
    btnNext.disabled = false;
  }
}

function casesForGrid() {
  if (settings.mode === "oll") return OLL;
  if (settings.mode === "pll") return PLL;
  if (settings.mode === "f2l") return F2L;
  return null;
}

function renderGrid(): void {
  const cases = casesForGrid();
  if (!cases) {
    gridWrap.hidden = true;
    return;
  }
  gridWrap.hidden = false;
  gridTitle.textContent = settings.mode === "oll" ? "OLL 1–57" : settings.mode === "pll" ? "PLL" : "F2L 1–41";
  gridEl.innerHTML = "";
  for (const entry of cases) {
    const btn = document.createElement("button");
    btn.type = "button";
    const state = getState(settings.mode, entry.id);
    btn.className = `case-cell ${state}${entry.twoLook ? " twolook" : ""}`;
    btn.title = `${entry.name} · ${entry.group} · ${state}. Click to deal, shift-click to mark.`;
    btn.textContent = entry.id;
    btn.addEventListener("click", (ev) => {
      if (ev.shiftKey) {
        cycleState(settings.mode, entry.id);
        renderGrid();
        if (current?.caseId === entry.id) {
          const s = getState(settings.mode, entry.id);
          btnKnown.textContent =
            s === "known" ? "Known" : s === "learning" ? "Learning" : "Unseen";
        }
        return;
      }
      void nextDeal(entry.id);
    });
    gridEl.append(btn);
  }
}

btnNext.addEventListener("click", () => void nextDeal());
btnReveal.addEventListener("click", reveal);
btnKnown.addEventListener("click", () => {
  if (!current?.caseId) return;
  const state = cycleState(current.mode, current.caseId);
  btnKnown.textContent =
    state === "known" ? "Known" : state === "learning" ? "Learning" : "Unseen";
  renderGrid();
});

window.addEventListener("keydown", (ev) => {
  const tag = (ev.target as HTMLElement | null)?.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
  if (ev.code === "Space") {
    ev.preventDefault();
    void nextDeal();
  } else if (ev.key === "r" || ev.key === "R") {
    if (!revealed) reveal();
  }
});

renderModes();
renderFilters();
renderGrid();
void nextDeal();
