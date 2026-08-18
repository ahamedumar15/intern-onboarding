# Prompt 2 — Close the half of the contract the first pass skipped

- **Agent:** Claude Code (Opus 5)
- **Trigger:** Reading `src/categoriser.ts` back against spec.md 3 "Side effects" and
  acceptance.md AC-07. The first cut logs the *suggestion* and stops there.

## Prompt (verbatim)

```
Re-read spec/spec.md section 3 "Side effects" and spec/acceptance.md AC-07
against what you just wrote.

The spec's side-effect list requires these to be logged:
  - Suggested category
  - Confidence score
  - Suggestion source
  - Final category selected by claimant

You implemented the first three. There is no code path in which a claimant
accepts or overrides a suggestion, so "Final category selected by claimant"
can never be logged. AC-07 is currently unimplementable.

Fix this. Constraints:
- Do not widen `categorise()`. The claimant's decision happens on a later
  request, after they have seen the suggestion; folding it into the same call
  would be inventing a flow the spec does not describe.
- The technical constraints fix the event name as `categoriser.suggested`.
  If your fix needs a second event, do not silently add one — tell me the
  spec is wrong, say exactly which sentence is wrong, and propose the change.
- Keep the PII allowlist property: the decision log must not carry receipt text.
- Add an acceptance test for AC-07.
```

## Why this prompt is shaped this way

The failure was not a bug in the code the agent wrote — everything it wrote
passed. It was a **silent scope truncation**: the agent implemented the
suggestion half of the contract and the tests it was asked to satisfy, and
nothing in a green test run points at the missing half. The prompt names the
exact spec sentence rather than asking "did you miss anything?", because the
agent had already reported itself finished once.

The "do not silently add an event name" clause exists because the previous
round showed the agent will resolve a spec conflict by quietly picking a side.
