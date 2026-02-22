import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { runUic, tempDir, PROJECT_ROOT } from './helpers.js';

describe('uicontract annotate (e2e)', () => {
  // The annotator resolves manifest filePaths relative to CWD.
  // Since scan produces paths relative to the scanned directory root,
  // we must run annotate with CWD = the fixture directory.
  const fixtureDir = path.join(PROJECT_ROOT, 'fixtures', 'react-app');

  it('--dry-run produces unified diff output', async () => {
    const tmp = await tempDir();
    const scanOut = path.join(tmp, 'scan.json');
    const namedOut = path.join(tmp, 'named.json');

    await runUic(['scan', 'fixtures/react-app', '-o', scanOut]);
    await runUic(['name', scanOut, '-o', namedOut]);

    const result = await runUic(['annotate', '--manifest', namedOut, '--dry-run'], { cwd: fixtureDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('---');
    expect(result.stdout).toContain('+++');
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);

  it('--dry-run output contains data-agent-id attributes', async () => {
    const tmp = await tempDir();
    const scanOut = path.join(tmp, 'scan.json');
    const namedOut = path.join(tmp, 'named.json');

    await runUic(['scan', 'fixtures/react-app', '-o', scanOut]);
    await runUic(['name', scanOut, '-o', namedOut]);

    const result = await runUic(['annotate', '--manifest', namedOut, '--dry-run'], { cwd: fixtureDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('data-agent-id=');
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);
});
