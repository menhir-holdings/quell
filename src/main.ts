import { TwistyPlayer } from "cubing/twisty";
import {
  caseName,
  createAccount,
  currentAccount,
  deleteAccount,
  hydrateVault,
  listAccounts,
  markRevealed,
  markShown,
  renameAccount,
  setCaseName,
  switchAccount,
} from "./account";
import {
  casesFor,
  casesGrouped,
  dealCase,
  findCase,
  groupsFor,
  invertMoves,
  joinAlgs,
} from "./deal";
import { llMarkup } from "./ll";
import { chooseCase } from "./schedule";
import type { CubeView, Deal, DrillQueue, SetId, Settings } from "./types";
import "./style.css";

const SETTINGS_KEY = "quell.settings.v5";
const LEGACY_V4 = "quell.settings.v4";
const LEGACY_V3 = "quell.settings.v3";
const LEGACY_V2 = "quell.settings.v2";

type Surface = "train" | "cases" | "account";

const DEFAULTS: Settings = { set: "oll", view: "2d", queue: null };

function coerceQueue(raw: unknown): DrillQueue | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Partial<DrillQueue>;
  if (parsed.set !== "oll" && parsed.set !== "pll") return null;
  if (!Array.isArray(parsed.ids) || !parsed.ids.length) return null;
  const ids = parsed.ids.map(String).filter(Boolean);
  if (!ids.length) return null;
  return {
    set: parsed.set,
    label: typeof parsed.label === "string" && parsed.label.trim() ? parsed.label : "Subset",
    ids,
  };
}

function coerceSettings(parsed: Partial<Settings> & { queue?: unknown }): Settings {
  return {
    set: parsed.set === "pll" ? "pll" : "oll",
    view: parsed.view === "3d" ? "3d" : "2d",
    queue: coerceQueue(parsed.queue),
  };
}

function loadSettings(): Settings {
  try {
    const raw =
      localStorage.getItem(SETTINGS_KEY) ??
      localStorage.getItem(LEGACY_V4) ??
      localStorage.getItem(LEGACY_V3) ??
      localStorage.getItem(LEGACY_V2);
    if (!raw) return { ...DEFAULTS };
    return coerceSettings(JSON.parse(raw) as Partial<Settings>);
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

const settings = loadSettings();
let surface: Surface = "train";
let browseSet: SetId = settings.set;
let peekId: string | null = null;
let current: Deal | null = null;
let algOpen = false;
let checkOpen = false;
let chain = "";
let recent: string[] = [];
let checkGen = 0;
let editingName = false;
let namePrompt: { set: SetId; id: string; token: number } | null = null;
let namePromptToken = 0;

const appEl = document.querySelector("#app") as HTMLElement;
const stageEl = document.querySelector("#stage") as HTMLElement;
const placesEl = document.querySelector("#places") as HTMLElement;
const setsEl = document.querySelector("#sets") as HTMLElement;
const viewTabsEl = document.querySelector("#view-tabs") as HTMLElement;
const nameEl = document.querySelector("#case-name") as HTMLElement;
const nameEdit = document.querySelector("#name-edit") as HTMLInputElement;
const algCard = document.querySelector("#alg-card") as HTMLButtonElement;
const algBody = document.querySelector("#alg-body") as HTMLElement;
const checkCard = document.querySelector("#check-card") as HTMLButtonElement;
const checkBody = document.querySelector("#check-body") as HTMLElement;
const llDiagram = document.querySelector("#ll-diagram") as HTMLElement;
const playerHost = document.querySelector("#player-host") as HTMLElement;
const btnMenu = document.querySelector("#btn-menu") as HTMLButtonElement;
const menuEl = document.querySelector("#menu") as HTMLElement;
const accountList = document.querySelector("#account-list") as HTMLElement;
const btnNewAccount = document.querySelector("#btn-new-account") as HTMLButtonElement;
const nameDialog = document.querySelector("#name-dialog") as HTMLDialogElement;
const nameDialogInput = document.querySelector("#name-dialog-input") as HTMLInputElement;
const btnSaveName = document.querySelector("#btn-save-name") as HTMLButtonElement;
const accountDialog = document.querySelector("#account-dialog") as HTMLDialogElement;
const accountDialogInput = document.querySelector(
  "#account-dialog-input",
) as HTMLInputElement;
const btnSaveAccount = document.querySelector("#btn-save-account") as HTMLButtonElement;
const accountPage = document.querySelector("#account-page") as HTMLElement;
const casesPage = document.querySelector("#cases-page") as HTMLElement;
const accountBack = document.querySelector("#account-back") as HTMLButtonElement;
const accountName = document.querySelector("#account-name") as HTMLInputElement;
const btnDeleteAccount = document.querySelector("#btn-delete-account") as HTMLButtonElement;
const deleteDialog = document.querySelector("#delete-dialog") as HTMLDialogElement;
const deleteTitle = document.querySelector("#delete-title") as HTMLElement;
const deleteCopy = document.querySelector("#delete-copy") as HTMLElement;
const btnLookup = document.querySelector("#btn-lookup") as HTMLButtonElement;
const queueChip = document.querySelector("#queue-chip") as HTMLElement;
const queueLabel = document.querySelector("#queue-label") as HTMLElement;
const btnClearQueue = document.querySelector("#btn-clear-queue") as HTMLButtonElement;
const btnResume = document.querySelector("#btn-resume") as HTMLButtonElement;
const resumeName = document.querySelector("#resume-name") as HTMLElement;
const casesSearch = document.querySelector("#cases-search") as HTMLInputElement;
const queueList = document.querySelector("#queue-list") as HTMLElement;
const casesList = document.querySelector("#cases-list") as HTMLElement;
const dockEl = document.querySelector("#dock") as HTMLElement;
const dockTrain = document.querySelector("#dock-train") as HTMLButtonElement;
const dockCases = document.querySelector("#dock-cases") as HTMLButtonElement;

let player: TwistyPlayer | null = null;

function named(value: string): boolean {
  return value.trim().length > 0;
}

function resetChain(): void {
  chain = "";
  recent = [];
}

function twistySetup(): string {
  return chain ? `z2 ${chain}` : "z2";
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
    button.dataset.id = item.id;
    button.className = "mode-tab" + (item.id === active ? " active" : "");
    button.setAttribute("aria-pressed", item.id === active ? "true" : "false");
    button.textContent = item.label;
    button.addEventListener("click", () => onPick(item.id));
    parent.append(button);
  }
}

function closeMenu(): void {
  menuEl.hidden = true;
  btnMenu.setAttribute("aria-expanded", "false");
}

function activeQueue(): DrillQueue | null {
  const queue = settings.queue;
  if (!queue || queue.set !== settings.set) return null;
  return queue;
}

function poolIds(): string[] | undefined {
  return activeQueue()?.ids;
}

function paintQueueChip(): void {
  const queue = activeQueue();
  appEl.dataset.queue = queue ? "on" : "off";
  if (!queue) {
    queueChip.hidden = true;
    queueLabel.textContent = "";
    return;
  }
  queueChip.hidden = false;
  queueLabel.textContent = `Drilling ${queue.label} · ${queue.ids.length}`;
}

function setQueue(queue: DrillQueue | null): void {
  settings.queue = queue;
  saveSettings();
  paintQueueChip();
}

function showSurface(next: Surface): void {
  commitName();
  closeMenu();
  surface = next;
  appEl.dataset.surface = next;
  stageEl.hidden = next !== "train";
  casesPage.hidden = next !== "cases";
  accountPage.hidden = next !== "account";
  dockEl.hidden = next === "account";
  renderChrome();
  if (next === "cases") {
    paintResume();
    paintQueues();
    paintCasesList();
  }
}

function openCasesFromTrain(): void {
  browseSet = settings.set;
  casesSearch.value = "";
  peekId = null;
  showSurface("cases");
}

function openAccountPage(): void {
  commitName();
  const account = currentAccount();
  accountName.value = account.label;
  showSurface("account");
  accountName.focus();
  accountName.select();
}

function closeAccountPage(save = true): void {
  if (save && surface === "account") commitAccountLabel();
  showSurface("train");
}

function commitAccountLabel(): void {
  const next = accountName.value;
  if (!named(next)) {
    accountName.value = currentAccount().label;
    return;
  }
  renameAccount(currentAccount().id, next);
}

function promptDeleteAccount(): void {
  const account = currentAccount();
  deleteTitle.textContent = `Delete ${account.label}?`;
  deleteCopy.textContent =
    "Case names on this account go with it. This cannot be undone.";
  deleteDialog.returnValue = "";
  deleteDialog.showModal();
}

function confirmDeleteAccount(): void {
  deleteAccount(currentAccount().id);
  resetChain();
  setQueue(null);
  showSurface("train");
  dealFresh();
}

function dialogOpen(): boolean {
  return nameDialog.open || accountDialog.open || deleteDialog.open;
}

function renderAccounts(): void {
  const accounts = listAccounts();
  const activeId = currentAccount().id;
  accountList.innerHTML = "";
  for (const account of accounts) {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "menuitem";
    button.className = "menu-account" + (account.id === activeId ? " current" : "");
    button.textContent = account.label;
    if (account.id === activeId) {
      button.setAttribute("aria-current", "true");
      button.setAttribute("aria-label", `${account.label}, account details`);
    }
    button.addEventListener("click", () => {
      closeMenu();
      if (account.id === activeId) {
        openAccountPage();
        return;
      }
      switchAccount(account.id);
      resetChain();
      setQueue(null);
      showSurface("train");
      dealFresh();
    });
    accountList.append(button);
  }
}

function paintPlaces(): void {
  tab(
    placesEl,
    [
      { id: "train", label: "Train" },
      { id: "cases", label: "Cases" },
    ],
    surface === "account" ? "train" : surface,
    (id) => {
      if (id === "cases") {
        if (surface !== "cases") {
          browseSet = settings.set;
          peekId = null;
        }
        showSurface("cases");
        return;
      }
      showSurface("train");
    },
  );
}

function paintDock(): void {
  const here = surface === "cases" ? "cases" : "train";
  dockTrain.classList.toggle("active", here === "train");
  dockCases.classList.toggle("active", here === "cases");
  if (here === "train") dockTrain.setAttribute("aria-current", "page");
  else dockTrain.removeAttribute("aria-current");
  if (here === "cases") dockCases.setAttribute("aria-current", "page");
  else dockCases.removeAttribute("aria-current");
}

function renderChrome(): void {
  const setActive = surface === "cases" ? browseSet : settings.set;
  tab(
    setsEl,
    [
      { id: "oll", label: "OLL" },
      { id: "pll", label: "PLL" },
    ],
    setActive,
    (id) => {
      const next = id as SetId;
      if (surface === "cases") {
        if (next === browseSet) return;
        browseSet = next;
        peekId = null;
        casesSearch.value = "";
        renderChrome();
        paintQueues();
        paintCasesList();
        return;
      }
      if (next === settings.set) return;
      settings.set = next;
      if (settings.queue?.set !== next) settings.queue = null;
      saveSettings();
      resetChain();
      renderChrome();
      paintQueueChip();
      dealFresh();
    },
  );
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
  paintPlaces();
  paintDock();
  paintQueueChip();
}

function applyView(): void {
  showView();
  if (settings.view === "3d" && current) {
    remountPlayer();
    applyAlgToPlayer(current, algOpen);
  }
}

function stopNameEdit(save: boolean): void {
  if (!editingName || !current) return;
  const next = nameEdit.value;
  editingName = false;
  nameEdit.hidden = true;
  if (save && named(next)) {
    setCaseName(current.set, current.caseId, next);
    current.displayName = caseName(current.set, current.caseId);
  }
  paintName();
}

function commitName(): void {
  if (editingName) stopNameEdit(true);
}

function startNameEdit(): void {
  if (!current || editingName) return;
  const custom = caseName(current.set, current.caseId);
  editingName = true;
  nameEl.hidden = true;
  nameEdit.hidden = false;
  nameEdit.value = custom;
  nameEdit.placeholder = "";
  nameEdit.focus();
  if (named(custom)) nameEdit.select();
}

function caseIsNamed(set: SetId, id: string): boolean {
  return named(caseName(set, id));
}

function promptForName(): void {
  if (!current || nameDialog.open) return;
  const token = ++namePromptToken;
  const target = { set: current.set, id: current.caseId, token };
  namePrompt = target;
  nameDialogInput.value = "";
  btnSaveName.disabled = true;
  nameDialog.returnValue = "";
  requestAnimationFrame(() => {
    if (namePrompt?.token !== token) return;
    if (caseIsNamed(target.set, target.id)) {
      namePrompt = null;
      advance();
      return;
    }
    nameDialog.showModal();
    nameDialogInput.focus();
  });
}

function paintName(): void {
  if (editingName) return;
  const custom = current ? caseName(current.set, current.caseId) : "";
  if (current) current.displayName = custom;
  nameEdit.hidden = true;
  if (!current) {
    nameEl.hidden = true;
    nameEl.textContent = "";
    nameEl.classList.remove("canonical");
    return;
  }
  const customNamed = named(custom);
  nameEl.hidden = false;
  nameEl.textContent = customNamed ? custom : current.canonicalName;
  nameEl.classList.toggle("canonical", !customNamed);
}

function paintAlg(): void {
  algCard.setAttribute("aria-expanded", algOpen ? "true" : "false");
  if (!algOpen || !current) {
    algBody.textContent = "Tap to reveal";
    return;
  }
  algBody.innerHTML = `${current.solveAlg}<span class="solve-hint">Tap to play</span>`;
}

function paintCheck(): void {
  checkCard.setAttribute("aria-expanded", checkOpen ? "true" : "false");
  if (!checkOpen || !current) {
    checkBody.textContent = "Tap to check the cube";
    return;
  }
  const d = current;
  const gen = ++checkGen;
  void llMarkup(joinAlgs(chain, d.solveAlg), d.set).then((svg) => {
    if (gen !== checkGen || current?.caseId !== d.caseId || !checkOpen) return;
    checkBody.innerHTML = `${svg}<span class="solve-hint">Tap to play</span>`;
  });
}

function showDeal(d: Deal): void {
  stopNameEdit(false);
  if (nameDialog.open) {
    namePrompt = null;
    nameDialog.close("cancel");
  }
  current = d;
  algOpen = false;
  checkOpen = false;
  checkGen += 1;
  paintName();
  paintAlg();
  paintCheck();
  paintQueueChip();
  paintResume();
  showView();
  void llMarkup(d.setupAlg, d.set).then((svg) => {
    if (current?.caseId !== d.caseId) return;
    llDiagram.innerHTML = svg;
  });
  if (settings.view === "3d") {
    remountPlayer();
    applyAlgToPlayer(d);
  }
  markShown(d.set, d.caseId);
}

function revealAlg(): void {
  if (!current || algOpen) return;
  algOpen = true;
  markRevealed(current.set, current.caseId);
  paintAlg();
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

function pickEntry(avoidId?: string) {
  return chooseCase({
    set: settings.set,
    recent,
    avoidId,
    ids: poolIds(),
  });
}

function dealFresh(): void {
  const entry = pickEntry();
  showDeal(dealCase(settings.set, entry));
}

function advance(): void {
  if (current) {
    chain = joinAlgs(chain, current.solveAlg);
    recent.push(current.caseId);
  }
  const entry = pickEntry(current?.caseId);
  const found = findCase(settings.set, entry.id) ?? entry;
  showDeal(dealCase(settings.set, found));
}

function startDrill(set: SetId, ids: string[], label: string): void {
  settings.set = set;
  browseSet = set;
  setQueue(ids.length === casesFor(set).length ? null : { set, label, ids });
  resetChain();
  peekId = null;
  renderChrome();
  showSurface("train");
  dealFresh();
}

function clearQueue(): void {
  setQueue(null);
}

const thumbCache = new Map<string, string>();
const thumbWait: Array<() => void> = [];
let thumbInflight = 0;

function thumbKey(set: SetId, id: string): string {
  return `${set}:${id}`;
}

async function withThumbSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (thumbInflight >= 4) await new Promise<void>((resolve) => thumbWait.push(resolve));
  thumbInflight += 1;
  try {
    return await fn();
  } finally {
    thumbInflight -= 1;
    thumbWait.shift()?.();
  }
}

function fillThumb(el: HTMLElement): void {
  const set = el.dataset.set as SetId | undefined;
  const id = el.dataset.id;
  const setup = el.dataset.setup;
  if (!set || !id || setup == null) return;
  const key = thumbKey(set, id);
  const cached = thumbCache.get(key);
  if (cached) {
    el.innerHTML = cached;
    return;
  }
  void withThumbSlot(async () => {
    if (thumbCache.has(key)) {
      if (el.dataset.id === id) el.innerHTML = thumbCache.get(key) ?? "";
      return;
    }
    const svg = await llMarkup(setup, set, true);
    thumbCache.set(key, svg);
    if (el.dataset.id === id) el.innerHTML = thumbCache.get(key) ?? "";
  });
}

const thumbObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      thumbObserver.unobserve(el);
      fillThumb(el);
    }
  },
  { root: casesPage, rootMargin: "160px", threshold: 0.01 },
);

function paintResume(): void {
  if (!current) {
    btnResume.hidden = true;
    resumeName.textContent = "";
    return;
  }
  const custom = caseName(current.set, current.caseId);
  btnResume.hidden = false;
  resumeName.textContent = named(custom) ? custom : current.canonicalName;
}

function paintQueues(): void {
  queueList.innerHTML = "";
  const all = casesFor(browseSet);
  const rows = [
    { group: browseSet === "oll" ? "All OLL" : "All PLL", ids: all.map((entry) => entry.id) },
    ...groupsFor(browseSet),
  ];
  for (const row of rows) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "queue-row";
    const copy = document.createElement("span");
    copy.className = "queue-copy";
    const title = document.createElement("span");
    title.className = "queue-name";
    title.textContent = row.group;
    const meta = document.createElement("span");
    meta.className = "queue-meta";
    meta.textContent = `${row.ids.length} case${row.ids.length === 1 ? "" : "s"}`;
    copy.append(title, meta);
    const drill = document.createElement("span");
    drill.className = "pill primary";
    drill.textContent = "Drill";
    button.append(copy, drill);
    button.addEventListener("click", () => startDrill(browseSet, row.ids, row.group));
    queueList.append(button);
  }
}

function paintCasesList(): void {
  const q = casesSearch.value.trim().toLowerCase();
  thumbObserver.disconnect();
  casesList.innerHTML = "";
  let lastGroup = "";
  for (const entry of casesGrouped(browseSet)) {
    const custom = caseName(browseSet, entry.id);
    const hay = `${custom} ${entry.name} ${entry.id} ${entry.group}`.toLowerCase();
    if (q && !hay.includes(q)) continue;
    if (entry.group !== lastGroup) {
      lastGroup = entry.group;
      const head = document.createElement("p");
      head.className = "change-group";
      head.textContent = entry.group;
      casesList.append(head);
    }
    const card = document.createElement("div");
    card.className = "change-case";
    card.setAttribute("role", "listitem");
    const open = peekId === entry.id;
    card.setAttribute("aria-expanded", open ? "true" : "false");
    const main = document.createElement("button");
    main.type = "button";
    main.className = "change-case-main";
    const thumb = document.createElement("span");
    thumb.className = "change-thumb";
    thumb.dataset.set = browseSet;
    thumb.dataset.id = entry.id;
    thumb.dataset.setup = invertMoves(entry.algs[0].moves);
    const copy = document.createElement("span");
    copy.className = "change-copy";
    const title = document.createElement("span");
    title.className = "change-case-name";
    title.textContent = custom || entry.name;
    copy.append(title);
    if (custom && custom !== entry.name) {
      const meta = document.createElement("span");
      meta.className = "change-case-meta";
      meta.textContent = entry.name;
      copy.append(meta);
    } else {
      const meta = document.createElement("span");
      meta.className = "change-case-meta";
      meta.textContent = open ? "Hide alg" : "Show alg";
      copy.append(meta);
    }
    main.append(thumb, copy);
    main.addEventListener("click", () => {
      peekId = peekId === entry.id ? null : entry.id;
      paintCasesList();
    });
    card.append(main);
    if (open) {
      const peek = document.createElement("div");
      peek.className = "cases-peek";
      const alg = document.createElement("p");
      alg.className = "cases-alg";
      alg.textContent = entry.algs[0].moves;
      const drill = document.createElement("button");
      drill.type = "button";
      drill.className = "pill";
      drill.textContent = "Drill this";
      drill.addEventListener("click", () => {
        startDrill(browseSet, [entry.id], custom || entry.name);
      });
      peek.append(alg, drill);
      card.append(peek);
      fillThumb(thumb);
    } else {
      thumbObserver.observe(thumb);
    }
    casesList.append(card);
  }
  if (!casesList.querySelector(".change-case")) {
    const empty = document.createElement("p");
    empty.className = "change-case-meta";
    empty.textContent = "No cases match.";
    casesList.append(empty);
  }
}

function requestNext(): void {
  commitName();
  if (!current) {
    dealFresh();
    return;
  }
  if (!caseIsNamed(current.set, current.caseId)) {
    promptForName();
    return;
  }
  advance();
}

function renderAll(): void {
  renderChrome();
  paintQueueChip();
  showSurface("train");
  if (current && current.set === settings.set) {
    const entry = findCase(settings.set, current.caseId);
    if (entry) {
      showDeal(dealCase(settings.set, entry));
      return;
    }
  }
  dealFresh();
}

nameEl.addEventListener("click", () => startNameEdit());
nameEdit.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    ev.preventDefault();
    stopNameEdit(true);
  }
  if (ev.key === "Escape") {
    ev.preventDefault();
    stopNameEdit(false);
  }
});
nameEdit.addEventListener("blur", () => stopNameEdit(true));

document.querySelector("#btn-next")!.addEventListener("click", () => requestNext());
btnLookup.addEventListener("click", () => openCasesFromTrain());
btnClearQueue.addEventListener("click", () => clearQueue());
btnResume.addEventListener("click", () => showSurface("train"));
casesSearch.addEventListener("input", () => paintCasesList());
dockTrain.addEventListener("click", () => showSurface("train"));
dockCases.addEventListener("click", () => {
  if (surface !== "cases") {
    browseSet = settings.set;
    peekId = null;
  }
  showSurface("cases");
});
algCard.addEventListener("click", () => {
  commitName();
  if (!algOpen) revealAlg();
  else playSolve();
});
checkCard.addEventListener("click", () => {
  commitName();
  if (!checkOpen) {
    checkOpen = true;
    paintCheck();
    return;
  }
  playSolve();
});

nameDialogInput.addEventListener("input", () => {
  btnSaveName.disabled = !named(nameDialogInput.value);
});
nameDialog.addEventListener("close", () => {
  const prompt = namePrompt;
  namePrompt = null;
  const save = nameDialog.returnValue === "save";
  const text = nameDialogInput.value;
  nameDialog.returnValue = "";
  nameDialogInput.value = "";
  btnSaveName.disabled = true;
  if (!save || !prompt || !named(text)) return;
  setCaseName(prompt.set, prompt.id, text);
  if (current?.set === prompt.set && current.caseId === prompt.id) {
    current.displayName = caseName(prompt.set, prompt.id);
    paintName();
    advance();
  }
});

accountDialogInput.addEventListener("input", () => {
  btnSaveAccount.disabled = !named(accountDialogInput.value);
});
accountDialog.addEventListener("close", () => {
  if (accountDialog.returnValue !== "save" || !named(accountDialogInput.value)) return;
  createAccount(accountDialogInput.value);
  resetChain();
  setQueue(null);
  showSurface("train");
  dealFresh();
});

btnMenu.addEventListener("click", (ev) => {
  ev.stopPropagation();
  const open = menuEl.hidden;
  if (open) renderAccounts();
  menuEl.hidden = !open;
  btnMenu.setAttribute("aria-expanded", open ? "true" : "false");
});
btnNewAccount.addEventListener("click", () => {
  closeMenu();
  accountDialogInput.value = "";
  btnSaveAccount.disabled = true;
  accountDialog.returnValue = "";
  accountDialog.showModal();
  accountDialogInput.focus();
});
accountBack.addEventListener("click", () => closeAccountPage());
accountName.addEventListener("input", () => {
  if (!named(accountName.value)) return;
  renameAccount(currentAccount().id, accountName.value);
});
accountName.addEventListener("blur", () => commitAccountLabel());
accountName.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    ev.preventDefault();
    closeAccountPage();
  }
});
btnDeleteAccount.addEventListener("click", () => promptDeleteAccount());
deleteDialog.addEventListener("close", () => {
  if (deleteDialog.returnValue !== "delete") return;
  confirmDeleteAccount();
});
for (const btn of document.querySelectorAll<HTMLButtonElement>(".dialog-cancel")) {
  btn.addEventListener("click", () => btn.closest("dialog")?.close("cancel"));
}
document.addEventListener("click", () => closeMenu());
menuEl.addEventListener("click", (ev) => ev.stopPropagation());

window.addEventListener("keydown", (ev) => {
  const tag = (ev.target as HTMLElement | null)?.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
  if (ev.code === "Escape") {
    closeMenu();
    stopNameEdit(false);
    if (dialogOpen()) return;
    if (surface === "account") {
      closeAccountPage();
      return;
    }
    if (surface === "cases") {
      showSurface("train");
      return;
    }
  }
  if (dialogOpen() || surface !== "train") return;
  if (ev.code === "Space") {
    ev.preventDefault();
    requestNext();
  } else if (ev.key === "r" || ev.key === "R") {
    if (!algOpen) revealAlg();
  } else if (ev.key === "l" || ev.key === "L") {
    openCasesFromTrain();
  }
});

void renderAll();
void hydrateVault().then(() => {
  if (current) paintName();
  if (surface === "cases") paintCasesList();
});

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
