---
target: ChatGPT Fluid responsiveness and varied UI transformations
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/williswee/Downloads/Code/jev-ui-demo/components/FluidComposer.tsx"
target_fingerprint: "sha256:7af34e09974b6e10cb8548273253594beeaf33f3933473cc13b309c230fbec18"
target_path: /Users/williswee/Downloads/Code/jev-ui-demo/components/FluidComposer.tsx
timestamp: 2026-09-23T13-46-51Z
slug: components-fluidcomposer-tsx
---
Method: dual-agent (A: /root/design_critique · B: /root/evidence_critique).

The first version is too restrained for the intended demonstration. The interface should acknowledge typing immediately; a confirmed live Jev decision still takes time. The strongest next direction is a compact composer that reveals useful, distinct controls for each capability.

## Timing and priority issues

1. **P1 — Feedback starts late.** The client waits 350 ms before starting a request or showing pending status. In the final public recording, server processing took 810–1,989 ms; that includes budget reservation, Jev, and settlement, not pure model compute. Browser travel and the 600 ms background transition add to the perceived delay. Give neutral acknowledgement within 100 ms of input as a design target, keep existing suggestions visibly marked as updating, test a shorter 120–180 ms debounce with bounded requests, and profile the server stages before selecting infrastructure changes. Confirm capability changes only from actual Jev responses. Move raw milliseconds into How it works. Suggested command: /impeccable optimize.

2. **P1 — Changes have too little visual and functional distinction.** Current Image and Sketch are largely the same tall shell. Adopt the user's compact pill reference and reveal a reserved accessory region with different controls: Image aspect ratio; Web recency/source scope; Research depth/report format; Sketch drawing-input preview. General returns to the compact neutral state. Keep the draft origin and caret anchored, and animate accessory changes over roughly 180–220 ms. Use a slightly more visible localized background cue over 300–400 ms. These are proposed targets, not measured improvements. Suggested commands: /impeccable bolder and /impeccable animate.

3. **P2 — Model/effort and completion need clearer meaning.** Keep Jev as the actual intent classifier. Add a separate suggested response setup: effort and optionally an intended downstream model, explicitly labelled as a preview. Medium-style effort and a model name are different concepts. TypeSafe's intent-routing documentation supports classifying intent and complexity together; benchmark any added choice in the same request. Do not claim that another model or tool has executed. Make the preview action's purpose visible before submission instead of revealing the limitation afterward. Suggested commands: /impeccable shape and /impeccable clarify.

4. **P2 — Mobile loses important clarity.** Classic/Fluid are 34px high, the mode chip is 36px, and return-to-Auto is 30×40px. These miss the project's 44px target requirement; this is not a claimed WCAG failure. Mobile hides the Suggested/Selected/Example prefix and moves provenance to a tiny separate label. Enlarge these targets and keep one clear source label next to the capability. Suggested command: /impeccable adapt.

## Proposed mode language

| Mode | Visible composer change | Background cue |
| --- | --- | --- |
| General | Compact pill, Auto or Balanced setup | Neutral charcoal |
| Image | Aspect-ratio frame choices and visual setup preview | Broader muted violet field |
| Web | Source scope and recency controls | Cool blue edge/field |
| Research | Depth and report-format controls; deeper effort suggestion | Warm amber field |
| Sketch | Drawing-input preview with clear pen affordance | Localized drafting grid |

These controls preview a configuration and must not suggest actual search, image generation, or research execution. Preserve manual overrides and reduced motion. Do not add decorative microphone/voice controls.

## Design health

| Heuristic | Score /4 | Main finding |
| --- | --- | --- |
| System status | 2 | Delayed acknowledgement |
| Real-world match | 2 | Action language overpromises execution |
| User control | 3 | Manual selection and Auto are useful |
| Consistency | 3 | Mobile provenance differs |
| Error prevention | 3 | Good input and stale-response guards |
| Recognition | 3 | Useful examples; some icon interpretation |
| Efficiency | 3 | Keyboard paths; waiting blocks preview |
| Minimalism | 3 | Calm, but excessive empty input space |
| Error recovery | 3 | Drafts preserved; retry implicit |
| Help | 3 | Honest explanation, secondary placement |
| **Total** | **28/40** | **Good usability foundation** |

## Specificity, strengths, and emotional journey

The quiet, familiar design fits the reference, but the signature fluid behavior is underexpressed. Preserve the stable draft/caret, manual correction, and combined icon/text/color cues. The current journey is calm entry, an expectation of adaptation, waiting, an understated reveal, and a demo-only confirmation. The revised peak should be a useful accessory appearing; the ending should confirm the chosen setup.

Cognitive load is moderate in the review checklist (two failures): six menu options and multiple overlapping source/status terms. The main screen's four example prompts remain manageable. Group Auto separately and unify source language.

Persona red flags: an impatient builder notices waiting and weak changes; a first-time visitor may expect the send arrow to run tools; a mobile visitor encounters undersized controls and tiny provenance text. Minor observations: Classic's generic “Open +” hint remains even with a manual capability selected; the byte-limit message is technically accurate but requires unnecessary interpretation.

## Evidence

Independent desktop/mobile inspection confirmed preserved drafts, no horizontal overflow at 390px, and no page errors in the evidence pass. This critique made zero live inference calls; timing comes from the existing real public recording. The deterministic scan returned zero findings for components/FluidComposer.tsx. Manual inspection identified the usability issues above; a clean detector does not establish interaction quality. The browser detector overlay could not load its localhost script, so no reliable visible overlay was produced. The helper server was stopped and browser contexts closed. No application code or deployment was changed.

Sources: components/FluidComposer.tsx:55–88; app/globals.css:5,8,14; artifacts/chatgpt-fluid-demo.json; https://docs.typesafe.ai/patterns/intent-routing.

## Decisions for the next version

1. Should the transformation reveal a compact tool tray (recommended), or open a larger workspace around the composer?
2. Should the selector show effort levels only, or effort plus a suggested model (recommended), with both clearly presented as setup previews?
