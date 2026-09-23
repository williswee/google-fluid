import type { EffortId, ModeId } from './intent';

// Illustrative UI presets, NOT model calls or claimed Jev model-selection output.
// Names verified 2026-09-23: https://developers.openai.com/api/docs/models
export const TEXT_MODELS = ['GPT-6 Luna', 'GPT-6 Sol', 'GPT-6 Astra'] as const;
export const IMAGE_MODELS = ['GPT Image 2.5 Flare', 'GPT Image 2.5 Sunburst'] as const;
export const EFFORT_LABELS: Record<EffortId, string> = { brief: 'Brief', balanced: 'Balanced', deep: 'Deep' };
export const EXAMPLE_EFFORT: Record<ModeId, EffortId> = { general: 'balanced', image: 'balanced', web: 'brief', research: 'deep', sketch: 'balanced' };
export function suggestedModel(mode: ModeId, effort: EffortId): string {
  if (mode === 'image') return effort === 'deep' ? IMAGE_MODELS[1] : IMAGE_MODELS[0];
  return effort === 'brief' ? TEXT_MODELS[0] : effort === 'deep' ? TEXT_MODELS[2] : TEXT_MODELS[1];
}
