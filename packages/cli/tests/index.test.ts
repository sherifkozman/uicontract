import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index.js';
import { scanCommand, parseScanArgs, SCAN_HELP } from '../src/commands/index.js';

describe('uic CLI', () => {
  it('exports a VERSION constant', () => {
    expect(typeof VERSION).toBe('string');
    expect(VERSION.length).toBeGreaterThan(0);
  });
});

describe('commands/index exports', () => {
  it('exports scanCommand as a function', () => {
    expect(typeof scanCommand).toBe('function');
  });

  it('exports parseScanArgs as a function', () => {
    expect(typeof parseScanArgs).toBe('function');
  });

  it('exports SCAN_HELP as a non-empty string', () => {
    expect(typeof SCAN_HELP).toBe('string');
    expect(SCAN_HELP.length).toBeGreaterThan(0);
    expect(SCAN_HELP).toContain('uic scan');
  });
});
