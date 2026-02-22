/**
 * UIC configuration loader and validator.
 *
 * Looks for `.uicrc.json` in the given directory and its parents,
 * returning a typed UicConfig. Returns defaults when no file is found.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { UicError } from './errors.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UicConfig {
  /** ID prefixes that require explicit approval to change */
  protectedScopes: string[];
  /** How to handle breaking changes: "block" exits non-zero, "warn" prints warning but exits 0 */
  breakingChangePolicy: 'block' | 'warn';
  /** npm package names implementing the Parser interface to load at startup */
  plugins: string[];
}

export const DEFAULT_CONFIG: UicConfig = {
  protectedScopes: [],
  breakingChangePolicy: 'block',
  plugins: [],
};

const CONFIG_FILENAME = '.uicrc.json';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate an unknown value as a UicConfig. Throws on invalid shape.
 */
export function validateConfig(raw: unknown): UicConfig {
  if (!isRecord(raw)) {
    throw new UicError('MANIFEST_INVALID', {
      message:
        'Invalid .uicrc.json: config must be a JSON object. See docs/CLI.md for the config schema.',
      context: { received: typeof raw },
    });
  }

  const config: UicConfig = { ...DEFAULT_CONFIG };

  // protectedScopes
  if ('protectedScopes' in raw) {
    if (!Array.isArray(raw['protectedScopes'])) {
      throw new UicError('MANIFEST_INVALID', {
        message:
          'Invalid .uicrc.json: "protectedScopes" must be an array of strings. Example: ["settings.billing"]',
        context: { received: typeof raw['protectedScopes'] },
      });
    }
    for (let i = 0; i < raw['protectedScopes'].length; i++) {
      const item: unknown = raw['protectedScopes'][i];
      if (typeof item !== 'string') {
        throw new UicError('MANIFEST_INVALID', {
          message: `Invalid .uicrc.json: "protectedScopes[${String(i)}]" must be a string, got ${typeof item}.`,
          context: { index: i, received: typeof item },
        });
      }
    }
    config.protectedScopes = raw['protectedScopes'] as string[];
  }

  // plugins
  if ('plugins' in raw) {
    if (!Array.isArray(raw['plugins'])) {
      throw new UicError('MANIFEST_INVALID', {
        message:
          'Invalid .uicrc.json: "plugins" must be an array of strings. Example: ["uic-parser-svelte"]',
        context: { received: typeof raw['plugins'] },
      });
    }
    for (let i = 0; i < raw['plugins'].length; i++) {
      const item: unknown = raw['plugins'][i];
      if (typeof item !== 'string') {
        throw new UicError('MANIFEST_INVALID', {
          message: `Invalid .uicrc.json: "plugins[${String(i)}]" must be a string, got ${typeof item}.`,
          context: { index: i, received: typeof item },
        });
      }
    }
    config.plugins = raw['plugins'] as string[];
  }

  // breakingChangePolicy
  if ('breakingChangePolicy' in raw) {
    if (raw['breakingChangePolicy'] !== 'block' && raw['breakingChangePolicy'] !== 'warn') {
      throw new UicError('MANIFEST_INVALID', {
        message:
          'Invalid .uicrc.json: "breakingChangePolicy" must be "block" or "warn".',
        context: { received: raw['breakingChangePolicy'] },
      });
    }
    config.breakingChangePolicy = raw['breakingChangePolicy'];
  }

  return config;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Walk up from `dir` looking for `.uicrc.json`.
 * Returns `null` if none found.
 */
async function findConfigFile(dir: string): Promise<string | null> {
  let current = path.resolve(dir);

  for (;;) {
    const candidate = path.join(current, CONFIG_FILENAME);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // not found — go up
    }

    const parent = path.dirname(current);
    if (parent === current) {
      // reached filesystem root
      return null;
    }
    current = parent;
  }
}

/**
 * Load UIC configuration from `.uicrc.json` in `dir` or its parents.
 * Returns `DEFAULT_CONFIG` when no config file is found.
 * Throws `UicError` on invalid JSON or invalid shape.
 */
export async function loadConfig(dir: string): Promise<UicConfig> {
  const configPath = await findConfigFile(dir);
  if (configPath === null) {
    return { ...DEFAULT_CONFIG };
  }

  let raw: string;
  try {
    raw = await fs.readFile(configPath, 'utf-8');
  } catch (err) {
    throw new UicError('FILE_READ_ERROR', {
      message: `Failed to read config file "${configPath}". Check permissions and try again.`,
      context: { configPath },
      cause: err instanceof Error ? err : undefined,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new UicError('MANIFEST_INVALID', {
      message: `Failed to parse "${configPath}" as JSON. Ensure it contains valid JSON.`,
      context: { configPath },
    });
  }

  return validateConfig(parsed);
}
