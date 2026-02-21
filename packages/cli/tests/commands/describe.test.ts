import { describe, it, expect } from 'vitest';
import { parseDescribeArgs } from '../../src/commands/describe.js';

// ---------------------------------------------------------------------------
// parseDescribeArgs
// ---------------------------------------------------------------------------

describe('parseDescribeArgs', () => {
  it('parses a single agentId positional', () => {
    const result = parseDescribeArgs(['settings.billing.pause-btn.button']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.agentId).toBe('settings.billing.pause-btn.button');
    expect(result.manifest).toBe('manifest.json');
    expect(result.json).toBe(false);
    expect(result.help).toBe(false);
  });

  it('parses --manifest flag', () => {
    const result = parseDescribeArgs(['my-id', '--manifest', 'dist/manifest.json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.manifest).toBe('dist/manifest.json');
  });

  it('parses --json flag', () => {
    const result = parseDescribeArgs(['my-id', '--json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.json).toBe(true);
  });

  it('parses --help flag', () => {
    const result = parseDescribeArgs(['--help']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('parses -h shorthand', () => {
    const result = parseDescribeArgs(['-h']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('allows --help without an agentId', () => {
    const result = parseDescribeArgs(['--help']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
    expect(result.agentId).toBeUndefined();
  });

  it('returns error when no agentId is given', () => {
    const result = parseDescribeArgs([]);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing required argument/i);
  });

  it('returns error on unknown option', () => {
    const result = parseDescribeArgs(['my-id', '--unknown']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unknown option/i);
  });

  it('returns error when --manifest is missing its value', () => {
    const result = parseDescribeArgs(['my-id', '--manifest']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --manifest/i);
  });

  it('returns error when too many positional arguments are given', () => {
    const result = parseDescribeArgs(['id-one', 'id-two']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unexpected argument/i);
  });

  it('parses flags before the agentId', () => {
    const result = parseDescribeArgs(['--json', 'my-id']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.json).toBe(true);
    expect(result.agentId).toBe('my-id');
  });

  it('parses all flags combined', () => {
    const result = parseDescribeArgs(['my-id', '--json', '--manifest', 'out.json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.agentId).toBe('my-id');
    expect(result.json).toBe(true);
    expect(result.manifest).toBe('out.json');
  });
});
