import { describe, it, expect } from 'vitest';
import { parseNameArgs } from '../../src/commands/name.js';

// ---------------------------------------------------------------------------
// parseNameArgs
// ---------------------------------------------------------------------------

describe('parseNameArgs', () => {
  it('parses a single manifest positional', () => {
    const result = parseNameArgs(['manifest.json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.manifest).toBe('manifest.json');
    expect(result.output).toBeUndefined();
    expect(result.ai).toBe(false);
    expect(result.aiTimeout).toBe(10000);
    expect(result.json).toBe(false);
    expect(result.help).toBe(false);
  });

  it('parses --output flag', () => {
    const result = parseNameArgs(['manifest.json', '--output', 'named.json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.output).toBe('named.json');
  });

  it('parses -o shorthand for --output', () => {
    const result = parseNameArgs(['manifest.json', '-o', 'named.json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.output).toBe('named.json');
  });

  it('parses --ai flag', () => {
    const result = parseNameArgs(['manifest.json', '--ai']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.ai).toBe(true);
  });

  it('parses --ai-timeout flag', () => {
    const result = parseNameArgs(['manifest.json', '--ai-timeout', '10000']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.aiTimeout).toBe(10000);
  });

  it('parses --json flag', () => {
    const result = parseNameArgs(['manifest.json', '--json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.json).toBe(true);
  });

  it('parses --help flag', () => {
    const result = parseNameArgs(['--help']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('parses -h shorthand', () => {
    const result = parseNameArgs(['-h']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('allows --help without a manifest', () => {
    const result = parseNameArgs(['--help']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
    expect(result.manifest).toBeUndefined();
  });

  it('returns error when no manifest is given', () => {
    const result = parseNameArgs([]);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing required argument/i);
  });

  it('returns error on unknown option', () => {
    const result = parseNameArgs(['manifest.json', '--unknown']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unknown option/i);
  });

  it('returns error when --output is missing its value', () => {
    const result = parseNameArgs(['manifest.json', '--output']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --output/i);
  });

  it('returns error when --ai-timeout is missing its value', () => {
    const result = parseNameArgs(['manifest.json', '--ai-timeout']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --ai-timeout/i);
  });

  it('returns error when --ai-timeout has invalid value', () => {
    const result = parseNameArgs(['manifest.json', '--ai-timeout', 'abc']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/invalid --ai-timeout/i);
  });

  it('returns error when too many positional arguments are given', () => {
    const result = parseNameArgs(['a.json', 'b.json']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unexpected argument/i);
  });

  it('parses --ai-provider flag with valid value', () => {
    const result = parseNameArgs(['manifest.json', '--ai-provider', 'openai']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.aiProvider).toBe('openai');
  });

  it('parses --ai-provider anthropic', () => {
    const result = parseNameArgs(['manifest.json', '--ai-provider', 'anthropic']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.aiProvider).toBe('anthropic');
  });

  it('parses --ai-provider google', () => {
    const result = parseNameArgs(['manifest.json', '--ai-provider', 'google']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.aiProvider).toBe('google');
  });

  it('returns error for invalid --ai-provider', () => {
    const result = parseNameArgs(['manifest.json', '--ai-provider', 'unknown']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/invalid --ai-provider/i);
  });

  it('returns error when --ai-provider is missing its value', () => {
    const result = parseNameArgs(['manifest.json', '--ai-provider']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --ai-provider/i);
  });

  it('parses --ai-model flag', () => {
    const result = parseNameArgs(['manifest.json', '--ai-model', 'gpt-4o']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.aiModel).toBe('gpt-4o');
  });

  it('returns error when --ai-model is missing its value', () => {
    const result = parseNameArgs(['manifest.json', '--ai-model']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --ai-model/i);
  });

  it('parses all flags combined', () => {
    const result = parseNameArgs([
      'manifest.json',
      '--ai',
      '--ai-timeout', '8000',
      '--json',
      '-o', 'out.json',
    ]);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.manifest).toBe('manifest.json');
    expect(result.ai).toBe(true);
    expect(result.aiTimeout).toBe(8000);
    expect(result.json).toBe(true);
    expect(result.output).toBe('out.json');
  });
});
