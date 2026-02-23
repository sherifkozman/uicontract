/**
 * Unit tests for file discovery — verifies that test files, stories,
 * and setup files are excluded from scanning by default.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { discoverFiles } from '../src/file-discovery.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'uic-fd-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

/** Create a file (and parent dirs) under tmpDir. */
async function touch(relPath: string): Promise<void> {
  const full = path.join(tmpDir, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, '');
}

/** Returns relative paths of discovered files. */
async function discover(dir = tmpDir): Promise<string[]> {
  const files = await discoverFiles(dir, {});
  return files.map((f) => path.relative(dir, f).replace(/\\/g, '/')).sort();
}

// ---------------------------------------------------------------------------
// Core inclusion
// ---------------------------------------------------------------------------

describe('file discovery', () => {
  it('discovers .tsx and .jsx files by default', async () => {
    await touch('src/App.tsx');
    await touch('src/Page.jsx');
    const found = await discover();
    expect(found).toEqual(['src/App.tsx', 'src/Page.jsx']);
  });

  // -------------------------------------------------------------------------
  // Standard directory exclusions
  // -------------------------------------------------------------------------

  it('excludes node_modules', async () => {
    await touch('src/App.tsx');
    await touch('node_modules/pkg/index.tsx');
    const found = await discover();
    expect(found).toEqual(['src/App.tsx']);
  });

  it('excludes dist directory', async () => {
    await touch('src/App.tsx');
    await touch('dist/App.tsx');
    const found = await discover();
    expect(found).toEqual(['src/App.tsx']);
  });

  // -------------------------------------------------------------------------
  // Test file exclusions (beta feedback fix)
  // -------------------------------------------------------------------------

  describe('test file exclusions', () => {
    it('excludes *.test.tsx files', async () => {
      await touch('src/App.tsx');
      await touch('src/App.test.tsx');
      const found = await discover();
      expect(found).toEqual(['src/App.tsx']);
    });

    it('excludes *.test.jsx files', async () => {
      await touch('src/App.tsx');
      await touch('src/App.test.jsx');
      const found = await discover();
      expect(found).toEqual(['src/App.tsx']);
    });

    it('excludes *.spec.tsx files', async () => {
      await touch('src/App.tsx');
      await touch('src/App.spec.tsx');
      const found = await discover();
      expect(found).toEqual(['src/App.tsx']);
    });

    it('excludes *.spec.jsx files', async () => {
      await touch('src/App.tsx');
      await touch('src/App.spec.jsx');
      const found = await discover();
      expect(found).toEqual(['src/App.tsx']);
    });

    it('excludes __tests__ directory', async () => {
      await touch('src/App.tsx');
      await touch('src/__tests__/App.tsx');
      const found = await discover();
      expect(found).toEqual(['src/App.tsx']);
    });

    it('excludes vitest.setup.tsx', async () => {
      await touch('src/App.tsx');
      await touch('vitest.setup.tsx');
      const found = await discover();
      expect(found).toEqual(['src/App.tsx']);
    });

    it('excludes jest.setup.tsx', async () => {
      await touch('src/App.tsx');
      await touch('jest.setup.tsx');
      const found = await discover();
      expect(found).toEqual(['src/App.tsx']);
    });

    it('excludes *.stories.tsx files', async () => {
      await touch('src/App.tsx');
      await touch('src/App.stories.tsx');
      const found = await discover();
      expect(found).toEqual(['src/App.tsx']);
    });
  });

  // -------------------------------------------------------------------------
  // Custom include/exclude overrides
  // -------------------------------------------------------------------------

  it('respects custom exclude patterns', async () => {
    await touch('src/App.tsx');
    await touch('src/internal/Secret.tsx');
    const files = await discoverFiles(tmpDir, {
      exclude: ['**/internal/**'],
    });
    const found = files.map((f) => path.relative(tmpDir, f).replace(/\\/g, '/'));
    expect(found).toEqual(['src/App.tsx']);
  });
});
