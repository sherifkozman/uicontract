import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { runUic, tempDir, PROJECT_ROOT } from './helpers.js';

describe('uic full pipeline (e2e)', () => {
  it('scan -> name -> annotate -> diff pipeline (React)', async () => {
    const tmp = await tempDir();
    const scanOut = path.join(tmp, 'scan.json');
    const namedOut = path.join(tmp, 'named.json');

    expect((await runUic(['scan', 'fixtures/react-app', '-o', scanOut])).exitCode).toBe(0);
    expect((await runUic(['name', scanOut, '-o', namedOut])).exitCode).toBe(0);

    // Annotator resolves file paths relative to CWD - must match fixture root
    const reactDir = path.join(PROJECT_ROOT, 'fixtures', 'react-app');
    const annotateResult = await runUic(['annotate', '--manifest', namedOut, '--dry-run'], { cwd: reactDir });
    expect(annotateResult.exitCode).toBe(0);
    expect(annotateResult.stdout).toContain('data-agent-id=');

    expect((await runUic(['diff', namedOut, namedOut])).exitCode).toBe(0);
    await fs.rm(tmp, { recursive: true, force: true });
  }, 60_000);

  it('scan -> name -> annotate -> diff pipeline (Vue)', async () => {
    const tmp = await tempDir();
    const scanOut = path.join(tmp, 'scan.json');
    const namedOut = path.join(tmp, 'named.json');

    expect((await runUic(['scan', 'fixtures/vue-app', '-o', scanOut])).exitCode).toBe(0);
    expect((await runUic(['name', scanOut, '-o', namedOut])).exitCode).toBe(0);

    // Annotator resolves file paths relative to CWD - must match fixture root
    const vueDir = path.join(PROJECT_ROOT, 'fixtures', 'vue-app');
    const annotateResult = await runUic(['annotate', '--manifest', namedOut, '--dry-run'], { cwd: vueDir });
    expect(annotateResult.exitCode).toBe(0);

    expect((await runUic(['diff', namedOut, namedOut])).exitCode).toBe(0);
    await fs.rm(tmp, { recursive: true, force: true });
  }, 60_000);

  it('cross-framework: React and Vue produce same schema structure', async () => {
    const tmp = await tempDir();
    const reactOut = path.join(tmp, 'react.json');
    const vueOut = path.join(tmp, 'vue.json');

    await runUic(['scan', 'fixtures/react-app', '-o', reactOut]);
    await runUic(['scan', 'fixtures/vue-app', '-o', vueOut]);

    const react = JSON.parse(await fs.readFile(reactOut, 'utf-8')) as Record<string, unknown>;
    const vue = JSON.parse(await fs.readFile(vueOut, 'utf-8')) as Record<string, unknown>;

    expect(react['schemaVersion']).toBe(vue['schemaVersion']);

    const reactEls = react['elements'] as Array<Record<string, unknown>>;
    const vueEls = vue['elements'] as Array<Record<string, unknown>>;
    expect(reactEls.length).toBeGreaterThan(0);
    expect(vueEls.length).toBeGreaterThan(0);

    const reactKeys = Object.keys(reactEls[0]!).sort();
    const vueKeys = Object.keys(vueEls[0]!).sort();
    expect(reactKeys).toEqual(vueKeys);
    await fs.rm(tmp, { recursive: true, force: true });
  }, 60_000);
});
