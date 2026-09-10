import type { Account, CaseRecord, SetId, Vault } from "./types";

const VAULT_KEY = "quell.vault.v1";
const VAULT_STABLE = "quell.vault";
const LEGACY_PROGRESS = "quell.progress.v2";
const LEGACY_PROGRESS_V1 = "quell.progress.v1";
const IDB_NAME = "quell";
const IDB_STORE = "kv";
const IDB_ENTRY = "vault";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyRecord(): CaseRecord {
  return {
    name: "",
    seen: 0,
    revealed: 0,
    lastSeenAt: null,
    namedAt: null,
  };
}

function emptyCases(): Account["cases"] {
  return { oll: {}, pll: {} };
}

function makeAccount(label: string, cases: Account["cases"] = emptyCases()): Account {
  return {
    id: uid(),
    label,
    createdAt: Date.now(),
    cases,
  };
}

function later(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

function mergeRecord(a: CaseRecord, b: CaseRecord): CaseRecord {
  const aName = a.name.trim();
  const bName = b.name.trim();
  const name =
    aName && bName
      ? (a.namedAt ?? 0) >= (b.namedAt ?? 0)
        ? aName
        : bName
      : aName || bName;
  const namedAt = name
    ? name === aName
      ? (a.namedAt ?? b.namedAt)
      : (b.namedAt ?? a.namedAt)
    : null;
  return {
    name,
    seen: Math.max(a.seen, b.seen),
    revealed: Math.max(a.revealed, b.revealed),
    lastSeenAt: later(a.lastSeenAt, b.lastSeenAt),
    namedAt,
  };
}

function mergeCasesInto(dst: Account["cases"], src: Account["cases"]): boolean {
  let changed = false;
  for (const set of ["oll", "pll"] as const) {
    dst[set] ??= {};
    for (const [id, rec] of Object.entries(src[set] ?? {})) {
      const prev = dst[set][id] ?? emptyRecord();
      const next = mergeRecord(prev, rec);
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        dst[set][id] = next;
        changed = true;
      }
    }
  }
  return changed;
}

function namesToCases(
  names: Partial<Record<SetId, Record<string, string>>>,
): Account["cases"] {
  const cases = emptyCases();
  for (const set of ["oll", "pll"] as const) {
    const bucket = names[set] ?? {};
    for (const [id, name] of Object.entries(bucket)) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      cases[set][id] = {
        ...emptyRecord(),
        name: trimmed,
        namedAt: Date.now(),
      };
    }
  }
  return cases;
}

function migrateProgressV2(raw: string): Account["cases"] {
  try {
    const parsed = JSON.parse(raw) as {
      oll?: Record<string, { name?: string }>;
      pll?: Record<string, { name?: string }>;
    };
    const names: Partial<Record<SetId, Record<string, string>>> = { oll: {}, pll: {} };
    for (const set of ["oll", "pll"] as const) {
      for (const [id, rec] of Object.entries(parsed[set] ?? {})) {
        names[set]![id] = rec.name ?? "";
      }
    }
    return namesToCases(names);
  } catch {
    return emptyCases();
  }
}

function parseVault(raw: string | null): Vault | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Vault;
    if (parsed.version === 1 && parsed.accounts?.length && parsed.currentId) {
      const current = parsed.accounts.find((a) => a.id === parsed.currentId);
      if (current) return parsed;
      return { ...parsed, currentId: parsed.accounts[0].id };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function namedCount(cases: Account["cases"]): number {
  let n = 0;
  for (const set of ["oll", "pll"] as const) {
    for (const rec of Object.values(cases[set] ?? {})) {
      if (rec.name.trim()) n += 1;
    }
  }
  return n;
}

function mergeVaultByAccount(into: Vault, extra: Vault | null): boolean {
  if (!extra) return false;
  let changed = false;
  const byId = new Map(extra.accounts.map((a) => [a.id, a]));
  for (const acc of into.accounts) {
    const other = byId.get(acc.id);
    if (other) changed = mergeCasesInto(acc.cases, other.cases) || changed;
  }
  return changed;
}

function absorbNames(vault: Vault): boolean {
  let changed = mergeVaultByAccount(
    vault,
    parseVault(localStorage.getItem(VAULT_STABLE)),
  );
  changed = mergeVaultByAccount(vault, parseVault(localStorage.getItem(VAULT_KEY))) || changed;
  const acc = vault.accounts.find((a) => a.id === vault.currentId) ?? vault.accounts[0];
  if (namedCount(acc.cases) === 0) {
    const legacy = emptyCases();
    mergeCasesInto(legacy, migrateProgressV2(localStorage.getItem(LEGACY_PROGRESS) ?? ""));
    mergeCasesInto(legacy, migrateProgressV2(localStorage.getItem(LEGACY_PROGRESS_V1) ?? ""));
    if (namedCount(legacy) > 0) changed = mergeCasesInto(acc.cases, legacy) || changed;
  }
  return changed;
}

function seedVault(): Vault {
  const cases = emptyCases();
  mergeCasesInto(cases, migrateProgressV2(localStorage.getItem(LEGACY_PROGRESS) ?? ""));
  mergeCasesInto(cases, migrateProgressV2(localStorage.getItem(LEGACY_PROGRESS_V1) ?? ""));
  const account = makeAccount("You", cases);
  return { version: 1, currentId: account.id, accounts: [account] };
}

function persistIdb(vault: Vault): void {
  if (typeof indexedDB === "undefined") return;
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(vault, IDB_ENTRY);
      tx.oncomplete = () => db.close();
    };
  } catch {
    /* private mode */
  }
}

function saveVault(vault: Vault): void {
  const raw = JSON.stringify(vault);
  localStorage.setItem(VAULT_KEY, raw);
  localStorage.setItem(VAULT_STABLE, raw);
  persistIdb(vault);
}

function loadVault(): Vault {
  const existing =
    parseVault(localStorage.getItem(VAULT_STABLE)) ??
    parseVault(localStorage.getItem(VAULT_KEY));
  const vault = existing ?? seedVault();
  const changed = absorbNames(vault);
  if (!existing || changed || !localStorage.getItem(VAULT_STABLE) || !localStorage.getItem(VAULT_KEY)) {
    saveVault(vault);
  }
  return vault;
}

function mutate(fn: (vault: Vault) => void): Vault {
  const vault = loadVault();
  fn(vault);
  saveVault(vault);
  return vault;
}

export function hydrateVault(): Promise<void> {
  if (typeof indexedDB === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const finish = (): void => resolve();
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onerror = finish;
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, "readonly");
        const get = tx.objectStore(IDB_STORE).get(IDB_ENTRY);
        get.onerror = () => {
          db.close();
          finish();
        };
        get.onsuccess = () => {
          const extra = get.result
            ? parseVault(JSON.stringify(get.result))
            : null;
          db.close();
          if (extra) {
            mutate((v) => {
              mergeVaultByAccount(v, extra);
              const ours = v.accounts.find((a) => a.id === v.currentId) ?? v.accounts[0];
              if (namedCount(ours.cases) === 0) {
                const donor =
                  extra.accounts.find((a) => a.id === extra.currentId) ?? extra.accounts[0];
                mergeCasesInto(ours.cases, donor.cases);
              }
            });
          }
          finish();
        };
      };
    } catch {
      finish();
    }
  });
}

export function listAccounts(): Account[] {
  return loadVault().accounts;
}

export function currentAccount(): Account {
  const vault = loadVault();
  return vault.accounts.find((a) => a.id === vault.currentId) ?? vault.accounts[0];
}

export function switchAccount(id: string): Account {
  const vault = mutate((v) => {
    if (v.accounts.some((a) => a.id === id)) v.currentId = id;
  });
  return vault.accounts.find((a) => a.id === vault.currentId) ?? vault.accounts[0];
}

export function createAccount(label: string): Account {
  const trimmed = label.trim();
  const account = makeAccount(trimmed || "Account");
  mutate((v) => {
    v.accounts.push(account);
    v.currentId = account.id;
  });
  return account;
}

export function renameAccount(id: string, label: string): Account {
  const trimmed = label.trim();
  const vault = mutate((v) => {
    const acc = v.accounts.find((a) => a.id === id);
    if (acc && trimmed) acc.label = trimmed;
  });
  return vault.accounts.find((a) => a.id === vault.currentId) ?? vault.accounts[0];
}

export function deleteAccount(id: string): Account {
  const vault = mutate((v) => {
    if (v.accounts.length <= 1) {
      const fresh = makeAccount("You");
      v.accounts = [fresh];
      v.currentId = fresh.id;
      return;
    }
    v.accounts = v.accounts.filter((a) => a.id !== id);
    if (v.currentId === id) v.currentId = v.accounts[0].id;
  });
  return vault.accounts.find((a) => a.id === vault.currentId) ?? vault.accounts[0];
}

export function getRecord(set: SetId, id: string): CaseRecord {
  return currentAccount().cases[set]?.[id] ?? emptyRecord();
}

export function patchRecord(set: SetId, id: string, patch: Partial<CaseRecord>): CaseRecord {
  let next = emptyRecord();
  mutate((v) => {
    const acc = v.accounts.find((a) => a.id === v.currentId);
    if (!acc) return;
    acc.cases[set] ??= {};
    next = { ...emptyRecord(), ...acc.cases[set][id], ...patch };
    acc.cases[set][id] = next;
  });
  return next;
}

export function caseName(set: SetId, id: string): string {
  return getRecord(set, id).name.trim();
}

export function setCaseName(set: SetId, id: string, name: string): CaseRecord {
  const trimmed = name.trim();
  const prev = getRecord(set, id);
  return patchRecord(set, id, {
    name: trimmed,
    namedAt: trimmed ? (prev.namedAt ?? Date.now()) : null,
  });
}

export function markShown(set: SetId, id: string): void {
  const prev = getRecord(set, id);
  patchRecord(set, id, {
    seen: prev.seen + 1,
    lastSeenAt: Date.now(),
  });
}

export function markRevealed(set: SetId, id: string): void {
  const prev = getRecord(set, id);
  patchRecord(set, id, { revealed: prev.revealed + 1 });
}

export function recordsFor(set: SetId): Record<string, CaseRecord> {
  return currentAccount().cases[set] ?? {};
}
