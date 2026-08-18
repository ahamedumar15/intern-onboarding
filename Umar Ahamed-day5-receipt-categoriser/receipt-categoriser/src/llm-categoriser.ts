/**
 * LLM categoriser — the primary path.
 *
 * Wraps the Azure OpenAI port. Its whole job is to make the model's answer
 * trustworthy enough to return, or to fail fast so the caller can degrade:
 *
 *  - enforces the LLM_TIMEOUT_MS budget (NFR: under 4s p95 end to end)
 *  - rejects any category outside the spec enum
 *  - clamps confidence into [0.0, 1.0]
 *  - converts every failure mode into a single LlmUnavailableError
 *
 * It never returns a partial or "best effort" answer. A bad answer here is
 * worse than the rule-based one, because it would carry an LLM-level
 * confidence score.
 */

import { withDeadline } from './deadline.ts';
import {
  CATEGORIES,
  LLM_TIMEOUT_MS,
  LlmUnavailableError,
  type Category,
  type LlmClient,
  type Suggestion,
} from './types.ts';

function isKnownCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

export async function categoriseByLlm(
  llm: LlmClient,
  lines: string[],
  timeoutMs: number = LLM_TIMEOUT_MS,
): Promise<Suggestion> {
  if (lines.length === 0) {
    // No text to classify. Do not spend a token budget guessing at nothing.
    throw new LlmUnavailableError('no OCR text to classify');
  }

  let raw;
  try {
    raw = await withDeadline(
      (signal) => llm.classify(lines, signal),
      timeoutMs,
      () => new LlmUnavailableError(`Azure OpenAI exceeded ${timeoutMs}ms`),
    );
  } catch (error) {
    // 503, 429, socket error, deadline — all the same to the caller.
    throw new LlmUnavailableError(
      `Azure OpenAI unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!raw || !isKnownCategory(raw.category)) {
    throw new LlmUnavailableError(
      `model returned a category outside the enum: ${JSON.stringify(raw?.category)}`,
    );
  }

  const confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence)) {
    throw new LlmUnavailableError('model returned a non-numeric confidence');
  }

  return {
    category: raw.category,
    confidence: Math.min(1, Math.max(0, confidence)),
    source: 'llm',
  };
}
