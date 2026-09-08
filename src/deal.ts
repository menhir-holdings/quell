import { Alg } from "cubing/alg";
import { randomScrambleForEvent } from "cubing/scramble";
import { F2L, F2L_SLOTS } from "./data/f2l";
import { OLL } from "./data/oll";
import { PLL } from "./data/pll";
import { randomHold, wcaHold } from "./hold";
import { pickWeighted } from "./progress";
import type { AlgVariant, CaseDef, Deal, Hold, Mode, Settings } from "./types";

const AUFS = ["", "U", "U2", "U'"] as const;

function invertMoves(s: string): string {
  return new Alg(s).invert().toString();
}

function joinMoves(...parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

function invertAuf(auf: string): string {
  if (auf === "U") return "U'";
  if (auf === "U'") return "U";
  return auf;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function chooseHold(settings: Settings): Hold {
  return settings.randomHold ? randomHold() : wcaHold();
}

function stickeringFor(mode: Mode, hold: Hold): Deal["stickering"] {
  if (!hold.wca) return "full";
  if (mode === "oll") return "OLL";
  if (mode === "pll") return "PLL";
  if (mode === "f2l") return "F2L";
  return "full";
}

function withHold(hold: Hold, scramble: string): string {
  return joinMoves(hold.rot, scramble);
}

function filterCases(
  cases: CaseDef[],
  settings: Settings,
  kind: "oll" | "pll",
): CaseDef[] {
  const group = kind === "oll" ? settings.ollGroup : settings.pllGroup;
  return cases.filter((entry) => {
    if (settings.skipTwoLook && entry.twoLook) return false;
    if (group !== "all" && entry.group !== group) return false;
    return true;
  });
}

function withAuf(settings: Settings, primary: string, algs: AlgVariant[]): {
  scramble: string;
  algs: AlgVariant[];
} {
  const auf = settings.randomAuf ? pick([...AUFS]) : "";
  const scramble = joinMoves(invertMoves(primary), auf);
  const prefix = invertAuf(auf);
  const revealed = algs.map((alg) => ({
    ...alg,
    moves: joinMoves(prefix, alg.moves),
  }));
  return { scramble, algs: revealed };
}

function dealCase(
  mode: Mode,
  settings: Settings,
  all: CaseDef[],
  filtered: CaseDef[],
  forcedId?: string,
): Deal {
  const hold = chooseHold(settings);
  const pool = forcedId
    ? all.filter((entry) => entry.id === forcedId)
    : filtered.length
      ? filtered
      : all;
  const chosen = pickWeighted(mode, pool);
  const primary = chosen.algs[0].moves;
  const { scramble, algs } = withAuf(settings, primary, chosen.algs);
  return {
    mode,
    hold,
    scramble,
    setupAlg: withHold(hold, scramble),
    caseId: chosen.id,
    caseName: chosen.name,
    group: chosen.group,
    algs,
    stickering: stickeringFor(mode, hold),
  };
}

function dealTwoGen(settings: Settings): Deal {
  const hold = chooseHold(settings);
  const faces = [
    ["R", "R'", "R2"],
    ["U", "U'", "U2"],
  ];
  const len = 12 + Math.floor(Math.random() * 7);
  const moves: string[] = [];
  let last = -1;
  for (let i = 0; i < len; i++) {
    let face = Math.floor(Math.random() * 2);
    if (face === last) face = 1 - face;
    last = face;
    moves.push(pick(faces[face]));
  }
  const scramble = moves.join(" ");
  return {
    mode: "twogen",
    hold,
    scramble,
    setupAlg: withHold(hold, scramble),
    caseName: "2-gen RU",
    group: "2-gen",
    algs: [
      {
        moves: invertMoves(scramble),
        label: "2-gen inverse",
        notes: "Always works. Stay on R and U — this is a TPS drill, not CFOP.",
      },
    ],
    stickering: "full",
  };
}

async function dealFull(settings: Settings): Promise<Deal> {
  const hold = chooseHold(settings);
  const scramble = (await randomScrambleForEvent("333")).toString();
  return {
    mode: "full",
    hold,
    scramble,
    setupAlg: withHold(hold, scramble),
    caseName: "Full solve",
    group: "WCA",
    algs: [],
    stickering: "full",
  };
}

function dealF2l(settings: Settings, forcedId?: string): Deal {
  const hold = chooseHold(settings);
  const n =
    settings.f2lPairs === "random"
      ? 1 + Math.floor(Math.random() * 4)
      : Number(settings.f2lPairs);

  const slots = [...F2L_SLOTS];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const used = slots.slice(0, n);

  const firstCase = forcedId
    ? F2L.find((entry) => entry.id === forcedId) ?? pickWeighted("f2l", F2L)
    : pickWeighted("f2l", F2L);

  const solutionParts: string[] = [];
  const first = used[0];
  solutionParts.push(first.to, firstCase.algs[0].moves, first.from);

  for (let i = 1; i < n; i++) {
    const nextCase = pick(F2L);
    solutionParts.push(used[i].to, nextCase.algs[0].moves, used[i].from);
  }

  const solution = joinMoves(...solutionParts);
  const scramble = invertMoves(solution);
  const slotHint = first.to
    ? `${first.to} — bring ${first.label} to FR, then`
    : "FR slot";

  return {
    mode: "f2l",
    hold,
    scramble,
    setupAlg: withHold(hold, scramble),
    caseId: firstCase.id,
    caseName: `${n} pair${n === 1 ? "" : "s"} · ${firstCase.name} @ ${first.id}`,
    group: firstCase.group,
    algs: firstCase.algs.map((alg: AlgVariant) => ({
      ...alg,
      moves: joinMoves(first.to, alg.moves),
      notes: [slotHint, alg.notes].filter(Boolean).join(" · "),
    })),
    stickering: stickeringFor("f2l", hold),
  };
}

export async function deal(
  settings: Settings,
  forcedId?: string,
): Promise<Deal> {
  switch (settings.mode) {
    case "oll":
      return dealCase("oll", settings, OLL, filterCases(OLL, settings, "oll"), forcedId);
    case "pll":
      return dealCase("pll", settings, PLL, filterCases(PLL, settings, "pll"), forcedId);
    case "twogen":
      return dealTwoGen(settings);
    case "full":
      return dealFull(settings);
    case "f2l":
      return dealF2l(settings, forcedId);
  }
}
