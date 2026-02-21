/**
 * `uic name` command — assign hierarchical agent IDs to manifest elements.
 *
 * stdout: named manifest (JSON)
 * stderr: logs, errors, help text
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { deserializeManifest, serializeManifest } from '@uic/core';
import type { Manifest } from '@uic/core';
import { nameElements } from '@uic/namer';

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

export const NAME_HELP = `\
uic name <manifest> [options]

Assign stable, hierarchical agent IDs to elements in a manifest.

ARGUMENTS
  <manifest>             Path to a manifest.json produced by "uic scan"

OPTIONS
  --output, -o <file>    Write named manifest to a file instead of stdout
  --ai                   Use AI-assisted naming (falls back to deterministic)
  --ai-timeout <ms>      Timeout for AI naming in milliseconds (default: 5000)
  --json                 Output as JSON (default)
  --help, -h             Show this help message

EXAMPLES
  uic name manifest.json
  uic name manifest.json -o named-manifest.json
  uic name manifest.json --ai
  uic name manifest.json --ai --ai-timeout 10000

Run "uic --help" for the full list of commands.
`;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

export interface NameArgs {
  manifest: string | undefined;
  output: string | undefined;
  ai: boolean;
  aiTimeout: number;
  json: boolean;
  help: boolean;
}

export interface NameArgsError {
  error: string;
}

export function parseNameArgs(args: string[]): NameArgs | NameArgsError {
  let output: string | undefined;
  let ai = false;
  let aiTimeout = 5000;
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
    if (arg === '--ai') {
      ai = true;
      continue;
    }
    if (arg === '--ai-timeout') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('-')) {
        return { error: 'Missing value for --ai-timeout. Example: --ai-timeout 5000' };
      }
      const parsed = parseInt(next, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        return { error: `Invalid --ai-timeout value: "${next}". Must be a positive integer (milliseconds).` };
      }
      aiTimeout = parsed;
      i++;
      continue;
    }
    if (arg === '--output' || arg === '-o') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('-')) {
        return { error: 'Missing value for --output / -o. Example: --output named-manifest.json' };
      }
      output = next;
      i++;
      continue;
    }
    if (arg !== undefined && arg.startsWith('-')) {
      return { error: `Unknown option: ${arg}. Run "uic name --help" for usage.` };
    }
    if (arg !== undefined) {
      positionals.push(arg);
    }
  }

  if (!help && positionals.length === 0) {
    return { error: 'Missing required argument <manifest>. Run "uic name --help" for usage.' };
  }

  if (positionals.length > 1) {
    return { error: `Unexpected argument: "${positionals[1] ?? ''}". Run "uic name --help" for usage.` };
  }

  return { manifest: positionals[0], output, ai, aiTimeout, json, help };
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export async function nameCommand(args: string[]): Promise<number> {
  const parsed = parseNameArgs(args);

  if ('error' in parsed) {
    process.stderr.write(`Error: ${parsed.error}\n`);
    return 1;
  }

  if (parsed.help) {
    process.stderr.write(NAME_HELP);
    return 0;
  }

  const manifestPath = path.resolve(parsed.manifest as string);

  // Load manifest
  let manifest: Manifest;
  try {
    const raw = await fs.readFile(manifestPath, 'utf-8');
    manifest = deserializeManifest(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: Failed to load manifest "${manifestPath}": ${message}\n`);
    return 1;
  }

  // Name elements
  const namedElements = nameElements(manifest.elements, {
    ai: parsed.ai,
    aiTimeout: parsed.aiTimeout,
  });

  // Build output manifest with named elements
  const namedManifest: Manifest = {
    ...manifest,
    elements: namedElements,
    metadata: {
      ...manifest.metadata,
      elementsDiscovered: namedElements.length,
    },
  };

  const output = serializeManifest(namedManifest);

  // Write output
  if (parsed.output !== undefined) {
    const outputPath = path.resolve(parsed.output);
    try {
      await fs.writeFile(outputPath, output, 'utf-8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Error: Failed to write named manifest to "${outputPath}": ${message}\n`);
      return 1;
    }
    process.stderr.write(
      `Named manifest written to ${outputPath}\n` +
        `  Elements named: ${String(namedElements.length)}\n`,
    );
  } else {
    process.stdout.write(output + '\n');
  }

  return 0;
}
