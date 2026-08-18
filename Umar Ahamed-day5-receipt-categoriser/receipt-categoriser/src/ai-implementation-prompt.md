# The implementation prompt

The prompt template used to drive the agent for this feature. Kept next to the
code because it is part of how the code is maintained: a change to the spec is
re-run through this, not chatted about.

```
You are implementing a feature in TypeScript. Below is the complete spec and
acceptance criteria. Implement the feature so that all acceptance criteria can
be made to pass with a small test runner.

Constraints:
- Touch only files under `src/` and `tests/`.
- Runtime is Node 24. Use the built-in `node:test` runner and native TypeScript
  type stripping. No npm dependencies, no build step.
- Every external service must sit behind an injected interface, so the
  acceptance tests can drive it with fakes. Do not call real SDKs.
- Do NOT invent fields, endpoints, or behaviour not in the spec. If the spec
  does not say what a value should be, stop and list it as an ambiguity rather
  than guessing silently.
- The module boundary is `categorise(request, deps)`, returning the same status
  and body the HTTP endpoint returns, so criteria are assertable from outside.

Before writing code, list any ambiguities in the spec you would want clarified.
Then implement.

[paste spec/spec.md]
[paste spec/acceptance.md]
```

## The four clauses that did the work

**"Do NOT invent fields."** The agent invented four anyway (`needs_review`,
`message`, `outcome`, status `204`) — but because the clause was there, it
listed them instead of burying them, which is what made the review possible.

**"List ambiguities before writing code."** Produced seven, six of them real
spec defects. Without this the agent silently picks a side of every
contradiction and the spec never gets fixed.

**"Behind an injected interface."** The difference between "AC-03 is tested" and
"AC-03 is untestable". Azure OpenAI cannot be made to return 503 on demand.

**"Returns the same status and body the HTTP endpoint returns."** Keeps every
acceptance criterion observable from outside the module — no test asserts on an
internal call.

## What the prompt failed to prevent

Nothing in it stopped the agent from **implementing only the half of the
contract that had tests** (see `ai-session/response-2.md`). A prompt clause that
would have: *"List every side effect in spec 3 and name the function that
produces it, before you write tests."*
