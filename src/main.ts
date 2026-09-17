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
import { lastLayer, llMarkup, tabIconSvg } from "./ll";
import { chooseCase } from "./schedule";
import type { CubeView, Deal, DrillQueue, SetId, Settings } from "./types";
import "./style.css";

const SETTINGS_KEY = "quell.settings.v5";
const LEGACY_V4 = "quell.settings.v4";
const LEGACY_V3 = "quell.settings.v3";
const LEGACY_V2 = "quell.settings.v2";

type Surface = "learn" | "practice" | "account";

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
let surface: Surface = "learn";
let browseSet: SetId = settings.set;
let lookupSet: SetId = settings.set;
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
const practicePage = document.querySelector("#practice-page") as HTMLElement;
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
const lookupSheet = document.querySelector("#lookup-sheet") as HTMLDialogElement;
const lookupSetsEl = document.querySelector("#lookup-sets") as HTMLElement;
const lookupSearch = document.querySelector("#lookup-search") as HTMLInputElement;
const lookupList = document.querySelector("#lookup-list") as HTMLElement;
const lookupPeek = document.querySelector("#lookup-peek") as HTMLElement;
const lookupPeekThumb = document.querySelector("#lookup-peek-thumb") as HTMLElement;
const lookupPeekName = document.querySelector("#lookup-peek-name") as HTMLElement;
const lookupPeekAlg = document.querySelector("#lookup-peek-alg") as HTMLElement;
const btnLookupDone = document.querySelector("#btn-lookup-done") as HTMLButtonElement;
const queueList = document.querySelector("#queue-list") as HTMLElement;
const dockEl = document.querySelector("#dock") as HTMLElement;
const dockLearn = document.querySelector("#dock-learn") as HTMLButtonElement;
const dockPractice = document.querySelector("#dock-practice") as HTMLButtonElement;

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
  queueLabel.textContent = `Practice · ${queue.label} · ${queue.ids.length}`;
}

function setQueue(queue: DrillQueue | null): void {
  settings.queue = queue;
  saveSettings();
  paintQueueChip();
}

function showSurface(next: Surface): void {
  commitName();
  closeMenu();
  closeLookup();
  surface = next;
  appEl.dataset.surface = next;
  stageEl.hidden = next !== "learn";
  practicePage.hidden = next !== "practice";
  accountPage.hidden = next !== "account";
  dockEl.hidden = next === "account";
  renderChrome();
  if (next === "practice") {
    paintResume();
    paintQueues();
  }
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
  showSurface("learn");
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
  showSurface("learn");
  dealFresh();
}

function lookupOpen(): boolean {
  return lookupSheet.open;
}

function dialogOpen(): boolean {
  return nameDialog.open || accountDialog.open || deleteDialog.open || lookupOpen();
}

function paintLookupSets(): void {
  tab(
    lookupSetsEl,
    [
      { id: "oll", label: "OLL" },
      { id: "pll", label: "PLL" },
    ],
    lookupSet,
    (id) => {
      const next = id as SetId;
      if (next === lookupSet) return;
      lookupSet = next;
      peekId = null;
      lookupSearch.value = "";
      paintLookupSets();
      paintLookupList();
      paintLookupPeek();
    },
  );
}

function openLookup(): void {
  commitName();
  closeMenu();
  lookupSet = settings.set;
  lookupSearch.value = "";
  peekId = null;
  paintLookupSets();
  appEl.dataset.lookup = "on";
  btnLookup.setAttribute("aria-expanded", "true");
  lookupSheet.showModal();
  paintLookupList();
  paintLookupPeek();
  btnLookupDone.focus();
}

function closeLookup(): void {
  appEl.dataset.lookup = "off";
  btnLookup.setAttribute("aria-expanded", "false");
  if (lookupSheet.open) lookupSheet.close();
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
      showSurface("learn");
      dealFresh();
    });
    accountList.append(button);
  }
}

function paintPlaces(): void {
  tab(
    placesEl,
    [
      { id: "learn", label: "Learn" },
      { id: "practice", label: "Practice" },
    ],
    surface === "account" ? "learn" : surface,
    (id) => {
      if (id === "practice") {
        showSurface("practice");
        return;
      }
      showSurface("learn");
    },
  );
}

function paintDock(): void {
  const here = surface === "practice" ? "practice" : "learn";
  dockLearn.classList.toggle("active", here === "learn");
  dockPractice.classList.toggle("active", here === "practice");
  if (here === "learn") dockLearn.setAttribute("aria-current", "page");
  else dockLearn.removeAttribute("aria-current");
  if (here === "practice") dockPractice.setAttribute("aria-current", "page");
  else dockPractice.removeAttribute("aria-current");
}

function renderChrome(): void {
  const setActive = surface === "practice" ? browseSet : settings.set;
  tab(
    setsEl,
    [
      { id: "oll", label: "OLL" },
      { id: "pll", label: "PLL" },
    ],
    setActive,
    (id) => {
      const next = id as SetId;
      if (surface === "practice") {
        if (next === browseSet) return;
        browseSet = next;
        renderChrome();
        paintQueues();
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

function setTabIcon(svg: string): void {
  const href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  document.querySelectorAll('link[rel="icon"]').forEach((node) => node.remove());
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = href;
  document.head.appendChild(link);
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
  void lastLayer(d.setupAlg).then((ll) => {
    if (current?.caseId !== d.caseId) return;
    setTabIcon(tabIconSvg(ll, d.set));
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
  setQueue(ids.length === casesFor(set).length ? null : { set, label, ids });
  resetChain();
  peekId = null;
  renderChrome();
  showSurface("learn");
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
  { root: lookupList, rootMargin: "160px", threshold: 0.01 },
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
  const queue = activeQueue();
  const rows = [
    { group: browseSet === "oll" ? "All OLL" : "All PLL", ids: all.map((entry) => entry.id) },
    ...groupsFor(browseSet),
  ];
  for (const row of rows) {
    const same =
      !!queue &&
      queue.set === browseSet &&
      queue.ids.length === row.ids.length &&
      queue.ids.every((id) => row.ids.includes(id));
    const allCases = row.ids.length === all.length;
    const currentRow = allCases ? !queue && settings.set === browseSet : same;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "queue-row" + (currentRow ? " current" : "");
    if (currentRow) button.setAttribute("aria-current", "true");
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
    drill.textContent = "Start";
    button.append(copy, drill);
    button.addEventListener("click", () => startDrill(browseSet, row.ids, row.group));
    queueList.append(button);
  }
}

function paintLookupPeek(): void {
  if (!peekId) {
    lookupPeek.hidden = true;
    lookupPeekThumb.replaceChildren();
    lookupPeekName.textContent = "";
    lookupPeekAlg.textContent = "";
    return;
  }
  const entry = findCase(lookupSet, peekId);
  if (!entry) {
    peekId = null;
    lookupPeek.hidden = true;
    return;
  }
  const custom = caseName(lookupSet, entry.id);
  lookupPeek.hidden = false;
  lookupPeekName.textContent = custom || entry.name;
  lookupPeekAlg.textContent = entry.algs[0].moves;
  lookupPeekThumb.replaceChildren();
  lookupPeekThumb.dataset.set = lookupSet;
  lookupPeekThumb.dataset.id = entry.id;
  lookupPeekThumb.dataset.setup = invertMoves(entry.algs[0].moves);
  fillThumb(lookupPeekThumb);
}

function markLookupSelection(): void {
  for (const card of lookupList.querySelectorAll<HTMLElement>(".lookup-cell")) {
    const on = card.dataset.id === peekId;
    card.setAttribute("aria-pressed", on ? "true" : "false");
  }
}

function hydrateVisibleThumbs(): void {
  requestAnimationFrame(() => {
    const rootBox = lookupList.getBoundingClientRect();
    for (const thumb of lookupList.querySelectorAll<HTMLElement>(".lookup-thumb")) {
      const box = thumb.getBoundingClientRect();
      if (box.bottom < rootBox.top - 40 || box.top > rootBox.bottom + 160) continue;
      fillThumb(thumb);
    }
  });
}

function paintLookupList(): void {
  const q = lookupSearch.value.trim().toLowerCase();
  thumbObserver.disconnect();
  lookupList.innerHTML = "";
  let lastGroup = "";
  for (const entry of casesGrouped(lookupSet)) {
    const custom = caseName(lookupSet, entry.id);
    const hay = `${custom} ${entry.name} ${entry.id} ${entry.group}`.toLowerCase();
    if (q && !hay.includes(q)) continue;
    if (entry.group !== lastGroup) {
      lastGroup = entry.group;
      const head = document.createElement("p");
      head.className = "lookup-group";
      head.textContent = entry.group;
      lookupList.append(head);
    }
    const card = document.createElement("button");
    card.type = "button";
    card.className = "lookup-cell";
    card.dataset.id = entry.id;
    card.setAttribute("aria-label", custom || entry.name);
    card.setAttribute("aria-pressed", peekId === entry.id ? "true" : "false");
    const thumb = document.createElement("span");
    thumb.className = "lookup-thumb";
    thumb.dataset.set = lookupSet;
    thumb.dataset.id = entry.id;
    thumb.dataset.setup = invertMoves(entry.algs[0].moves);
    const copy = document.createElement("span");
    copy.className = "lookup-copy";
    const title = document.createElement("span");
    title.className = "lookup-name";
    title.textContent = custom || entry.name;
    copy.append(title);
    card.append(thumb, copy);
    thumbObserver.observe(thumb);
    card.addEventListener("click", () => {
      peekId = peekId === entry.id ? null : entry.id;
      markLookupSelection();
      paintLookupPeek();
    });
    lookupList.append(card);
  }
  if (!lookupList.querySelector(".lookup-cell")) {
    const empty = document.createElement("p");
    empty.className = "lookup-empty";
    empty.textContent = "No cases match.";
    lookupList.append(empty);
  }
  hydrateVisibleThumbs();
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
  showSurface("learn");
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
btnLookup.addEventListener("click", () => openLookup());
btnLookupDone.addEventListener("click", () => closeLookup());
lookupSheet.addEventListener("close", () => {
  appEl.dataset.lookup = "off";
  btnLookup.setAttribute("aria-expanded", "false");
  peekId = null;
  paintLookupPeek();
});
lookupSearch.addEventListener("input", () => paintLookupList());
lookupSearch.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") ev.preventDefault();
});
btnClearQueue.addEventListener("click", () => clearQueue());
btnResume.addEventListener("click", () => showSurface("learn"));
dockLearn.addEventListener("click", () => showSurface("learn"));
dockPractice.addEventListener("click", () => showSurface("practice"));
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
  showSurface("learn");
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
    if (lookupOpen()) {
      closeLookup();
      return;
    }
    if (dialogOpen()) return;
    if (surface === "account") {
      closeAccountPage();
      return;
    }
    if (surface === "practice") {
      showSurface("learn");
      return;
    }
  }
  if ((ev.key === "l" || ev.key === "L") && !nameDialog.open && !accountDialog.open && !deleteDialog.open) {
    ev.preventDefault();
    if (lookupOpen()) closeLookup();
    else if (surface === "learn") openLookup();
    return;
  }
  if (dialogOpen() || surface !== "learn") return;
  if (ev.code === "Space") {
    ev.preventDefault();
    requestNext();
  } else if (ev.key === "r" || ev.key === "R") {
    if (!algOpen) revealAlg();
  }
});

void renderAll();
void hydrateVault().then(() => {
  if (current) paintName();
  if (lookupOpen()) paintLookupList();
});

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
