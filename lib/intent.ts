export const MODES = ["general", "image", "web", "research", "sketch"] as const;

export type ModeId = (typeof MODES)[number];
export const EFFORTS = ["brief", "balanced", "deep"] as const;
export type EffortId = (typeof EFFORTS)[number];

export interface IntentTimings {
  reserveMs: number;
  inferenceMs: number;
  settleMs: number;
}

export interface IntentResult {
  mode: ModeId;
  probabilities: Record<ModeId, number>;
  effort: EffortId;
  effortProbabilities: Record<EffortId, number>;
  model: string;
  /** Total endpoint processing time, including the budget database and Jev. */
  latencyMs: number;
  source: "live";
  /** Measured server stages. Fixtures can omit these; live responses include them. */
  timings?: IntentTimings;
}

export interface IntentError {
  code: string;
  error: string;
}

export const MAX_DRAFT_BYTES = 2_000;

/** An uncertain prediction leaves the composer in its ordinary state. */
export function chooseMode(probabilities: Record<ModeId, number>): ModeId {
  const ranked = [...MODES].sort((a, b) => probabilities[b] - probabilities[a]);
  const [first, second] = ranked;
  return probabilities[first] >= 0.7 &&
    probabilities[first] - probabilities[second] >= 0.2
    ? first
    : "general";
}

/** Effort is inferred independently of the capability; uncertainty stays balanced. */
export function chooseEffort(probabilities: Record<EffortId, number>): EffortId {
  const [first, second] = [...EFFORTS].sort((a, b) => probabilities[b] - probabilities[a]);
  return probabilities[first] >= 0.7 &&
    probabilities[first] - probabilities[second] >= 0.2
    ? first
    : "balanced";
}
