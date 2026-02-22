import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { runUic, tempDir } from './helpers.js';

describe('uicontract name (e2e)', () => {
  it('produces stable deterministic output across two runs', async () => {
    const tmp = await tempDir();
    const scanOut = path.join(tmp, 'scan.json');
    const name1 = path.join(tmp, 'named1.json');
    const name2 = path.join(tmp, 'named2.json');

    await runUic(['scan', 'fixtures/react-app', '-o', scanOut]);
    await runUic(['name', scanOut, '-o', name1]);
    await runUic(['name', scanOut, '-o', name2]);

    const m1 = JSON.parse(await fs.readFile(name1, 'utf-8')) as Record<string, unknown>;
    const m2 = JSON.parse(await fs.readFile(name2, 'utf-8')) as Record<string, unknown>;
    expect(m1['elements']).toEqual(m2['elements']);
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);

  it('produces zero duplicate agentIds', async () => {
    const tmp = await tempDir();
    const scanOut = path.join(tmp, 'scan.json');
    const namedOut = path.join(tmp, 'named.json');

    await runUic(['scan', 'fixtures/react-app', '-o', scanOut]);
    await runUic(['name', scanOut, '-o', namedOut]);

    const manifest = JSON.parse(await fs.readFile(namedOut, 'utf-8')) as Record<string, unknown>;
    const elements = manifest['elements'] as Array<Record<string, unknown>>;
    const ids = elements.map((el) => el['agentId'] as string);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);
});
