import type { CaseDef, KnownState, Mode } from "./types";

const KEY = "quell.progress.v1";

type Store = Record<string, Record<string, KnownState>>;

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function save(store: Store): void {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function getState(mode: Mode, id: string): KnownState {
  return load()[mode]?.[id] ?? "unseen";
}

export function setState(mode: Mode, id: string, state: KnownState): void {
  const store = load();
  store[mode] ??= {};
  store[mode][id] = state;
  save(store);
}

export function cycleState(mode: Mode, id: string): KnownState {
  const next: Record<KnownState, KnownState> = {
    unseen: "learning",
    learning: "known",
    known: "unseen",
  };
  const state = next[getState(mode, id)];
  setState(mode, id, state);
  return state;
}

export function pickWeighted<T extends CaseDef>(mode: Mode, cases: T[]): T {
  const weights = cases.map((entry) => {
    const state = getState(mode, entry.id);
    if (state === "unseen") return 5;
    if (state === "learning") return 3;
    return 1;
  });
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < cases.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return cases[i];
  }
  return cases[cases.length - 1];
}
