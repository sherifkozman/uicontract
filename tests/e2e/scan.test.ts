import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { runUic, tempDir } from './helpers.js';

describe('uic scan (e2e)', () => {
  it('produces valid JSON manifest for react fixture', async () => {
    const tmp = await tempDir();
    const outFile = path.join(tmp, 'manifest.json');
    const result = await runUic(['scan', 'fixtures/react-app', '-o', outFile]);
    expect(result.exitCode).toBe(0);

    const raw = await fs.readFile(outFile, 'utf-8');
    const manifest = JSON.parse(raw) as Record<string, unknown>;
    expect(manifest['schemaVersion']).toBe('1.0');
    expect(manifest['generator']).toBeDefined();
    expect(manifest['metadata']).toBeDefined();
    expect(Array.isArray(manifest['elements'])).toBe(true);

    const elements = manifest['elements'] as Array<Record<string, unknown>>;
    expect(elements.length).toBeGreaterThanOrEqual(15);
    for (const el of elements) {
      expect(el['agentId']).toEqual(expect.any(String));
      expect(el['type']).toEqual(expect.any(String));
      expect(el['filePath']).toEqual(expect.any(String));
      expect(el['line']).toEqual(expect.any(Number));
    }
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);

  it('respects --framework react flag', async () => {
    const result = await runUic(['scan', 'fixtures/react-app', '--framework', 'react', '--json']);
    expect(result.exitCode).toBe(0);
    const manifest = JSON.parse(result.stdout) as Record<string, unknown>;
    const metadata = manifest['metadata'] as Record<string, unknown>;
    expect(metadata['framework']).toBe('react');
  }, 30_000);

  it('exits 1 with helpful error for non-existent directory', async () => {
    const result = await runUic(['scan', '/tmp/nonexistent-uic-dir-12345']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toLowerCase()).toMatch(/not found|does not exist|no such/);
  }, 10_000);
});
