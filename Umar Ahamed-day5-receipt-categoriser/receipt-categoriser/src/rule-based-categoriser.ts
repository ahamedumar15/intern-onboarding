/**
 * Rule-based categoriser — the degraded path.
 *
 * Used when Azure OpenAI is unavailable (spec.md NFR: "must continue to work if
 * the LLM provider has a transient outage"). Deliberately dumb: keyword scoring
 * over OCR lines, no network, no state, so it cannot itself fail.
 *
 * Confidence is capped at RULE_BASED_MAX_CONFIDENCE, which is below
 * NEEDS_REVIEW_THRESHOLD. That is intentional: every rule-based suggestion
 * reaches the claimant flagged "Needs review", because we do not want a
 * keyword match to look as trustworthy as a model call.
 */

import {
  RULE_BASED_MAX_CONFIDENCE,
  type Category,
  type Suggestion,
} from './types.ts';

/**
 * Keyword sets are LKR/Sri-Lanka flavoured on purpose — the Day 4 user base is
 * BISTEC staff claiming local expenses.
 *
 * Known weakness: in Sri Lanka "hotel" routinely means a restaurant, so it is
 * scored for both Meals and Lodging and the tie-break below decides. This is
 * logged as an open question in spec.md 7 rather than silently guessed at.
 */
const KEYWORDS: Record<Exclude<Category, 'Other'>, string[]> = {
  Meals: [
    'restaurant', 'cafe', 'café', 'coffee', 'tea', 'bakery', 'kottu', 'rice',
    'curry', 'lunch', 'dinner', 'breakfast', 'meal', 'burger', 'pizza',
    'sandwich', 'beverage', 'food', 'canteen', 'hotel',
  ],
  Travel: [
    'taxi', 'cab', 'uber', 'pickme', 'fuel', 'petrol', 'diesel', 'train',
    'railway', 'bus', 'airline', 'airways', 'flight', 'boarding', 'ticket',
    'toll', 'parking', 'mileage', 'transport',
  ],
  Lodging: [
    'lodge', 'lodging', 'guest house', 'guesthouse', 'resort', 'inn',
    'accommodation', 'room charge', 'room rate', 'night stay', 'check-in',
    'check out', 'checkout', 'suite',
  ],
  'Office Supplies': [
    'stationery', 'stationary', 'notebook', 'note book', 'paper', 'pen',
    'pencil', 'marker', 'printer', 'toner', 'ink', 'cartridge', 'envelope',
    'stapler', 'file', 'folder', 'binder', 'usb', 'keyboard', 'mouse',
  ],
};

/** Categories that win a tie, most specific first. */
const TIE_BREAK_ORDER: Category[] = ['Lodging', 'Travel', 'Office Supplies', 'Meals'];

function countMatches(haystack: string, keywords: string[]): number {
  let hits = 0;
  for (const keyword of keywords) {
    if (haystack.includes(keyword)) hits += 1;
  }
  return hits;
}

/**
 * @param lines OCR line items. May be empty (OCR produced nothing usable).
 */
export function categoriseByRules(lines: string[]): Suggestion {
  const haystack = lines.join('\n').toLowerCase();

  const scores = new Map<Category, number>();
  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    scores.set(category as Category, countMatches(haystack, keywords));
  }

  let best: Category = 'Other';
  let bestScore = 0;
  for (const category of TIE_BREAK_ORDER) {
    const score = scores.get(category) ?? 0;
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }

  if (bestScore === 0) {
    // Nothing matched — spec.md 3 says the safe default is "Other".
    return { category: 'Other', confidence: 0.1, source: 'rule-based' };
  }

  // 1 hit -> 0.3, 2 -> 0.4, 3+ -> 0.5. Never above the cap.
  const confidence = Math.min(RULE_BASED_MAX_CONFIDENCE, 0.2 + bestScore * 0.1);
  return { category: best, confidence: round2(confidence), source: 'rule-based' };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
