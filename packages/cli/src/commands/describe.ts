/**
 * `uicontract describe` command - show full details of a single element by agentId.
 *
 * stdout: element details (human-readable or JSON)
 * stderr: logs, errors, help text
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { deserializeManifest } from '@uicontract/core';
import type { ManifestElement } from '@uicontract/core';

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

export const DESCRIBE_HELP = `\
uicontract describe <agent-id> [options]

Show full details of an interactive UI element by its agent ID.

ARGUMENTS
  <agent-id>             The agent ID of the element to describe

OPTIONS
  --manifest <path>      Path to manifest file (default: manifest.json)
  --json                 Output element as JSON
  --help, -h             Show this help message

EXAMPLES
  uicontract describe settings.billing.pause-btn.button
  uicontract describe login.email.input --json
  uicontract describe nav.home.a --manifest dist/manifest.json

Run "uicontract --help" for the full list of commands.
`;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

export interface DescribeArgs {
  agentId: string | undefined;
  manifest: string;
  json: boolean;
  help: boolean;
}

export interface DescribeArgsError {
  error: string;
}

export function parseDescribeArgs(args: string[]): DescribeArgs | DescribeArgsError {
  let manifest = 'manifest.json';
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
    if (arg !== undefined && arg.startsWith('-')) {
      return { error: `Unknown option: ${arg}. Run "uicontract describe --help" for usage.` };
    }
    if (arg !== undefined) {
      positionals.push(arg);
    }
  }

  if (!help && positionals.length === 0) {
    return { error: 'Missing required argument <agent-id>. Run "uicontract describe --help" for usage.' };
  }

  if (positionals.length > 1) {
    return { error: `Unexpected argument: "${positionals[1] ?? ''}". Only one agent-id is accepted.` };
  }

  return { agentId: positionals[0], manifest, json, help };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatElementDetail(el: ManifestElement): string {
  const lines: string[] = [
    `Agent ID:       ${el.agentId}`,
    `Type:           ${el.type}`,
    `File:           ${el.filePath}:${String(el.line)}:${String(el.column)}`,
    `Component:      ${el.componentName ?? '(none)'}`,
    `Route:          ${el.route ?? '(none)'}`,
    `Label:          ${el.label !== null ? `"${el.label}"` : '(none)'}`,
    `Handler:        ${el.handler ?? '(none)'}`,
    `Conditional:    ${String(el.conditional)}`,
    `Dynamic:        ${String(el.dynamic)}`,
  ];

  const attrKeys = Object.keys(el.attributes);
  if (attrKeys.length > 0) {
    lines.push('Attributes:');
    for (const key of attrKeys) {
      lines.push(`  ${key}: "${el.attributes[key] ?? ''}"`);
    }
  } else {
    lines.push('Attributes:     (none)');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export async function describeCommand(args: string[]): Promise<number> {
  const parsed = parseDescribeArgs(args);

  if ('error' in parsed) {
    process.stderr.write(`Error: ${parsed.error}\n`);
    return 1;
  }

  if (parsed.help) {
    process.stderr.write(DESCRIBE_HELP);
    return 0;
  }

  const agentId = parsed.agentId as string;
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

  const element = manifest.elements.find((el) => el.agentId === agentId);

  if (element === undefined) {
    process.stderr.write(
      `Error: No element found with agent ID "${agentId}". ` +
        `Run "uicontract list" to see all available elements, or "uicontract find <query>" to search.\n`,
    );
    return 1;
  }

  if (parsed.json) {
    process.stdout.write(JSON.stringify(element, null, 2) + '\n');
  } else {
    process.stdout.write(formatElementDetail(element) + '\n');
  }

  return 0;
}
