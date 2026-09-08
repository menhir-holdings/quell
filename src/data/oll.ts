import type { AlgVariant, CaseDef } from "../types";

function a(moves: string, label: string, notes?: string): AlgVariant {
  return notes ? { moves, label, notes } : { moves, label };
}

function c(
  id: number,
  name: string,
  group: string,
  algs: AlgVariant[],
  twoLook = false,
): CaseDef {
  return { id: String(id), name, group, twoLook, algs };
}

/** Standard OLL 1–57. twoLook marks the 7 OCLLs from 2-look. */
export const OLL: CaseDef[] = [
  c(1, "OLL 1", "Dot", [a("R U2 R2 F R F' U2 R' F R F'", "main")]),
  c(2, "OLL 2", "Dot", [
    a("F R U R' U' S R U R' U' f'", "main", "RUS — no cube rotation"),
    a("r U r' U2 r U2 R' U2 R U' r'", "wide"),
  ]),
  c(3, "OLL 3", "Dot", [a("f R U R' U' f' U' F R U R' U' F'", "main")]),
  c(4, "OLL 4", "Dot", [a("f R U R' U' f' U F R U R' U' F'", "main")]),
  c(5, "OLL 5", "Square", [
    a("r' U2 R U R' U r", "main", "lefty square — no regrip"),
  ]),
  c(6, "OLL 6", "Square", [a("r U2 R' U' R U' r'", "main", "righty square")]),
  c(7, "OLL 7", "Lightning", [a("r U R' U R U2 r'", "main", "fat sune")]),
  c(8, "OLL 8", "Lightning", [a("r' U' R U' R' U2 r", "main", "fat anti-sune")]),
  c(9, "OLL 9", "Fish", [a("R U R' U' R' F R2 U R' U' F'", "main")]),
  c(10, "OLL 10", "Fish", [a("R U R' U R' F R F' R U2 R'", "main")]),
  c(11, "OLL 11", "Lightning", [a("r' R2 U R' U R U2 R' U M'", "main")]),
  c(12, "OLL 12", "Lightning", [
    a("F R U R' U' F' U F R U R' U' F'", "main"),
    a("M' R' U' R U' R' U2 R U' M", "M-gen"),
  ]),
  c(13, "OLL 13", "Knight", [a("F U R U' R2 F' R U R U' R'", "main")]),
  c(14, "OLL 14", "Knight", [a("R' F R U R' F' R F U' F'", "main")]),
  c(15, "OLL 15", "Knight", [a("r' U' r R' U' R U r' U r", "main")]),
  c(16, "OLL 16", "Knight", [a("r U r' R U R' U' r U' r'", "main")]),
  c(17, "OLL 17", "Dot", [a("R U R' U R' F R F' U2 R' F R F'", "main")]),
  c(18, "OLL 18", "Dot", [a("r U R' U R U2 r2 U' R U' R' U2 r", "main")]),
  c(19, "OLL 19", "Dot", [a("r' R U R U R' U' r R2 F R F'", "main")]),
  c(20, "OLL 20", "Dot", [a("r U R' U' M2 U R U' R' U' M'", "main")]),
  c(21, "OLL 21 H", "OCLL", [
    a("R U2 R' U' R U R' U' R U' R'", "main", "double sune"),
    a("R U R' U R U' R' U R U2 R'", "alt", "sune twice, other angle"),
  ], true),
  c(22, "OLL 22 Pi", "OCLL", [
    a("R U2 R2 U' R2 U' R2 U2 R", "main"),
    a("f R U R' U' f' F R U R' U' F'", "2-look shape"),
  ], true),
  c(23, "OLL 23 U", "OCLL", [
    a("R2 D' R U2 R' D R U2 R", "main", "RUD — headlights on left"),
    a("R2 D R' U2 R D' R' U2 R'", "mirror"),
  ], true),
  c(24, "OLL 24 T", "OCLL", [
    a("r U R' U' r' F R F'", "main", "sexy + sledge"),
    a("R U R D R' U' R D' R2", "RUD"),
  ], true),
  c(25, "OLL 25 L", "OCLL", [
    a("F R' F' r U R U' r'", "main"),
    a("R U2 R D R' U2 R D' R2", "RUD"),
  ], true),
  c(26, "OLL 26 Anti-Sune", "OCLL", [
    a("R U2 R' U' R U' R'", "main"),
    a("r' U' r U' r' U2 r", "wide", "lefty anti"),
  ], true),
  c(27, "OLL 27 Sune", "OCLL", [
    a("R U R' U R U2 R'", "main"),
    a("r U r' U r U2 r'", "wide"),
  ], true),
  c(28, "OLL 28", "OELL", [
    a("r U R' U' r' R U R U' R'", "main", "adjacent edges"),
  ]),
  c(29, "OLL 29", "Awkward", [a("R U R' U' R U' R' F' U' F R U R'", "main")]),
  c(30, "OLL 30", "Awkward", [a("F R' F R2 U' R' U' R U R' F2", "main")]),
  c(31, "OLL 31", "P", [a("R' U' F U R U' R' F' R", "main")]),
  c(32, "OLL 32", "P", [a("S R U R' U' R' F R f'", "main", "S-gen P")]),
  c(33, "OLL 33", "T", [a("R U R' U' R' F R F'", "main", "sexy sledge")]),
  c(34, "OLL 34", "C", [a("R U R2 U' R' F R U R U' F'", "main")]),
  c(35, "OLL 35", "Fish", [a("R U2 R2 F R F' R U2 R'", "main")]),
  c(36, "OLL 36", "W", [
    a("L' U' L U' L' U L U L F' L' F", "main"),
    a("R U R2 F' R U2 R U2 R' F R U' R'", "RU"),
  ]),
  c(37, "OLL 37", "Fish", [a("F R' F' R U R U' R'", "main", "sledge + sexy")]),
  c(38, "OLL 38", "W", [a("R U R' U R U' R' U' R' F R F'", "main")]),
  c(39, "OLL 39", "Lightning", [
    a("R U R' F' U' F U R U2 R'", "main"),
    a("L F' L' U' L U F U' L'", "lefty"),
  ]),
  c(40, "OLL 40", "Lightning", [a("R' F R U R' U' F' U R", "main")]),
  c(41, "OLL 41", "Awkward", [a("R U R' U R U2 R' F R U R' U' F'", "main")]),
  c(42, "OLL 42", "Awkward", [a("R' U' R U' R' U2 R F R U R' U' F'", "main")]),
  c(43, "OLL 43", "P", [
    a("R' U' F' U F R", "main", "short P"),
    a("F' U' L' U L F", "lefty"),
  ]),
  c(44, "OLL 44", "P", [a("F U R U' R' F'", "main")]),
  c(45, "OLL 45", "T", [a("F R U R' U' F'", "main", "2-look line alg")]),
  c(46, "OLL 46", "C", [a("R' U' R' F R F' U R", "main")]),
  c(47, "OLL 47", "L", [
    a("F' L' U' L U L' U' L U F", "main"),
    a("R' U' R' F R F' R' F R F' U R", "RU"),
  ]),
  c(48, "OLL 48", "L", [a("F R U R' U' R U R' U' F'", "main")]),
  c(49, "OLL 49", "L", [a("r U' r2 U r2 U r2 U' r", "main", "wide L")]),
  c(50, "OLL 50", "L", [a("r' U r2 U' r2 U' r2 U r'", "main")]),
  c(51, "OLL 51", "Line", [a("F U R U' R' U R U' R' F'", "main")]),
  c(52, "OLL 52", "Line", [
    a("R U R' U R U' B U' B' R'", "main"),
    a("R U R' U R d' R U' R' F'", "d-move"),
  ]),
  c(53, "OLL 53", "L", [a("r' U' R U' R' U R U' R' U2 r", "main")]),
  c(54, "OLL 54", "L", [a("r U R' U R U' R' U R U2 r'", "main")]),
  c(55, "OLL 55", "Line", [
    a("R' F R U R U' R2 F' R2 U' R' U R U R'", "main"),
  ]),
  c(56, "OLL 56", "Line", [a("r U r' U R U' R' U R U' R' r U' r'", "main")]),
  c(57, "OLL 57", "OELL", [
    a("R U R' U' M' U R U' r'", "main", "opposite edges"),
  ]),
];

export const OLL_GROUPS = [
  "Dot",
  "Square",
  "Lightning",
  "Knight",
  "Fish",
  "Awkward",
  "P",
  "W",
  "T",
  "C",
  "Line",
  "L",
  "OCLL",
  "OELL",
];
