# Captioned demo recording: 55–60 seconds

Record the actual working browser interface. The primary film shows live Jev inference with the live status visible. Submitting previews the selected route and explicitly says no tool is running. Keep captions baked into the final video so the story works without sound.

## Storyboard

| Time | On-screen action | Caption |
| --- | --- | --- |
| 0–5s | Start on the ready composer, with the product identity and live status visible. | “What if the interface understood your intent before you hit send?” |
| 5–18s | Type “Create a minimal poster for a rooftop garden.” Pause for the actual Image suggestion. Select “poster” and replace it with “maintenance checklist”; pause for the ordinary composer to return. Keep the caret and changed word visible. | “As your intent changes, the composer adapts.” |
| 18–28s | Replace the draft with “Find the latest announcements about reusable rockets.” Show Web search, then change the prompt to “Research urban heat mitigation and compare the evidence in a source-backed report.” Show Deep research. | “The right capability appears when it is useful.” |
| 28–38s | Enter “Let me draw the room layout to show you what I mean.” Show the Sketch capability for user-provided drawing input and its quiet background cue. | “When you want to draw, the interface makes room for it.” |
| 38–46s | Open the mode selector, choose a manual mode, then return to Auto. | “You stay in control.” |
| 46–53s | Submit once. Leave the selected-route confirmation and its “UI demonstration only — no tool is running” message visible. | “Jev predicts the intent. This demo previews the experience.” |
| 53–60s | Finish on the composer with a clean end card and the verified public URL. | “Try ChatGPT Fluid” / “chatgptfluid.vercel.app” / “Built with TypeSafe Jev” |

The poster-to-checklist revision is the signature moment. If it does not route correctly in a real run, improve and re-evaluate the classifier before recording that claim. Do not manually switch modes offscreen or substitute a saved response to manufacture the transition.

## Capture and delivery

- Use a clean browser session at 1440 × 900 or a comparable readable desktop viewport. Hide bookmarks, extensions, account details, notifications, and any credentials.
- Record at normal speed. Trim idle time between complete demonstrations, but preserve the elapsed time from the final typed character to each mode transition when making latency visible. Do not speed up inference and imply the edited timing is real.
- Keep the live/fixture indicator visible. Do not intercept the API, replay responses, inject mode changes, or hide inference failures in a take presented as live.
- Use deliberate typing and a quiet cursor. Avoid music unless separately licensed; the captioned recording should stand on its own.
- Deliver an H.264 MP4, a WebVTT or SRT caption file, and a still poster frame. Keep a clean original screen recording so the edited result is auditable.
- Store temporary recordings under ignored `artifacts/`; do not commit private browser recordings or credentials.

## If live inference is unavailable

An explicitly labeled fixture walkthrough is a different deliverable. Start and keep a visible caption: **“Example walkthrough — live Jev unavailable.”** Use the interface's built-in example prompts and keep their example label visible. Captions should say “Illustrative interaction” rather than “Jev detected.” Do not publish an unlabeled fixture walkthrough as evidence of live inference. A live demo film remains pending until credentials, the ledger, and the provider are available.

## Final review

Check that the video is between 45 and 60 seconds, captions are legible without audio, the key transition can be understood at normal speed, no result is presented as an executed tool, and the final URL resolves to the reviewed public deployment. Record which build and whether live or fixture mode were used in the video's delivery notes.
