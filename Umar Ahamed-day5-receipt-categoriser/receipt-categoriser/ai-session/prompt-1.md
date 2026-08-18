# Prompt 1 — First implementation pass (spec-led)

- **Agent:** Claude Code (Opus 5)
- **Date:** 2026-08-15
- **Goal:** Produce a first cut of the categoriser from the spec alone, with no chat-driven design.

## Prompt (verbatim)

```
You are implementing a feature in TypeScript. Below is the complete spec and
acceptance criteria for the GreenChit "Receipt Categoriser". Implement the
feature so that all acceptance criteria can be made to pass with a small test
runner.

Constraints:
- Touch only files under `src/` and `tests/`.
- Runtime is Node 24. Use the built-in `node:test` runner and native TypeScript
  type stripping. Do NOT add any npm dependencies, and do NOT add a build step.
- Azure OpenAI, Azure AI Document Intelligence, Application Insights and Azure
  App Configuration must be behind injected interfaces (ports), so the
  acceptance tests can drive them with fakes. Do not call the real SDKs.
- Do NOT invent fields, endpoints, or behaviour not in the spec. If the spec
  does not say what a value should be, stop and list it as an ambiguity rather
  than guessing silently.
- The module boundary is: `categorise(request, deps)` returns the same
  status + body the HTTP endpoint would return, so the acceptance criteria can
  be asserted from outside the module.

Before writing code, list any ambiguities in the spec you would want clarified.
Then implement.

[pasted: spec/spec.md]
[pasted: spec/acceptance.md]
```

## Why this prompt is shaped this way

| Element | Reason |
|---|---|
| "Touch only files under `src/` and `tests/`" | Stops the agent rewriting the Day 4 design pack or the spec itself. |
| "no npm dependencies, no build step" | Makes the deliverable reproducible by another intern with only Node installed. |
| "behind injected interfaces (ports)" | The four Azure services are untestable in a lab; this is the only way AC-03 (503) and AC-04 (OCR failure) are observable. |
| "Do NOT invent fields" | Direct counter to the known failure mode — agents pad response objects. |
| "returns the same status + body the HTTP endpoint would return" | Keeps criteria observable from outside the code, as the acceptance deliverable requires. |
| "list ambiguities before writing code" | Turns spec gaps into review output instead of silent agent guesses. |
