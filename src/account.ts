import type { Account, CaseRecord, SetId, Vault } from "./types";

const VAULT_KEY = "quell.vault.v1";
const LEGACY_PROGRESS = "quell.progress.v2";
const LEGACY_PROGRESS_V1 = "quell.progress.v1";

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

function migrateProgressV1(raw: string): Account["cases"] {
  try {
    JSON.parse(raw);
    return emptyCases();
  } catch {
    return emptyCases();
  }
}

function seedVault(): Vault {
  let cases = emptyCases();
  const v2 = localStorage.getItem(LEGACY_PROGRESS);
  const v1 = localStorage.getItem(LEGACY_PROGRESS_V1);
  if (v2) cases = migrateProgressV2(v2);
  else if (v1) cases = migrateProgressV1(v1);
  const account = makeAccount("You", cases);
  return { version: 1, currentId: account.id, accounts: [account] };
}

function loadVault(): Vault {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Vault;
      if (parsed.version === 1 && parsed.accounts?.length && parsed.currentId) {
        const current = parsed.accounts.find((a) => a.id === parsed.currentId);
        if (current) return parsed;
        return { ...parsed, currentId: parsed.accounts[0].id };
      }
    }
  } catch {
    /* seed */
  }
  const seeded = seedVault();
  saveVault(seeded);
  return seeded;
}

function saveVault(vault: Vault): void {
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

function mutate(fn: (vault: Vault) => void): Vault {
  const vault = loadVault();
  fn(vault);
  saveVault(vault);
  return vault;
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
