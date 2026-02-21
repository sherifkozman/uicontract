/**
 * `uic find` command — fuzzy search for elements in a manifest.
 *
 * stdout: matching elements (human-readable or JSON)
 * stderr: logs, errors, help text
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { deserializeManifest } from '@uic/core';
import type { ManifestElement } from '@uic/core';

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

export const FIND_HELP = `\
uic find <query> [options]

Search for interactive UI elements in a manifest by name, label, route, or handler.

ARGUMENTS
  <query>                Text to search for (case-insensitive substring match)

OPTIONS
  --manifest <path>      Path to manifest file (default: manifest.json)
  --type <type>          Filter results to a specific element type
  --json                 Output matching elements as JSON array
  --help, -h             Show this help message

EXAMPLES
  uic find "login"
  uic find "button" --type button
  uic find "settings" --manifest dist/manifest.json --json

Run "uic --help" for the full list of commands.
`;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

export interface FindArgs {
  query: string | undefined;
  manifest: string;
  type: string | undefined;
  json: boolean;
  help: boolean;
}

export interface FindArgsError {
  error: string;
}

export function parseFindArgs(args: string[]): FindArgs | FindArgsError {
  let manifest = 'manifest.json';
  let type: string | undefined;
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
    if (arg !== undefined && arg.startsWith('-')) {
      return { error: `Unknown option: ${arg}. Run "uic find --help" for usage.` };
    }
    if (arg !== undefined) {
      positionals.push(arg);
    }
  }

  if (!help && positionals.length === 0) {
    return { error: 'Missing required argument <query>. Run "uic find --help" for usage.' };
  }

  if (positionals.length > 1) {
    return { error: `Unexpected argument: "${positionals[1] ?? ''}". Wrap multi-word queries in quotes.` };
  }

  return { query: positionals[0], manifest, type, json, help };
}

// ---------------------------------------------------------------------------
// Search logic
// ---------------------------------------------------------------------------

/** Check if an element matches the query (case-insensitive substring). */
export function elementMatchesQuery(el: ManifestElement, query: string): boolean {
  const q = query.toLowerCase();
  const fields = [
    el.agentId,
    el.label,
    el.componentName,
    el.route,
    el.handler,
    el.type,
    el.filePath,
  ];
  for (const field of fields) {
    if (field !== null && field.toLowerCase().includes(q)) {
      return true;
    }
  }
  return false;
}

/** Format a single element for human-readable output. */
function formatElementRow(el: ManifestElement): string {
  const label = el.label !== null ? `  "${el.label}"` : '';
  return `  ${el.agentId}  ${el.type}  ${el.filePath}:${String(el.line)}${label}`;
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
        `Run "uic scan <dir>" first to generate a manifest, or specify --manifest <path>.\n`,
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
        process.stdout.write(formatElementRow(el) + '\n');
      }
    }
  }

  return 0;
}
