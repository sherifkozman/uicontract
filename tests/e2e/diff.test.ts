import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { runUic, tempDir } from './helpers.js';

describe('uicontract diff (e2e)', () => {
  it('exits 0 when comparing identical manifests', async () => {
    const tmp = await tempDir();
    const manifest = path.join(tmp, 'manifest.json');
    await runUic(['scan', 'fixtures/react-app', '-o', manifest]);
    const result = await runUic(['diff', manifest, manifest]);
    expect(result.exitCode).toBe(0);
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);

  it('exits 1 and reports breaking change when element is removed', async () => {
    const tmp = await tempDir();
    const original = path.join(tmp, 'original.json');
    const modified = path.join(tmp, 'modified.json');

    await runUic(['scan', 'fixtures/react-app', '-o', original]);
    const raw = await fs.readFile(original, 'utf-8');
    const manifest = JSON.parse(raw) as Record<string, unknown>;
    const elements = manifest['elements'] as Array<unknown>;
    elements.shift(); // remove first element
    await fs.writeFile(modified, JSON.stringify(manifest, null, 2), 'utf-8');

    const result = await runUic(['diff', original, modified]);
    expect(result.exitCode).toBe(1);

    const jsonResult = await runUic(['diff', original, modified, '--json']);
    expect(jsonResult.exitCode).toBe(1);
    const parsed = JSON.parse(jsonResult.stdout) as Record<string, unknown>;
    expect(parsed['breaking']).toBe(true);
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);
});
