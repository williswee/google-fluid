# Routing evaluation

`development.json` and `held-out.json` contain 15 authored English prompts each, balanced across General, Image, Web, Research, and Sketch. Each case names the expected primary mode, the scenario being checked, and a labeling rationale. Prompts cover ordinary requests, negated actions, tool names mentioned without activation, and mixed intent with an explicit immediate task.

Sketch means the **user draws or attaches their own image as input**. “Let me draw the room layout” is Sketch. “Generate a sketch of a cat” and requests for the assistant to produce diagrams or wireframes are Image. Figurative language such as “sketch out a plan” remains General when the desired output is writing. The cases explicitly check this input-versus-output distinction.

Use the development split while refining the routing criteria. Keep held-out cases out of prompt tuning, then run them once the contract is stable. If a held-out case influences a change, record that fact and introduce genuinely new cases for the next held-out check. These are deliberately small demo acceptance sets, not statistically representative benchmarks.

Run the application with its normal server-only live configuration, then:

```sh
npm run evaluate -- --split development --base-url http://localhost:3000
npm run evaluate -- --split held-out --base-url http://localhost:3000
```

Both commands consume the same shared US$5 allowance as public visitors. The script checks `/api/status`, then submits one case at a time through `/api/intent`, with a same-origin header. It does not call TypeSafe directly, retry failed requests, bypass rate limits, or reset the ledger. A timeout, invalid response, budget refusal, rate limit, or other request error ends the run and writes an incomplete report. Do not repeatedly rerun a blocked evaluation.

Optional flags:

| Flag | Purpose |
| --- | --- |
| `--split development` | Default: 15 development cases. |
| `--split held-out` | Separate 15-case acceptance check. |
| `--split all` | Both splits; only use when that disclosure is intentional. |
| `--max-cases 3` | Small connectivity check, explicitly reported as a partial sample. Cases remain in dataset order; this is not a balanced benchmark. |
| `--output evaluation/results/release-check.json` | Choose a report path; an existing file is never overwritten. |

The default output filename contains the run timestamp and split. Reports include completion and error counts, accuracy, per-mode accuracy, an expected-versus-predicted confusion matrix, probabilities, model identity, and timing summaries. Nearest-rank p50/p95 include all completed calls, including cold starts. Failed calls have individual elapsed times but are excluded from success latency aggregates. A configured server is not necessarily an available provider; the request result remains authoritative.

Interpret the two latency measures separately: client round trip includes HTTP and application work; server-reported latency includes validation, budget reservation, Jev, and settlement, not pure model compute. Publish the sample size, completion count, split, model, date, and timing definition next to any result. Never present a fixture, a partial run, or an authored expected label as a live Jev result.

No live evaluation has been claimed by the dataset authors. A real report is required before reporting accuracy or latency numbers.
