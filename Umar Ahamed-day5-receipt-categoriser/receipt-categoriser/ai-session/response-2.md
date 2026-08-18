# Response 2 — Claimant decision log

## The agent's finding

> The spec is not implementable as written.
>
> spec.md 3 lists "Final category selected by claimant" as a field of the
> `categoriser.suggested` event. That event is emitted when the suggestion is
> returned — *before* the claimant has seen it. At emission time the final
> category does not exist. No ordering of the code fixes this; it is a defect
> in the spec, not in the implementation.

Proposed change, quoted back for the spec owner:

- **Before (spec 3, Side effects):** one event, `categoriser.suggested`, whose
  fields include "Final category selected by claimant".
- **After:** two events correlated by `claimId` —
  `categoriser.suggested` at T0 (category, confidence, source), and
  `categoriser.decided` at T1 (suggested category, final category, overridden).

The technical constraints name only `categoriser.suggested`, so **this needs an
explicit decision before merge.** The agent did not treat its own proposal as
approved: `src/decision.ts` carries the defect as a comment at the top of the
file, and it is smell R-03 in the spec review.

## What changed

```
src/decision.ts                 new — recordDecision(), categoriser.decided
tests/acceptance.test.ts        + AC-07 override, + accepted-suggestion case
```

`categorise()` was not widened. The claimant decides on a later request, and
folding the decision into the categorise call would have invented a flow the
spec does not describe.

`node --test` — **12 passing.**

## Why this was missed the first time

The round-1 output was green, self-consistent, and complete against every
acceptance criterion it had been given a test for. AC-07 existed in
`acceptance.md`, and the agent simply did not write a test for it — so nothing
failed, and the missing half of the contract was invisible in the test run.

The lesson for driving agents: **a green suite proves the tests pass, not that
the spec is implemented.** The check that found this was reading the spec's
side-effect list against the code line by line, not running anything.
