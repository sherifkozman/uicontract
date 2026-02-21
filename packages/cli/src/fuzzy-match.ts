/**
 * Fuzzy string matching utilities for the `uic find` command.
 *
 * Implements Levenshtein distance and word-level fuzzy matching so that
 * queries such as "pase subscribtion" can find "pause-subscription".
 *
 * No external dependencies -- everything is computed inline.
 */

// ---------------------------------------------------------------------------
// Levenshtein distance
// ---------------------------------------------------------------------------

/**
 * Compute the Levenshtein edit distance between two strings.
 * Uses a single-row dynamic-programming approach (O(min(a,b)) space).
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure `a` is the shorter string so the row array is small.
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  const aLen = a.length;
  const bLen = b.length;

  // Previous row of distances (indices 0..aLen).
  const row: number[] = Array.from({ length: aLen + 1 }, (_, i) => i);

  for (let j = 1; j <= bLen; j++) {
    let prev = j;
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const rowPrev = row[i] as number;
      const rowCurr = row[i - 1] as number;
      const val = Math.min(
        rowPrev + 1,
        prev + 1,
        rowCurr + cost,
      );
      row[i - 1] = prev;
      prev = val;
    }
    row[aLen] = prev;
  }

  return row[aLen] as number;
}

// ---------------------------------------------------------------------------
// Tokenisation helpers
// ---------------------------------------------------------------------------

/**
 * Split a string into lowercase tokens. Handles camelCase, PascalCase,
 * kebab-case, snake_case, dot.separated, and slash/separated paths.
 *
 * Examples:
 *   "handlePauseSubscription" => ["handle", "pause", "subscription"]
 *   "pause-subscription"     => ["pause", "subscription"]
 *   "settings.billing"       => ["settings", "billing"]
 */
export function tokenize(str: string): string[] {
  const spaced = str.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced
    .split(/[\s\-_./\\:]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 0);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const PERFECT_SCORE = 1.0;
const DEFAULT_THRESHOLD = 0.3;

/**
 * Compute a similarity score (0..1) between two individual tokens.
 * 1.0 = identical, 0.0 = completely different.
 */
function tokenSimilarity(a: string, b: string): number {
  if (a === b) return PERFECT_SCORE;

  if (a.includes(b) || b.includes(a)) {
    const longer = Math.max(a.length, b.length);
    const shorter = Math.min(a.length, b.length);
    return 0.8 + 0.2 * (shorter / longer);
  }

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return PERFECT_SCORE;

  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

/**
 * Score how well a query matches a single target field.
 *
 * Strategy:
 * 1. Exact substring match on the raw field => high score.
 * 2. Tokenise both query and field, then find the best token-level
 *    alignment (each query token matched to the best field token).
 *
 * Returns a score in [0, 1]. Higher is better.
 */
export function scoreField(query: string, field: string): number {
  const qLower = query.toLowerCase();
  const fLower = field.toLowerCase();

  if (fLower.includes(qLower)) {
    return 0.9 + 0.1 * (qLower.length / fLower.length);
  }

  const qTokens = tokenize(query);
  const fTokens = tokenize(field);

  if (qTokens.length === 0 || fTokens.length === 0) return 0;

  let totalSim = 0;
  for (const qt of qTokens) {
    let bestSim = 0;
    for (const ft of fTokens) {
      const sim = tokenSimilarity(qt, ft);
      if (sim > bestSim) bestSim = sim;
    }
    totalSim += bestSim;
  }

  return (totalSim / qTokens.length) * 0.85;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Result of scoring an element against a query. */
export interface FuzzyMatchResult {
  score: number;
  matches: boolean;
}

/**
 * Score a set of fields against a search query using fuzzy matching.
 * Returns the best score across all fields and whether it exceeds the threshold.
 */
export function fuzzyMatchElement(
  fields: (string | null)[],
  query: string,
  threshold: number = DEFAULT_THRESHOLD,
): FuzzyMatchResult {
  let bestScore = 0;

  for (const field of fields) {
    if (field === null) continue;
    const s = scoreField(query, field);
    if (s > bestScore) bestScore = s;
  }

  return { score: bestScore, matches: bestScore >= threshold };
}
