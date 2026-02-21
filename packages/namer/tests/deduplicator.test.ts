import { describe, it, expect } from 'vitest';
import type { NamedElement } from '@uic/core';
import { deduplicateNames } from '../src/deduplicator.js';

function makeNamed(
  agentId: string,
  line: number,
  overrides: Partial<NamedElement> = {},
): NamedElement {
  return {
    agentId,
    type: 'button',
    filePath: 'src/Example.tsx',
    line,
    column: 4,
    componentName: null,
    route: null,
    label: null,
    handler: null,
    attributes: {},
    conditional: false,
    dynamic: false,
    ...overrides,
  };
}

describe('deduplicateNames', () => {
  it('returns unchanged when no duplicates exist', () => {
    const elements = [
      makeNamed('settings.save.button', 10),
      makeNamed('settings.cancel.button', 20),
      makeNamed('dashboard.submit.form', 30),
    ];
    const result = deduplicateNames(elements);
    expect(result.map((e) => e.agentId)).toEqual([
      'settings.save.button',
      'settings.cancel.button',
      'dashboard.submit.form',
    ]);
  });

  it('appends .0 and .1 to two elements with same ID', () => {
    const elements = [
      makeNamed('settings.save.button', 20),
      makeNamed('settings.save.button', 10),
    ];
    const result = deduplicateNames(elements);
    const ids = result.map((e) => e.agentId);
    expect(ids).toContain('settings.save.button.0');
    expect(ids).toContain('settings.save.button.1');
    expect(new Set(ids).size).toBe(2);
  });

  it('assigns suffixes ordered by line number (lower line = lower suffix)', () => {
    const elements = [
      makeNamed('settings.save.button', 30),
      makeNamed('settings.save.button', 10),
      makeNamed('settings.save.button', 20),
    ];
    const result = deduplicateNames(elements);

    // Line 10 should get .0, line 20 should get .1, line 30 should get .2
    // But they may be at different array indices, so find by original line
    const byLine = new Map(result.map((e) => [e.line, e.agentId]));
    expect(byLine.get(10)).toBe('settings.save.button.0');
    expect(byLine.get(20)).toBe('settings.save.button.1');
    expect(byLine.get(30)).toBe('settings.save.button.2');
  });

  it('handles three duplicates with .0, .1, .2', () => {
    const elements = [
      makeNamed('app.click.button', 5),
      makeNamed('app.click.button', 15),
      makeNamed('app.click.button', 25),
    ];
    const result = deduplicateNames(elements);
    const ids = result.map((e) => e.agentId).sort();
    expect(ids).toEqual([
      'app.click.button.0',
      'app.click.button.1',
      'app.click.button.2',
    ]);
  });

  it('handles mixed unique and duplicate IDs', () => {
    const elements = [
      makeNamed('unique.one.button', 1),
      makeNamed('duplicate.button', 10),
      makeNamed('unique.two.input', 20),
      makeNamed('duplicate.button', 30),
      makeNamed('unique.three.a', 40),
    ];
    const result = deduplicateNames(elements);
    const ids = result.map((e) => e.agentId);

    // Unique ones unchanged
    expect(ids).toContain('unique.one.button');
    expect(ids).toContain('unique.two.input');
    expect(ids).toContain('unique.three.a');

    // Duplicates get suffixed
    expect(ids).toContain('duplicate.button.0');
    expect(ids).toContain('duplicate.button.1');

    // No bare duplicates remain
    expect(ids.filter((id) => id === 'duplicate.button')).toHaveLength(0);
  });

  it('result has no duplicate IDs', () => {
    const elements = [
      makeNamed('a.button', 1),
      makeNamed('a.button', 2),
      makeNamed('b.input', 3),
      makeNamed('b.input', 4),
      makeNamed('b.input', 5),
      makeNamed('c.form', 6),
    ];
    const result = deduplicateNames(elements);
    const ids = result.map((e) => e.agentId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not mutate the input array', () => {
    const elements = [
      makeNamed('test.button', 10),
      makeNamed('test.button', 20),
    ];
    const originalIds = elements.map((e) => e.agentId);
    deduplicateNames(elements);
    expect(elements.map((e) => e.agentId)).toEqual(originalIds);
  });

  it('handles empty input', () => {
    expect(deduplicateNames([])).toEqual([]);
  });

  it('handles single element', () => {
    const elements = [makeNamed('solo.button', 1)];
    const result = deduplicateNames(elements);
    expect(result.map((e) => e.agentId)).toEqual(['solo.button']);
  });
});
