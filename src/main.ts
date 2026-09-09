import { TwistyPlayer } from "cubing/twisty";
import { casesFor, dealCase, pickRandom } from "./deal";
import { llMarkup } from "./ll";
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
const viewTabsEl = document.querySelector("#view-tabs") as HTMLElement;
const statusEl = document.querySelector("#status") as HTMLElement;
const emptyEl = document.querySelector("#empty") as HTMLElement;
const stageEl = document.querySelector("#stage") as HTMLElement;
const caseEl = document.querySelector("#case-label") as HTMLElement;
const subEl = document.querySelector("#case-sub") as HTMLElement;
const nameInput = document.querySelector("#custom-name") as HTMLInputElement;
const setupKicker = document.querySelector("#setup-kicker") as HTMLElement;
const setupEl = document.querySelector("#setup") as HTMLElement;
const solveCard = document.querySelector("#solve-card") as HTMLButtonElement;
const solveBody = document.querySelector("#solve-body") as HTMLElement;
const gridEl = document.querySelector("#grid") as HTMLElement;
const gridWrap = document.querySelector("#grid-wrap") as HTMLElement;
const gridTitle = document.querySelector("#grid-title") as HTMLElement;
const gridLead = document.querySelector("#grid-lead") as HTMLElement;
const btnNext = document.querySelector("#btn-next") as HTMLButtonElement;
const btnLearned = document.querySelector("#btn-learned") as HTMLButtonElement;
const llDiagram = document.querySelector("#ll-diagram") as HTMLElement;
const playerHost = document.querySelector("#player-host") as HTMLElement;

let player: TwistyPlayer | null = null;

function createPlayer(): TwistyPlayer {
  const next = new TwistyPlayer({
    puzzle: "3x3x3",
    visualization: "3D",
    background: "none",
    controlPanel: "none",
    hintFacelets: "floating",
    viewerLink: "none",
    cameraLatitude: 35,
    cameraLongitude: 25,
    experimentalStickering: current?.stickering ?? "OLL",
    experimentalSetupAlg: current ? `z2 ${current.setupAlg}` : "",
    experimentalSetupAnchor: "start",
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

function showView(): void {
  const top = settings.view === "2d";
  llDiagram.hidden = !top;
  playerHost.hidden = top;
}

function tab(
  parent: HTMLElement,
  items: { id: string; label: string }[],
  active: string,
  onPick: (id: string) => void,
): void {
  parent.innerHTML = "";
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mode-tab" + (item.id === active ? " active" : "");
    button.textContent = item.label;
    button.addEventListener("click", () => onPick(item.id));
    parent.append(button);
  }
}

function applyView(): void {
  showView();
  if (settings.view === "3d") {
    remountPlayer();
    if (current) applyAlgToPlayer(current);
  }
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
    const sub = document.createElement("nav");
    sub.className = "mode-tabs";
    sub.setAttribute("aria-label", "Practice mode");
    tab(
      sub,
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
    filtersEl.append(sub);
  }

  tab(
    viewTabsEl,
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

function paintSolveCard(): void {
  solveCard.setAttribute("aria-expanded", revealed ? "true" : "false");
  if (!revealed || !current) {
    solveBody.textContent = "Tap to reveal";
    return;
  }
  solveBody.innerHTML = `${current.solveAlg}<span class="solve-hint">Tap to play</span>`;
}

function paintLearned(): void {
  const on = Boolean(current && getProgress(current.set, current.caseId).inPractice);
  btnLearned.setAttribute("aria-pressed", on ? "true" : "false");
  btnLearned.textContent = "Learned";
}

async function paintDiagram(d: Deal): Promise<void> {
  llDiagram.innerHTML = await llMarkup(d.setupAlg, d.set);
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
  paintSolveCard();
  paintLearned();
  btnNext.hidden = !(settings.phase === "practice" && settings.practiceSub === "feed");
  showView();
  void paintDiagram(d);
  if (settings.view === "3d") {
    remountPlayer();
    applyAlgToPlayer(d);
  }
  statusEl.textContent = d.displayName;
}

function reveal(): void {
  if (!current || revealed) return;
  revealed = true;
  paintSolveCard();
}

function playSolve(): void {
  if (!current) return;
  settings.view = "3d";
  saveSettings();
  renderChrome();
  showView();
  remountPlayer();
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

async function renderGrid(entries: CaseDef[], title: string, lead: string): Promise<void> {
  gridWrap.hidden = false;
  gridTitle.textContent = title;
  gridLead.textContent = lead;
  const marks = await Promise.all(
    entries.map((entry) => llMarkup(dealCase(settings.set, entry).setupAlg, settings.set, true)),
  );
  gridEl.innerHTML = "";
  let lastGroup = "";
  entries.forEach((entry, i) => {
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
    btn.innerHTML = marks[i];
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
  });
}

function paintGridHighlight(): void {
  for (const node of gridEl.querySelectorAll(".case-cell")) {
    const btn = node as HTMLButtonElement;
    btn.classList.toggle("current", btn.dataset.id === current?.caseId);
  }
}

let renderGen = 0;

async function renderAll(): Promise<void> {
  const gen = ++renderGen;
  renderChrome();
  emptyEl.hidden = true;
  emptyEl.textContent = "";
  gridWrap.hidden = true;
  gridEl.innerHTML = "";
  const setLabel = settings.set.toUpperCase();

  if (settings.phase === "learn") {
    const pool = learnCases();
    btnNext.hidden = true;
    if (!pool.length) {
      stageEl.hidden = true;
      current = null;
      emptyEl.hidden = false;
      emptyEl.textContent = `Every ${setLabel} case is marked Learned. Unmark one in Practice if you want it back here.`;
      statusEl.textContent = `${setLabel} · all learned`;
      return;
    }
    const keep =
      current &&
      current.set === settings.set &&
      pool.some((c) => c.id === current!.caseId);
    if (!keep) dealId(pool[0].id);
    else showDeal(dealCase(settings.set, pool.find((c) => c.id === current!.caseId)!));
    if (gen !== renderGen) return;
    await renderGrid(
      pool,
      `Learn ${setLabel}`,
      "Tap the solve card for the alg. Learned moves it into practice.",
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
      `Nothing in ${setLabel} practice yet. Switch to <strong>Learn</strong> and mark a case Learned.`;
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
    if (gen !== renderGen) return;
    await renderGrid(
      pool,
      `Practice ${setLabel}`,
      "The cases you marked Learned. Tap one to open it.",
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
solveCard.addEventListener("click", () => {
  if (!revealed) reveal();
  else playSolve();
});
btnLearned.addEventListener("click", () => {
  if (!current) return;
  const now = getProgress(current.set, current.caseId);
  setProgress(current.set, current.caseId, { inPractice: !now.inPractice });
  current = null;
  void renderAll();
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

void renderAll();
