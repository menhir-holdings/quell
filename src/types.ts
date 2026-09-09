export type SetId = "oll" | "pll";

export type Phase = "learn" | "practice";

export type NextMode = "random" | "pick";

export type CubeView = "2d" | "3d";

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

export type Deal = {
  set: SetId;
  caseId: string;
  canonicalName: string;
  displayName: string;
  group: string;
  setupAlg: string;
  solveAlg: string;
  stickering: "OLL" | "PLL";
};

export type CaseProgress = {
  inPractice: boolean;
  name: string;
};

export type Settings = {
  set: SetId;
  phase: Phase;
  nextMode: NextMode;
  chaining: boolean;
  view: CubeView;
};
