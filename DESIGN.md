# ChatGPT Fluid design direction

The visual authority is the user's compact ChatGPT composer screenshot and the approved 23 September revision: a charcoal canvas, a compact rounded input, and a tool tray that unfolds below it. Preserve the independent ChatGPT Fluid identity, Geist typography, Classic/Fluid comparison, and subdued atmosphere.

The composer is the main experience. Desktop begins as a horizontal pill with plus, one-line draft, fixed-width model/effort preview selector, and a visibly labelled Preview action. Mobile separates the input and controls into two compact rows. Text grows only as the draft wraps, never because a prediction arrives. Model names must never resize the input column.

## Interaction and motion

Typing immediately acknowledges that the draft changed, independently of inference. Neutral feedback never claims to know an unconfirmed intent. The last confirmed suggestion is visibly marked Updating while a new decision is pending. Use a 150 ms typing pause and one in-flight request with only the latest queued draft. Ignore obsolete decisions; allow dispatched calls to settle their real cost. Retain exact-draft decisions only in the current tab.

The focal moment is a mode-specific tool tray revealing itself under an anchored composer. Reserve its stage height so the draft/caret and primary action stay still. Use a 200 ms opacity/clip reveal and 350 ms localized background crossfade. No continuous decorative animation, bounce, or movement of the active input. Respect reduced motion and keep state labels visible.

## Mode treatments

- General: neutral charcoal, compact input, quiet guidance for a semantic edit.
- Image: muted violet field; selectable Square, Landscape, Portrait frames.
- Web: cool blue field; source/recency controls and a static globe drawing.
- Research: amber field; report-structure controls and an outline preview.
- Sketch: green-white drafting grid; real local pointer drawing, Undo/Clear, pen weight, and a keyboard description alternative. It stays in tab memory and is never uploaded.

These are response-setup previews, not executed AI tools or generated results. Keep that distinction beside the composer. Never show fabricated content or pretend to retrieve pages.

## Model and effort preview

Jev supplies capability and effort as separate Choice answers in one request. The app maps that result to an illustrative named model preset. The preview selector exposes both the effort and model and lets the visitor override them. Effort overrides persist until Auto/reset; model overrides persist for each capability. Actual inference remains exclusively jev-1.13.0. Do not imply the downstream preset has run.

## Accessibility and states

All controls meet the project's 44px target. Keep Suggested/Selected/Example provenance on mobile. Keyboard paths, focus outlines, readable contrast, reduced motion, explicit retry, IME handling, unchanged text, stale responses, empty/oversize drafts, error/manual/example fallback, and loss of live availability must remain usable. Draft-transmission notice belongs beside the composer, above the accessory stage. Latency diagnostics belong in How it works, with budget reserve, Jev request, settlement, and browser round-trip distinguished.
