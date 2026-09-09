import type { AlgVariant, CaseDef } from "../types";

function a(moves: string, notes?: string): AlgVariant[] {
  return notes ? [{ moves, label: "STC", notes }] : [{ moves, label: "STC" }];
}

function c(
  id: string,
  name: string,
  group: string,
  moves: string,
  twoLook = false,
  notes?: string,
): CaseDef {
  return { id, name, group, twoLook, algs: a(moves, notes) };
}

/** 21 PLLs. Algs from SolveTheCube. */
export const PLL: CaseDef[] = [
  c("H", "H", "EPLL", "(M2 U M2) U2 (M2 U M2)", true),
  c(
    "Z",
    "Z",
    "EPLL",
    "R' U' R2 U (R U R' U') R U R U' R U' R' U2",
    true,
  ),
  c("Ub", "Ub", "EPLL", "R2 U' (R' U' R) U R U (R U' R)", true),
  c("Ua", "Ua", "EPLL", "(R' U R' U') R' U' (R' U R) U R2", true),
  c("Aa", "Aa", "CPLL", "x z' R2 U2 (R' D' R) U2 (R' D R') z x'", true),
  c("Ab", "Ab", "CPLL", "x R2 D2 (R U R') D2 (R U' R) x'", true),
  c(
    "E",
    "E",
    "CPLL",
    "R2 U R' U' y (R U R' U') (R U R' U') (R U R') y' (R U' R2')",
    true,
  ),
  c("T", "T", "Adjacent", "(R U R' U') R' F R2 U' R' U' R U R' F'"),
  c(
    "Y",
    "Y",
    "Opposite",
    "(F R U' R') U' (R U R' F') (R U R' U') (R' F R F')",
  ),
  c(
    "F",
    "F",
    "Adjacent",
    "U' (R' U R U') R2 (F' U' F U) x (R U R' U') R2 x'",
  ),
  c("V", "V", "Opposite", "(R' U R' U') y (R' D R' D') R2 y' (R' B' R B R)"),
  c("Ja", "Ja", "Adjacent", "L' U' L F (L' U' L U) L F' L2 U L U"),
  c("Jb", "Jb", "Adjacent", "R U R' F' (R U R' U') R' F R2 U' R' U'"),
  c("Ra", "Ra", "Adjacent", "(L U2 L') U2 L F' (L' U' L U) L F L2 U"),
  c("Rb", "Rb", "Adjacent", "(R' U2 R) U2 R' F (R U R' U') R' F' R2 U'"),
  c(
    "Na",
    "Na",
    "Opposite",
    "(R U R' U) (R U R' F') (R U R' U') R' F R2 U' R' U2 (R U' R')",
  ),
  c(
    "Nb",
    "Nb",
    "Opposite",
    "(R' U R U') R' (F' U' F) (R U R' F) R' F' (R U' R)",
  ),
  c("Ga", "Ga", "G", "y R2' u (R' U R' U') (R u' R2) y' (R' U R)"),
  c("Gb", "Gb", "G", "(R' U' R) y R2 u (R' U R U') (R u' R2)"),
  c("Gc", "Gc", "G", "y R2' u' R U' (R U R' u) R2 y (R U' R')"),
  c("Gd", "Gd", "G", "y2 (R U R') y' (R2 u' R) U' (R' U R') u R2"),
];

export const PLL_GROUPS = ["EPLL", "CPLL", "Adjacent", "Opposite", "G"];
