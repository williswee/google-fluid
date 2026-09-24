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
  focus: "#8ab4f8"
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
typography:
  query:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "26px"
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
  example:
    rounded: "{rounded.tile}"
    padding: "10px 15px"
    height: "48px"
---

# Design System: Fluid Search

## Overview

**Creative North Star: "A search bar that takes the shape of your curiosity."**

The user-pinned Google-style world uses a white canvas, a familiar multicolour wordmark, charcoal text and restrained blue actions. Fluid Search keeps its independent identity in the header and its non-affiliation notice in the footer. The former dark ChatGPT composer direction is superseded.

The query is the visual anchor. A softly tinted lower shell reveals one useful tool at a time, while compact examples invite exploration. The current implementation in `components/FluidSearch.tsx`, `components/SearchTools.tsx` and `app/globals.css` is the evidence for this system; home composition belongs in the surface brief.

**Key Characteristics:**

- White space around a single search surface.
- Familiar controls with intent-specific accents and restrained illustrations.
- Visible source, pending state and disclosure beside the interaction.

## Colors

Blue is the default action colour. Warm weather and dictionary accents, green market and place accents, violet movies, red documents, rose dates and slate precise-search accents distinguish tools inside pale matching tints. General and website tools share the default blue treatment; conversion and news use their own pale blue interiors.

The multicolour brand letters are identity accents, not a general-purpose content palette. Neutral text, white fields and light borders keep each tool readable. Placeholder, privacy, example-hint and footer text use the muted token after the contrast correction.

**The Local Colour Rule.** Change the tool tint, icon and related controls with the active intent; keep the page white.

## Typography

Geist is locally bundled at regular, medium and semibold weights, with Arial and sans-serif fallbacks. Its familiar workhorse character is part of the user-pinned direction. Georgia appears only in the dictionary term and editorial illustration details.

The hierarchy is compact: query above body copy, medium-weight tool title above small choice labels and notes. Desktop query text follows the query token; narrow screens reduce it to 15px with a 24px line height. Tool titles step down to 17px and then 16px. The wordmark steps from 78px to 65px to 61px. Converter values use tabular numerals and step from 46px to 39px to 30px. These signature treatments do not enlarge ordinary labels.

## Layout

The main column is at most 760px wide, centred with 20px desktop side clearance. The header is a horizontal home link and action group. Below 700px the main clearance becomes 16px, the header tightens, and the about action becomes icon-only. Below 440px examples change from three columns to two; precise-search fields stack below 700px. Four document-format tiles remain in one row.

Tool interiors use a compact illustration beside flexible controls, or a purpose-built converter/filter grid. Small screens reduce illustrations and hide selected decorative icons. Controls preserve a minimum 44px target in the final responsive overrides.

**The Anchored Query Rule.** Tool changes affect the lower shell. The textarea grows only with its content, up to 112px; inference must not reposition its caret.

## Elevation & Depth

Depth is shallow: a light shell border and diffuse shadow separate the search surface from the white canvas. Hover and focus deepen that shadow slightly. Tinted interiors, white inputs and low-contrast separators organize tool content. The active Classic/Fluid segment has a small lift; the page does not use heavy card stacking. Exact shadow and focus treatments live in the sidecar.

## Shapes

The search shell is pill-like at rest and slightly squarer when expanded. Fields and choices share softly rounded corners; example and document tiles use the tile radius. Search, clear and swap actions are circular. Preserve a single clipped outer shell so the tinted tool reads as an extension of the query.

## Components

The search field uses a leading intent icon, a growing textarea, clear action and blue submit arrow. The shell carries focus-within feedback; other interactive controls use the visible blue focus outline. Empty, oversized and composing drafts disable submission. Classic/Fluid uses a two-segment pressed state.

Tool choices use pale or translucent white surfaces and become solid accent with white text when selected. Query-filter chips expose removable syntax with an explicit accessible label. Examples use icon-and-label tiles and reflect the active intent. Inline fields pair a white input with an accent Apply or Add action.

Source labels remain visible: **Jev**, **Search syntax**, **Selected**, and **Example** distinguish inference, local parsing, manual refinement and outage samples. Pending edits retain the last confirmed tool and show Reading or Updating feedback. Keep draft-transmission disclosure and errors near the query. Illustrative maps and market/weather graphics are not retrieved results; real Google destinations and the local converter remain explicitly described.

The single lower panel is measured with ResizeObserver and transitions its height over 280ms using `cubic-bezier(.16,1,.3,1)`. This localized layout animation is an accepted tradeoff for content-fitting transitions. Tool content arrives over 240ms; the tint changes over 300ms. The pending underline pulses only while waiting. Reduced-motion preference removes animation and effectively disables transitions.

## Do's and Don'ts

- **Do** retain the white canvas, anchored query and independent Fluid Search identity.
- **Do** keep provenance, privacy disclosure, readable muted text and visible keyboard focus.
- **Do** preserve 44px targets and useful controls across responsive sizes.
- **Do** describe external destinations and illustrative content honestly.
- **Don't** restore the superseded dark composer, model selector or capability trays.
- **Don't** fabricate results or present local syntax parsing as a Jev decision.
- **Don't** move the active input or require animation to understand state.
