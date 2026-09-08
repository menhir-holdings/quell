export type Mode = "oll" | "pll" | "twogen" | "full" | "f2l";

export type AlgVariant = {
  moves: string;
  label: string;
  notes?: string;
};

export type CaseDef = {
  id: string;
  name: string;
  group: string;
  twoLook?: boolean;
  algs: AlgVariant[];
};

export type StickerColor = "white" | "yellow" | "green" | "blue" | "red" | "orange";

export type Hold = {
  rot: string;
  u: StickerColor;
  f: StickerColor;
  wca: boolean;
};

export type Deal = {
  mode: Mode;
  hold: Hold;
  scramble: string;
  setupAlg: string;
  caseId?: string;
  caseName: string;
  group?: string;
  algs: AlgVariant[];
  stickering: "full" | "OLL" | "PLL" | "F2L";
};

export type KnownState = "unseen" | "learning" | "known";

export type Settings = {
  mode: Mode;
  skipTwoLook: boolean;
  randomHold: boolean;
  randomAuf: boolean;
  f2lPairs: "1" | "2" | "3" | "4" | "random";
  ollGroup: string;
  pllGroup: string;
};
