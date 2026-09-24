---
version: 1
slug: "components-fluidsearch-tsx"
primary_target: "components/FluidSearch.tsx"
related_targets: ["app/globals.css", "components/SearchTools.tsx", "components/SearchHints.tsx", "components/TravelTools.tsx", "components/travel-tools.css", "components/DiscoveryTools.tsx", "components/discovery-tools.css", "components/MarketTools.tsx", "components/market-tools.css", "components/CurrencyTool.tsx", "components/UtilityTools.tsx", "components/utility-tools.css", "components/KnowledgeTools.tsx", "components/knowledge-tools.css", "components/PlayTools.tsx", "components/play-tools.css", "components/DinoGame.tsx", "components/dino-game.css", "lib/search-presets.ts"]
---

# Fluid Search — home

Mode: Experience. One anchored search box, 27 intent surfaces and 43 distinctly named slash examples. User-pinned white Google-style world, independent Fluid Search identity, app delivery first; promotional video delivery remains deferred.

## Direction contract

THESIS: Natural language reveals a useful interface before submission; slash discovery gives direct access to every tool.
OWN-WORLD: White canvas, familiar multicolour wordmark, Geist, charcoal text, blue primary actions and lightly tinted tool interiors.
STORY: Type or press /, choose or discover a tool, adjust its real controls, then continue locally or open a clearly labelled external result.
FIRST VIEWPORT: A centred wordmark above a 760px maximum-width search shell. No permanent example grid. One quiet clickable tip sits below the empty query. The / control opens a searchable list beneath the same input; a selected tool replaces that list. No header controls or top brand link. Notes and attribution share a quiet footer.
FORM: User-pinned Google canon overrides seed 7e4568cb. Natural-language routing uses Jev; explicit operators remain local. Visible badges distinguish Jev, Search syntax and Selected by you. Tool transitions never move the caret; narrow-screen query text is 16px with a 14px placeholder. Shared controls and the keyboard-focused search shell use an explicit 2px blue outline.
FINISH: DESIGN.md and its sidecar record implemented source changes. Verification and finish-review results are reported separately; fixture forecast and currency values do not establish live-data claims.

## Implemented surfaces

- General search and document, website, date-range and precise-query refinements.
- Editable flight itineraries, hotel stays and shopping preferences with validation, expandable query details and external Google search actions.
- Stock research controls and a local illustrative compound-growth calculator; a news desk with coverage, date, source and regional filters.
- Video duration/source/date search controls; attributed NASA Earth/Moon imagery with shape, colour and preview-layout controls.
- Singapore/Tokyo map previews loaded from OpenStreetMap only by explicit action, with city/zoom controls and a separate destination/category search.
- Unit and daily-reference currency conversion; arithmetic and tip calculator; timer; stopwatch; metronome; colour picker.
- Real forecast views for Singapore/Tokyo; curated dictionary and film examples; Earth/Mars comparison.
- Prebuilt adjustable orbit simulation; two-player tic-tac-toe; bounded barrel-roll and askew Easter eggs.
- Explicitly started dinosaur runner in the search shell and on the app’s 404 page.

## Interaction and disclosure

The / menu exposes 43 examples across 27 modes, with distinct example titles. It supports filtering names and queries, pointer selection, arrow keys and Enter. Its height accounts for the visual viewport, and arrow navigation scrolls only the list to reveal the active row. Escape restores the prior draft and caret. Selected examples work during routing outages and remain labelled; editing returns to routing unless the persistent selector in Notes pins a tool.

While the query is empty and neither the menu nor Notes is open, one clickable hint rotates at six-second intervals between slash discovery and selected examples. Pointer hover and keyboard focus pause independently, so leaving either one alone cannot restart rotation. Hidden-page state, offscreen state and explicit Pause also stop rotation. Reduced motion leaves slash discovery static. Selecting a hint follows the same labelled, editable path as selecting a slash example. Hints do not create screen-reader live announcements.

Single-choice selects retain native menus and keyboard controls, with a 16px chevron inset 12px from the right edge, 36px end padding and a 44px minimum height. The Notes selector is 170px wide; forced-colors mode restores the native arrow.

Privacy, non-affiliation, diagnostics and implementation limits sit in Notes, accessible from the footer or source badge. The panel groups content into How routing works, Tools & data, Controls & limits, and Credits. Opening focuses the Notes heading; Close or Escape restores focus to its actual opener, with the footer button as fallback. The input retains a screen-reader privacy description; visible errors and retry actions remain adjacent. Knowledge and currency source disclosures identify reference material, retrieval/rate timing and supported scope. Unknown content exposes supported examples or real external search instead of fabricated results. Choosing a supported knowledge example updates the query and keeps that tool selected.

Travel, shopping, stock, video and news controls prepare external searches; their local previews do not claim current prices, inventory, availability, videos or headlines. Compound growth is a local editable scenario with calculation assumptions. NASA images are curated references, explicitly credited and linked to their sources, with visible failure recovery. Arbitrary image queries retain their outgoing query and filters. Maps clearly label the fixed preview area; loading is an explicit third-party action, attribution remains available, and destination search is separate from the displayed city.

Utility buttons retain native Enter activation. Invalid hex input shows a linked inline error, disables Copy and clears obsolete success feedback while preserving the last valid swatch. Invalid timer durations show linked feedback and disable Start; Reset restores the last valid duration. Unit conversion rejects non-finite results. Complete paired date ranges with After equal to or later than Before show linked feedback and block submission. Clock readouts do not announce every tick; separate polite status messages announce timer/stopwatch state changes and laps.

Utility and game state lives only while its tool is mounted. Audio begins only with Start sound and has an explicit stop. Orbit motion has pause/reset and model details. Easter eggs animate only their contained miniature. Reduced motion disables nonessential geometric animation and automatic hint rotation; the stable input, readable results and working controls remain. Dinosaur motion needed to play is explicitly started and can be paused.

Dinosaur run adds an explicitly started local runner with Space/ArrowUp/touch jump, collision/score/restart and pause. It also appears on our 404 route. Notes credits ShapeShift OSS and Anish Gupta.

Date-range errors have one visible message, shared by the query and date inputs through their accessible descriptions; invalid ranges remain blocked.
