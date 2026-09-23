# ChatGPT Fluid design direction

The approved visual authority is the user's ChatGPT composer screenshot: charcoal canvas, soft rounded composer, neutral sans typography, small familiar line icons. This is an interactive experience whose first viewport proves the composer, not a marketing landing page.

Use a restrained dark grayscale with off-white primary text and readable muted text. Geist Sans supplies self-hosted readable typography. The app title sits at top left with a small outlined fluid mark; a Classic/Fluid segmented control sits top right. Center the main composer at a comfortable reading width, with a short heading above and example prompts below. The footer holds attribution and How it works.

Modes change an anchored accessory row, composer edge, and a localized background wash. Image: desaturated violet. Web: cool blue. Research: soft amber. Sketch: green-white with a faint localized dot grid. General is neutral charcoal. Color never carries meaning alone.

The textarea, caret, and controls remain fixed across mode changes. Mode labels crossfade in 200ms; ambient fields transition in 600ms. No constant animation, particles, decorative cards, fake voice/upload controls, or generated output. Reduced motion disables transitions. Mobile retains a 44px interaction target and 16px input type.

The plus menu lists Auto and five explicit modes. A selected manual mode stays locked and displays a return-to-Auto affordance. Explicit sample mode never resembles live inference. Empty, pending, uncertain, network unavailable, limit reached, and oversize states preserve readable feedback and the draft.
