import type { AlgVariant, CaseDef } from "../types";

function a(moves: string, label: string, notes?: string): AlgVariant {
  return notes ? { moves, label, notes } : { moves, label };
}

function c(
  id: string,
  name: string,
  group: string,
  algs: AlgVariant[],
  twoLook = false,
): CaseDef {
  return { id, name, group, twoLook, algs };
}

/** 21 PLLs. twoLook = EPLL + CPLL used in 2-look. */
export const PLL: CaseDef[] = [
  c("Ua", "Ua", "EPLL", [
    a("R U' R U R U R U' R' U' R2", "main", "RU — no M slice"),
    a("M2 U M U2 M' U M2", "M-gen", "faster if slice is clean"),
  ], true),
  c("Ub", "Ub", "EPLL", [
    a("R2 U R U R' U' R' U' R' U R'", "main", "RU"),
    a("M2 U' M U2 M' U' M2", "M-gen"),
  ], true),
  c("H", "H", "EPLL", [a("M2 U M2 U2 M2 U M2", "main", "pure slice")], true),
  c("Z", "Z", "EPLL", [
    a("M' U M2 U M2 U M' U2 M2", "main"),
    a("M2 U M2 U M' U2 M2 U2 M'", "alt", "start with M2"),
  ], true),
  c("Aa", "Aa", "CPLL", [
    a("x R' U R' D2 R U' R' D2 R2", "main", "x then RUD"),
  ], true),
  c("Ab", "Ab", "CPLL", [
    a("x R2 D2 R U R' D2 R U' R", "main"),
  ], true),
  c("E", "E", "CPLL", [
    a("x' R U' R' D R U R' D' R U R' D R U' R' D'", "main"),
  ], true),
  c("T", "T", "Adjacent", [
    a("R U R' U' R' F R2 U' R' U' R U R' F'", "main", "standard T"),
  ]),
  c("F", "F", "Adjacent", [
    a("R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R", "main"),
  ]),
  c("Ja", "Ja", "Adjacent", [
    a("L' U' L F L' U' L U L F' L2 U L", "main", "lefty J"),
    a("x R2 F R F' R U2 r' U r U2", "wide"),
  ]),
  c("Jb", "Jb", "Adjacent", [
    a("R U R' F' R U R' U' R' F R2 U' R'", "main", "T-shaped J — fastest J"),
  ]),
  c("Ra", "Ra", "Adjacent", [
    a("R U' R' U' R U R D R' U' R D' R' U2 R'", "main"),
  ]),
  c("Rb", "Rb", "Adjacent", [
    a("R' U2 R U2 R' F R U R' U' R' F' R2 U'", "main"),
  ]),
  c("Na", "Na", "Opposite", [
    a("R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'", "main"),
    a("R F U' R' U R U F' R2 F' R U R U' R' F", "alt"),
  ]),
  c("Nb", "Nb", "Opposite", [
    a("R' U R U' R' F' U' F R U R' F R' F' R U' R", "main"),
    a("r' D' F r U' r' F' D r2 U r' U' r' U r U r'", "wide"),
  ]),
  c("V", "V", "Opposite", [
    a("R' U R' U' y R' F' R2 U' R' U R' F R F", "main"),
    a("R' U R' U' R D' R' D R' U D' R2 U' R2 D R2", "RUD", "no y"),
  ]),
  c("Y", "Y", "Opposite", [
    a("F R U' R' U' R U R' F' R U R' U' R' F R F'", "main"),
  ]),
  c("Ga", "Ga", "G", [
    a("R2 U R' U R' U' R U' R2 U' D R' U R D'", "main"),
  ]),
  c("Gb", "Gb", "G", [
    a("R' U' R U D' R2 U R' U R U' R U' R2 D", "main"),
  ]),
  c("Gc", "Gc", "G", [
    a("R2 U' R U' R U R' U R2 U D' R U' R' D", "main"),
  ]),
  c("Gd", "Gd", "G", [
    a("R U R' U' D R2 U' R U' R' U R' U R2 D'", "main"),
  ]),
];

export const PLL_GROUPS = ["EPLL", "CPLL", "Adjacent", "Opposite", "G"];
