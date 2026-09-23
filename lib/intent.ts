export const MODES = ["general", "image", "web", "research", "sketch"] as const;

export type ModeId = (typeof MODES)[number];

export interface IntentResult {
  mode: ModeId;
  probabilities: Record<ModeId, number>;
  model: string;
  /** Total endpoint processing time, including the budget database and Jev. */
  latencyMs: number;
  source: "live";
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
