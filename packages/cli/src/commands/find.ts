/**
 * `uicontract find` command -- fuzzy search for elements in a manifest.
 *
 * stdout: matching elements (human-readable or JSON)
 * stderr: logs, errors, help text
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { deserializeManifest } from '@uicontract/core';
import type { ManifestElement } from '@uicontract/core';
import { fuzzyMatchElement } from '../fuzzy-match.js';

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

export const FIND_HELP = `\
uicontract find <query> [options]

Search for interactive UI elements in a manifest by name, label, route, or handler.

ARGUMENTS
  <query>                Text to search for (case-insensitive)

OPTIONS
  --manifest <path>      Path to manifest file (default: manifest.json)
  --type <type>          Filter results to a specific element type
  --threshold <number>   Minimum fuzzy match score between 0 and 1 (default: 0.6)
  --limit <number>       Maximum number of results to return (default: 10)
  --exact                Use exact substring matching (no fuzzy matching)
  --fuzzy                Use fuzzy matching (default)
  --json                 Output matching elements as JSON array
  --help, -h             Show this help message

EXAMPLES
  uicontract find "login"
  uicontract find "pase subscribtion"          # fuzzy match finds "pause-subscription"
  uicontract find "button" --type button
  uicontract find "settings" --exact           # strict substring match only
  uicontract find "settings" --manifest dist/manifest.json --json
  uicontract find "billing" --threshold 0.8    # stricter matching
  uicontract find "billing" --limit 5          # return at most 5 results

Run "uicontract --help" for the full list of commands.
`;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

export interface FindArgs {
  query: string | undefined;
  manifest: string;
  type: string | undefined;
  threshold: number;
  limit: number;
  json: boolean;
  help: boolean;
  exact: boolean;
}

export interface FindArgsError {
  error: string;
}

export function parseFindArgs(args: string[]): FindArgs | FindArgsError {
  let manifest = 'manifest.json';
  let type: string | undefined;
  let threshold = 0.6;
  let limit = 10;
  let json = false;
  let help = false;
  let exact = false;
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
    if (arg === '--exact') {
      exact = true;
      continue;
    }
    if (arg === '--fuzzy') {
      exact = false;
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
    if (arg === '--type') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('-')) {
        return { error: 'Missing value for --type. Example: --type button' };
      }
      type = next;
      i++;
      continue;
    }
    if (arg === '--threshold') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('-')) {
        return { error: 'Missing value for --threshold. Example: --threshold 0.6' };
      }
      const parsed = Number(next);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
        return { error: '--threshold must be a number between 0 and 1. Example: --threshold 0.6' };
      }
      threshold = parsed;
      i++;
      continue;
    }
    if (arg === '--limit') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('-')) {
        return { error: 'Missing value for --limit. Example: --limit 10' };
      }
      const parsed = Number(next);
      if (!Number.isInteger(parsed) || parsed < 1) {
        return { error: '--limit must be a positive integer. Example: --limit 10' };
      }
      limit = parsed;
      i++;
      continue;
    }
    if (arg !== undefined && arg.startsWith('-')) {
      return { error: `Unknown option: ${arg}. Run "uicontract find --help" for usage.` };
    }
    if (arg !== undefined) {
      positionals.push(arg);
    }
  }

  if (!help && positionals.length === 0) {
    return { error: 'Missing required argument <query>. Run "uicontract find --help" for usage.' };
  }

  if (positionals.length > 1) {
    return { error: `Unexpected argument: "${positionals[1] ?? ''}". Wrap multi-word queries in quotes.` };
  }

  return { query: positionals[0], manifest, type, threshold, limit, json, help, exact };
}

// ---------------------------------------------------------------------------
// Search logic
// ---------------------------------------------------------------------------

/** Fields to search against for a given element. */
function getSearchFields(el: ManifestElement): (string | null)[] {
  return [
    el.agentId,
    el.label,
    el.componentName,
    el.route,
    el.handler,
    el.type,
    el.filePath,
  ];
}

/** Check if an element matches the query (case-insensitive substring). */
export function elementMatchesQuery(el: ManifestElement, query: string): boolean {
  const q = query.toLowerCase();
  const fields = getSearchFields(el);
  for (const field of fields) {
    if (field !== null && field.toLowerCase().includes(q)) {
      return true;
    }
  }
  return false;
}

/** Scored search result for fuzzy mode. */
export interface ScoredElement {
  element: ManifestElement;
  score: number;
}

/**
 * Score an element against a query using fuzzy matching.
 * Returns null if the element does not meet the threshold.
 */
export function scoreElement(el: ManifestElement, query: string, threshold?: number): ScoredElement | null {
  const fields = getSearchFields(el);
  const result = fuzzyMatchElement(fields, query, threshold);
  if (!result.matches) return null;
  return { element: el, score: result.score };
}

/** Format a single element for human-readable output. */
function formatElementRow(el: ManifestElement, score: number | null): string {
  const label = el.label !== null ? `  "${el.label}"` : '';
  const scoreStr = score !== null ? `  (score: ${score.toFixed(2)})` : '';
  return `  ${el.agentId}  ${el.type}  ${el.filePath}:${String(el.line)}${label}${scoreStr}`;
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export async function findCommand(args: string[]): Promise<number> {
  const parsed = parseFindArgs(args);

  if ('error' in parsed) {
    process.stderr.write(`Error: ${parsed.error}\n`);
    return 1;
  }

  if (parsed.help) {
    process.stderr.write(FIND_HELP);
    return 0;
  }

  const query = parsed.query as string;
  const manifestPath = path.resolve(parsed.manifest);

  let raw: string;
  try {
    raw = await fs.readFile(manifestPath, 'utf-8');
  } catch {
    process.stderr.write(
      `Error: Manifest not found at "${manifestPath}". ` +
        `Run "uicontract scan <dir>" first to generate a manifest, or specify --manifest <path>.\n`,
    );
    return 1;
  }

  let manifest;
  try {
    manifest = deserializeManifest(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: Invalid manifest: ${message}\n`);
    return 1;
  }

  if (parsed.exact) {
    // Exact substring matching (original behavior).
    let results = manifest.elements.filter((el) => elementMatchesQuery(el, query));

    if (parsed.type !== undefined) {
      results = results.filter((el) => el.type === parsed.type);
    }

    if (parsed.json) {
      process.stdout.write(JSON.stringify(results, null, 2) + '\n');
    } else {
      if (results.length === 0) {
        process.stdout.write(`No elements matching "${query}".\n`);
      } else {
        process.stdout.write(`Found ${String(results.length)} element(s) matching "${query}":\n`);
        for (const el of results) {
          process.stdout.write(formatElementRow(el, null) + '\n');
        }
      }
    }
  } else {
    // Fuzzy matching (default).
    let scored: ScoredElement[] = [];
    for (const el of manifest.elements) {
      const result = scoreElement(el, query, parsed.threshold);
      if (result !== null) {
        scored.push(result);
      }
    }

    if (parsed.type !== undefined) {
      scored = scored.filter((s) => s.element.type === parsed.type);
    }

    // Sort by score descending (best match first).
    scored.sort((a, b) => b.score - a.score);

    // Apply limit.
    scored = scored.slice(0, parsed.limit);

    if (parsed.json) {
      const output = scored.map((s) => ({
        ...s.element,
        _score: Math.round(s.score * 100) / 100,
      }));
      process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    } else {
      if (scored.length === 0) {
        process.stdout.write(`No elements matching "${query}".\n`);
      } else {
        process.stdout.write(`Found ${String(scored.length)} element(s) matching "${query}":\n`);
        for (const s of scored) {
          process.stdout.write(formatElementRow(s.element, s.score) + '\n');
        }
      }
    }
  }

  return 0;
}
