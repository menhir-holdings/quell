import type { AlgVariant, CaseDef } from "../types";

function a(moves: string, notes?: string): AlgVariant[] {
  return notes ? [{ moves, label: "STC", notes }] : [{ moves, label: "STC" }];
}

function c(
  id: number,
  name: string,
  group: string,
  moves: string,
  twoLook = false,
  notes?: string,
): CaseDef {
  return { id: String(id), name, group, twoLook, algs: a(moves, notes) };
}

/**
 * OLL 1–57. Numbering is the speedsolving.com wiki order.
 * Primaries favor RUF / wide / home-grip over mid-alg y.
 */
export const OLL: CaseDef[] = [
  c(1, "OLL 1", "Dot", "(R U2 R') (R' F R F') U2 (R' F R F')"),
  c(2, "OLL 2", "Dot", "F (R U R' U') F' f (R U R' U') f'"),
  c(3, "OLL 3", "Dot", "f (R U R' U') f' U' F (R U R' U') F'"),
  c(4, "OLL 4", "Dot", "f (R U R' U') f' U F (R U R' U') F'"),
  c(5, "OLL 5", "Square", "r' U2 (R U R' U) r"),
  c(6, "OLL 6", "Square", "r U2 R' U' R U' r'"),
  c(7, "OLL 7", "Lightning", "(r U R' U) R U2 r'", false, "fat sune"),
  c(8, "OLL 8", "Lightning", "r' U' R U' R' U2 r", false, "fat anti-sune"),
  c(9, "OLL 9", "Fish", "(R U R' U') R' F R2 U R' U' F'"),
  c(10, "OLL 10", "Fish", "(R U R' U) (R' F R F') R U2 R'"),
  c(11, "OLL 11", "Lightning", "(r U R' U) (R' F R F') R U2 r'"),
  c(12, "OLL 12", "Lightning", "F (R U R' U') F' U F (R U R' U') F'"),
  c(13, "OLL 13", "Knight", "F (U R U' R2) F' (R U R U' R')"),
  c(14, "OLL 14", "Knight", "(R' F R) U (R' F' R) F U' F'"),
  c(15, "OLL 15", "Knight", "l' U' l (L' U' L U) l' U l"),
  c(16, "OLL 16", "Knight", "r U r' (R U R' U') r U' r'"),
  c(17, "OLL 17", "Dot", "(R U R' U) (R' F R F') U2 (R' F R F')"),
  c(18, "OLL 18", "Dot", "r U R' U R U2 r2 U' R U' R' U2 r"),
  c(19, "OLL 19", "Dot", "M U (R U R' U') M' (R' F R F')"),
  c(20, "OLL 20", "Dot", "M U (R U R' U') M2 (U R U' r')"),
  c(21, "OLL 21 H", "OCLL", "(R U R') U (R U' R') U (R U2 R')", true, "double sune"),
  c(22, "OLL 22 Pi", "OCLL", "R U2 (R2' U' R2 U') (R2' U2 R)", true),
  c(23, "OLL 23 U", "OCLL", "R2 D (R' U2 R) D' (R' U2 R')", true),
  c(24, "OLL 24 T", "OCLL", "(r U R' U') (r' F R F')", true),
  c(25, "OLL 25 L", "OCLL", "F' (r U R' U') (r' F R)", true),
  c(26, "OLL 26 Anti-Sune", "OCLL", "(R U2 R') U' (R U' R')", true),
  c(27, "OLL 27 Sune", "OCLL", "(R' U2 R) U (R' U R)", true),
  c(28, "OLL 28", "OELL", "M' U' M U2' M' U' M"),
  c(29, "OLL 29", "Awkward", "(R U R' U') R U' R' F' U' (F R U R')"),
  c(30, "OLL 30", "Awkward", "(R' F R F') (R' F R F') (R U R' U') (R U R')"),
  c(31, "OLL 31", "P", "R' U' F U R U' R' F' R"),
  c(32, "OLL 32", "P", "F U R U' F' r U R' U' r'"),
  c(33, "OLL 33", "T", "(R U R' U') (R' F R F')", false, "sexy sledge"),
  c(34, "OLL 34", "C", "R U R2 U' R' F R U R U' F'"),
  c(35, "OLL 35", "Fish", "(R U2 R') (R' F R F') (R U2 R')"),
  c(36, "OLL 36", "W", "(L' U' L U') (L' U L U) (L F' L' F)"),
  c(37, "OLL 37", "Fish", "F R' F' R U R U' R'", false, "sledge + sexy"),
  c(38, "OLL 38", "W", "(R U R' U) (R U' R' U') (R' F R F')"),
  c(39, "OLL 39", "Z", "L F' (L' U' L U) F U' L'"),
  c(40, "OLL 40", "Z", "R' F (R U R' U') F' U R"),
  c(41, "OLL 41", "Awkward", "(R U R' U) R U2 R' F (R U R' U') F'"),
  c(42, "OLL 42", "Awkward", "(L F' L' F) L' U2 L Dw R U R'"),
  c(43, "OLL 43", "P", "f' (L' U' L U) f"),
  c(44, "OLL 44", "P", "f (R U R' U') f'"),
  c(45, "OLL 45", "T", "F (R U R' U') F'", false, "2-look line"),
  c(46, "OLL 46", "C", "R' U' (R' F R F') U R"),
  c(47, "OLL 47", "L", "F' (L' U' L U) (L' U' L U) F"),
  c(48, "OLL 48", "L", "F (R U R' U') (R U R' U') F'"),
  c(49, "OLL 49", "L", "R' F R2 B' R2' F' R2 B R'"),
  c(50, "OLL 50", "L", "(R' F R' F') R2 U2 B' R B R'"),
  c(51, "OLL 51", "Line", "f (R U R' U') (R U R' U') f'"),
  c(52, "OLL 52", "Line", "R' F' U' F U' R U R' U R"),
  c(53, "OLL 53", "L", "(l' U' L U') (L' U L U') L' U2 l"),
  c(54, "OLL 54", "L", "(r U R' U) (R U' R' U) R U2' r'"),
  c(55, "OLL 55", "Line", "R U2 R2 (U' R U' R') U2 (F R F')"),
  c(56, "OLL 56", "Line", "F (R U R' U') R F' (r U R' U') r'"),
  c(57, "OLL 57", "OELL", "(R U R' U') M' (U R U' r')"),
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
  "Z",
  "Line",
  "L",
  "OCLL",
  "OELL",
];
