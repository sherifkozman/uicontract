import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { loadConfig, validateConfig, DEFAULT_CONFIG } from '../src/index.js';

// ---------------------------------------------------------------------------
// Temp directory helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'uic-config-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// validateConfig
// ---------------------------------------------------------------------------

describe('validateConfig', () => {
  it('returns defaults for an empty object', () => {
    const result = validateConfig({});
    expect(result).toEqual(DEFAULT_CONFIG);
  });

  it('accepts a valid full config', () => {
    const raw = {
      protectedScopes: ['settings.billing', 'auth'],
      breakingChangePolicy: 'warn',
    };
    const result = validateConfig(raw);
    expect(result.protectedScopes).toEqual(['settings.billing', 'auth']);
    expect(result.breakingChangePolicy).toBe('warn');
  });

  it('accepts a valid config with only protectedScopes', () => {
    const raw = { protectedScopes: ['nav.main'] };
    const result = validateConfig(raw);
    expect(result.protectedScopes).toEqual(['nav.main']);
    expect(result.breakingChangePolicy).toBe('block');
  });

  it('accepts a valid config with only breakingChangePolicy', () => {
    const raw = { breakingChangePolicy: 'block' };
    const result = validateConfig(raw);
    expect(result.protectedScopes).toEqual([]);
    expect(result.breakingChangePolicy).toBe('block');
  });

  it('throws on non-object input', () => {
    expect(() => validateConfig('string')).toThrow(/config must be a JSON object/);
    expect(() => validateConfig(42)).toThrow(/config must be a JSON object/);
    expect(() => validateConfig(null)).toThrow(/config must be a JSON object/);
    expect(() => validateConfig([1, 2])).toThrow(/config must be a JSON object/);
  });

  it('throws when protectedScopes is not an array', () => {
    expect(() => validateConfig({ protectedScopes: 'not-an-array' })).toThrow(
      /protectedScopes.*must be an array/,
    );
  });

  it('throws when protectedScopes contains non-string items', () => {
    expect(() => validateConfig({ protectedScopes: [123] })).toThrow(
      /protectedScopes.*must be a string/,
    );
  });

  it('throws when breakingChangePolicy is invalid', () => {
    expect(() => validateConfig({ breakingChangePolicy: 'invalid' })).toThrow(
      /breakingChangePolicy.*must be "block" or "warn"/,
    );
  });

  describe('componentMap', () => {
    it('accepts a valid componentMap', () => {
      const result = validateConfig({
        componentMap: { Button: 'button', Link: 'a', TextInput: 'input' },
      });
      expect(result.componentMap).toEqual({
        Button: 'button',
        Link: 'a',
        TextInput: 'input',
      });
    });

    it('defaults to empty object when omitted', () => {
      const result = validateConfig({});
      expect(result.componentMap).toEqual({});
    });

    it('throws when componentMap is not an object', () => {
      expect(() => validateConfig({ componentMap: 'not-an-object' })).toThrow(
        /componentMap.*must be an object/,
      );
    });

    it('throws when componentMap value is not a valid element type', () => {
      expect(() =>
        validateConfig({ componentMap: { Button: 'widget' } }),
      ).toThrow(/componentMap\.Button.*must be a valid element type/);
    });

    it('throws when componentMap value is not a string', () => {
      expect(() =>
        validateConfig({ componentMap: { Button: 123 } }),
      ).toThrow(/componentMap\.Button.*must be a valid element type/);
    });

    it('accepts all valid element types as values', () => {
      const validTypes = [
        'button', 'input', 'select', 'textarea', 'a', 'form',
        'div', 'span', 'img', 'label',
      ];
      for (const type of validTypes) {
        const result = validateConfig({ componentMap: { Test: type } });
        expect(result.componentMap['Test']).toBe(type);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// loadConfig
// ---------------------------------------------------------------------------

describe('loadConfig', () => {
  it('returns defaults when no config file exists', async () => {
    const config = await loadConfig(tmpDir);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('loads a valid .uicrc.json from the given directory', async () => {
    const configContent = JSON.stringify({
      protectedScopes: ['settings'],
      breakingChangePolicy: 'warn',
    });
    await fs.writeFile(path.join(tmpDir, '.uicrc.json'), configContent, 'utf-8');

    const config = await loadConfig(tmpDir);
    expect(config.protectedScopes).toEqual(['settings']);
    expect(config.breakingChangePolicy).toBe('warn');
  });

  it('walks up to find .uicrc.json in a parent directory', async () => {
    const childDir = path.join(tmpDir, 'sub', 'deep');
    await fs.mkdir(childDir, { recursive: true });

    const configContent = JSON.stringify({ protectedScopes: ['nav'] });
    await fs.writeFile(path.join(tmpDir, '.uicrc.json'), configContent, 'utf-8');

    const config = await loadConfig(childDir);
    expect(config.protectedScopes).toEqual(['nav']);
  });

  it('throws on invalid JSON in .uicrc.json', async () => {
    await fs.writeFile(path.join(tmpDir, '.uicrc.json'), '{ broken json', 'utf-8');

    await expect(loadConfig(tmpDir)).rejects.toThrow(/Failed to parse/);
  });

  it('throws on invalid shape in .uicrc.json', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.uicrc.json'),
      JSON.stringify({ breakingChangePolicy: 'explode' }),
      'utf-8',
    );

    await expect(loadConfig(tmpDir)).rejects.toThrow(/breakingChangePolicy/);
  });

  it('returns a copy of defaults (not the same reference)', async () => {
    const config1 = await loadConfig(tmpDir);
    const config2 = await loadConfig(tmpDir);
    expect(config1).toEqual(config2);
    expect(config1).not.toBe(config2);
  });
});
