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
import { casesGrouped, dealCase, findCase, invertMoves, joinAlgs } from "./deal";
import { llMarkup } from "./ll";
import { chooseCase } from "./schedule";
import type { CubeView, Deal, SetId, Settings } from "./types";
import "./style.css";

const SETTINGS_KEY = "quell.settings.v4";
const LEGACY_V3 = "quell.settings.v3";
const LEGACY_V2 = "quell.settings.v2";

const DEFAULTS: Settings = { set: "oll", view: "2d" };

function coerceSettings(parsed: Partial<Settings>): Settings {
  return {
    set: parsed.set === "pll" ? "pll" : "oll",
    view: parsed.view === "3d" ? "3d" : "2d",
  };
}

function loadSettings(): Settings {
  try {
    const raw =
      localStorage.getItem(SETTINGS_KEY) ??
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
let current: Deal | null = null;
let algOpen = false;
let checkOpen = false;
let chain = "";
let recent: string[] = [];
let checkGen = 0;
let editingName = false;

const appEl = document.querySelector("#app") as HTMLElement;
const stageEl = document.querySelector("#stage") as HTMLElement;
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
const accountBack = document.querySelector("#account-back") as HTMLButtonElement;
const accountName = document.querySelector("#account-name") as HTMLInputElement;
const btnDeleteAccount = document.querySelector("#btn-delete-account") as HTMLButtonElement;
const deleteDialog = document.querySelector("#delete-dialog") as HTMLDialogElement;
const deleteTitle = document.querySelector("#delete-title") as HTMLElement;
const deleteCopy = document.querySelector("#delete-copy") as HTMLElement;
const btnChange = document.querySelector("#btn-change") as HTMLButtonElement;
const changeDialog = document.querySelector("#change-dialog") as HTMLDialogElement;
const changeSearch = document.querySelector("#change-search") as HTMLInputElement;
const changeList = document.querySelector("#change-list") as HTMLElement;

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

function openAccountPage(): void {
  commitName();
  const account = currentAccount();
  accountName.value = account.label;
  appEl.dataset.surface = "account";
  stageEl.hidden = true;
  accountPage.hidden = false;
  accountName.focus();
  accountName.select();
}

function closeAccountPage(save = true): void {
  if (save && !accountPage.hidden) commitAccountLabel();
  delete appEl.dataset.surface;
  accountPage.hidden = true;
  stageEl.hidden = false;
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
  closeAccountPage(false);
  resetChain();
  dealFresh();
}

function dialogOpen(): boolean {
  return nameDialog.open || accountDialog.open || deleteDialog.open || changeDialog.open;
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
      closeAccountPage(false);
      dealFresh();
    });
    accountList.append(button);
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
      if (id === settings.set) return;
      settings.set = id as SetId;
      saveSettings();
      resetChain();
      renderChrome();
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
  nameEdit.placeholder = current.canonicalName;
  nameEdit.focus();
  if (named(custom)) nameEdit.select();
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
  current = d;
  algOpen = false;
  checkOpen = false;
  checkGen += 1;
  paintName();
  paintAlg();
  paintCheck();
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

function dealFresh(): void {
  const entry = chooseCase({ set: settings.set, recent: [] });
  showDeal(dealCase(settings.set, entry));
}

function advance(): void {
  if (current) {
    chain = joinAlgs(chain, current.solveAlg);
    recent.push(current.caseId);
  }
  const entry = chooseCase({
    set: settings.set,
    recent,
    avoidId: current?.caseId,
  });
  const found = findCase(settings.set, entry.id) ?? entry;
  showDeal(dealCase(settings.set, found));
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
    if (el.dataset.id === id) el.innerHTML = svg;
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
  { root: changeList, rootMargin: "160px", threshold: 0.01 },
);

function pickCase(id: string): void {
  const entry = findCase(settings.set, id);
  if (!entry) return;
  changeDialog.close("pick");
  resetChain();
  showDeal(dealCase(settings.set, entry));
}

function paintChangeList(): void {
  const q = changeSearch.value.trim().toLowerCase();
  thumbObserver.disconnect();
  changeList.innerHTML = "";
  let lastGroup = "";
  for (const entry of casesGrouped(settings.set)) {
    const custom = caseName(settings.set, entry.id);
    const hay = `${custom} ${entry.name} ${entry.id} ${entry.group}`.toLowerCase();
    if (q && !hay.includes(q)) continue;
    if (entry.group !== lastGroup) {
      lastGroup = entry.group;
      const head = document.createElement("p");
      head.className = "change-group";
      head.textContent = entry.group;
      changeList.append(head);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "change-case";
    button.setAttribute("role", "option");
    if (current?.caseId === entry.id) button.setAttribute("aria-current", "true");
    const thumb = document.createElement("span");
    thumb.className = "change-thumb";
    thumb.dataset.set = settings.set;
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
    }
    button.append(thumb, copy);
    button.addEventListener("click", () => pickCase(entry.id));
    changeList.append(button);
    thumbObserver.observe(thumb);
  }
  if (!changeList.querySelector(".change-case")) {
    const empty = document.createElement("p");
    empty.className = "change-case-meta";
    empty.textContent = "No cases match.";
    changeList.append(empty);
  }
}

function openChange(): void {
  commitName();
  changeSearch.value = "";
  paintChangeList();
  changeDialog.showModal();
  changeSearch.focus();
}

function requestNext(): void {
  commitName();
  if (!current) {
    dealFresh();
    return;
  }
  if (!named(caseName(current.set, current.caseId))) {
    nameDialogInput.value = "";
    btnSaveName.disabled = true;
    nameDialog.returnValue = "";
    nameDialog.showModal();
    nameDialogInput.focus();
    return;
  }
  advance();
}

function renderAll(): void {
  renderChrome();
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
btnChange.addEventListener("click", () => openChange());
changeSearch.addEventListener("input", () => paintChangeList());
changeDialog.querySelector("form")!.addEventListener("submit", (ev) => ev.preventDefault());
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
  if (nameDialog.returnValue !== "save" || !current || !named(nameDialogInput.value)) {
    return;
  }
  setCaseName(current.set, current.caseId, nameDialogInput.value);
  current.displayName = caseName(current.set, current.caseId);
  advance();
});

accountDialogInput.addEventListener("input", () => {
  btnSaveAccount.disabled = !named(accountDialogInput.value);
});
accountDialog.addEventListener("close", () => {
  if (accountDialog.returnValue !== "save" || !named(accountDialogInput.value)) return;
  createAccount(accountDialogInput.value);
  resetChain();
  closeAccountPage(false);
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
    if (!dialogOpen() && !accountPage.hidden) closeAccountPage();
  }
  if (dialogOpen() || !accountPage.hidden) return;
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
});

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
