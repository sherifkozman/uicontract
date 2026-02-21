import { describe, it, expect } from 'vitest';
import { parseScanArgs, generateTempId } from '../../src/commands/scan.js';
import type { RawElement } from '@uic/core';

// ---------------------------------------------------------------------------
// parseScanArgs
// ---------------------------------------------------------------------------

describe('parseScanArgs', () => {
  it('parses a single positional directory', () => {
    const result = parseScanArgs(['./my-app']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.dir).toBe('./my-app');
    expect(result.framework).toBeUndefined();
    expect(result.output).toBeUndefined();
    expect(result.json).toBe(false);
    expect(result.verbose).toBe(false);
    expect(result.quiet).toBe(false);
    expect(result.help).toBe(false);
  });

  it('parses --framework flag', () => {
    const result = parseScanArgs(['./my-app', '--framework', 'react']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.framework).toBe('react');
    expect(result.dir).toBe('./my-app');
  });

  it('parses --output flag', () => {
    const result = parseScanArgs(['./my-app', '--output', 'manifest.json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.output).toBe('manifest.json');
  });

  it('parses -o shorthand for --output', () => {
    const result = parseScanArgs(['./my-app', '-o', 'manifest.json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.output).toBe('manifest.json');
  });

  it('parses --help flag', () => {
    const result = parseScanArgs(['--help']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('parses -h shorthand for --help', () => {
    const result = parseScanArgs(['-h']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('returns error when no directory is given', () => {
    const result = parseScanArgs([]);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing required argument/i);
  });

  it('parses --json and --verbose together', () => {
    const result = parseScanArgs(['./my-app', '--json', '--verbose']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.json).toBe(true);
    expect(result.verbose).toBe(true);
  });

  it('parses --quiet flag', () => {
    const result = parseScanArgs(['./my-app', '--quiet']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.quiet).toBe(true);
  });

  it('returns error on unknown option', () => {
    const result = parseScanArgs(['./my-app', '--unknown-flag']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unknown option/i);
  });

  it('returns error when --framework is missing its value', () => {
    const result = parseScanArgs(['./my-app', '--framework']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --framework/i);
  });

  it('returns error when --output is missing its value', () => {
    const result = parseScanArgs(['./my-app', '--output']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --output/i);
  });

  it('returns error when too many positional arguments are given', () => {
    const result = parseScanArgs(['./dir-a', './dir-b']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unexpected argument/i);
  });

  it('allows --help without a directory', () => {
    const result = parseScanArgs(['--help']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
    expect(result.dir).toBeUndefined();
  });

  it('parses flags before the directory', () => {
    const result = parseScanArgs(['--framework', 'react', './my-app']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.framework).toBe('react');
    expect(result.dir).toBe('./my-app');
  });
});

// ---------------------------------------------------------------------------
// generateTempId
// ---------------------------------------------------------------------------

describe('generateTempId', () => {
  function makeElement(overrides: Partial<RawElement> = {}): RawElement {
    return {
      type: 'button',
      filePath: 'src/App.tsx',
      line: 42,
      column: 4,
      componentName: 'MyComponent',
      route: null,
      label: 'Submit',
      handler: 'handleSubmit',
      attributes: {},
      conditional: false,
      dynamic: false,
      ...overrides,
    };
  }

  it('produces an id matching AGENT_ID_PATTERN ^[a-z][a-z0-9.-]*$', () => {
    const el = makeElement();
    const id = generateTempId(el, 0);
    expect(id).toMatch(/^[a-z][a-z0-9.-]*$/);
  });

  it('uses componentName in the id when available', () => {
    const el = makeElement({ componentName: 'MyComponent' });
    const id = generateTempId(el, 0);
    expect(id).toContain('mycomponent');
  });

  it('falls back to route when componentName is null', () => {
    const el = makeElement({ componentName: null, route: '/settings/billing' });
    const id = generateTempId(el, 1);
    expect(id).toMatch(/^[a-z][a-z0-9.-]*$/);
    expect(id).toContain('settings');
  });

  it('falls back to "unknown" when both componentName and route are null', () => {
    const el = makeElement({ componentName: null, route: null });
    const id = generateTempId(el, 5);
    expect(id).toMatch(/^[a-z][a-z0-9.-]*$/);
    expect(id).toContain('unknown');
  });

  it('includes the element type in the id', () => {
    const el = makeElement({ type: 'input' });
    const id = generateTempId(el, 0);
    expect(id).toContain('input');
  });

  it('includes the line number in the id', () => {
    const el = makeElement({ line: 99 });
    const id = generateTempId(el, 0);
    expect(id).toContain('99');
  });

  it('produces unique ids for elements with different lines', () => {
    const el1 = makeElement({ line: 10 });
    const el2 = makeElement({ line: 20 });
    expect(generateTempId(el1, 0)).not.toBe(generateTempId(el2, 1));
  });

  it('handles component names with special characters', () => {
    const el = makeElement({ componentName: 'My__Component123' });
    const id = generateTempId(el, 0);
    expect(id).toMatch(/^[a-z][a-z0-9.-]*$/);
  });

  it('handles a component name that starts with digits after lowercasing', () => {
    const el = makeElement({ componentName: '123Widget' });
    const id = generateTempId(el, 0);
    // Must still start with a letter
    expect(id).toMatch(/^[a-z]/);
    expect(id).toMatch(/^[a-z][a-z0-9.-]*$/);
  });
});
