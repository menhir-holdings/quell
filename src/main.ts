import { TwistyPlayer } from "cubing/twisty";
import { casesFor, dealCase, joinAlgs, nextInOrder, pickRandom } from "./deal";
import { identifyMoves } from "./identify";
import { llMarkup } from "./ll";
import { displayName, getProgress, resetLearned, setProgress } from "./progress";
import type { CaseDef, CubeView, Deal, NextMode, Phase, SetId, Settings } from "./types";
import "./style.css";

const SETTINGS_KEY = "quell.settings.v3";
const LEGACY_SETTINGS_KEY = "quell.settings.v2";

const DEFAULTS: Settings = {
  set: "oll",
  phase: "learn",
  nextMode: "random",
  chaining: false,
  view: "2d",
};

function coerceSettings(parsed: Partial<Settings> & { practiceSub?: string }): Settings {
  const nextMode: NextMode =
    parsed.nextMode === "pick" || parsed.nextMode === "random"
      ? parsed.nextMode
      : parsed.practiceSub === "select"
        ? "pick"
        : "random";
  return {
    set: parsed.set === "pll" ? "pll" : "oll",
    phase: parsed.phase === "practice" ? "practice" : "learn",
    view: parsed.view === "3d" ? "3d" : "2d",
    nextMode,
    chaining: Boolean(parsed.chaining),
  };
}

function loadSettings(): Settings {
  try {
    const raw =
      localStorage.getItem(SETTINGS_KEY) ?? localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    return coerceSettings(JSON.parse(raw) as Partial<Settings> & { practiceSub?: string });
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
let chain = "";
let chainCount = 0;
let revealGen = 0;
let foundGen = 0;
let foundEntry: CaseDef | null = null;

const setsEl = document.querySelector("#sets") as HTMLElement;
const phasesEl = document.querySelector("#phases") as HTMLElement;
const filtersEl = document.querySelector("#filters") as HTMLElement;
const viewTabsEl = document.querySelector("#view-tabs") as HTMLElement;
const statusEl = document.querySelector("#status") as HTMLElement;
const emptyEl = document.querySelector("#empty") as HTMLElement;
const stageEl = document.querySelector("#stage") as HTMLElement;
const caseEl = document.querySelector("#case-label") as HTMLElement;
const subEl = document.querySelector("#case-sub") as HTMLElement;
const promptEl = document.querySelector("#practice-prompt") as HTMLElement;
const nameInput = document.querySelector("#custom-name") as HTMLInputElement;
const setupBlock = document.querySelector("#setup-block") as HTMLElement;
const setupKicker = document.querySelector("#setup-kicker") as HTMLElement;
const setupEl = document.querySelector("#setup") as HTMLElement;
const solveCard = document.querySelector("#solve-card") as HTMLButtonElement;
const solveKicker = document.querySelector("#solve-kicker") as HTMLElement;
const solveBody = document.querySelector("#solve-body") as HTMLElement;
const gridEl = document.querySelector("#grid") as HTMLElement;
const gridWrap = document.querySelector("#grid-wrap") as HTMLElement;
const gridTitle = document.querySelector("#grid-title") as HTMLElement;
const gridLead = document.querySelector("#grid-lead") as HTMLElement;
const btnNext = document.querySelector("#btn-next") as HTMLButtonElement;
const btnLearned = document.querySelector("#btn-learned") as HTMLButtonElement;
const learnHint = document.querySelector("#learn-hint") as HTMLElement;
const foundCard = document.querySelector("#found-card") as HTMLElement;
const foundTitle = document.querySelector("#found-title") as HTMLElement;
const foundSub = document.querySelector("#found-sub") as HTMLElement;
const foundAlg = document.querySelector("#found-alg") as HTMLElement;
const foundName = document.querySelector("#found-name") as HTMLInputElement;
const foundHint = document.querySelector("#found-hint") as HTMLElement;
const btnLearnFound = document.querySelector("#btn-learn-found") as HTMLButtonElement;
const llDiagram = document.querySelector("#ll-diagram") as HTMLElement;
const playerHost = document.querySelector("#player-host") as HTMLElement;
const btnMenu = document.querySelector("#btn-menu") as HTMLButtonElement;
const menuEl = document.querySelector("#menu") as HTMLElement;
const btnResetLearned = document.querySelector("#btn-reset-learned") as HTMLButtonElement;
const resetDialog = document.querySelector("#reset-dialog") as HTMLDialogElement;

let player: TwistyPlayer | null = null;

function runningMoves(): string {
  return settings.chaining ? chain : "";
}

function resetChain(): void {
  chain = "";
  chainCount = 0;
}

function twistySetup(): string {
  if (!current) return "z2";
  if (settings.phase === "practice") {
    const run = runningMoves();
    return run ? `z2 ${run}` : "z2";
  }
  return `z2 ${current.setupAlg}`;
}

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
    experimentalSetupAlg: twistySetup(),
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
  p.experimentalSetupAlg = twistySetup();
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

function closeMenu(): void {
  menuEl.hidden = true;
  btnMenu.setAttribute("aria-expanded", "false");
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
      resetChain();
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
      resetChain();
      current = null;
      renderAll();
    },
  );

  filtersEl.innerHTML = "";
  if (settings.phase === "practice") {
    const nextNav = document.createElement("nav");
    nextNav.className = "mode-tabs";
    nextNav.setAttribute("aria-label", "Next");
    tab(
      nextNav,
      [
        { id: "random", label: "Random" },
        { id: "pick", label: "Pick" },
      ],
      settings.nextMode,
      (id) => {
        settings.nextMode = id as NextMode;
        saveSettings();
        renderChrome();
        paintStatus();
        if (!gridWrap.hidden) {
          gridLead.textContent =
            settings.nextMode === "random"
              ? "Next picks at random. Tap a case to jump without changing that."
              : "Next walks the list. Tap a case to jump without changing that.";
        }
      },
    );
    const chainBtn = document.createElement("button");
    chainBtn.type = "button";
    chainBtn.className = "learned";
    chainBtn.setAttribute("aria-pressed", settings.chaining ? "true" : "false");
    chainBtn.textContent = "Chain";
    chainBtn.addEventListener("click", () => {
      settings.chaining = !settings.chaining;
      saveSettings();
      resetChain();
      renderChrome();
      if (current) showDeal(current);
      else paintStatus();
    });
    filtersEl.append(nextNav, chainBtn);
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

function paintStatus(): void {
  const setLabel = settings.set.toUpperCase();
  if (settings.phase === "learn") {
    const n = learnCases().length;
    statusEl.textContent = n ? `${n} left to learn` : `${setLabel} · all learned`;
    return;
  }
  const n = practicedCases().length;
  if (!n) {
    statusEl.textContent = `${setLabel} · empty practice`;
    return;
  }
  const chainBit = settings.chaining ? `chain ${chainCount}` : "fresh";
  statusEl.textContent = `Practice · ${chainBit}`;
}

function named(value: string): boolean {
  return value.trim().length > 0;
}

function hideFound(): void {
  foundEntry = null;
  foundCard.hidden = true;
}

function paintFoundLearned(): void {
  const ready = named(foundName.value);
  btnLearnFound.disabled = !ready;
  foundHint.hidden = ready;
}

function showFound(entry: CaseDef): void {
  foundEntry = entry;
  const deal = dealCase(settings.set, entry);
  foundCard.hidden = false;
  foundTitle.textContent = deal.canonicalName;
  foundSub.textContent = deal.group;
  foundAlg.textContent = deal.solveAlg;
  foundName.value = getProgress(settings.set, entry.id).name;
  paintFoundLearned();
}

async function updateFound(): Promise<void> {
  const gen = ++foundGen;
  if (!current || settings.phase !== "practice" || !settings.chaining) {
    hideFound();
    return;
  }
  const moves = revealed
    ? joinAlgs(runningMoves(), current.solveAlg)
    : runningMoves();
  if (!moves) {
    hideFound();
    return;
  }
  const hit = await identifyMoves(moves, current.set);
  if (gen !== foundGen) return;
  if (hit.kind !== "case" || getProgress(current.set, hit.entry.id).inPractice) {
    hideFound();
    return;
  }
  showFound(hit.entry);
}

function paintSolveCard(): void {
  solveCard.setAttribute("aria-expanded", revealed ? "true" : "false");
  if (settings.phase === "learn") {
    solveKicker.textContent = "Solve";
    if (!revealed || !current) {
      solveBody.textContent = "Tap to reveal";
      return;
    }
    solveBody.innerHTML = `${current.solveAlg}<span class="solve-hint">Tap to play</span>`;
    return;
  }

  solveKicker.textContent = "After this alg";
  if (!revealed || !current) {
    solveBody.textContent = "Tap to check the cube";
    return;
  }
  const d = current;
  const gen = ++revealGen;
  void llMarkup(joinAlgs(runningMoves(), d.solveAlg), d.set).then((svg) => {
    if (gen !== revealGen || current?.caseId !== d.caseId || !revealed) return;
    solveBody.innerHTML = `${svg}<span class="solve-hint">Tap to play</span>`;
  });
  void updateFound();
}

function paintLearned(): void {
  const practicing = settings.phase === "practice";
  const on = Boolean(current && getProgress(current.set, current.caseId).inPractice);
  const ready = named(nameInput.value);
  btnLearned.hidden = practicing;
  learnHint.hidden = practicing || ready;
  btnLearned.disabled = practicing || !ready;
  btnLearned.setAttribute("aria-pressed", on ? "true" : "false");
  btnLearned.textContent = "Learned";
  nameInput.required = !practicing;
}

async function paintDiagram(d: Deal): Promise<void> {
  llDiagram.innerHTML = await llMarkup(d.setupAlg, d.set);
}

function showDeal(d: Deal): void {
  current = d;
  revealed = false;
  revealGen += 1;
  hideFound();
  stageEl.hidden = false;
  const practicing = settings.phase === "practice";
  caseEl.textContent = practicing ? `Do ${d.displayName}` : d.displayName;
  subEl.textContent =
    d.displayName === d.canonicalName
      ? `${d.group}`
      : `${d.canonicalName} · ${d.group}`;
  promptEl.hidden = !practicing;
  nameInput.value = getProgress(d.set, d.caseId).name;
  setupBlock.hidden = practicing;
  setupKicker.textContent =
    d.set === "pll" ? "Setup · from solved" : "Setup · from last layer oriented";
  setupEl.textContent = d.setupAlg;
  paintSolveCard();
  paintLearned();
  void updateFound();
  btnNext.hidden = !practicing;
  showView();
  void paintDiagram(d);
  if (settings.view === "3d") {
    remountPlayer();
    applyAlgToPlayer(d);
  }
  paintStatus();
}

function reveal(): void {
  if (!current || revealed) return;
  revealed = true;
  paintSolveCard();
  void updateFound();
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

function nextPractice(append = true): void {
  const pool = practicedCases();
  if (!pool.length) {
    current = null;
    stageEl.hidden = true;
    paintStatus();
    return;
  }
  if (append && settings.chaining && current) {
    chain = joinAlgs(chain, current.solveAlg);
    chainCount += 1;
  }
  const entry =
    settings.nextMode === "random"
      ? pickRandom(pool, current?.caseId)
      : nextInOrder(pool, current?.caseId);
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

async function refreshPracticeGrid(): Promise<void> {
  const pool = practicedCases();
  if (!pool.length) {
    void renderAll();
    return;
  }
  await renderGrid(
    pool,
    `Practice ${settings.set.toUpperCase()}`,
    settings.nextMode === "random"
      ? "Next picks at random. Tap a case to jump without changing that."
      : "Next walks the list. Tap a case to jump without changing that.",
  );
  paintStatus();
}

let renderGen = 0;

function keepCurrent(pool: CaseDef[]): boolean {
  return Boolean(
    current && current.set === settings.set && pool.some((c) => c.id === current!.caseId),
  );
}

async function renderAll(): Promise<void> {
  const gen = ++renderGen;
  renderChrome();
  hideFound();
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
      emptyEl.textContent = `Every ${setLabel} case is marked Learned. Open the menu to reset learned cases if you want them back here.`;
      paintStatus();
      return;
    }
    if (!keepCurrent(pool)) dealId(pool[0].id);
    else showDeal(dealCase(settings.set, pool.find((c) => c.id === current!.caseId)!));
    if (gen !== renderGen) return;
    await renderGrid(
      pool,
      `Learn ${setLabel}`,
      "Name the case, then Learned moves it into practice.",
    );
    paintStatus();
    return;
  }

  const pool = practicedCases();
  if (!pool.length) {
    stageEl.hidden = true;
    current = null;
    emptyEl.hidden = false;
    emptyEl.innerHTML =
      `Nothing in ${setLabel} practice yet. Switch to <strong>Learn</strong> and mark a case Learned.`;
    paintStatus();
    return;
  }

  if (!keepCurrent(pool)) nextPractice(false);
  else showDeal(dealCase(settings.set, pool.find((c) => c.id === current!.caseId)!));
  if (gen !== renderGen) return;
  await renderGrid(
    pool,
    `Practice ${setLabel}`,
    settings.nextMode === "random"
      ? "Next picks at random. Tap a case to jump without changing that."
      : "Next walks the list. Tap a case to jump without changing that.",
  );
  paintStatus();
}

nameInput.addEventListener("input", () => {
  if (!current) return;
  setProgress(current.set, current.caseId, { name: nameInput.value });
  current.displayName = displayName(
    current.set,
    current.caseId,
    current.canonicalName,
  );
  caseEl.textContent =
    settings.phase === "practice" ? `Do ${current.displayName}` : current.displayName;
  subEl.textContent =
    current.displayName === current.canonicalName
      ? current.group
      : `${current.canonicalName} · ${current.group}`;
  const cell = gridEl.querySelector(
    `.case-cell[data-id="${current.caseId}"] .cell-name`,
  );
  if (cell) cell.textContent = current.displayName;
  paintLearned();
});

foundName.addEventListener("input", () => {
  if (foundEntry) {
    setProgress(settings.set, foundEntry.id, { name: foundName.value });
  }
  paintFoundLearned();
});

btnNext.addEventListener("click", () => nextPractice(true));
solveCard.addEventListener("click", () => {
  if (!revealed) reveal();
  else playSolve();
});
btnLearned.addEventListener("click", () => {
  if (!current || settings.phase !== "learn" || !named(nameInput.value)) return;
  const pool = learnCases();
  const idx = pool.findIndex((entry) => entry.id === current!.caseId);
  setProgress(current.set, current.caseId, {
    name: nameInput.value.trim(),
    inPractice: true,
  });
  const rest = learnCases();
  if (!rest.length) {
    current = null;
    void renderAll();
    return;
  }
  const next = rest[Math.min(Math.max(idx, 0), rest.length - 1)];
  dealId(next.id);
  void renderAll();
});
btnLearnFound.addEventListener("click", () => {
  if (!foundEntry || !named(foundName.value)) return;
  setProgress(settings.set, foundEntry.id, {
    name: foundName.value.trim(),
    inPractice: true,
  });
  hideFound();
  void refreshPracticeGrid();
});

btnMenu.addEventListener("click", (ev) => {
  ev.stopPropagation();
  const open = menuEl.hidden;
  menuEl.hidden = !open;
  btnMenu.setAttribute("aria-expanded", open ? "true" : "false");
});
btnResetLearned.addEventListener("click", () => {
  closeMenu();
  resetDialog.showModal();
});
resetDialog.addEventListener("close", () => {
  if (resetDialog.returnValue !== "reset") return;
  resetLearned();
  resetChain();
  current = null;
  void renderAll();
});
document.addEventListener("click", () => closeMenu());
menuEl.addEventListener("click", (ev) => ev.stopPropagation());

window.addEventListener("keydown", (ev) => {
  const tag = (ev.target as HTMLElement | null)?.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
  if (ev.code === "Escape") closeMenu();
  if (ev.code === "Space") {
    ev.preventDefault();
    if (settings.phase === "practice" && practicedCases().length) nextPractice(true);
  } else if (ev.key === "r" || ev.key === "R") {
    if (!revealed) reveal();
  }
});

void renderAll();
