import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import type { NamedElement } from '@uic/core';
import { annotateFiles } from '../src/index.js';

/**
 * Helper to create a NamedElement with sensible defaults.
 */
function makeElement(overrides: Partial<NamedElement> & { agentId: string; filePath: string }): NamedElement {
  return {
    type: 'button',
    line: 1,
    column: 1,
    componentName: null,
    route: null,
    label: null,
    handler: null,
    attributes: {},
    conditional: false,
    dynamic: false,
    ...overrides,
  };
}

describe('annotateFiles', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'uic-annotate-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns patches in dry-run mode without modifying files', async () => {
    const filePath = path.join(tmpDir, 'App.tsx');
    const content = '<button>Click</button>';
    await fs.writeFile(filePath, content);

    const elements: NamedElement[] = [
      makeElement({
        agentId: 'app.button',
        filePath,
        type: 'button',
        line: 1,
        column: 1,
      }),
    ];

    const result = await annotateFiles(elements, { dryRun: true });

    expect(result.totalApplied).toBe(1);
    expect(result.files.length).toBe(1);
    expect(result.files[0]!.patch).not.toBeNull();
    expect(result.files[0]!.patch!.diff).toContain('+<button data-agent-id="app.button">Click</button>');
    expect(result.backup).toBeNull();

    // File should NOT be modified
    const fileContent = await fs.readFile(filePath, 'utf-8');
    expect(fileContent).toBe(content);
  });

  it('groups elements by file correctly', async () => {
    const file1 = path.join(tmpDir, 'A.tsx');
    const file2 = path.join(tmpDir, 'B.tsx');

    await fs.writeFile(file1, '<button>A</button>');
    await fs.writeFile(file2, '<input />');

    const elements: NamedElement[] = [
      makeElement({ agentId: 'a.btn', filePath: file1, type: 'button', line: 1, column: 1 }),
      makeElement({ agentId: 'b.input', filePath: file2, type: 'input', line: 1, column: 1 }),
    ];

    const result = await annotateFiles(elements);

    expect(result.files.length).toBe(2);
    expect(result.totalApplied).toBe(2);
  });

  it('returns empty results for empty elements list', async () => {
    const result = await annotateFiles([]);

    expect(result.files.length).toBe(0);
    expect(result.totalApplied).toBe(0);
    expect(result.totalSkipped).toBe(0);
    expect(result.backup).toBeNull();
  });

  it('writes files when write=true and dryRun=false', async () => {
    const filePath = path.join(tmpDir, 'App.tsx');
    await fs.writeFile(filePath, '<button>Click</button>');

    const elements: NamedElement[] = [
      makeElement({
        agentId: 'app.button',
        filePath,
        type: 'button',
        line: 1,
        column: 1,
      }),
    ];

    const backupDir = path.join(tmpDir, '.uic-backup');
    const result = await annotateFiles(elements, {
      dryRun: false,
      write: true,
      backupDir,
    });

    expect(result.totalApplied).toBe(1);
    expect(result.backup).not.toBeNull();

    // File should be modified
    const fileContent = await fs.readFile(filePath, 'utf-8');
    expect(fileContent).toBe('<button data-agent-id="app.button">Click</button>');
  });

  it('does not write when write=true but dryRun=true (dryRun takes precedence)', async () => {
    const filePath = path.join(tmpDir, 'App.tsx');
    const content = '<button>Click</button>';
    await fs.writeFile(filePath, content);

    const elements: NamedElement[] = [
      makeElement({
        agentId: 'app.button',
        filePath,
        type: 'button',
        line: 1,
        column: 1,
      }),
    ];

    const result = await annotateFiles(elements, { dryRun: true, write: true });

    expect(result.backup).toBeNull();

    // File should NOT be modified
    const fileContent = await fs.readFile(filePath, 'utf-8');
    expect(fileContent).toBe(content);
  });

  it('returns null patch when file has no changes', async () => {
    const filePath = path.join(tmpDir, 'App.tsx');
    await fs.writeFile(filePath, '<button data-agent-id="app.button">Click</button>');

    const elements: NamedElement[] = [
      makeElement({
        agentId: 'app.button',
        filePath,
        type: 'button',
        line: 1,
        column: 1,
      }),
    ];

    const result = await annotateFiles(elements);

    expect(result.files[0]!.patch).toBeNull();
    expect(result.totalApplied).toBe(0);
    expect(result.totalSkipped).toBe(1);
  });
});
