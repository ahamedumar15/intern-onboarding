# Prompt 3 — Make the non-functional requirements load-bearing

- **Agent:** Claude Code (Opus 5)
- **Trigger:** Two NFRs are asserted in the spec and enforced nowhere in the code.

## Prompt (verbatim)

```
Two non-functional requirements are currently decorative. Make them real.

1. Latency: "under 4 seconds p95 from upload to displayed suggestion".
   Right now only the Azure OpenAI call has a timeout. If Document
   Intelligence hangs, the request hangs with it and the 4s budget is
   unbounded. Give the handler one end-to-end budget and spend it across
   OCR and the LLM, so no single upstream can blow it.

2. Cost: "must not exceed LKR 5 per suggestion at ~2,000/month".
   Nothing bounds how much OCR text is sent to the model. A 400-line
   receipt costs whatever it costs.

Constraints:
- The budgets are operational values. Make them injectable configuration
  (the real service reads them from Azure App Configuration alongside the
  feature flag), not constants a test has to monkey-patch.
- An OCR timeout is the service being unavailable -> 502. An LLM timeout is
  a transient outage -> degrade to rule-based, per AC-03. Do not collapse
  these two into one behaviour.
- Add a test for each. The latency test must not add seconds to the suite.
- Do not change any existing acceptance test to make this pass.
```

## Why this prompt is shaped this way

`node --test` was green after round 2, which is exactly why this round was
needed: **the tests written from the acceptance criteria could not fail on
either NFR.** Both are stated as prose in the spec with no observable trigger,
so the agent had no reason to implement them and no test to notice.

The last constraint — "do not change any existing acceptance test to make this
pass" — is there because the cheapest way for an agent to satisfy a new
constraint is to loosen an old assertion.
