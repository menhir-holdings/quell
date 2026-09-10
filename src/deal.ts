import { Alg } from "cubing/alg";
import { OLL, OLL_GROUPS } from "./data/oll";
import { PLL, PLL_GROUPS } from "./data/pll";
import { caseName } from "./account";
import type { CaseDef, Deal, SetId } from "./types";

export function casesFor(set: SetId): CaseDef[] {
  return set === "oll" ? OLL : PLL;
}

export function casesGrouped(set: SetId): CaseDef[] {
  const pool = casesFor(set);
  const order = set === "oll" ? OLL_GROUPS : PLL_GROUPS;
  const rank = new Map(order.map((group, i) => [group, i]));
  return [...pool].sort((a, b) => (rank.get(a.group) ?? 99) - (rank.get(b.group) ?? 99));
}

export function findCase(set: SetId, id: string): CaseDef | undefined {
  return casesFor(set).find((entry) => entry.id === id);
}

export function flatten(moves: string): string {
  return moves.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
}

export function joinAlgs(...parts: string[]): string {
  return parts.map(flatten).filter(Boolean).join(" ");
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
    displayName: caseName(set, entry.id),
    group: entry.group,
    setupAlg: invertMoves(solveAlg),
    solveAlg,
    stickering: set === "oll" ? "OLL" : "PLL",
  };
}
