/**
 * `uic annotate` command — insert data-agent-id attributes into source files.
 *
 * stdout: unified diff patches (or JSON)
 * stderr: logs, errors, help text
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { deserializeManifest } from '@uicontract/core';
import type { Manifest, NamedElement } from '@uicontract/core';
import {
  annotateSource,
  generatePatch,
  createBackup,
  cleanupBackup,
} from '@uicontract/annotator';
import type { AnnotationTarget, AnnotateFileResult, FilePatch } from '@uicontract/annotator';

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

export const ANNOTATE_HELP = `\
uic annotate [options]

Insert data-agent-id attributes into source files based on a manifest.

OPTIONS
  --manifest <path>      Path to manifest file (default: manifest.json)
  --dry-run              Show patches without modifying files (default)
  --write                Modify source files in-place (creates backup first)
  --backup-dir <dir>     Backup directory (default: .uic-backup)
  --json                 Output results as JSON
  --help, -h             Show this help message

EXAMPLES
  uic annotate
  uic annotate --manifest named-manifest.json --dry-run
  uic annotate --write
  uic annotate --write --backup-dir ./my-backup
  uic annotate --json

Run "uicontract --help" for the full list of commands.
`;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

export interface AnnotateArgs {
  manifest: string;
  dryRun: boolean;
  write: boolean;
  backupDir: string;
  json: boolean;
  help: boolean;
}

export interface AnnotateArgsError {
  error: string;
}

export function parseAnnotateArgs(args: string[]): AnnotateArgs | AnnotateArgsError {
  let manifest = 'manifest.json';
  let dryRun = false;
  let write = false;
  let backupDir = '.uic-backup';
  let json = false;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--write') {
      write = true;
      continue;
    }
    if (arg === '--manifest') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('-')) {
        return { error: 'Missing value for --manifest. Example: --manifest manifest.json' };
      }
      manifest = next;
      i++;
      continue;
    }
    if (arg === '--backup-dir') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('-')) {
        return { error: 'Missing value for --backup-dir. Example: --backup-dir .uic-backup' };
      }
      backupDir = next;
      i++;
      continue;
    }
    if (arg !== undefined && arg.startsWith('-')) {
      return { error: `Unknown option: ${arg}. Run "uicontract annotate --help" for usage.` };
    }
    if (arg !== undefined) {
      return { error: `Unexpected argument: "${arg}". "uicontract annotate" takes no positional arguments.` };
    }
  }

  // Default to dry-run if --write not specified
  if (!write) {
    dryRun = true;
  }

  return { manifest, dryRun, write, backupDir, json, help };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Group elements by their file path. */
function groupByFile(elements: NamedElement[]): Map<string, NamedElement[]> {
  const groups = new Map<string, NamedElement[]>();
  for (const el of elements) {
    const existing = groups.get(el.filePath);
    if (existing !== undefined) {
      existing.push(el);
    } else {
      groups.set(el.filePath, [el]);
    }
  }
  return groups;
}

/** Convert NamedElements to AnnotationTargets. */
function toTargets(elements: NamedElement[]): AnnotationTarget[] {
  return elements.map((el) => ({
    agentId: el.agentId,
    line: el.line,
    column: el.column,
    type: el.type,
  }));
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export async function annotateCommand(args: string[]): Promise<number> {
  const parsed = parseAnnotateArgs(args);

  if ('error' in parsed) {
    process.stderr.write(`Error: ${parsed.error}\n`);
    return 1;
  }

  if (parsed.help) {
    process.stderr.write(ANNOTATE_HELP);
    return 0;
  }

  const manifestPath = path.resolve(parsed.manifest);

  // Load manifest
  let manifest: Manifest;
  try {
    const raw = await fs.readFile(manifestPath, 'utf-8');
    manifest = deserializeManifest(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `Error: Failed to load manifest "${manifestPath}": ${message}\n` +
        `Run "uicontract scan <dir>" first to generate a manifest, or specify --manifest <path>.\n`,
    );
    return 1;
  }

  if (manifest.elements.length === 0) {
    if (parsed.json) {
      process.stdout.write(JSON.stringify({ files: [], totalApplied: 0, totalSkipped: 0 }, null, 2) + '\n');
    } else {
      process.stdout.write('No elements to annotate.\n');
    }
    return 0;
  }

  // Group elements by file
  const fileGroups = groupByFile(manifest.elements);
  const results: AnnotateFileResult[] = [];
  let totalApplied = 0;
  let totalSkipped = 0;
  const modifiedFiles: string[] = [];
  const patches: FilePatch[] = [];

  for (const [filePath, elements] of fileGroups) {
    const resolvedPath = path.resolve(filePath);

    // Read source file
    let source: string;
    try {
      source = await fs.readFile(resolvedPath, 'utf-8');
    } catch {
      process.stderr.write(`Warning: Could not read "${resolvedPath}", skipping.\n`);
      continue;
    }

    const targets = toTargets(elements);
    const annotationResult = annotateSource(source, targets);

    if (!annotationResult.modified) {
      results.push({
        filePath,
        annotationsApplied: 0,
        annotationsSkipped: annotationResult.annotationsSkipped,
        patch: null,
      });
      totalSkipped += annotationResult.annotationsSkipped;
      continue;
    }

    const patch = generatePatch(filePath, source, annotationResult.annotatedSource);
    patches.push(patch);
    modifiedFiles.push(resolvedPath);

    results.push({
      filePath,
      annotationsApplied: annotationResult.annotationsApplied,
      annotationsSkipped: annotationResult.annotationsSkipped,
      patch,
    });

    totalApplied += annotationResult.annotationsApplied;
    totalSkipped += annotationResult.annotationsSkipped;
  }

  // Output results
  if (parsed.json) {
    process.stdout.write(
      JSON.stringify({ files: results, totalApplied, totalSkipped }, null, 2) + '\n',
    );
  } else if (parsed.write) {
    // Create backup and write files
    if (modifiedFiles.length === 0) {
      process.stdout.write('No files need modification (all annotations already present).\n');
      return 0;
    }

    const backup = await createBackup(modifiedFiles, { backupDir: parsed.backupDir });

    // Write modified files
    for (const result of results) {
      if (result.patch === null) continue;
      const resolvedPath = path.resolve(result.filePath);
      await fs.writeFile(resolvedPath, result.patch.modified, 'utf-8');
    }

    process.stderr.write(
      `Annotated ${String(modifiedFiles.length)} file(s)\n` +
        `  Annotations applied: ${String(totalApplied)}\n` +
        `  Annotations skipped: ${String(totalSkipped)}\n` +
        `  Backup: ${backup.backupDir}\n`,
    );

    // Cleanup backup after successful write
    await cleanupBackup(backup);
  } else {
    // Dry-run: output patches
    if (patches.length === 0) {
      process.stdout.write('No changes needed (all annotations already present).\n');
    } else {
      for (const patch of patches) {
        process.stdout.write(patch.diff);
        process.stdout.write('\n');
      }
      process.stderr.write(
        `\nDry run: ${String(totalApplied)} annotation(s) would be applied across ${String(patches.length)} file(s).\n` +
          `Run with --write to apply changes.\n`,
      );
    }
  }

  return 0;
}
