---
name: Fluid Search
description: A familiar white search surface whose lower shell reveals intent-specific controls.
colors:
  ink: "#202124"
  muted: "#62666c"
  surface: "#ffffff"
  soft: "#f8f9fa"
  line: "#e5e7eb"
  blue: "#1967d2"
  action: "#1a73e8"
  action-hover: "#1559bc"
  focus: "#1967d2"
  focus-soft: "#8ab4f8"
  error: "#b3261e"
  brand-blue: "#4285f4"
  brand-red: "#ea4335"
  brand-yellow: "#e4a900"
  brand-green: "#34a853"
  general-tint: "#f5f8ff"
  weather-accent: "#a05a06"
  weather-tint: "#fff9ed"
  finance-accent: "#137333"
  finance-tint: "#f1f9f4"
  places-accent: "#137b62"
  places-tint: "#f0f8f5"
  movies-accent: "#7846ac"
  movies-tint: "#f7f3fc"
  conversion-tint: "#f2f7ff"
  dictionary-accent: "#a14621"
  dictionary-tint: "#fcf6f0"
  documents-accent: "#b13838"
  documents-tint: "#fff7f6"
  news-tint: "#f3f7fb"
  date-accent: "#a43c67"
  date-tint: "#fdf4f8"
  precision-accent: "#596374"
  precision-tint: "#f7f8fa"
  utility-tint: "#f3f7ff"
  metronome-accent: "#8b4521"
  metronome-tint: "#fcf6ef"
  color-accent: "#6647a8"
  color-tint: "#f8f5fc"
  science-accent: "#4b4e99"
  science-tint: "#f5f5fc"
  play-accent: "#187557"
  play-tint: "#f0f9f5"
  play-ink: "#244b65"
  play-action: "#256087"
  command-selected: "#f0f5fe"
  flights-accent: "#225c9e"
  flights-tint: "#f2f7fe"
  hotels-accent: "#8b5033"
  hotels-tint: "#fcf6f0"
  shopping-accent: "#7950a2"
  shopping-tint: "#f8f4fc"
  images-accent: "#76557e"
  images-tint: "#faf5fb"
  video-accent: "#a14343"
  video-tint: "#fff6f5"
typography:
  query:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "26px"
  query-mobile:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  query-placeholder-mobile:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  notes-body:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.75
  clock:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "clamp(37px, 8vw, 64px)"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.35px"
  body:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
  note:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  field: "8px"
  tile: "12px"
  command: "10px"
  shell: "30px"
  shell-open: "26px"
  circle: "50%"
spacing:
  compact: "6px"
  small: "8px"
  control: "12px"
  inset: "24px"
  body-gap: "28px"
components:
  search-button:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.circle}"
    size: "44px"
  search-button-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.surface}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px"
  command-option:
    rounded: "{rounded.command}"
    padding: "10px 15px"
  command-option-selected:
    backgroundColor: "{colors.command-selected}"
    textColor: "{colors.blue}"
  slash-button:
    rounded: "{rounded.command}"
    size: "44px"
  utility-button:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.surface}"
    padding: "9px 15px"
---

# Design System: Fluid Search

## Overview

**Creative North Star: "A search bar that takes the shape of your curiosity."**

The user-pinned Google-style world uses a white canvas, a familiar multicolour wordmark, charcoal text and restrained blue actions. Fluid Search retains its independent identity in the central wordmark. Privacy, affiliation and implementation details live in Notes; its labelled button shares the footer with a quiet TypeSafe Jev attribution.

The query is the visual anchor. Its lower shell becomes one useful interface at a time. A slash control and searchable command menu make all 27 modes discoverable through 43 distinctly named examples, without a permanent example grid. One quiet clickable tip helps visitors discover these capabilities while the query is empty. Functional tools, editable planners, curated references and playful experiments share the same shell, with their own clear controls and source details.

**Key Characteristics:**

- White space around one anchored search surface.
- Discovery through the slash menu and quiet idle tips; detail through progressive disclosure.
- Visible routing provenance and recognizably different, functional tool interiors.

## Colors

Blue leads actions, calculator and clock tools. Weather and dictionary use warm hues; stocks and places use green; movies and colour controls use violet; documents use red; dates use rose; precision uses slate. Orbit uses a pale violet shell with blue scientific controls. Games and Easter eggs use pale green. Flights use cool blue, hotels warm brown, shopping and images muted violet, and video warm red. The Earth/Mars comparison pairs blue and terracotta values. Photography and loaded maps retain their source colours inside their own bounded viewport.

Intent colour stays in the lower tool, icon, selection and related controls. White fields and subdued separators keep dense tools legible. The colour picker alone makes its chosen colour the working material, with black or white swatch text selected for contrast. Multicolour brand letters remain an identity treatment.

**The Local Colour Rule.** Change the tool tint, icon and related controls with the active intent; keep the page white.

## Typography

Geist is locally bundled at regular, medium and semibold weights, with Arial and sans-serif fallbacks. Its familiar workhorse character is retained. Georgia gives dictionary terms, definitions and examples a distinct reference-book voice; the news heading and query preview use the same serif voice for an editorial treatment.

The query uses the desktop and mobile tokens; narrow-screen text remains 16px and its placeholder is 14px. Tool titles use 19–20px on desktop and 16–18px in compact layouts. The wordmark steps from 78px to 65px to 61px. Palette rows pair a medium-weight 14px example name with a 12px query. The single idle tip is 12px with a medium-weight query. Tabular numerals stabilize converter, calculator, clock, weather, comparison, orbit, budget and growth readings. Large numerals express an actual result or changing measurement, not general decoration.

## Layout

The main column is centred and at most 760px wide. Below 700px, its side clearance is 16px. Notes remains a labelled footer button on every screen size. The empty-state tip sits beneath the query in a reserved, centred row; it disappears while typing, browsing the slash menu or reading Notes.

The command menu lives inside the lower shell. Its scrollable list is capped by 390px, 49svh and the space below it in the visual viewport. Keyboard navigation scrolls the list itself to reveal the active row, without scrolling the page. Keyboard guidance hides on narrow screens. Tool-specific layouts use keypads, paired values, tabs, fields, an illustration beside controls, or a playable board. Colour controls stack below 500px; orbit and game layouts stack below 560px. Forecast days retain a minimum 44px width and scroll horizontally when needed. Four document-format tiles remain in a row. Image controls stack below the preview at 540px; travel date and budget groups adapt at 520px, with flight endpoints stacking at 360px. Finance and news fields reflow at 560px. Image frames, charts and map viewports stay contained in the same lower panel.

**The Anchored Query Rule.** Tool changes affect the lower shell. The textarea grows only with its content, up to 112px; inference must not reposition its caret.

## Elevation & Depth

A light border and diffuse shadow separate the search shell from the white canvas. Hover and focus deepen the shadow slightly. White inputs, pale interiors and subtle separators organize content without nested raised cards. The active command row uses a pale blue fill rather than extra elevation. Exact shadows and motion live in the sidecar.

## Shapes

The pill-like search shell becomes slightly squarer when open and clips its lower content. Fields and choices use soft corners; document tiles and the game board use larger corners. Search, clear and swap actions are circular. The slash control resembles a small keyboard key inside a full-size target. Preserve one continuous shell for both discovery and tools.

## Components

The search field has an intent icon, growing textarea, clear control, slash control and blue submit arrow. Empty, oversized, composing and open-menu states disable submission. The shell carries focus-within feedback and an explicit 2px blue outline when the query has keyboard focus. Shared controls use the same 2px focus outline with a 3px offset; command rows inset it inside their rounded edge. Widget-specific focus treatments remain local. Brief colour transitions and pressed fills give shared controls visible feedback. The former Classic/Fluid switch and header identity are removed. Notes and the TypeSafe credit share the footer.

The slash menu filters tool names, distinct example names and queries while preserving the underlying query. Arrow keys move the active option, Enter selects it, and Escape restores the prior draft and caret. Pointer selection produces the same result. Selection fills an editable example and opens its tool immediately, including during a routing outage. A persistent manual selector lives in Notes.

The empty-state tip begins with slash discovery, then rotates through selected examples every six seconds. Clicking the initial tip opens the menu; clicking an example fills the query and selects its tool. Hover or focus pauses rotation, as do document hiding and leaving the viewport. An explicit Pause/Resume control is available when motion is allowed. Reduced motion keeps the initial tip static and removes the automatic reveal. The hint is not a live announcement region.

Routing badges remain visible above the tool: **Jev** with measured timing, **Search syntax · instant**, or **Selected by you**. Pending edits show Reading or Updating while retaining the previous tool. The badge opens Notes. That disclosure contains draft transmission, non-affiliation, source behaviour, diagnostics and the persistent selector. A screen-reader description still associates privacy status with the query. Errors and retry actions remain beside the shell.

Notes is divided into How routing works, Tools & data, Controls & limits, and Credits. Its neutral panel uses the Notes body token, 14px section headings and thin separators, with more space above each new section. Opening Notes focuses its heading. Close or Escape within the panel restores focus to the footer button or source badge that opened it; the footer button is the fallback if that opener has disappeared.

Tool families preserve their own working affordances:

- **Utilities:** arithmetic keypad, tip and bill fields, timer progress and completion, stopwatch laps, metronome tempo and beat state, and a swatch with hex/RGB controls. Defaults are labelled when they are editable examples. Enter retains native button activation. Invalid hex input keeps the last valid swatch, exposes a linked inline error and disables Copy; editing clears stale copy success. Timer and stopwatch readouts stay available without announcing every tick: separate polite status messages describe state changes, completion and laps. Metronome audio starts only through **Start sound**, can be stopped, and stops when the page is hidden or the tool closes.
- **Knowledge:** weather has city/day/temperature controls, loading, retry and source disclosure; the large temperature is the daily high. Dictionary tabs use serif reading text. Film tabs combine original illustration, facts and a runtime planner. Planet comparison uses paired values, relative bars and an editable age conversion. Supported examples and external-search paths stay explicit.
- **Conversion:** paired amount and result with selectors and swap. Unit calculations are local. Currency values use dated daily ECB reference rates with an expandable rate/source explanation and visible failure handling.
- **Experiments:** the prebuilt orbit model pairs an original SVG scene with mass/radius sliders and computed readings, pause/reset, and model details. Tic-tac-toe has a playable two-person board, turn/result state, undo and reset. Barrel roll and askew affect only a contained miniature, with explicit play/replay/reset.
- **Travel and shopping:** flights use editable endpoints, a swap action, trip type, dates, passengers and cabin. Hotels combine destination, stay dates, nights, guests, rooms, class and amenity toggles. Shopping pairs the product query with a budget range, currency, condition, category and sort preference. Inline errors block unusable searches; expandable search details show how choices become the outgoing Google query. These are search planners, not quotes or availability listings.
- **Finance:** pressed tabs switch between stock research and an editable compound-growth scenario. Stock controls collect a ticker or asset, research view and time horizon before opening current information externally. The local growth chart compares calculated balance with contributions; its details state the compounding assumptions and excluded costs. It is labelled illustrative, never a market forecast.
- **Discovery:** video duration choices use a small film-strip treatment beside source and posting-date controls. The preview describes the search, not a retrieved video. Images pair shape, colour and layout controls with credited NASA Earth or Moon references; unrelated queries retain image-search controls without an unrelated default photo. Preview layout stays local, while shape and colour travel to Google Images. Source details and image-load recovery remain available. Maps offer Singapore/Tokyo and city/closer views, with an explicit Load map action before any OpenStreetMap iframe is mounted. Loaded maps retain attribution and a larger-map link. The destination/category search stays independent of the preview area.
- **News:** a serif masthead and query preview frame topic, coverage type, recency, source and region controls. Current coverage opens externally; no local headlines or results are implied.
- **Search refinements:** removable syntax chips, file-format tiles, source/date fields and exact/excluded terms edit the query. All outbound actions identify their destination and preserve the visitor’s query and preferences.

The lower panel uses its measured content height and a 280ms transition with `cubic-bezier(.16,1,.3,1)`; this localized layout animation is an accepted tradeoff. Arrival lasts 240ms and tint changes last 300ms. Pending feedback is temporary. Reduced motion removes nonessential transitions and geometric animation, including automatic search-tip rotation; orbit calculations and clock readouts remain useful. Dinosaur motion necessary for play begins only after an explicit Start and retains Pause. Orbit movement can be paused, and Easter eggs are bounded to one user-triggered motion.

## Do's and Don'ts

- **Do** retain the white canvas, anchored query and independent Fluid Search identity.
- **Do** keep slash discovery usable with pointer, keyboard and touch.
- **Do** preserve routing provenance and make data sources and limitations accessible.
- **Do** use 44px primary control targets, readable muted text and visible keyboard focus.
- **Do** require an explicit action for audio and provide pause, stop, replay or reset where relevant.
- **Don't** restore the superseded dark composer or permanent example-card grid.
- **Don't** present selected tools, local syntax or reference content as Jev-generated results.
- **Don't** invent retrieved data, hide failure states or turn fixture values into facts.
- **Don't** move the active input or require animation to understand state.

## Dinosaur and footer refinement

The header branding and Classic/Fluid switch are removed. Notes is a 44px footer button beside the TypeSafe credit; opening it reveals a max-760px panel with privacy, attribution to ShapeShift by Anish Gupta, and technical details. Main top spacing retains the established search position (134px desktop, 114px tablet, 103px phone). The dinosaur panel uses charcoal pixel art, a grounded desert track, score, jump/pause/restart controls and explicit start. Its original SVG artwork and local physics require no external assets. The same component appears on the real 404 page. Motion needed to play begins only after consent to start; pausing and reduced decorative motion remain available.
