import type { Hold, StickerColor } from "./types";

type Face = "U" | "D" | "F" | "B" | "R" | "L";
type Centers = Record<Face, StickerColor>;

export const STICKER_HEX: Record<StickerColor, string> = {
  white: "#efefef",
  yellow: "#ffd500",
  green: "#009e60",
  blue: "#0051ba",
  red: "#c41e3a",
  orange: "#ff6f00",
};

export const COLOR_LABEL: Record<StickerColor, string> = {
  white: "White",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  red: "Red",
  orange: "Orange",
};

const SOLVED: Centers = {
  U: "white",
  D: "yellow",
  F: "green",
  B: "blue",
  R: "red",
  L: "orange",
};

function applyX(c: Centers): Centers {
  return { U: c.B, B: c.D, D: c.F, F: c.U, R: c.R, L: c.L };
}

function applyY(c: Centers): Centers {
  return { U: c.U, D: c.D, F: c.R, R: c.B, B: c.L, L: c.F };
}

function applyZ(c: Centers): Centers {
  return { F: c.F, B: c.B, U: c.L, L: c.D, D: c.R, R: c.U };
}

function applyOne(c: Centers, move: string): Centers {
  const times = move.endsWith("2") ? 2 : move.endsWith("'") ? 3 : 1;
  const face = move[0];
  const fn = face === "x" ? applyX : face === "y" ? applyY : applyZ;
  let out = c;
  for (let i = 0; i < times; i++) out = fn(out);
  return out;
}

const U_FACE_ROTS = ["", "x", "x2", "x'", "z", "z'"];
const Y_ROTS = ["", "y", "y2", "y'"];

let cached: Hold[] | null = null;

export function allHolds(): Hold[] {
  if (cached) return cached;
  const holds: Hold[] = [];
  for (const a of U_FACE_ROTS) {
    for (const b of Y_ROTS) {
      const rot = [a, b].filter(Boolean).join(" ");
      let c = SOLVED;
      if (a) c = applyOne(c, a);
      if (b) c = applyOne(c, b);
      holds.push({ rot, u: c.U, f: c.F, wca: rot === "" });
    }
  }
  cached = holds;
  return holds;
}

export function wcaHold(): Hold {
  return allHolds()[0];
}

export function randomHold(): Hold {
  const holds = allHolds();
  return holds[Math.floor(Math.random() * holds.length)];
}
