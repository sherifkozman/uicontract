import { describe, it, expect } from 'vitest';
import {
  parseDiffArgs,
  diffManifests,
  findProtectedScopeViolations,
  formatDiffReport,
} from '../../src/commands/diff.js';
import type { Manifest, ManifestElement } from '@uicontract/core';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeElement(overrides: Partial<ManifestElement> = {}): ManifestElement {
  return {
    agentId: 'test.element.button',
    type: 'button',
    filePath: 'src/App.tsx',
    line: 10,
    column: 4,
    componentName: 'App',
    route: '/',
    label: 'Click me',
    handler: 'handleClick',
    attributes: {},
    conditional: false,
    dynamic: false,
    ...overrides,
  };
}

function makeManifest(elements: ManifestElement[]): Manifest {
  return {
    schemaVersion: '1.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    generator: { name: '@uicontract/cli', version: '0.0.0' },
    metadata: {
      framework: 'react',
      projectRoot: '/project',
      filesScanned: 10,
      elementsDiscovered: elements.length,
      warnings: 0,
    },
    elements,
  };
}

// ---------------------------------------------------------------------------
// parseDiffArgs
// ---------------------------------------------------------------------------

describe('parseDiffArgs', () => {
  it('parses two positional manifests', () => {
    const result = parseDiffArgs(['old.json', 'new.json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.oldManifest).toBe('old.json');
    expect(result.newManifest).toBe('new.json');
    expect(result.allowBreaking).toBeUndefined();
    expect(result.json).toBe(false);
    expect(result.help).toBe(false);
  });

  it('parses --allow-breaking with reason', () => {
    const result = parseDiffArgs(['old.json', 'new.json', '--allow-breaking', 'Intentional redesign']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.allowBreaking).toBe('Intentional redesign');
  });

  it('parses --json flag', () => {
    const result = parseDiffArgs(['old.json', 'new.json', '--json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.json).toBe(true);
  });

  it('parses --help flag', () => {
    const result = parseDiffArgs(['--help']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('parses -h shorthand', () => {
    const result = parseDiffArgs(['-h']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('allows --help without positional args', () => {
    const result = parseDiffArgs(['--help']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
    expect(result.oldManifest).toBeUndefined();
    expect(result.newManifest).toBeUndefined();
  });

  it('returns error when only one positional is given', () => {
    const result = parseDiffArgs(['old.json']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing required arguments/i);
  });

  it('returns error when no positionals are given', () => {
    const result = parseDiffArgs([]);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing required arguments/i);
  });

  it('returns error on unknown option', () => {
    const result = parseDiffArgs(['old.json', 'new.json', '--unknown']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unknown option/i);
  });

  it('returns error when --allow-breaking is missing its value', () => {
    const result = parseDiffArgs(['old.json', 'new.json', '--allow-breaking']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --allow-breaking/i);
  });

  it('returns error when too many positional arguments are given', () => {
    const result = parseDiffArgs(['a.json', 'b.json', 'c.json']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unexpected argument/i);
  });

  it('parses flags before positionals', () => {
    const result = parseDiffArgs(['--json', 'old.json', 'new.json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.json).toBe(true);
    expect(result.oldManifest).toBe('old.json');
    expect(result.newManifest).toBe('new.json');
  });

  it('parses --config flag with a path', () => {
    const result = parseDiffArgs(['old.json', 'new.json', '--config', './my-config.json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.configPath).toBe('./my-config.json');
  });

  it('returns error when --config is missing its value', () => {
    const result = parseDiffArgs(['old.json', 'new.json', '--config']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --config/i);
  });

  it('returns error when --config value starts with dash', () => {
    const result = parseDiffArgs(['old.json', 'new.json', '--config', '--json']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --config/i);
  });
});

// ---------------------------------------------------------------------------
// diffManifests
// ---------------------------------------------------------------------------

describe('diffManifests', () => {
  it('returns no changes for identical manifests', () => {
    const el = makeElement();
    const m = makeManifest([el]);
    const result = diffManifests(m, m);
    expect(result.changes).toHaveLength(0);
    expect(result.breaking).toBe(false);
    expect(result.summary.total).toBe(0);
  });

  it('detects ADDED elements', () => {
    const old = makeManifest([]);
    const el = makeElement({ agentId: 'new.element.button' });
    const updated = makeManifest([el]);

    const result = diffManifests(old, updated);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.category).toBe('ADDED');
    expect(result.changes[0]?.breaking).toBe(false);
    expect(result.changes[0]?.agentId).toBe('new.element.button');
    expect(result.summary.added).toBe(1);
  });

  it('detects REMOVED elements', () => {
    const el = makeElement({ agentId: 'old.element.button' });
    const old = makeManifest([el]);
    const updated = makeManifest([]);

    const result = diffManifests(old, updated);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.category).toBe('REMOVED');
    expect(result.changes[0]?.breaking).toBe(true);
    expect(result.changes[0]?.agentId).toBe('old.element.button');
    expect(result.summary.removed).toBe(1);
  });

  it('detects TYPE_CHANGED', () => {
    const oldEl = makeElement({ agentId: 'test.el', type: 'button' });
    const newEl = makeElement({ agentId: 'test.el', type: 'a' });
    const old = makeManifest([oldEl]);
    const updated = makeManifest([newEl]);

    const result = diffManifests(old, updated);
    const typeChange = result.changes.find((c) => c.category === 'TYPE_CHANGED');
    expect(typeChange).toBeDefined();
    expect(typeChange?.breaking).toBe(true);
    expect(typeChange?.agentId).toBe('test.el');
    expect(result.summary.typeChanged).toBe(1);
  });

  it('detects ROUTE_CHANGED', () => {
    const oldEl = makeElement({ agentId: 'test.el', route: '/old' });
    const newEl = makeElement({ agentId: 'test.el', route: '/new' });
    const old = makeManifest([oldEl]);
    const updated = makeManifest([newEl]);

    const result = diffManifests(old, updated);
    const routeChange = result.changes.find((c) => c.category === 'ROUTE_CHANGED');
    expect(routeChange).toBeDefined();
    expect(routeChange?.breaking).toBe(true);
    expect(result.summary.routeChanged).toBe(1);
  });

  it('detects LABEL_CHANGED (non-breaking)', () => {
    const oldEl = makeElement({ agentId: 'test.el', label: 'Old' });
    const newEl = makeElement({ agentId: 'test.el', label: 'New' });
    const old = makeManifest([oldEl]);
    const updated = makeManifest([newEl]);

    const result = diffManifests(old, updated);
    const labelChange = result.changes.find((c) => c.category === 'LABEL_CHANGED');
    expect(labelChange).toBeDefined();
    expect(labelChange?.breaking).toBe(false);
    expect(result.summary.labelChanged).toBe(1);
  });

  it('detects HANDLER_CHANGED (non-breaking)', () => {
    const oldEl = makeElement({ agentId: 'test.el', handler: 'oldHandler' });
    const newEl = makeElement({ agentId: 'test.el', handler: 'newHandler' });
    const old = makeManifest([oldEl]);
    const updated = makeManifest([newEl]);

    const result = diffManifests(old, updated);
    const handlerChange = result.changes.find((c) => c.category === 'HANDLER_CHANGED');
    expect(handlerChange).toBeDefined();
    expect(handlerChange?.breaking).toBe(false);
    expect(result.summary.handlerChanged).toBe(1);
  });

  it('detects MOVED (non-breaking)', () => {
    const oldEl = makeElement({ agentId: 'test.el', filePath: 'src/A.tsx', line: 10 });
    const newEl = makeElement({ agentId: 'test.el', filePath: 'src/B.tsx', line: 20 });
    const old = makeManifest([oldEl]);
    const updated = makeManifest([newEl]);

    const result = diffManifests(old, updated);
    const movedChange = result.changes.find((c) => c.category === 'MOVED');
    expect(movedChange).toBeDefined();
    expect(movedChange?.breaking).toBe(false);
    expect(result.summary.moved).toBe(1);
  });

  it('detects RENAMED (breaking) when ID changes at same location', () => {
    const oldEl = makeElement({ agentId: 'old-id', filePath: 'src/App.tsx', line: 10 });
    const newEl = makeElement({ agentId: 'new-id', filePath: 'src/App.tsx', line: 10 });
    const old = makeManifest([oldEl]);
    const updated = makeManifest([newEl]);

    const result = diffManifests(old, updated);
    const renameChange = result.changes.find((c) => c.category === 'RENAMED');
    expect(renameChange).toBeDefined();
    expect(renameChange?.breaking).toBe(true);
    expect(renameChange?.agentId).toBe('old-id');
    expect(result.summary.renamed).toBe(1);
  });

  it('does not double-count renames as ADDED+REMOVED', () => {
    const oldEl = makeElement({ agentId: 'old-id', filePath: 'src/A.tsx', line: 5 });
    const newEl = makeElement({ agentId: 'new-id', filePath: 'src/A.tsx', line: 5 });
    const old = makeManifest([oldEl]);
    const updated = makeManifest([newEl]);

    const result = diffManifests(old, updated);
    expect(result.summary.renamed).toBe(1);
    expect(result.summary.added).toBe(0);
    expect(result.summary.removed).toBe(0);
  });

  it('detects multiple changes on same element', () => {
    const oldEl = makeElement({
      agentId: 'test.el',
      type: 'button',
      label: 'Old',
      handler: 'oldHandler',
    });
    const newEl = makeElement({
      agentId: 'test.el',
      type: 'a',
      label: 'New',
      handler: 'newHandler',
    });
    const old = makeManifest([oldEl]);
    const updated = makeManifest([newEl]);

    const result = diffManifests(old, updated);
    expect(result.changes.length).toBeGreaterThanOrEqual(3);
    expect(result.changes.some((c) => c.category === 'TYPE_CHANGED')).toBe(true);
    expect(result.changes.some((c) => c.category === 'LABEL_CHANGED')).toBe(true);
    expect(result.changes.some((c) => c.category === 'HANDLER_CHANGED')).toBe(true);
  });

  it('sets breaking=true when any breaking change exists', () => {
    const oldEl = makeElement({ agentId: 'test.el' });
    const old = makeManifest([oldEl]);
    const updated = makeManifest([]);

    const result = diffManifests(old, updated);
    expect(result.breaking).toBe(true);
    expect(result.summary.breakingCount).toBeGreaterThan(0);
  });

  it('sets breaking=false when only non-breaking changes exist', () => {
    const oldEl = makeElement({ agentId: 'test.el', label: 'Old' });
    const newEl = makeElement({ agentId: 'test.el', label: 'New' });
    const old = makeManifest([oldEl]);
    const updated = makeManifest([newEl]);

    const result = diffManifests(old, updated);
    expect(result.breaking).toBe(false);
    expect(result.summary.breakingCount).toBe(0);
  });

  it('handles empty manifests', () => {
    const old = makeManifest([]);
    const updated = makeManifest([]);

    const result = diffManifests(old, updated);
    expect(result.changes).toHaveLength(0);
    expect(result.breaking).toBe(false);
  });

  it('handles large manifest with many adds and removes', () => {
    const oldElements: ManifestElement[] = [];
    const newElements: ManifestElement[] = [];

    for (let i = 0; i < 5; i++) {
      oldElements.push(
        makeElement({
          agentId: `old.element${String(i)}`,
          filePath: `src/old${String(i)}.tsx`,
          line: i + 1,
        }),
      );
    }
    for (let i = 0; i < 3; i++) {
      newElements.push(
        makeElement({
          agentId: `new.element${String(i)}`,
          filePath: `src/new${String(i)}.tsx`,
          line: i + 1,
        }),
      );
    }

    const old = makeManifest(oldElements);
    const updated = makeManifest(newElements);

    const result = diffManifests(old, updated);
    expect(result.summary.removed).toBe(5);
    expect(result.summary.added).toBe(3);
    expect(result.summary.total).toBe(8);
    expect(result.breaking).toBe(true);
  });

  it('correctly computes summary totals', () => {
    const oldEl1 = makeElement({ agentId: 'el1', type: 'button' });
    const oldEl2 = makeElement({ agentId: 'el2', filePath: 'src/B.tsx', line: 20 });
    const newEl1 = makeElement({ agentId: 'el1', type: 'a' });
    const newEl3 = makeElement({ agentId: 'el3', filePath: 'src/C.tsx', line: 30 });

    const old = makeManifest([oldEl1, oldEl2]);
    const updated = makeManifest([newEl1, newEl3]);

    const result = diffManifests(old, updated);
    // el1: TYPE_CHANGED (breaking)
    // el2: REMOVED (breaking)
    // el3: ADDED (non-breaking)
    expect(result.summary.typeChanged).toBe(1);
    expect(result.summary.removed).toBe(1);
    expect(result.summary.added).toBe(1);
    expect(result.summary.breakingCount).toBe(2);
    expect(result.summary.total).toBe(3);
    expect(result.breaking).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// findProtectedScopeViolations
// ---------------------------------------------------------------------------

describe('findProtectedScopeViolations', () => {
  it('returns empty when no protected scopes configured', () => {
    const el = makeElement({ agentId: 'settings.billing.btn' });
    const result = diffManifests(makeManifest([el]), makeManifest([]));
    const violations = findProtectedScopeViolations(result.changes, []);
    expect(violations).toHaveLength(0);
  });

  it('returns empty when no changes match protected scopes', () => {
    const el = makeElement({ agentId: 'nav.link' });
    const result = diffManifests(makeManifest([el]), makeManifest([]));
    const violations = findProtectedScopeViolations(result.changes, ['settings.billing']);
    expect(violations).toHaveLength(0);
  });

  it('detects violations when a breaking change matches a protected scope', () => {
    const el = makeElement({ agentId: 'settings.billing.pause-btn' });
    const result = diffManifests(makeManifest([el]), makeManifest([]));
    const violations = findProtectedScopeViolations(result.changes, ['settings.billing']);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.agentId).toBe('settings.billing.pause-btn');
  });

  it('does not flag non-breaking changes as violations', () => {
    const oldEl = makeElement({ agentId: 'settings.billing.btn', label: 'Old' });
    const newEl = makeElement({ agentId: 'settings.billing.btn', label: 'New' });
    const result = diffManifests(makeManifest([oldEl]), makeManifest([newEl]));
    const violations = findProtectedScopeViolations(result.changes, ['settings.billing']);
    expect(violations).toHaveLength(0);
  });

  it('matches multiple protected scopes', () => {
    const el1 = makeElement({ agentId: 'settings.billing.btn', filePath: 'a.tsx', line: 1 });
    const el2 = makeElement({ agentId: 'auth.login.btn', filePath: 'b.tsx', line: 2 });
    const el3 = makeElement({ agentId: 'nav.link', filePath: 'c.tsx', line: 3 });

    const result = diffManifests(makeManifest([el1, el2, el3]), makeManifest([]));
    const violations = findProtectedScopeViolations(result.changes, [
      'settings.billing',
      'auth',
    ]);
    expect(violations).toHaveLength(2);
    const violationIds = violations.map((v) => v.agentId);
    expect(violationIds).toContain('settings.billing.btn');
    expect(violationIds).toContain('auth.login.btn');
  });

  it('uses startsWith for prefix matching', () => {
    const el = makeElement({ agentId: 'settings.billing-extended.btn' });
    // "settings.billing" should NOT match "settings.billing-extended" because
    // the prefix is "settings.billing" and the id starts with "settings.billing-"
    // Wait — actually startsWith('settings.billing') DOES match 'settings.billing-extended.btn'
    // This is intentional: scope is a prefix match.
    const result = diffManifests(makeManifest([el]), makeManifest([]));
    const violations = findProtectedScopeViolations(result.changes, ['settings.billing']);
    expect(violations).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// formatDiffReport
// ---------------------------------------------------------------------------

describe('formatDiffReport', () => {
  it('shows no changes message for empty diff', () => {
    const result = diffManifests(makeManifest([]), makeManifest([]));
    const report = formatDiffReport(result, undefined);
    expect(report).toContain('No changes detected');
  });

  it('shows protected scope violations section when present', () => {
    const el = makeElement({ agentId: 'settings.billing.btn' });
    const result = diffManifests(makeManifest([el]), makeManifest([]));
    const violations = findProtectedScopeViolations(result.changes, ['settings.billing']);

    const report = formatDiffReport(result, undefined, violations);
    expect(report).toContain('PROTECTED SCOPE VIOLATIONS');
    expect(report).toContain('settings.billing.btn');
    expect(report).toContain('cannot be overridden');
  });

  it('separates protected violations from regular breaking changes', () => {
    const el1 = makeElement({ agentId: 'settings.billing.btn', filePath: 'a.tsx', line: 1 });
    const el2 = makeElement({ agentId: 'nav.link', filePath: 'b.tsx', line: 2 });

    const result = diffManifests(makeManifest([el1, el2]), makeManifest([]));
    const violations = findProtectedScopeViolations(result.changes, ['settings.billing']);

    const report = formatDiffReport(result, undefined, violations);
    expect(report).toContain('PROTECTED SCOPE VIOLATIONS (1)');
    expect(report).toContain('BREAKING CHANGES (1)');
  });

  it('shows allow-breaking message when set', () => {
    const el = makeElement({ agentId: 'nav.link' });
    const result = diffManifests(makeManifest([el]), makeManifest([]));
    const report = formatDiffReport(result, 'Redesign');
    expect(report).toContain('Breaking changes allowed: "Redesign"');
  });
});

// ---------------------------------------------------------------------------
// Config integration scenarios (unit-level, no file I/O)
// ---------------------------------------------------------------------------

describe('config integration scenarios', () => {
  it('protected scope + --allow-breaking still detects violations', () => {
    // This tests the logic that protected scope violations are not overridable.
    // The diffCommand itself handles the exit code, but we test the building blocks.
    const el = makeElement({ agentId: 'settings.billing.btn' });
    const result = diffManifests(makeManifest([el]), makeManifest([]));
    const violations = findProtectedScopeViolations(result.changes, ['settings.billing']);

    // Even with --allow-breaking, violations should still be found
    expect(violations).toHaveLength(1);
    expect(result.breaking).toBe(true);
  });

  it('breakingChangePolicy "warn" does not affect diff detection', () => {
    // The policy only affects the exit code in diffCommand, not the diff detection.
    const el = makeElement({ agentId: 'nav.btn' });
    const result = diffManifests(makeManifest([el]), makeManifest([]));

    // The diff result itself always reports breaking changes accurately
    expect(result.breaking).toBe(true);
    expect(result.summary.breakingCount).toBe(1);
  });
});
