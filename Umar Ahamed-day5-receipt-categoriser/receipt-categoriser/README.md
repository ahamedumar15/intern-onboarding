# Receipt Categoriser

Reference implementation of the GreenChit Receipt Categoriser, built by driving
an AI coding agent from [spec/spec.md](spec/spec.md) and
[spec/acceptance.md](spec/acceptance.md).

## Run the tests

```bash
cd receipt-categoriser
npm test          # or: node --test
```

Needs Node >= 22.18 (24.x used here) and nothing else — no install step, no
dependencies. TypeScript runs directly via Node's built-in type stripping.

**15 tests, ~0.3 s.** Ten map one-to-one onto acceptance criteria: AC-01 to
AC-09 plus the NFR and spec-contract cases.

## Layout

| Path | What it holds |
|---|---|
| [src/categoriser.ts](src/categoriser.ts) | Orchestrator. Returns the exact status + body the endpoint returns. |
| [src/llm-categoriser.ts](src/llm-categoriser.ts) | Azure OpenAI path. Validates the model's answer or fails fast. |
| [src/rule-based-categoriser.ts](src/rule-based-categoriser.ts) | Keyword fallback. No network, cannot fail, confidence capped at 0.5. |
| [src/decision.ts](src/decision.ts) | Claimant accept/override log (AC-07). |
| [src/telemetry.ts](src/telemetry.ts) | `categoriser.suggested`, built from an allowlist. |
| [src/deadline.ts](src/deadline.ts) | The one timeout primitive both upstream calls use. |
| [src/types.ts](src/types.ts) | Contract types, thresholds, and the four service ports. |
| [ai-session/](ai-session/) | The three prompts and what the agent returned. |
| [ai-implementation-report.md](ai-implementation-report.md) | What the agent got wrong and what was done about it. |

The LLM and rule-based paths never call each other. `categoriser.ts` picks one;
either file can be replaced without touching the other.

## What is faked

Azure OpenAI, Document Intelligence, Application Insights and App Configuration
sit behind four interfaces in `src/types.ts`; the tests supply fakes
(`tests/fixtures.ts`). This is what makes AC-03 (LLM returns 503) and AC-04
(unparseable image) testable at all.

Receipt fixtures are **OCR text, not images** — the fixture boundary is
Document Intelligence's output. Swapping in real JPEGs would test Azure's OCR,
not this feature.

## What this is not

Day 4 puts this feature inside the existing ASP.NET Core Claims API. This repo
is TypeScript: it pins down the *contract, control flow and failure behaviour*,
not the production code. Porting it means keeping the ports, the budget split
and the telemetry allowlist, and rewriting the rest in C#.

Also missing on purpose: the HTTP route, auth, and the claim-record write. The
module starts after the upload is parsed and ends before the claim is saved.

## Known open items

- The `categoriser.decided` event is a **proposed** spec change, not an approved
  one — see `src/decision.ts` and smell R-03 in the spec review.
- `204` for feature-flag-off is the agent's invention; the spec has no answer.
- The 60-line prompt cap is a defensible bound, not one measured against LKR 5.
