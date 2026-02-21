import { describe, it, expect } from 'vitest';
import { parseAnnotateArgs } from '../../src/commands/annotate.js';

// ---------------------------------------------------------------------------
// parseAnnotateArgs
// ---------------------------------------------------------------------------

describe('parseAnnotateArgs', () => {
  it('parses with no arguments (all defaults)', () => {
    const result = parseAnnotateArgs([]);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.manifest).toBe('manifest.json');
    expect(result.dryRun).toBe(true);
    expect(result.write).toBe(false);
    expect(result.backupDir).toBe('.uic-backup');
    expect(result.json).toBe(false);
    expect(result.help).toBe(false);
  });

  it('parses --manifest flag', () => {
    const result = parseAnnotateArgs(['--manifest', 'named.json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.manifest).toBe('named.json');
  });

  it('parses --dry-run flag', () => {
    const result = parseAnnotateArgs(['--dry-run']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.dryRun).toBe(true);
  });

  it('parses --write flag', () => {
    const result = parseAnnotateArgs(['--write']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.write).toBe(true);
  });

  it('defaults to dry-run when --write is not specified', () => {
    const result = parseAnnotateArgs([]);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.dryRun).toBe(true);
    expect(result.write).toBe(false);
  });

  it('parses --backup-dir flag', () => {
    const result = parseAnnotateArgs(['--backup-dir', './my-backup']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.backupDir).toBe('./my-backup');
  });

  it('parses --json flag', () => {
    const result = parseAnnotateArgs(['--json']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.json).toBe(true);
  });

  it('parses --help flag', () => {
    const result = parseAnnotateArgs(['--help']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('parses -h shorthand', () => {
    const result = parseAnnotateArgs(['-h']);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.help).toBe(true);
  });

  it('parses multiple flags combined', () => {
    const result = parseAnnotateArgs([
      '--manifest', 'named.json',
      '--write',
      '--backup-dir', './backup',
      '--json',
    ]);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.manifest).toBe('named.json');
    expect(result.write).toBe(true);
    expect(result.backupDir).toBe('./backup');
    expect(result.json).toBe(true);
  });

  it('returns error on unknown option', () => {
    const result = parseAnnotateArgs(['--unknown']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unknown option/i);
  });

  it('returns error on unexpected positional argument', () => {
    const result = parseAnnotateArgs(['some-dir']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/unexpected argument/i);
  });

  it('returns error when --manifest is missing its value', () => {
    const result = parseAnnotateArgs(['--manifest']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --manifest/i);
  });

  it('returns error when --backup-dir is missing its value', () => {
    const result = parseAnnotateArgs(['--backup-dir']);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/missing value for --backup-dir/i);
  });
});
