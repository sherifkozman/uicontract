import { describe, it, expect } from 'vitest';
import { parseListArgs } from '../../src/commands/list.js';

// ---------------------------------------------------------------------------
// parseListArgs
// ---------------------------------------------------------------------------

describe('parseListArgs', () => {
  it('parses with no arguments (all defaults)', () => {
    const result = parseListArgs([]);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.manifest).toBe('manifest.json');
    expect(result.type).toBeUndefined();
    expect(result.route).toBeUndefined();
    expect(result.component).toBeUndefined();
    expect(result.routes).toBe(false);
    expect(result.components).toBe(false);
    expect(result.json).toBe(false);
    expect(result.help).toBe(false);
  });

  it('parses --manifest flag', () => {
    const result = parseListArgs(['--manifest', 'dist/manifest.json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.manifest).toBe('dist/manifest.json');
  });

  it('parses --type flag', () => {
    const result = parseListArgs(['--type', 'button']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.type).toBe('button');
  });

  it('parses --route flag', () => {
    const result = parseListArgs(['--route', '/settings/billing']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.route).toBe('/settings/billing');
  });

  it('parses --component flag', () => {
    const result = parseListArgs(['--component', 'LoginForm']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.component).toBe('LoginForm');
  });

  it('parses --routes flag', () => {
    const result = parseListArgs(['--routes']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.routes).toBe(true);
  });

  it('parses --components flag', () => {
    const result = parseListArgs(['--components']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.components).toBe(true);
  });

  it('parses --json flag', () => {
    const result = parseListArgs(['--json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.json).toBe(true);
  });

  it('parses --help flag', () => {
    const result = parseListArgs(['--help']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('parses -h shorthand', () => {
    const result = parseListArgs(['-h']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('parses multiple flags combined', () => {
    const result = parseListArgs([
      '--type', 'button',
      '--route', '/settings',
      '--component', 'SettingsPage',
      '--json',
      '--manifest', 'out.json',
    ]);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.type).toBe('button');
    expect(result.route).toBe('/settings');
    expect(result.component).toBe('SettingsPage');
    expect(result.json).toBe(true);
    expect(result.manifest).toBe('out.json');
  });

  it('returns error on unknown option', () => {
    const result = parseListArgs(['--unknown']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unknown option/i);
  });

  it('returns error on unexpected positional argument', () => {
    const result = parseListArgs(['some-arg']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unexpected argument/i);
  });

  it('returns error when --manifest is missing its value', () => {
    const result = parseListArgs(['--manifest']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --manifest/i);
  });

  it('returns error when --type is missing its value', () => {
    const result = parseListArgs(['--type']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --type/i);
  });

  it('returns error when --route is missing its value', () => {
    const result = parseListArgs(['--route']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --route/i);
  });

  it('returns error when --component is missing its value', () => {
    const result = parseListArgs(['--component']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --component/i);
  });
});
