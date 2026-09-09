import type { CaseProgress, SetId } from "./types";

const KEY = "quell.progress.v2";
const LEGACY_KEY = "quell.progress.v1";

type Store = Record<SetId, Record<string, CaseProgress>>;

function empty(): Store {
  return { oll: {}, pll: {} };
}

function migrateV1(raw: string): Store {
  try {
    const old = JSON.parse(raw) as Record<string, Record<string, string>>;
    const store = empty();
    for (const set of ["oll", "pll"] as const) {
      const bucket = old[set] ?? {};
      for (const [id, state] of Object.entries(bucket)) {
        if (state === "known" || state === "learning") {
          store[set][id] = { inPractice: true, name: "" };
        }
      }
    }
    return store;
  } catch {
    return empty();
  }
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Store>;
      return {
        oll: parsed.oll ?? {},
        pll: parsed.pll ?? {},
      };
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateV1(legacy);
      save(migrated);
      return migrated;
    }
    return empty();
  } catch {
    return empty();
  }
}

function save(store: Store): void {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function getProgress(set: SetId, id: string): CaseProgress {
  return load()[set]?.[id] ?? { inPractice: false, name: "" };
}

export function setProgress(
  set: SetId,
  id: string,
  patch: Partial<CaseProgress>,
): CaseProgress {
  const store = load();
  store[set] ??= {};
  const next = { ...getProgress(set, id), ...patch };
  store[set][id] = next;
  save(store);
  return next;
}

export function displayName(
  set: SetId,
  id: string,
  canonical: string,
): string {
  const nick = getProgress(set, id).name.trim();
  return nick || canonical;
}

/** Send every case back to Learn. Custom names stay. */
export function resetLearned(): void {
  const store = load();
  for (const set of ["oll", "pll"] as const) {
    for (const id of Object.keys(store[set] ?? {})) {
      store[set][id] = { ...store[set][id], inPractice: false };
    }
  }
  save(store);
}
