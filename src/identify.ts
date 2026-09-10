import { casesFor, findCase, invertMoves, joinAlgs } from "./deal";
import { lastLayer, llKey } from "./ll";
import type { CaseDef, SetId } from "./types";

const AUFS = ["", "U", "U2", "U'"] as const;

export type Identify =
  | { kind: "base" }
  | { kind: "case"; entry: CaseDef }
  | { kind: "unknown" };

type Catalog = {
  base: Set<string>;
  cases: Map<string, string>;
};

const catalogs: Partial<Record<SetId, Catalog>> = {};

async function catalog(set: SetId): Promise<Catalog> {
  const hit = catalogs[set];
  if (hit) return hit;

  const base = new Set<string>();
  const cases = new Map<string, string>();

  for (const auf of AUFS) {
    base.add(llKey(await lastLayer(auf), set));
  }

  for (const entry of casesFor(set)) {
    const setup = invertMoves(entry.algs[0].moves);
    for (const auf of AUFS) {
      const key = llKey(await lastLayer(joinAlgs(setup, auf)), set);
      if (!base.has(key) && !cases.has(key)) cases.set(key, entry.id);
    }
  }

  const built = { base, cases };
  catalogs[set] = built;
  return built;
}

/** Which last-layer case `moves` (after z2) is, up to U/U'/U2. */
export async function identifyMoves(moves: string, set: SetId): Promise<Identify> {
  const cat = await catalog(set);
  const key = llKey(await lastLayer(moves), set);
  if (cat.base.has(key)) return { kind: "base" };
  const id = cat.cases.get(key);
  if (!id) return { kind: "unknown" };
  const entry = findCase(set, id);
  if (!entry) return { kind: "unknown" };
  return { kind: "case", entry };
}
