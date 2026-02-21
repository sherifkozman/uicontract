/**
 * `uic diff` command — compare two manifests and detect breaking changes.
 *
 * stdout: diff report (human-readable or JSON)
 * stderr: logs, errors, help text
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { deserializeManifest, loadConfig } from '@uic/core';
import type { Manifest, ManifestElement, UicConfig } from '@uic/core';

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

export const DIFF_HELP = `\
uic diff <old-manifest> <new-manifest> [options]

Compare two manifests and report changes. Exits non-zero if breaking changes found.

ARGUMENTS
  <old-manifest>         Path to the baseline manifest
  <new-manifest>         Path to the new/current manifest

OPTIONS
  --allow-breaking <reason>   Override exit code to 0 even with breaking changes
  --config <path>             Path to .uicrc.json config file (auto-detected if omitted)
  --json                      Output diff result as JSON
  --help, -h                  Show this help message

CHANGE CATEGORIES
  BREAKING:     REMOVED, RENAMED, TYPE_CHANGED, ROUTE_CHANGED
  Informational: ADDED, LABEL_CHANGED, HANDLER_CHANGED, MOVED

EXIT CODES
  0  No breaking changes (or --allow-breaking used with no protected scope violations)
  1  Breaking changes found, error, or protected scope violation

EXAMPLES
  uic diff baseline.json current.json
  uic diff old.json new.json --json
  uic diff old.json new.json --allow-breaking "Intentional redesign of nav"
  uic diff old.json new.json --config ./my-config.json

Run "uic --help" for the full list of commands.
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DiffCategory =
  | 'ADDED'
  | 'REMOVED'
  | 'RENAMED'
  | 'TYPE_CHANGED'
  | 'ROUTE_CHANGED'
  | 'LABEL_CHANGED'
  | 'HANDLER_CHANGED'
  | 'MOVED';

export interface DiffChange {
  category: DiffCategory;
  breaking: boolean;
  agentId: string;
  details: string;
  oldElement?: ManifestElement;
  newElement?: ManifestElement;
}

export interface DiffSummary {
  added: number;
  removed: number;
  renamed: number;
  typeChanged: number;
  routeChanged: number;
  labelChanged: number;
  handlerChanged: number;
  moved: number;
  total: number;
  breakingCount: number;
}

export interface DiffResult {
  changes: DiffChange[];
  breaking: boolean;
  summary: DiffSummary;
}

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

export interface DiffArgs {
  oldManifest: string | undefined;
  newManifest: string | undefined;
  allowBreaking: string | undefined;
  configPath: string | undefined;
  json: boolean;
  help: boolean;
}

export interface DiffArgsError {
  error: string;
}

export function parseDiffArgs(args: string[]): DiffArgs | DiffArgsError {
  let allowBreaking: string | undefined;
  let configPath: string | undefined;
  let json = false;
  let help = false;
  const positionals: string[] = [];

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
    if (arg === '--allow-breaking') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('-')) {
        return { error: 'Missing value for --allow-breaking. Provide a reason. Example: --allow-breaking "Intentional redesign"' };
      }
      allowBreaking = next;
      i++;
      continue;
    }
    if (arg === '--config') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('-')) {
        return { error: 'Missing value for --config. Provide a path. Example: --config .uicrc.json' };
      }
      configPath = next;
      i++;
      continue;
    }
    if (arg !== undefined && arg.startsWith('-')) {
      return { error: `Unknown option: ${arg}. Run "uic diff --help" for usage.` };
    }
    if (arg !== undefined) {
      positionals.push(arg);
    }
  }

  if (!help && positionals.length < 2) {
    return { error: 'Missing required arguments. Usage: uic diff <old-manifest> <new-manifest>' };
  }

  if (positionals.length > 2) {
    return { error: `Unexpected argument: "${positionals[2] ?? ''}". Run "uic diff --help" for usage.` };
  }

  return {
    oldManifest: positionals[0],
    newManifest: positionals[1],
    allowBreaking,
    configPath,
    json,
    help,
  };
}

// ---------------------------------------------------------------------------
// Diff logic (pure function — no I/O)
// ---------------------------------------------------------------------------

/** Compare two manifests and return categorized changes. */
export function diffManifests(oldManifest: Manifest, newManifest: Manifest): DiffResult {
  const oldById = new Map<string, ManifestElement>();
  for (const el of oldManifest.elements) {
    oldById.set(el.agentId, el);
  }

  const newById = new Map<string, ManifestElement>();
  for (const el of newManifest.elements) {
    newById.set(el.agentId, el);
  }

  const changes: DiffChange[] = [];

  // Build location maps for rename detection
  // key: "filePath:line" -> element
  const oldByLocation = new Map<string, ManifestElement>();
  for (const el of oldManifest.elements) {
    oldByLocation.set(`${el.filePath}:${String(el.line)}`, el);
  }
  const newByLocation = new Map<string, ManifestElement>();
  for (const el of newManifest.elements) {
    newByLocation.set(`${el.filePath}:${String(el.line)}`, el);
  }

  // Track IDs involved in renames to avoid double-counting
  const renamedOldIds = new Set<string>();
  const renamedNewIds = new Set<string>();

  // Detect renames: IDs that were removed where a new ID appeared at the same location
  for (const [oldId, oldEl] of oldById) {
    if (newById.has(oldId)) continue; // not removed
    const location = `${oldEl.filePath}:${String(oldEl.line)}`;
    const newAtSameLocation = newByLocation.get(location);
    if (newAtSameLocation !== undefined && !oldById.has(newAtSameLocation.agentId)) {
      // New element at same location with a different ID → rename
      renamedOldIds.add(oldId);
      renamedNewIds.add(newAtSameLocation.agentId);
      changes.push({
        category: 'RENAMED',
        breaking: true,
        agentId: oldId,
        details: `Renamed: "${oldId}" → "${newAtSameLocation.agentId}" at ${oldEl.filePath}:${String(oldEl.line)}`,
        oldElement: oldEl,
        newElement: newAtSameLocation,
      });
    }
  }

  // Removed elements (in old, not in new, not renamed)
  for (const [oldId, oldEl] of oldById) {
    if (newById.has(oldId)) continue;
    if (renamedOldIds.has(oldId)) continue;
    changes.push({
      category: 'REMOVED',
      breaking: true,
      agentId: oldId,
      details: `Removed: "${oldId}" was in ${oldEl.filePath}:${String(oldEl.line)}`,
      oldElement: oldEl,
    });
  }

  // Added elements (in new, not in old, not from rename)
  for (const [newId, newEl] of newById) {
    if (oldById.has(newId)) continue;
    if (renamedNewIds.has(newId)) continue;
    changes.push({
      category: 'ADDED',
      breaking: false,
      agentId: newId,
      details: `Added: "${newId}" in ${newEl.filePath}:${String(newEl.line)}`,
      newElement: newEl,
    });
  }

  // Changed elements (same agentId in both)
  for (const [id, oldEl] of oldById) {
    const newEl = newById.get(id);
    if (newEl === undefined) continue;

    if (oldEl.type !== newEl.type) {
      changes.push({
        category: 'TYPE_CHANGED',
        breaking: true,
        agentId: id,
        details: `Type changed: "${oldEl.type}" → "${newEl.type}"`,
        oldElement: oldEl,
        newElement: newEl,
      });
    }

    if (oldEl.route !== newEl.route) {
      changes.push({
        category: 'ROUTE_CHANGED',
        breaking: true,
        agentId: id,
        details: `Route changed: "${oldEl.route ?? '(none)'}" → "${newEl.route ?? '(none)'}"`,
        oldElement: oldEl,
        newElement: newEl,
      });
    }

    if (oldEl.label !== newEl.label) {
      changes.push({
        category: 'LABEL_CHANGED',
        breaking: false,
        agentId: id,
        details: `Label changed: "${oldEl.label ?? '(none)'}" → "${newEl.label ?? '(none)'}"`,
        oldElement: oldEl,
        newElement: newEl,
      });
    }

    if (oldEl.handler !== newEl.handler) {
      changes.push({
        category: 'HANDLER_CHANGED',
        breaking: false,
        agentId: id,
        details: `Handler changed: "${oldEl.handler ?? '(none)'}" → "${newEl.handler ?? '(none)'}"`,
        oldElement: oldEl,
        newElement: newEl,
      });
    }

    if (oldEl.filePath !== newEl.filePath || oldEl.line !== newEl.line) {
      changes.push({
        category: 'MOVED',
        breaking: false,
        agentId: id,
        details: `Moved: ${oldEl.filePath}:${String(oldEl.line)} → ${newEl.filePath}:${String(newEl.line)}`,
        oldElement: oldEl,
        newElement: newEl,
      });
    }
  }

  const summary: DiffSummary = {
    added: changes.filter((c) => c.category === 'ADDED').length,
    removed: changes.filter((c) => c.category === 'REMOVED').length,
    renamed: changes.filter((c) => c.category === 'RENAMED').length,
    typeChanged: changes.filter((c) => c.category === 'TYPE_CHANGED').length,
    routeChanged: changes.filter((c) => c.category === 'ROUTE_CHANGED').length,
    labelChanged: changes.filter((c) => c.category === 'LABEL_CHANGED').length,
    handlerChanged: changes.filter((c) => c.category === 'HANDLER_CHANGED').length,
    moved: changes.filter((c) => c.category === 'MOVED').length,
    total: changes.length,
    breakingCount: changes.filter((c) => c.breaking).length,
  };

  return {
    changes,
    breaking: summary.breakingCount > 0,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Protected scope checking (pure function)
// ---------------------------------------------------------------------------

/**
 * Check which breaking changes touch a protected scope.
 * Returns the subset of breaking changes whose agentId starts with
 * any prefix in `protectedScopes`.
 */
export function findProtectedScopeViolations(
  changes: DiffChange[],
  protectedScopes: string[],
): DiffChange[] {
  if (protectedScopes.length === 0) return [];
  return changes.filter(
    (c) =>
      c.breaking &&
      protectedScopes.some((scope) => c.agentId.startsWith(scope)),
  );
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatDiffReport(
  result: DiffResult,
  allowBreaking: string | undefined,
  protectedViolations: DiffChange[] = [],
): string {
  if (result.changes.length === 0) {
    return 'UIC Manifest Diff\n=================\n\nNo changes detected.\n';
  }

  const lines: string[] = ['UIC Manifest Diff', '=================', ''];

  // Protected scope violations section (always shown first if any)
  if (protectedViolations.length > 0) {
    lines.push(
      `PROTECTED SCOPE VIOLATIONS (${String(protectedViolations.length)}):`,
    );
    lines.push(
      '  These changes affect protected scopes and cannot be overridden with --allow-breaking.',
    );
    for (const change of protectedViolations) {
      lines.push(`  !! ${change.category}  ${change.agentId}`);
      lines.push(`     ${change.details}`);
    }
    lines.push('');
  }

  const protectedIds = new Set(protectedViolations.map((c) => `${c.category}:${c.agentId}`));
  const breakingNonProtected = result.changes.filter(
    (c) => c.breaking && !protectedIds.has(`${c.category}:${c.agentId}`),
  );
  const nonBreaking = result.changes.filter((c) => !c.breaking);

  if (breakingNonProtected.length > 0) {
    lines.push(`BREAKING CHANGES (${String(breakingNonProtected.length)}):`);
    for (const change of breakingNonProtected) {
      lines.push(`  \u2717 ${change.category}  ${change.agentId}`);
      lines.push(`    ${change.details}`);
    }
    lines.push('');
  }

  if (nonBreaking.length > 0) {
    lines.push(`NON-BREAKING CHANGES (${String(nonBreaking.length)}):`);
    for (const change of nonBreaking) {
      const prefix = change.category === 'ADDED' ? '+' : '~';
      lines.push(`  ${prefix} ${change.category}  ${change.agentId}`);
      lines.push(`    ${change.details}`);
    }
    lines.push('');
  }

  lines.push(
    `Summary: ${String(result.summary.total)} change(s) (${String(result.summary.breakingCount)} breaking, ${String(result.summary.total - result.summary.breakingCount)} non-breaking)`,
  );

  if (allowBreaking !== undefined && result.breaking) {
    lines.push(`\nBreaking changes allowed: "${allowBreaking}"`);
  }

  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export async function diffCommand(args: string[]): Promise<number> {
  const parsed = parseDiffArgs(args);

  if ('error' in parsed) {
    process.stderr.write(`Error: ${parsed.error}\n`);
    return 1;
  }

  if (parsed.help) {
    process.stderr.write(DIFF_HELP);
    return 0;
  }

  const oldPath = path.resolve(parsed.oldManifest as string);
  const newPath = path.resolve(parsed.newManifest as string);

  // Load config
  let config: UicConfig;
  if (parsed.configPath !== undefined) {
    // Explicit config path: read and validate directly
    const configFilePath = path.resolve(parsed.configPath);
    try {
      const raw = await fs.readFile(configFilePath, 'utf-8');
      const { validateConfig } = await import('@uic/core');
      const jsonParsed: unknown = JSON.parse(raw);
      config = validateConfig(jsonParsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `Error: Failed to load config "${configFilePath}": ${message}\n`,
      );
      return 1;
    }
  } else {
    try {
      config = await loadConfig(process.cwd());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Error: Failed to load config: ${message}\n`);
      return 1;
    }
  }

  // Load old manifest
  let oldManifest: Manifest;
  try {
    const raw = await fs.readFile(oldPath, 'utf-8');
    oldManifest = deserializeManifest(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: Failed to load old manifest "${oldPath}": ${message}\n`);
    return 1;
  }

  // Load new manifest
  let newManifest: Manifest;
  try {
    const raw = await fs.readFile(newPath, 'utf-8');
    newManifest = deserializeManifest(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: Failed to load new manifest "${newPath}": ${message}\n`);
    return 1;
  }

  const result = diffManifests(oldManifest, newManifest);

  // Check protected scope violations
  const protectedViolations = findProtectedScopeViolations(
    result.changes,
    config.protectedScopes,
  );

  if (parsed.json) {
    const jsonOutput = {
      ...result,
      protectedScopeViolations: protectedViolations.map((c) => c.agentId),
    };
    process.stdout.write(JSON.stringify(jsonOutput, null, 2) + '\n');
  } else {
    process.stdout.write(formatDiffReport(result, parsed.allowBreaking, protectedViolations));
  }

  // Exit code logic:
  // 1. Protected scope violations ALWAYS exit 1 (--allow-breaking does NOT override)
  if (protectedViolations.length > 0) {
    return 1;
  }

  // 2. Breaking changes follow policy
  if (result.breaking) {
    if (parsed.allowBreaking !== undefined) {
      // --allow-breaking overrides the policy
      return 0;
    }

    if (config.breakingChangePolicy === 'warn') {
      // "warn" policy: print (already done above) but exit 0
      return 0;
    }

    // "block" policy (default): exit 1
    return 1;
  }

  return 0;
}
