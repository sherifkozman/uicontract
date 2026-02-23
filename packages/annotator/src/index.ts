/**
 * @uicontract/annotator -- source code annotation with data-agent-id attributes.
 *
 * Public API: annotateFiles (main entry point) plus lower-level exports
 * for annotation, patch generation, and backup management.
 */
import * as fs from 'node:fs/promises';

import type { NamedElement } from '@uicontract/core';

import type { AnnotationTarget, AnnotationResult } from './jsx-annotator.js';
import { annotateSource } from './jsx-annotator.js';
import type { FilePatch } from './patch-generator.js';
import { generatePatch } from './patch-generator.js';
import type { BackupResult } from './backup.js';
import { createBackup } from './backup.js';

// Re-export everything
export { annotateSource } from './jsx-annotator.js';
export type { AnnotationTarget, AnnotationResult } from './jsx-annotator.js';

export { annotateVueSource } from './vue-annotator.js';

export { generatePatch, formatUnifiedDiff } from './patch-generator.js';
export type { FilePatch } from './patch-generator.js';

export { createBackup, restoreBackup, cleanupBackup } from './backup.js';
export type { BackupOptions, BackupResult } from './backup.js';

/** Options for the annotateFiles entry point. */
export interface AnnotateOptions {
  dryRun?: boolean; // default: true -- only produce patches
  write?: boolean; // default: false -- write files in-place
  backupDir?: string; // default: '.uic-backup'
}

/** Result for a single annotated file. */
export interface AnnotateFileResult {
  filePath: string;
  annotationsApplied: number;
  annotationsSkipped: number;
  patch: FilePatch | null; // null if no changes
}

/** Aggregate result of annotating multiple files. */
export interface AnnotateResult {
  files: AnnotateFileResult[];
  totalApplied: number;
  totalSkipped: number;
  backup: BackupResult | null;
}

/**
 * Convert NamedElements into AnnotationTargets grouped by file path.
 */
function groupByFile(
  elements: NamedElement[],
): Map<string, AnnotationTarget[]> {
  const groups = new Map<string, AnnotationTarget[]>();

  for (const el of elements) {
    const existing = groups.get(el.filePath);
    const target: AnnotationTarget = {
      agentId: el.agentId,
      line: el.line,
      column: el.column,
      type: el.type,
      sourceTagName: el.sourceTagName,
    };

    if (existing) {
      existing.push(target);
    } else {
      groups.set(el.filePath, [target]);
    }
  }

  return groups;
}

/**
 * Main entry point: annotate source files with data-agent-id attributes.
 *
 * 1. Groups elements by filePath
 * 2. For each file: reads source, annotates, generates patch
 * 3. If `write` is true: creates backup, writes modified files
 * 4. Returns results with patches and summary counts
 */
export async function annotateFiles(
  elements: NamedElement[],
  options?: AnnotateOptions,
): Promise<AnnotateResult> {
  const dryRun = options?.dryRun ?? true;
  const write = options?.write ?? false;
  const backupDir = options?.backupDir;

  const fileGroups = groupByFile(elements);
  const fileResults: AnnotateFileResult[] = [];
  let totalApplied = 0;
  let totalSkipped = 0;

  // Track files that were modified (for backup)
  const modifiedFiles: Array<{ filePath: string; content: string }> = [];

  for (const [filePath, targets] of fileGroups) {
    const source = await fs.readFile(filePath, 'utf-8');
    const result: AnnotationResult = annotateSource(source, targets);

    let patch: FilePatch | null = null;
    if (result.modified) {
      patch = generatePatch(filePath, result.originalSource, result.annotatedSource);
      modifiedFiles.push({ filePath, content: result.annotatedSource });
    }

    fileResults.push({
      filePath,
      annotationsApplied: result.annotationsApplied,
      annotationsSkipped: result.annotationsSkipped,
      patch,
    });

    totalApplied += result.annotationsApplied;
    totalSkipped += result.annotationsSkipped;
  }

  // Write files if requested and not dry-run
  let backup: BackupResult | null = null;

  if (write && !dryRun && modifiedFiles.length > 0) {
    // Create backup first
    const filePaths = modifiedFiles.map((f) => f.filePath);
    backup = await createBackup(filePaths, { backupDir });

    // Write modified files
    for (const { filePath, content } of modifiedFiles) {
      await fs.writeFile(filePath, content, 'utf-8');
    }
  }

  return {
    files: fileResults,
    totalApplied,
    totalSkipped,
    backup,
  };
}
