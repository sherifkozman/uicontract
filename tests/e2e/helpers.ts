/**
 * E2E test helpers - shared utilities for subprocess-based CLI testing.
 *
 * Uses `execFile` (never `exec`) for security - no shell interpolation.
 */

import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Absolute path to the built CLI binary. */
export const UIC_BIN = path.resolve(__dirname, '../../packages/cli/dist/bin/uic.js');

/** Absolute path to the monorepo root. */
export const PROJECT_ROOT = path.resolve(__dirname, '../..');

/** Result of running the UIC CLI. */
export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Options for `runUic`. */
export interface RunOptions {
  /** Working directory for the child process. */
  cwd?: string;
  /** Timeout in milliseconds. Defaults to 30000 (30s). */
  timeout?: number;
}

/**
 * Spawn `node <UIC_BIN> ...args` via `execFile` and capture output.
 */
export function runUic(args: string[], options?: RunOptions): Promise<RunResult> {
  const timeout = options?.timeout ?? 30_000;
  const cwd = options?.cwd ?? PROJECT_ROOT;

  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      [UIC_BIN, ...args],
      { cwd, timeout, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        let exitCode = 0;
        if (error !== null) {
          exitCode = child.exitCode ?? 1;
        }
        resolve({ stdout: stdout ?? '', stderr: stderr ?? '', exitCode });
      },
    );
  });
}

/**
 * Read and parse a manifest JSON file.
 */
export async function loadManifest(manifestPath: string): Promise<unknown> {
  const raw = await fs.readFile(manifestPath, 'utf-8');
  return JSON.parse(raw) as unknown;
}

/**
 * Create a temporary directory with an optional prefix.
 * The caller is responsible for cleaning up via `fs.rm(dir, { recursive: true })`.
 */
export async function tempDir(prefix = 'uic-e2e-'): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}
