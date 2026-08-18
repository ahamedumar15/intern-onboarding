# Response 3 — NFRs made load-bearing (and a real bug)

## What changed

```
src/types.ts        + SUGGESTION_BUDGET_MS 4000 / OCR_TIMEOUT_MS 2000 /
                      LLM_TIMEOUT_MS 1500 / MAX_LLM_INPUT_LINES 60
                    + CategoriserTimeouts, injectable via deps
                    + AbortSignal on the OCR port
src/deadline.ts     new — the single deadline primitive
src/categoriser.ts  OCR runs under a deadline; the LLM gets whatever is left of
                    the 4s budget; the prompt is capped at 60 lines
tests/              + hung-OCR, + hung-LLM, + cost-cap
```

`node --test` — **15 passing, suite runs in 278 ms.**

Budget split, and why: OCR 2000 + LLM 1500 + ~500 ms headroom = the 4s p95. If
OCR is slow, the model gets less time — the request does not get more.

## The bug this round exposed

The first version of the timeout did this:

```ts
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
raw = await llm.classify(lines, controller.signal);   // <-- still awaited
```

It aborts the signal and then keeps waiting. Against a client that honours
`AbortSignal` it looks correct. Against a client that accepts the request and
never answers, **it hangs forever** — which is precisely the failure the 4s NFR
exists to prevent.

This was not caught by reading the code. It was caught by running it: the
hung-LLM test never returned, and `node --test` had to be killed after two
minutes. The fix is `src/deadline.ts`, which *races* the work against the
deadline instead of only signalling it, and is now used by both upstream calls.

Worth stating plainly: **signalling an abort is not a timeout.** A timeout is a
promise that resolves without the upstream's cooperation.

## What the agent did not do

It did not touch any existing acceptance test to make the new constraints pass —
that was an explicit constraint in the prompt, and it held. The three new tests
are additive.

## Still open after this round

- 60 lines is a defensible bound, not a measured one. Nobody has priced a real
  gpt-4.1 call against LKR 5 yet; that is a load-test task, not a code task.
- The latency tests prove the handler returns *on its own deadline*. They say
  nothing about p95 under concurrency, which needs a load test the spec asserts
  and does not describe (spec review, smell R-05).
