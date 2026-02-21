import { describe, it, expect } from 'vitest';
import { parseFindArgs, elementMatchesQuery } from '../../src/commands/find.js';
import type { ManifestElement } from '@uic/core';

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
});

// ---------------------------------------------------------------------------
// elementMatchesQuery
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
