import type { AlgVariant, CaseDef } from "../types";

function a(moves: string, label: string, notes?: string): AlgVariant {
  return notes ? { moves, label, notes } : { moves, label };
}

function c(id: number, name: string, group: string, algs: AlgVariant[]): CaseDef {
  return { id: String(id), name, group, algs };
}

/**
 * 41 FR-slot F2L insertions. No x/y/z so they stack for N-pair deals.
 * Inverse of each alg from solved breaks only the FR pair (plus U).
 */
export const F2L: CaseDef[] = [
  c(1, "F2L 1", "Easy", [a("U R U' R'", "main"), a("F' U F", "F-lead")]),
  c(2, "F2L 2", "Easy", [a("U' F' U F", "main"), a("R U' R'", "R-lead")]),
  c(3, "F2L 3", "Easy", [a("R U R'", "main", "connected pair, white on R")]),
  c(4, "F2L 4", "Easy", [a("F' U' F", "main", "connected pair, white on F")]),
  c(5, "F2L 5", "Split", [a("U' R U R' U2 R U' R'", "main")]),
  c(6, "F2L 6", "Split", [a("U F' U' F U2 F' U F", "main")]),
  c(7, "F2L 7", "Split", [a("U' R U2 R' U2 R U' R'", "main")]),
  c(8, "F2L 8", "Split", [a("U F' U2 F U2 F' U F", "main")]),
  c(9, "F2L 9", "Split", [a("U' R U R' U R U R'", "main")]),
  c(10, "F2L 10", "Split", [a("U' R U' R' U F' U' F", "main")]),
  c(11, "F2L 11", "Split", [a("U R U2 R' U R U' R'", "main")]),
  c(12, "F2L 12", "Split", [a("U' F' U2 F U' F' U F", "main")]),
  c(13, "F2L 13", "Split", [a("U2 R U R' U R U' R'", "main")]),
  c(14, "F2L 14", "Split", [a("U2 F' U' F U' F' U F", "main")]),
  c(15, "F2L 15", "Corner slot", [a("U' R' F R F' R U R'", "main", "sledge insert")]),
  c(16, "F2L 16", "Corner slot", [a("U R U' R' U' F' U F", "main")]),
  c(17, "F2L 17", "Corner slot", [a("R U' R' U R U' R'", "main")]),
  c(18, "F2L 18", "Corner slot", [a("F' U F U' F' U F", "main")]),
  c(19, "F2L 19", "Corner slot", [a("R U R' U' R U R'", "main")]),
  c(20, "F2L 20", "Corner slot", [a("F' U' F U F' U' F", "main")]),
  c(21, "F2L 21", "Edge slot", [
    a("U R U' R' U R U' R' U R U' R'", "main", "triple sexy"),
  ]),
  c(22, "F2L 22", "Edge slot", [a("U' R' F R F' R U' R'", "main")]),
  c(23, "F2L 23", "Edge slot", [a("U' R U' R' U2 R U' R'", "main")]),
  c(24, "F2L 24", "Edge slot", [a("U' R U R' U F' U' F", "main")]),
  c(25, "F2L 25", "Edge slot", [a("U R U R' U2 R U R'", "main")]),
  c(26, "F2L 26", "Edge slot", [a("U F' U' F U' R U R'", "main")]),
  c(27, "F2L 27", "Connected", [
    a("R' U2 R2 U R2 U R", "main", "RU 2-gen"),
  ]),
  c(28, "F2L 28", "Connected", [a("U' R U2 R' U F' U' F", "main")]),
  c(29, "F2L 29", "Connected", [a("U' R U' R' U R U R'", "main")]),
  c(30, "F2L 30", "Connected", [a("U F' U F U' F' U' F", "main")]),
  c(31, "F2L 31", "Connected", [a("R U R' U2 R U' R' U R U' R'", "main")]),
  c(32, "F2L 32", "Connected", [a("R U' R' U2 F' U' F", "main")]),
  c(33, "F2L 33", "Connected", [a("R U2 R' U' R U R'", "main")]),
  c(34, "F2L 34", "Connected", [a("F' U2 F U F' U' F", "main")]),
  c(35, "F2L 35", "Connected", [a("U R U' R' U' R U' R' U R U' R'", "main")]),
  c(36, "F2L 36", "Connected", [a("F U R U' R' F' R U' R'", "main")]),
  c(37, "F2L 37", "Pair slot", [a("R U' R' U' R U R' U2 R U' R'", "main")]),
  c(38, "F2L 38", "Pair slot", [a("R U' R' U' R U' R' U F' U' F", "main")]),
  c(39, "F2L 39", "Pair slot", [a("R U' R' U R U2 R' U R U' R'", "main")]),
  c(40, "F2L 40", "Pair slot", [a("R U2 R' U F' U' F", "main")]),
  c(41, "F2L 41", "Pair slot", [a("R U R' F' R U R' U' R' F R2 U' R'", "main")]),
];

export const F2L_GROUPS = ["Easy", "Split", "Corner slot", "Edge slot", "Connected", "Pair slot"];

export const F2L_SLOTS = [
  { id: "FR", to: "", from: "", label: "front-right" },
  { id: "FL", to: "y'", from: "y", label: "front-left" },
  { id: "BR", to: "y", from: "y'", label: "back-right" },
  { id: "BL", to: "y2", from: "y2", label: "back-left" },
] as const;
