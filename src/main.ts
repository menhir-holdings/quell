import { TwistyPlayer } from "cubing/twisty";
import { casesFor, dealCase, pickRandom } from "./deal";
import { displayName, getProgress, setProgress } from "./progress";
import type { CaseDef, CubeView, Deal, Phase, PracticeSub, SetId, Settings } from "./types";
import "./style.css";

const SETTINGS_KEY = "quell.settings.v2";

const DEFAULTS: Settings = {
  set: "oll",
  phase: "learn",
  practiceSub: "feed",
  view: "2d",
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

const settings = loadSettings();
let current: Deal | null = null;
let revealed = false;

const setsEl = document.querySelector("#sets") as HTMLElement;
const phasesEl = document.querySelector("#phases") as HTMLElement;
const filtersEl = document.querySelector("#filters") as HTMLElement;
const statusEl = document.querySelector("#status") as HTMLElement;
const emptyEl = document.querySelector("#empty") as HTMLElement;
const stageEl = document.querySelector("#stage") as HTMLElement;
const caseEl = document.querySelector("#case-label") as HTMLElement;
const subEl = document.querySelector("#case-sub") as HTMLElement;
const nameInput = document.querySelector("#custom-name") as HTMLInputElement;
const setupKicker = document.querySelector("#setup-kicker") as HTMLElement;
const setupEl = document.querySelector("#setup") as HTMLElement;
const algsBox = document.querySelector("#solve-box") as HTMLElement;
const solveBtn = document.querySelector("#solve-alg") as HTMLButtonElement;
const gridEl = document.querySelector("#grid") as HTMLElement;
const gridWrap = document.querySelector("#grid-wrap") as HTMLElement;
const gridTitle = document.querySelector("#grid-title") as HTMLElement;
const gridLead = document.querySelector("#grid-lead") as HTMLElement;
const btnNext = document.querySelector("#btn-next") as HTMLButtonElement;
const btnReveal = document.querySelector("#btn-reveal") as HTMLButtonElement;
const btnPractice = document.querySelector("#btn-practice") as HTMLButtonElement;
const playerHost = document.querySelector("#player-host") as HTMLElement;

let player: TwistyPlayer | null = null;

function createPlayer(): TwistyPlayer {
  const next = new TwistyPlayer({
    puzzle: "3x3x3",
    visualization: settings.view === "2d" ? "experimental-2D-LL" : "3D",
    background: settings.view === "2d" ? "checkered" : "none",
    controlPanel: "none",
    hintFacelets: settings.view === "3d" ? "floating" : "none",
    viewerLink: "none",
    cameraLatitude: 35,
    cameraLongitude: 25,
  });
  next.style.width = "100%";
  next.style.height = "100%";
  return next;
}

function remountPlayer(): TwistyPlayer {
  player?.remove();
  player = createPlayer();
  playerHost.replaceChildren(player);
  return player;
}

function applyAlgToPlayer(d: Deal, play = false): void {
  const p = player ?? remountPlayer();
  p.experimentalSetupAlg = `z2 ${d.setupAlg}`;
  p.experimentalSetupAnchor = "start";
  p.experimentalStickering = d.stickering;
  p.alg = play ? d.solveAlg : "";
  p.controlPanel = play ? "bottom-row" : "none";
  if (play) p.play();
}

function tab(
  parent: HTMLElement,
  items: { id: string; label: string }[],
  active: string,
  onPick: (id: string) => void,
): void {
  parent.innerHTML = "";
  for (const item of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mode-tab" + (item.id === active ? " active" : "");
    btn.textContent = item.label;
    btn.addEventListener("click", () => onPick(item.id));
    parent.append(btn);
  }
}

function applyView(): void {
  remountPlayer();
  if (current) applyAlgToPlayer(current);
}

function renderChrome(): void {
  tab(
    setsEl,
    [
      { id: "oll", label: "OLL" },
      { id: "pll", label: "PLL" },
    ],
    settings.set,
    (id) => {
      settings.set = id as SetId;
      saveSettings();
      current = null;
      renderAll();
    },
  );
  tab(
    phasesEl,
    [
      { id: "learn", label: "Learn" },
      { id: "practice", label: "Practice" },
    ],
    settings.phase,
    (id) => {
      settings.phase = id as Phase;
      saveSettings();
      current = null;
      renderAll();
    },
  );

  filtersEl.innerHTML = "";
  if (settings.phase === "practice") {
    tab(
      filtersEl,
      [
        { id: "feed", label: "Feed" },
        { id: "select", label: "Select" },
      ],
      settings.practiceSub,
      (id) => {
        settings.practiceSub = id as PracticeSub;
        saveSettings();
        current = null;
        renderAll();
      },
    );
  }
  const viewTabs = document.createElement("nav");
  viewTabs.className = "mode-tabs view-tabs";
  viewTabs.setAttribute("aria-label", "Cube view");
  tab(
    viewTabs,
    [
      { id: "2d", label: "Top" },
      { id: "3d", label: "3D" },
    ],
    settings.view,
    (id) => {
      settings.view = id as CubeView;
      saveSettings();
      renderChrome();
      applyView();
    },
  );
  filtersEl.append(viewTabs);
}

function practicedCases(): CaseDef[] {
  return casesFor(settings.set).filter(
    (entry) => getProgress(settings.set, entry.id).inPractice,
  );
}

function learnCases(): CaseDef[] {
  return casesFor(settings.set).filter(
    (entry) => !getProgress(settings.set, entry.id).inPractice,
  );
}

function showDeal(d: Deal): void {
  current = d;
  revealed = false;
  stageEl.hidden = false;
  caseEl.textContent = d.displayName;
  subEl.textContent =
    d.displayName === d.canonicalName
      ? `${d.group}`
      : `${d.canonicalName} · ${d.group}`;
  nameInput.value = getProgress(d.set, d.caseId).name;
  setupKicker.textContent =
    d.set === "pll" ? "Setup · from solved" : "Setup · from last layer oriented";
  setupEl.textContent = d.setupAlg;
  algsBox.hidden = true;
  solveBtn.replaceChildren();
  btnReveal.disabled = false;
  btnReveal.textContent = "Reveal solve";
  const inPractice = getProgress(d.set, d.caseId).inPractice;
  btnPractice.textContent = inPractice ? "Remove from practice" : "Add to practice";
  btnNext.hidden = !(settings.phase === "practice" && settings.practiceSub === "feed");
  remountPlayer();
  applyAlgToPlayer(d);
  statusEl.textContent = d.displayName;
}

function reveal(): void {
  if (!current) return;
  revealed = true;
  btnReveal.textContent = "Solve shown";
  btnReveal.disabled = true;
  algsBox.hidden = false;
  solveBtn.innerHTML = `<code>${current.solveAlg}</code>
    <span class="alg-notes">Click to play</span>`;
}

function playSolve(): void {
  if (!current) return;
  applyAlgToPlayer(current, true);
}

function dealId(id: string): void {
  const entry = casesFor(settings.set).find((c) => c.id === id);
  if (!entry) return;
  showDeal(dealCase(settings.set, entry));
}

function nextFeed(): void {
  const pool = practicedCases();
  if (!pool.length) {
    current = null;
    stageEl.hidden = true;
    return;
  }
  const entry = pickRandom(pool, current?.caseId);
  showDeal(dealCase(settings.set, entry));
}

function renderGrid(entries: CaseDef[], title: string, lead: string): void {
  gridWrap.hidden = false;
  gridTitle.textContent = title;
  gridLead.textContent = lead;
  gridEl.innerHTML = "";
  let lastGroup = "";
  for (const entry of entries) {
    if (entry.group !== lastGroup) {
      lastGroup = entry.group;
      const h = document.createElement("p");
      h.className = "group-label";
      h.textContent = entry.group;
      gridEl.append(h);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    const nick = displayName(settings.set, entry.id, entry.name);
    const inPractice = getProgress(settings.set, entry.id).inPractice;
    btn.className =
      "case-cell" +
      (inPractice ? " in-practice" : "") +
      (current?.caseId === entry.id ? " current" : "");
    btn.dataset.id = entry.id;
    const idEl = document.createElement("span");
    idEl.className = "cell-id";
    idEl.textContent = entry.id;
    const nameEl = document.createElement("span");
    nameEl.className = "cell-name";
    nameEl.textContent = nick;
    btn.append(idEl, nameEl);
    btn.addEventListener("click", () => {
      dealId(entry.id);
      paintGridHighlight();
    });
    gridEl.append(btn);
  }
}

function paintGridHighlight(): void {
  for (const node of gridEl.querySelectorAll(".case-cell")) {
    const btn = node as HTMLButtonElement;
    btn.classList.toggle("current", btn.dataset.id === current?.caseId);
  }
}

function renderAll(): void {
  renderChrome();
  emptyEl.hidden = true;
  emptyEl.textContent = "";
  gridWrap.hidden = true;
  const setLabel = settings.set.toUpperCase();

  if (settings.phase === "learn") {
    const pool = learnCases();
    btnNext.hidden = true;
    if (!pool.length) {
      stageEl.hidden = true;
      current = null;
      emptyEl.hidden = false;
      emptyEl.textContent = `Every ${setLabel} case is in practice. Remove one there if you want it back on this list.`;
      statusEl.textContent = `${setLabel} · all in practice`;
      return;
    }
    const keep =
      current &&
      current.set === settings.set &&
      pool.some((c) => c.id === current!.caseId);
    if (!keep) dealId(pool[0].id);
    else showDeal(dealCase(settings.set, pool.find((c) => c.id === current!.caseId)!));
    renderGrid(
      pool,
      `Learn ${setLabel}`,
      "Pick a case, give it a name if you want, then add it to practice.",
    );
    statusEl.textContent = `${pool.length} left to learn`;
    return;
  }

  const pool = practicedCases();
  if (!pool.length) {
    stageEl.hidden = true;
    current = null;
    emptyEl.hidden = false;
    emptyEl.innerHTML =
      `Nothing in ${setLabel} practice yet. Switch to <strong>Learn</strong>, open a case, name it, and add it here.`;
    statusEl.textContent = `${setLabel} · empty practice`;
    return;
  }

  if (settings.practiceSub === "select") {
    const keep =
      current &&
      current.set === settings.set &&
      pool.some((c) => c.id === current!.caseId);
    if (!keep) dealId(pool[0].id);
    else showDeal(dealCase(settings.set, pool.find((c) => c.id === current!.caseId)!));
    renderGrid(
      pool,
      `Practice ${setLabel}`,
      "Select the case you want to hit. Your name is on each cell.",
    );
    btnNext.hidden = true;
    statusEl.textContent = `${pool.length} in practice`;
    return;
  }

  btnNext.hidden = false;
  nextFeed();
  statusEl.textContent = `${setLabel} feed · ${pool.length} cases`;
}

nameInput.addEventListener("input", () => {
  if (!current) return;
  setProgress(current.set, current.caseId, { name: nameInput.value });
  current.displayName = displayName(
    current.set,
    current.caseId,
    current.canonicalName,
  );
  caseEl.textContent = current.displayName;
  subEl.textContent =
    current.displayName === current.canonicalName
      ? current.group
      : `${current.canonicalName} · ${current.group}`;
  const cell = gridEl.querySelector(
    `.case-cell[data-id="${current.caseId}"] .cell-name`,
  );
  if (cell) cell.textContent = current.displayName;
});

btnNext.addEventListener("click", () => nextFeed());
btnReveal.addEventListener("click", reveal);
solveBtn.addEventListener("click", playSolve);
btnPractice.addEventListener("click", () => {
  if (!current) return;
  const now = getProgress(current.set, current.caseId);
  setProgress(current.set, current.caseId, { inPractice: !now.inPractice });
  current = null;
  renderAll();
});

window.addEventListener("keydown", (ev) => {
  const tag = (ev.target as HTMLElement | null)?.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
  if (ev.code === "Space") {
    ev.preventDefault();
    if (settings.phase === "practice" && settings.practiceSub === "feed") nextFeed();
  } else if (ev.key === "r" || ev.key === "R") {
    if (!revealed) reveal();
  }
});

renderAll();
