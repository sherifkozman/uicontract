import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { runUic, tempDir } from './helpers.js';

describe('uic query commands (e2e)', () => {
  let manifestPath: string;
  let tmp: string;

  beforeAll(async () => {
    tmp = await tempDir();
    manifestPath = path.join(tmp, 'manifest.json');
    await runUic(['scan', 'fixtures/react-app', '-o', manifestPath]);
  }, 30_000);

  afterAll(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('find "pause" returns matching elements', async () => {
    const result = await runUic(['find', 'pause', '--manifest', manifestPath, '--json']);
    expect(result.exitCode).toBe(0);
    const elements = JSON.parse(result.stdout) as Array<Record<string, unknown>>;
    expect(elements.length).toBeGreaterThanOrEqual(1);
    const labels = elements.map((el) => String(el['label'] ?? '').toLowerCase());
    const ids = elements.map((el) => String(el['agentId'] ?? '').toLowerCase());
    expect([...labels, ...ids].some((s) => s.includes('pause'))).toBe(true);
  }, 15_000);

  it('describe returns full element detail for a known agentId', async () => {
    const raw = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as Record<string, unknown>;
    const elements = manifest['elements'] as Array<Record<string, unknown>>;
    const firstId = elements[0]?.['agentId'] as string;

    const result = await runUic(['describe', firstId, '--manifest', manifestPath, '--json']);
    expect(result.exitCode).toBe(0);
    const detail = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(detail['agentId']).toBe(firstId);
    expect(detail['type']).toBeDefined();
    expect(detail['filePath']).toBeDefined();
  }, 15_000);

  it('list --type button --json returns only buttons', async () => {
    const result = await runUic(['list', '--type', 'button', '--manifest', manifestPath, '--json']);
    expect(result.exitCode).toBe(0);
    const elements = JSON.parse(result.stdout) as Array<Record<string, unknown>>;
    expect(elements.length).toBeGreaterThanOrEqual(1);
    for (const el of elements) {
      expect(el['type']).toBe('button');
    }
  }, 15_000);
});
