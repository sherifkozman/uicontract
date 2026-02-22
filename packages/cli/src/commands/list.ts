/**
 * `uic list` command — list all elements in a manifest with filtering.
 *
 * stdout: element listing (human-readable or JSON)
 * stderr: logs, errors, help text
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { deserializeManifest } from '@uicontract/core';
import type { ManifestElement } from '@uicontract/core';

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

export const LIST_HELP = `\
uic list [options]

List all interactive UI elements in a manifest.

OPTIONS
  --manifest <path>      Path to manifest file (default: manifest.json)
  --type <type>          Filter by element type (button, input, a, etc.)
  --route <route>        Filter by route
  --component <name>     Filter by component name
  --routes               Show route summary (unique routes with element counts)
  --components           Show component summary (unique components with element counts)
  --json                 Output as JSON
  --help, -h             Show this help message

EXAMPLES
  uic list
  uic list --type button
  uic list --route /settings/billing
  uic list --component LoginForm
  uic list --routes
  uic list --components
  uic list --json --manifest dist/manifest.json

Run "uic --help" for the full list of commands.
`;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

export interface ListArgs {
  manifest: string;
  type: string | undefined;
  route: string | undefined;
  component: string | undefined;
  routes: boolean;
  components: boolean;
  json: boolean;
  help: boolean;
}

export interface ListArgsError {
  error: string;
}

export function parseListArgs(args: string[]): ListArgs | ListArgsError {
  let manifest = 'manifest.json';
  let type: string | undefined;
  let route: string | undefined;
  let component: string | undefined;
  let routes = false;
  let components = false;
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
    if (arg === '--routes') {
      routes = true;
      continue;
    }
    if (arg === '--components') {
      components = true;
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
    if (arg === '--route') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('-')) {
        return { error: 'Missing value for --route. Example: --route /settings' };
      }
      route = next;
      i++;
      continue;
    }
    if (arg === '--component') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('-')) {
        return { error: 'Missing value for --component. Example: --component LoginForm' };
      }
      component = next;
      i++;
      continue;
    }
    if (arg !== undefined && arg.startsWith('-')) {
      return { error: `Unknown option: ${arg}. Run "uic list --help" for usage.` };
    }
    // list takes no positional args
    if (arg !== undefined) {
      return { error: `Unexpected argument: "${arg}". "uic list" takes no positional arguments.` };
    }
  }

  return { manifest, type, route, component, routes, components, json, help };
}

// ---------------------------------------------------------------------------
// Filtering & formatting
// ---------------------------------------------------------------------------

function filterElements(
  elements: ManifestElement[],
  opts: { type?: string; route?: string; component?: string },
): ManifestElement[] {
  let result = elements;
  if (opts.type !== undefined) {
    result = result.filter((el) => el.type === opts.type);
  }
  if (opts.route !== undefined) {
    result = result.filter((el) => el.route === opts.route);
  }
  if (opts.component !== undefined) {
    result = result.filter((el) => el.componentName === opts.component);
  }
  return result;
}

function formatElementRow(el: ManifestElement): string {
  const label = el.label !== null ? `  "${el.label}"` : '';
  return `  ${el.agentId}  ${el.type}${label}`;
}

interface SummaryEntry {
  name: string;
  count: number;
}

function buildRouteSummary(elements: ManifestElement[]): SummaryEntry[] {
  const counts = new Map<string, number>();
  for (const el of elements) {
    const key = el.route ?? '(no route)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildComponentSummary(elements: ManifestElement[]): SummaryEntry[] {
  const counts = new Map<string, number>();
  for (const el of elements) {
    const key = el.componentName ?? '(no component)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function formatSummary(label: string, entries: SummaryEntry[]): string {
  if (entries.length === 0) {
    return `No ${label} found.\n`;
  }
  const lines = [`${label} (${String(entries.length)}):`];
  for (const entry of entries) {
    lines.push(`  ${entry.name}  (${String(entry.count)} element${entry.count !== 1 ? 's' : ''})`);
  }
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export async function listCommand(args: string[]): Promise<number> {
  const parsed = parseListArgs(args);

  if ('error' in parsed) {
    process.stderr.write(`Error: ${parsed.error}\n`);
    return 1;
  }

  if (parsed.help) {
    process.stderr.write(LIST_HELP);
    return 0;
  }

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

  const filtered = filterElements(manifest.elements, {
    type: parsed.type,
    route: parsed.route,
    component: parsed.component,
  });

  // --routes summary mode
  if (parsed.routes) {
    const summary = buildRouteSummary(filtered);
    if (parsed.json) {
      process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    } else {
      process.stdout.write(formatSummary('Routes', summary));
    }
    return 0;
  }

  // --components summary mode
  if (parsed.components) {
    const summary = buildComponentSummary(filtered);
    if (parsed.json) {
      process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    } else {
      process.stdout.write(formatSummary('Components', summary));
    }
    return 0;
  }

  // Default: list elements
  if (parsed.json) {
    process.stdout.write(JSON.stringify(filtered, null, 2) + '\n');
  } else {
    if (filtered.length === 0) {
      process.stdout.write('No elements found.\n');
    } else {
      process.stdout.write(`${String(filtered.length)} element(s):\n`);
      for (const el of filtered) {
        process.stdout.write(formatElementRow(el) + '\n');
      }
    }
  }

  return 0;
}
