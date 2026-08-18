# Response 1 — First implementation pass

## Ambiguities the agent raised before writing code

These are reproduced as returned. Six of the seven are real defects in the spec
and are carried into the spec review; one (A7) is a spec that argues with itself.

| # | Where | Ambiguity |
|---|---|---|
| A1 | spec 3 Errors vs acceptance AC-04 | "OCR service is unavailable -> 502" and "Document Intelligence cannot parse -> 200 + Other" are two different failures under one name. A dead service and an unreadable photo are not the same event, and the spec gives no way to tell which branch a given failure takes. |
| A2 | spec 3 Contract vs acceptance AC-08 | With the feature flag off, AC-08 says "no category suggestion is displayed" — but the Contract has no status code or body for that case. Every documented response carries a category. |
| A3 | spec 3 Output Rules | "Confidence below 0.60 must be displayed as 'Needs review'." *Displayed* by whom? If the web app derives it, two clients can drift apart on the threshold. If the API returns it, the Outputs block is missing a field. |
| A4 | spec 5 Example 4 | The OCR-failure example returns `source: "rule-based"`, but no rule ran — there was no text. The enum has no honest value for "nothing was categorised". |
| A5 | acceptance AC-01 | The body pins `"confidence": 0.70` exactly while the prose says `>= 0.70`. Lifted literally into a test, a correct 0.94 answer fails. |
| A6 | technical constraints vs spec | "Cost per suggestion must not exceed LKR 5 at ~2,000/month" appears in the brief but nowhere in the spec, so nothing in the design is accountable to it. |
| A7 | spec 3 vs spec 7 | Section 3 fixes the threshold at 0.60 as a hard rule; section 7 asks whether it should be configurable. As written the open question is already closed. |

## What the agent produced

```
src/types.ts                    contract types, enums, thresholds, the four ports
src/categoriser.ts              orchestrator; returns the HTTP status + body
src/llm-categoriser.ts          Azure OpenAI path, with output validation
src/rule-based-categoriser.ts   keyword fallback, confidence capped at 0.5
src/telemetry.ts                categoriser.suggested, allowlisted properties
tests/fixtures.ts               fakes for OCR / LLM / telemetry / feature flags
tests/acceptance.test.ts        AC-01..AC-06, AC-08, AC-09 + a 502 case
```

`node --test` — **10 passing.**

How it resolved the ambiguities it had raised:

- **A1** — split into two error types. `OcrUnavailableError` -> 502,
  `OcrFailedError` -> 200 + `Other`. Both branches tested.
- **A2** — chose `204 No Content`. **Not in the spec.** Flagged as an invention.
- **A3** — returned `needs_review` from the API. **Not in the Outputs block.**
- **A4** — followed the spec's Example 4 literally (`source: "rule-based"`,
  confidence 0.0) rather than "fixing" it, and left the smell for the review.

## Deviations from the spec in this pass

| Deviation | Kind | Verdict |
|---|---|---|
| `needs_review: boolean` added to the response body | invented field | **Kept.** One server-side threshold beats two client copies. Contract in spec 3 must gain the field in v0.2. |
| `message: string` on the OCR-failure body | invented field | **Kept.** AC-04 requires the claimant to see specific text; something has to carry it. |
| `outcome` property on the telemetry event | invented field | **Kept.** Distinguishes `ok` / `ocr-failed` / `llm-fallback`, which is the whole point of logging "for future model evaluation". |
| `204` for feature-flag-off | invented status code | **Kept, contested.** The spec has no answer here at all. Needs a decision, not a default. |
| TypeScript, not ASP.NET Core | wrong platform | **Accepted with scope note.** Day 4 puts this inside the .NET Claims API. This repo is a reference implementation of the *logic and contract*; see README "What this is not". |

The first three were all additive — the agent never dropped a field the spec
asked for, it added four the spec did not. That is the shape of the failure to
watch for: nothing is missing, so nothing looks wrong.
