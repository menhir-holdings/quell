import { Alg } from "cubing/alg";
import { OLL } from "./data/oll";
import { PLL } from "./data/pll";
import { displayName } from "./progress";
import type { CaseDef, Deal, SetId } from "./types";

export function casesFor(set: SetId): CaseDef[] {
  return set === "oll" ? OLL : PLL;
}

export function findCase(set: SetId, id: string): CaseDef | undefined {
  return casesFor(set).find((entry) => entry.id === id);
}

function flatten(moves: string): string {
  return moves.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
}

export function invertMoves(moves: string): string {
  return new Alg(flatten(moves)).invert().simplify({ cancel: true }).toString();
}

export function dealCase(set: SetId, entry: CaseDef): Deal {
  const solveAlg = entry.algs[0].moves;
  return {
    set,
    caseId: entry.id,
    canonicalName: entry.name,
    displayName: displayName(set, entry.id, entry.name),
    group: entry.group,
    setupAlg: invertMoves(solveAlg),
    solveAlg,
    stickering: set === "oll" ? "OLL" : "PLL",
  };
}

export function pickRandom(pool: CaseDef[], avoidId?: string): CaseDef {
  const choices =
    pool.length > 1 && avoidId
      ? pool.filter((entry) => entry.id !== avoidId)
      : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}
