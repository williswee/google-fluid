export const MODES = [
  "general", "weather", "finance", "places", "movies", "convert", "define",
  "documents", "site", "news", "date", "precise",
] as const;

export type ModeId = (typeof MODES)[number];

export interface IntentTimings {
  reserveMs: number;
  inferenceMs: number;
  settleMs: number;
}

export interface IntentResult {
  mode: ModeId;
  probabilities: Record<ModeId, number>;
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

/** An uncertain prediction leaves the search bar in its ordinary state. */
export function chooseMode(probabilities: Record<ModeId, number>): ModeId {
  const ranked = [...MODES].sort((a, b) => probabilities[b] - probabilities[a]);
  const [first, second] = ranked;
  return probabilities[first] >= 0.7 &&
    probabilities[first] - probabilities[second] >= 0.2
    ? first
    : "general";
}
