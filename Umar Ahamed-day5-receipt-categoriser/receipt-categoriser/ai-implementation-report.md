# AI-Driven Implementation Report

- **Agent:** Claude Code (Opus 5), CLI in VS Code
- **Spec driven from:** `spec/spec.md` + `spec/acceptance.md`, pasted whole
- **Rounds:** 3 prompts, all in [ai-session/](ai-session/)
- **Result:** 15 tests passing in ~0.3 s; 10 map onto acceptance criteria
- **Hand-written code:** none of `src/`. Every line came from a prompt; the
  human contribution was the spec, the three prompts, and the reviews below.

## Review log

| # | What I asked the AI | What it produced | Did it match the spec? | My fix / follow-up |
|---|---|---|---|---|
| 1 | First implementation pass, spec pasted whole, "do not invent fields, list ambiguities first" | 7 ambiguities, then `types / categoriser / llm / rule-based / telemetry` + 10 tests, all green | **Partial.** Invented four things the spec never mentions: a `needs_review` field, a `message` field, an `outcome` telemetry property, and status `204` for flag-off | Kept all four — each is load-bearing — but recorded them as **contract changes owed to spec v0.2**, not as free wins. `204` stays contested: the spec has no answer, so a default is a guess wearing a status code. |
| 2 | Same pass, ambiguity A1: OCR "unavailable" (502) vs "cannot parse" (200 + `Other`) | Split into `OcrUnavailableError` -> 502 and `OcrFailedError` -> 200 + `Other`, both tested | **It resolved a contradiction the spec never resolved.** The right call, silently made | Kept the split, and wrote the reasoning into a header comment in `categoriser.ts` so the next reader sees the spec is ambiguous rather than assuming it says this. Raised as smell R-01. |
| 3 | "spec 3 Side effects requires the claimant's final category. You implemented the first three fields. AC-07 is unimplementable. Fix it, and if the spec is wrong say which sentence" | `src/decision.ts` + `categoriser.decided` event + 2 tests. Named the defective sentence instead of quietly adding an event | **No — and neither did the spec.** `categoriser.suggested` is emitted *before* the claimant decides, so "final category selected by claimant" can never be one of its fields | This is the one that mattered: **round 1 was green and half-implemented.** AC-07 existed and simply had no test, so nothing failed. Fix is a second correlated event, filed as smell **R-03** and marked "not approved" in the code. |
| 4 | "The latency and cost NFRs are decorative. Make them real. Do not change an existing test to pass" | One 4s budget split OCR 2000 / LLM 1500 / 500 headroom, injectable timeouts, 60-line prompt cap, 3 new tests. No existing test touched | **Yes**, and it went past the spec: the spec never says how the 4s is divided | Accepted the split and documented it in `types.ts`. The cost cap is honest-but-unmeasured — nobody has priced a real gpt-4.1 call against LKR 5 yet, and the README says so. |
| 5 | (Same round) hung-LLM test | **Deadlocked the suite.** The timeout aborted the `AbortSignal` and then kept awaiting the call — correct against a cooperative client, infinite against one that never answers | **No.** The 4s NFR was unenforceable in exactly the case it exists for | Caught by running it, not reading it: `node --test` had to be killed after 120 s. Replaced with `src/deadline.ts`, which **races** the deadline rather than only signalling it, now used by both upstream calls. |

## The deviation worth keeping

Round 1 produced code that was green, self-consistent, complete against every
test it had been asked to write — and missing half the contract's side effects.
Nothing about the failure looked like failure.

The agent's mistakes were **additive, not subtractive**. It never dropped a
field the spec asked for; it added four the spec did not, and skipped the one
criterion nobody had written a test for. A reviewer diffing code against tests
sees nothing. Only reading the spec's side-effect list against the code finds it.

The second lesson is cheaper to state: **a green suite proves the tests pass.**
The deadlock in review 5 was invisible to review and obvious after 120 seconds
of running.

## What the prompts got right, and what they missed

Right: pasting the spec whole; "do not invent fields" (it invented anyway, but
it *declared* them); "list ambiguities before writing code" (seven, six real);
ports for every Azure service (without which AC-03 and AC-04 are untestable);
"do not change an existing test to make this pass".

Missed: nothing required the agent to enumerate the spec's side effects and name
the function producing each. That single clause would have caught review 3 in
round 1.

## Traceability

| Criterion | Test | Status |
|---|---|---|
| AC-01 happy path | `AC-01 happy path: clear meal receipt` | pass |
| AC-02 ambiguous | `AC-02 ambiguous receipt ... flagged for review` | pass |
| AC-03 LLM fallback | `AC-03 LLM unavailable falls back to rule-based` | pass |
| AC-04 OCR failure | `AC-04 OCR cannot parse the image` | pass |
| AC-05 oversized | `AC-05 oversized payload is rejected ...` | pass |
| AC-06 PII boundary | `AC-06 PII ... never reaches Application Insights` | pass |
| AC-07 override | `AC-07 claimant override is recorded ...` | pass |
| AC-08 feature flag | `AC-08 feature flag off short-circuits the endpoint` | pass |
| AC-09 invalid type | `AC-09 unsupported file type is a 400` | pass |
| AC-10 logging | folded into AC-01 + AC-06 (event name, fields, allowlist) | pass |
| NFR latency | two hung-upstream tests | pass |
| NFR cost | prompt-size cap test | pass (bound is unmeasured) |
