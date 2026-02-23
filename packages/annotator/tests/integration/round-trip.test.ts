/**
 * Round-trip integration test: scan -> name -> annotate -> re-scan -> verify.
 *
 * Uses the react-minimal fixture as a clean starting point.
 * Copies fixture to a temp directory, annotates, then re-scans to verify
 * that annotated source produces elements with matching data-agent-id values.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { ReactParser } from '@uicontract/parser-react';
import { nameElements } from '@uicontract/namer';
import { annotateSource } from '../../src/jsx-annotator.js';
import type { AnnotationTarget } from '../../src/jsx-annotator.js';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const FIXTURES_DIR = path.resolve(__dirname, '../../../../fixtures');
const MINIMAL_FIXTURE = path.join(FIXTURES_DIR, 'react-minimal');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parser = new ReactParser();

/**
 * Recursively copy a directory tree.
 */
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Round-trip integration: scan -> name -> annotate -> re-scan', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'uic-round-trip-'));
    await copyDir(MINIMAL_FIXTURE, tempDir);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('annotated elements retain their data-agent-id attributes after re-scan', async () => {
    // Step 1: Scan the clean fixture
    const initialResult = await parser.discover(tempDir, {});
    expect(initialResult.elements.length).toBeGreaterThan(0);
    const initialCount = initialResult.elements.length;

    // Step 2: Name the discovered elements
    const namedElements = await nameElements(initialResult.elements);
    expect(namedElements).toHaveLength(initialCount);

    // Step 3: Group named elements by file path and annotate each file
    const elementsByFile = new Map<string, typeof namedElements>();
    for (const el of namedElements) {
      const existing = elementsByFile.get(el.filePath);
      if (existing) {
        existing.push(el);
      } else {
        elementsByFile.set(el.filePath, [el]);
      }
    }

    for (const [relFilePath, fileElements] of elementsByFile) {
      const absFilePath = path.join(tempDir, relFilePath);
      const source = await fs.readFile(absFilePath, 'utf-8');

      const targets: AnnotationTarget[] = fileElements.map((el) => ({
        agentId: el.agentId,
        line: el.line,
        column: el.column,
        type: el.type,
        sourceTagName: el.sourceTagName,
      }));

      const annotationResult = annotateSource(source, targets);
      expect(annotationResult.annotationsApplied).toBeGreaterThan(0);

      // Write the annotated source back
      await fs.writeFile(absFilePath, annotationResult.annotatedSource, 'utf-8');
    }

    // Step 4: Re-scan the annotated directory
    const rescanResult = await parser.discover(tempDir, {});

    // Step 5: Verify element count is preserved
    expect(rescanResult.elements.length).toBe(initialCount);

    // Step 6: Verify every re-scanned element has the correct data-agent-id
    for (const rescanEl of rescanResult.elements) {
      const agentId = rescanEl.attributes['data-agent-id'];
      expect(agentId).toBeDefined();
      expect(typeof agentId).toBe('string');
      expect(agentId!.length).toBeGreaterThan(0);
    }

    // Step 7: Verify the data-agent-id values match the named IDs
    // Build a set of expected agentIds from the naming step
    const expectedIds = new Set(namedElements.map((el) => el.agentId));
    const actualIds = new Set(
      rescanResult.elements.map((el) => el.attributes['data-agent-id']),
    );

    expect(actualIds).toEqual(expectedIds);
  });

  it('re-scanned element count matches initial count exactly', async () => {
    // Re-scan the already-annotated temp directory (annotated in previous test)
    const result = await parser.discover(tempDir, {});
    // react-minimal has exactly 3 elements: button, input, a
    expect(result.elements.length).toBe(3);
  });

  it('annotation is idempotent: annotating again produces no changes', async () => {
    // Re-scan to get current state
    const result = await parser.discover(tempDir, {});
    const namedElements = await nameElements(result.elements);

    // Attempt to annotate again
    for (const [relFilePath, fileElements] of groupByFile(namedElements)) {
      const absFilePath = path.join(tempDir, relFilePath);
      const source = await fs.readFile(absFilePath, 'utf-8');

      const targets: AnnotationTarget[] = fileElements.map((el) => ({
        agentId: el.agentId,
        line: el.line,
        column: el.column,
        type: el.type,
        sourceTagName: el.sourceTagName,
      }));

      const annotationResult = annotateSource(source, targets);

      // All annotations should be skipped (already correct)
      expect(annotationResult.annotationsApplied).toBe(0);
      expect(annotationResult.annotationsSkipped).toBe(targets.length);
      expect(annotationResult.modified).toBe(false);
    }
  });
});

describe('componentMap round-trip: scan -> name -> annotate custom component', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'uic-componentmap-'));
    // Create a minimal React file with a custom Button component usage
    await fs.writeFile(
      path.join(tempDir, 'App.tsx'),
      `export default function App() {
  return (
    <form>
      <input placeholder="Email" />
      <Button type="submit">Sign in</Button>
    </form>
  );
}
`,
      'utf-8',
    );
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('injects data-agent-id into custom component tags via componentMap', async () => {
    const componentMap = { Button: 'button' as const };

    // Step 1: Scan with componentMap
    const scanResult = await parser.discover(tempDir, { componentMap });
    // Should find: form, input, Button (mapped to button)
    expect(scanResult.elements.length).toBe(3);

    // Verify the Button element has sourceTagName set
    const buttonEl = scanResult.elements.find((el) => el.sourceTagName === 'Button');
    expect(buttonEl).toBeDefined();
    expect(buttonEl!.type).toBe('button');

    // Step 2: Name elements
    const namedElements = await nameElements(scanResult.elements);
    expect(namedElements).toHaveLength(3);

    // Step 3: Annotate
    const source = await fs.readFile(path.join(tempDir, 'App.tsx'), 'utf-8');
    const targets: AnnotationTarget[] = namedElements.map((el) => ({
      agentId: el.agentId,
      line: el.line,
      column: el.column,
      type: el.type,
      sourceTagName: el.sourceTagName,
    }));

    const result = annotateSource(source, targets);

    // All 3 elements should be annotated (including the custom Button)
    expect(result.annotationsApplied).toBe(3);
    expect(result.modified).toBe(true);

    // Verify the annotated source contains data-agent-id on the Button tag
    expect(result.annotatedSource).toContain('<Button data-agent-id=');
    expect(result.annotatedSource).toContain('<input data-agent-id=');
    expect(result.annotatedSource).toContain('<form data-agent-id=');
  });
});

/**
 * Group NamedElements by their file path.
 */
function groupByFile<T extends { filePath: string }>(
  elements: T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const el of elements) {
    const existing = groups.get(el.filePath);
    if (existing) {
      existing.push(el);
    } else {
      groups.set(el.filePath, [el]);
    }
  }
  return groups;
}
