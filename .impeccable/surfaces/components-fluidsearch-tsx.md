---
version: 1
slug: "components-fluidsearch-tsx"
primary_target: "components/FluidSearch.tsx"
related_targets: ["app/globals.css", "components/SearchTools.tsx", "components/CurrencyTool.tsx", "components/UtilityTools.tsx", "components/utility-tools.css", "components/KnowledgeTools.tsx", "components/knowledge-tools.css", "components/PlayTools.tsx", "components/play-tools.css", "lib/search-presets.ts"]
---

# Fluid Search — home

Mode: Experience. One anchored search box, 22 intent surfaces. User-pinned white Google-style world, independent Fluid Search identity, app delivery first; video remains deferred.

## Direction contract

THESIS: Natural language reveals a useful interface before submission; slash discovery gives direct access to every tool.
OWN-WORLD: White canvas, familiar multicolour wordmark, Geist, charcoal text, blue primary actions and lightly tinted tool interiors.
STORY: Type or press /, choose or discover a tool, adjust its real controls, then continue locally or open a clearly labelled external result.
FIRST VIEWPORT: A centred wordmark above a 760px maximum-width search shell. No permanent example grid. The / control opens a searchable list beneath the same input; a selected tool replaces that list. No header controls or top brand link. Notes and attribution share a quiet footer.
FORM: User-pinned Google canon overrides seed 7e4568cb. Natural-language routing uses Jev; explicit operators remain local. Visible badges distinguish Jev, Search syntax and Selected by you. Tool transitions never move the caret; narrow-screen query text is 16px with a 14px placeholder. Shared controls and the keyboard-focused search shell use an explicit 2px blue outline.
FINISH: DESIGN.md and its sidecar record implemented source changes. Verification and finish-review results are reported separately; fixture forecast and currency values do not establish live-data claims.

## Implemented surfaces

- General search; stocks, places and news refinements with explicit external result links.
- Unit and daily-reference currency conversion; arithmetic and tip calculator; timer; stopwatch; metronome; colour picker.
- Real forecast views for Singapore/Tokyo; curated dictionary and film examples; Earth/Mars comparison.
- Prebuilt adjustable orbit simulation; two-player tic-tac-toe; bounded barrel-roll and askew Easter eggs.
- Document format, website, date-range and precise-query filters.

## Interaction and disclosure

The / menu supports filtering, pointer selection, arrow keys and Enter. Its height accounts for the visual viewport, and arrow navigation scrolls only the list to reveal the active row. Escape restores the prior draft and caret. Selected examples work during routing outages and remain labelled; editing returns to routing unless the persistent selector in Notes pins a tool.

Privacy, non-affiliation, diagnostics and implementation limits sit in Notes, accessible from the footer or source badge. The panel groups content into How routing works, Tools & data, Controls & limits, and Credits. Opening focuses the Notes heading; Close or Escape restores focus to its actual opener, with the footer button as fallback. The input retains a screen-reader privacy description; visible errors and retry actions remain adjacent. Knowledge and currency source disclosures identify reference material, retrieval/rate timing and supported scope. Unknown content exposes supported examples or real external search instead of fabricated results.

Utility buttons retain native Enter activation. Invalid hex input shows a linked inline error, disables Copy and clears obsolete success feedback while preserving the last valid swatch. Clock readouts do not announce every tick; separate polite status messages announce timer/stopwatch state changes and laps.

Utility and game state lives only while its tool is mounted. Audio begins only with Start sound and has an explicit stop. Orbit motion has pause/reset and model details. Easter eggs animate only their contained miniature. Reduced motion disables geometric animation; the stable input, readable results and working controls remain.

Dinosaur run adds an explicitly started local runner with Space/ArrowUp/touch jump, collision/score/restart and pause. It also appears on our 404 route. Notes credits ShapeShift OSS and Anish Gupta.
