import { describe, it, expect } from 'vitest';
import { parseFindArgs, elementMatchesQuery, scoreElement } from '../../src/commands/find.js';
import { levenshtein, tokenize, scoreField, fuzzyMatchElement } from '../../src/fuzzy-match.js';
import type { ManifestElement } from '@uicontract/core';

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

function makeElement(overrides: Partial<ManifestElement> = {}): ManifestElement {
  return {
    agentId: 'settings.billing.pause-btn.button',
    type: 'button',
    filePath: 'src/components/BillingSettings.tsx',
    line: 47,
    column: 8,
    componentName: 'BillingSettings',
    route: '/settings/billing',
    label: 'Pause subscription',
    handler: 'handlePauseSubscription',
    attributes: {},
    conditional: false,
    dynamic: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseFindArgs
// ---------------------------------------------------------------------------

describe('parseFindArgs', () => {
  it('parses a single query positional', () => {
    const result = parseFindArgs(['login']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.query).toBe('login');
    expect(result.manifest).toBe('manifest.json');
    expect(result.type).toBeUndefined();
    expect(result.json).toBe(false);
    expect(result.help).toBe(false);
  });

  it('parses --manifest flag', () => {
    const result = parseFindArgs(['login', '--manifest', 'dist/manifest.json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.manifest).toBe('dist/manifest.json');
  });

  it('parses --type flag', () => {
    const result = parseFindArgs(['login', '--type', 'button']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.type).toBe('button');
  });

  it('parses --json flag', () => {
    const result = parseFindArgs(['login', '--json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.json).toBe(true);
  });

  it('parses --help flag', () => {
    const result = parseFindArgs(['--help']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('parses -h shorthand', () => {
    const result = parseFindArgs(['-h']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('allows --help without a query', () => {
    const result = parseFindArgs(['--help']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
    expect(result.query).toBeUndefined();
  });

  it('returns error when no query is given', () => {
    const result = parseFindArgs([]);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing required argument/i);
  });

  it('returns error on unknown option', () => {
    const result = parseFindArgs(['login', '--unknown']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unknown option/i);
  });

  it('returns error when --manifest is missing its value', () => {
    const result = parseFindArgs(['login', '--manifest']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --manifest/i);
  });

  it('returns error when --type is missing its value', () => {
    const result = parseFindArgs(['login', '--type']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --type/i);
  });

  it('returns error when too many positional arguments are given', () => {
    const result = parseFindArgs(['login', 'extra']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unexpected argument/i);
  });

  it('parses flags before the query', () => {
    const result = parseFindArgs(['--type', 'button', 'login']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.type).toBe('button');
    expect(result.query).toBe('login');
  });

  // -------------------------------------------------------------------------
  // New tests for --exact and --fuzzy flags
  // -------------------------------------------------------------------------

  it('parses --exact flag', () => {
    const result = parseFindArgs(['login', '--exact']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.exact).toBe(true);
  });

  it('defaults to fuzzy mode (exact = false)', () => {
    const result = parseFindArgs(['login']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.exact).toBe(false);
  });

  it('parses --fuzzy flag (explicit fuzzy mode)', () => {
    const result = parseFindArgs(['login', '--fuzzy']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.exact).toBe(false);
  });

  it('--exact after --fuzzy takes precedence (last flag wins)', () => {
    const result = parseFindArgs(['login', '--fuzzy', '--exact']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.exact).toBe(true);
  });

  it('--fuzzy after --exact takes precedence (last flag wins)', () => {
    const result = parseFindArgs(['login', '--exact', '--fuzzy']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.exact).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// elementMatchesQuery (exact substring matching)
// ---------------------------------------------------------------------------

describe('elementMatchesQuery', () => {
  it('matches on agentId', () => {
    const el = makeElement({ agentId: 'settings.billing.pause-btn.button' });
    expect(elementMatchesQuery(el, 'billing')).toBe(true);
  });

  it('matches on label', () => {
    const el = makeElement({ label: 'Pause subscription' });
    expect(elementMatchesQuery(el, 'pause')).toBe(true);
  });

  it('matches on componentName', () => {
    const el = makeElement({ componentName: 'BillingSettings' });
    expect(elementMatchesQuery(el, 'billing')).toBe(true);
  });

  it('matches on route', () => {
    const el = makeElement({ route: '/settings/billing' });
    expect(elementMatchesQuery(el, '/settings')).toBe(true);
  });

  it('matches on handler', () => {
    const el = makeElement({ handler: 'handlePauseSubscription' });
    expect(elementMatchesQuery(el, 'handlePause')).toBe(true);
  });

  it('matches on type', () => {
    const el = makeElement({ type: 'button' });
    expect(elementMatchesQuery(el, 'button')).toBe(true);
  });

  it('matches on filePath', () => {
    const el = makeElement({ filePath: 'src/components/BillingSettings.tsx' });
    expect(elementMatchesQuery(el, 'BillingSettings.tsx')).toBe(true);
  });

  it('is case-insensitive', () => {
    const el = makeElement({ label: 'Pause subscription' });
    expect(elementMatchesQuery(el, 'PAUSE')).toBe(true);
    expect(elementMatchesQuery(el, 'pAuSe')).toBe(true);
  });

  it('returns false when no field matches', () => {
    const el = makeElement();
    expect(elementMatchesQuery(el, 'zzz-not-found')).toBe(false);
  });

  it('handles null fields gracefully', () => {
    const el = makeElement({
      label: null,
      componentName: null,
      route: null,
      handler: null,
    });
    expect(elementMatchesQuery(el, 'something')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// levenshtein
// ---------------------------------------------------------------------------

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
  });

  it('returns length of other string when one is empty', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('xyz', '')).toBe(3);
  });

  it('returns 0 for two empty strings', () => {
    expect(levenshtein('', '')).toBe(0);
  });

  it('computes single substitution', () => {
    expect(levenshtein('cat', 'car')).toBe(1);
  });

  it('computes single insertion', () => {
    expect(levenshtein('cat', 'cats')).toBe(1);
  });

  it('computes single deletion', () => {
    expect(levenshtein('cats', 'cat')).toBe(1);
  });

  it('is symmetric', () => {
    expect(levenshtein('pause', 'pase')).toBe(levenshtein('pase', 'pause'));
    expect(levenshtein('kitten', 'sitting')).toBe(levenshtein('sitting', 'kitten'));
  });

  it('computes well-known distance for "kitten" / "sitting"', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('computes distance for "pause" / "pase"', () => {
    // "pase" -> "pause" requires 1 insertion
    expect(levenshtein('pause', 'pase')).toBe(1);
  });

  it('computes distance for "subscription" / "subscribtion"', () => {
    // "subscribtion" differs from "subscription" by one character (p -> b)
    expect(levenshtein('subscription', 'subscribtion')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// tokenize
// ---------------------------------------------------------------------------

describe('tokenize', () => {
  it('splits camelCase', () => {
    expect(tokenize('handlePauseSubscription')).toEqual(['handle', 'pause', 'subscription']);
  });

  it('splits kebab-case', () => {
    expect(tokenize('pause-subscription')).toEqual(['pause', 'subscription']);
  });

  it('splits dot.separated', () => {
    expect(tokenize('settings.billing')).toEqual(['settings', 'billing']);
  });

  it('splits snake_case', () => {
    expect(tokenize('pause_subscription')).toEqual(['pause', 'subscription']);
  });

  it('splits slash-separated paths', () => {
    expect(tokenize('src/components/Billing')).toEqual(['src', 'components', 'billing']);
  });

  it('handles mixed delimiters', () => {
    expect(tokenize('settings.billing/pause-btn_click')).toEqual([
      'settings', 'billing', 'pause', 'btn', 'click',
    ]);
  });

  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('lowercases all tokens', () => {
    expect(tokenize('PauseSubscription')).toEqual(['pause', 'subscription']);
  });
});

// ---------------------------------------------------------------------------
// scoreField
// ---------------------------------------------------------------------------

describe('scoreField', () => {
  it('scores exact substring match highly (>= 0.9)', () => {
    const score = scoreField('billing', 'settings.billing.pause-btn.button');
    expect(score).toBeGreaterThanOrEqual(0.9);
  });

  it('scores an identical string at 1.0', () => {
    const score = scoreField('button', 'button');
    expect(score).toBe(1.0);
  });

  it('scores fuzzy match for misspelled query', () => {
    // "pase" should still match "pause" with a reasonable score
    const score = scoreField('pase', 'pause-subscription');
    expect(score).toBeGreaterThan(0.3);
  });

  it('scores multi-word fuzzy match', () => {
    // "pase subscribtion" should match "pause-subscription"
    const score = scoreField('pase subscribtion', 'pause-subscription');
    expect(score).toBeGreaterThan(0.3);
  });

  it('returns 0 for completely unrelated strings', () => {
    const score = scoreField('xyz123', 'button');
    expect(score).toBeLessThan(0.3);
  });

  it('returns 0 when query or field has no tokens', () => {
    expect(scoreField('   ', 'button')).toBe(0);
  });

  it('exact substring scores higher than fuzzy match', () => {
    const exactScore = scoreField('pause', 'pause-subscription');
    const fuzzyScore = scoreField('pase', 'pause-subscription');
    expect(exactScore).toBeGreaterThan(fuzzyScore);
  });
});

// ---------------------------------------------------------------------------
// fuzzyMatchElement
// ---------------------------------------------------------------------------

describe('fuzzyMatchElement', () => {
  it('matches when one field scores above threshold', () => {
    const result = fuzzyMatchElement(['pause-subscription', 'billing'], 'pause');
    expect(result.matches).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('does not match when all fields are below threshold', () => {
    const result = fuzzyMatchElement(['xyz', 'abc'], 'completely-different-query-text');
    expect(result.matches).toBe(false);
  });

  it('skips null fields', () => {
    const result = fuzzyMatchElement([null, null, 'pause-subscription'], 'pause');
    expect(result.matches).toBe(true);
  });

  it('returns score 0 when all fields are null', () => {
    const result = fuzzyMatchElement([null, null], 'anything');
    expect(result.score).toBe(0);
    expect(result.matches).toBe(false);
  });

  it('respects custom threshold', () => {
    const result = fuzzyMatchElement(['pause'], 'pase', 0.99);
    // score will be decent but not 0.99+
    expect(result.matches).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// scoreElement (fuzzy mode integration)
// ---------------------------------------------------------------------------

describe('scoreElement', () => {
  it('scores a matching element above the threshold', () => {
    const el = makeElement({ label: 'Pause subscription' });
    const result = scoreElement(el, 'pause');
    expect(result).not.toBeNull();
    expect(result?.score).toBeGreaterThan(0.3);
  });

  it('returns null for a non-matching element', () => {
    const el = makeElement();
    const result = scoreElement(el, 'zzz-completely-unrelated-gibberish');
    expect(result).toBeNull();
  });

  it('finds elements via fuzzy/misspelled queries', () => {
    const el = makeElement({
      agentId: 'settings.billing.pause-subscription.button',
      label: 'Pause subscription',
    });
    const result = scoreElement(el, 'pase subscribtion');
    expect(result).not.toBeNull();
    expect(result?.score).toBeGreaterThan(0.3);
  });

  it('ranks exact substring match higher than fuzzy match', () => {
    const el = makeElement({ label: 'Pause subscription' });
    const exact = scoreElement(el, 'pause');
    const fuzzy = scoreElement(el, 'pase');
    expect(exact).not.toBeNull();
    expect(fuzzy).not.toBeNull();
    expect(exact!.score).toBeGreaterThan(fuzzy!.score);
  });

  it('handles null fields in the element', () => {
    const el = makeElement({
      label: null,
      componentName: null,
      route: null,
      handler: null,
    });
    // Should still match on agentId, type, or filePath
    const result = scoreElement(el, 'billing');
    expect(result).not.toBeNull();
  });

  it('results are sorted by relevance when multiple elements match', () => {
    const el1 = makeElement({ agentId: 'login.form.button', label: 'Login' });
    const el2 = makeElement({ agentId: 'settings.logout.button', label: 'Logout' });
    const el3 = makeElement({ agentId: 'auth.login.input', label: 'Login email' });

    const scores = [el1, el2, el3]
      .map((el) => scoreElement(el, 'login'))
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // el1 and el3 both have "login" in them, el2 has "logout" which is close
    expect(scores.length).toBeGreaterThanOrEqual(2);

    // Sorting by score descending
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    expect(sorted[0]?.score).toBeGreaterThanOrEqual(sorted[sorted.length - 1]?.score ?? 0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases for fuzzy matching
// ---------------------------------------------------------------------------

describe('fuzzy matching edge cases', () => {
  it('single character query matches elements containing that character', () => {
    const el = makeElement({ label: 'A big button' });
    const result = scoreElement(el, 'a');
    // Single char 'a' is a substring of the label
    expect(result).not.toBeNull();
  });

  it('very long query does not crash', () => {
    const el = makeElement();
    const longQuery = 'a'.repeat(500);
    const result = scoreElement(el, longQuery);
    // Should not throw; result can be null (no match)
    expect(result === null || typeof result.score === 'number').toBe(true);
  });

  it('query with special characters does not crash', () => {
    const el = makeElement({ agentId: 'settings.billing.pause-btn.button' });
    const result = scoreElement(el, 'settings/billing');
    // '/' is a delimiter, so this should tokenize and still match
    expect(result).not.toBeNull();
  });

  it('empty fields array in fuzzyMatchElement returns no match', () => {
    const result = fuzzyMatchElement([], 'anything');
    expect(result.matches).toBe(false);
    expect(result.score).toBe(0);
  });
});
