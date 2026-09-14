import { casesFor } from "./deal";
import { recordsFor } from "./account";
import type { CaseDef, CaseRecord, SchedulePolicy, SetId } from "./types";

/**
 * Next-case picker. The flashcard flow never changes — only weights do.
 *
 * variety (now): avoid the last few, else uniform.
 * weakness (later): up-weight high reveal-rate / stale / unnamed.
 * focus (later): restrict the pool, same chain + name + check UI.
 */
export type ChooseInput = {
  set: SetId;
  recent: string[];
  avoidId?: string;
  /** When set, Next stays inside this subset. */
  ids?: string[];
  policy?: SchedulePolicy;
};

const RECENT_CAP = 8;

function variety(pool: CaseDef[], recent: string[], avoidId?: string): CaseDef {
  if (pool.length <= 1) return pool[0];
  const blocked = new Set(recent.slice(-RECENT_CAP));
  if (avoidId) blocked.add(avoidId);
  let candidates = pool.filter((entry) => !blocked.has(entry.id));
  if (!candidates.length) {
    candidates = avoidId ? pool.filter((entry) => entry.id !== avoidId) : pool;
  }
  if (!candidates.length) return pool[0];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function poolFor(input: ChooseInput): CaseDef[] {
  const all = casesFor(input.set);
  if (!input.ids?.length) return all;
  const allowed = new Set(input.ids);
  const subset = all.filter((entry) => allowed.has(entry.id));
  return subset.length ? subset : all;
}

/** Hook for later policies. `records` is already the current account's set. */
export function chooseCase(
  input: ChooseInput,
  _records: Record<string, CaseRecord> = recordsFor(input.set),
): CaseDef {
  const pool = poolFor(input);
  const policy = input.policy ?? "variety";
  if (policy === "variety") return variety(pool, input.recent, input.avoidId);
  return variety(pool, input.recent, input.avoidId);
}
