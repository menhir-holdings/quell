export type SetId = "oll" | "pll";

export type CubeView = "2d" | "3d";

/** How the next case is chosen. UI stays the same; only the picker changes. */
export type SchedulePolicy = "variety";

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

/** Per-case user data. `name` is live; the rest is for later targeting. */
export type CaseRecord = {
  name: string;
  seen: number;
  revealed: number;
  lastSeenAt: number | null;
  namedAt: number | null;
};

export type Account = {
  id: string;
  label: string;
  createdAt: number;
  cases: Record<SetId, Record<string, CaseRecord>>;
};

export type Vault = {
  version: 1;
  currentId: string;
  accounts: Account[];
};

export type Settings = {
  set: SetId;
  view: CubeView;
};
