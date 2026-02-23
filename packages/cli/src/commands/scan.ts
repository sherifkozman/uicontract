/**
 * `uicontract scan` command - discovers interactive elements in a project and
 * emits a UIC manifest.
 *
 * stdout: manifest JSON (or summary when --output is used)
 * stderr: logs, errors, help text
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  parserRegistry,
  buildManifest,
  serializeManifest,
  UicError,
  createLogger,
  loadConfig,
  loadPlugins,
  VERSION,
} from '@uicontract/core';
import type { NamedElement, RawElement } from '@uicontract/core';
import { reactParser } from '@uicontract/parser-react';
import { vueParser } from '@uicontract/parser-vue';

// Register parsers into the global registry.
// Guard against duplicate registration if this module is imported multiple times
// in the same process (e.g., during tests).
try {
  parserRegistry.register(reactParser);
} catch (err) {
  if (!(err instanceof UicError) || err.code !== 'PARSER_DUPLICATE') {
    throw err;
  }
}
try {
  parserRegistry.register(vueParser);
} catch (err) {
  if (!(err instanceof UicError) || err.code !== 'PARSER_DUPLICATE') {
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

export const SCAN_HELP = `\
uicontract scan <directory> [options]

Scan a project directory for interactive UI elements and emit a manifest.

ARGUMENTS
  <directory>            Path to the project root to scan

OPTIONS
  --framework <name>     Framework to use (react, vue). Auto-detected if omitted.
  --output, -o <file>    Write manifest to a file instead of stdout.
  --json                 Output manifest as JSON (default when writing to stdout).
  --verbose              Enable debug logging.
  --quiet                Suppress all non-error output.
  --help, -h             Show this help message.

EXAMPLES
  uicontract scan ./my-app
  uicontract scan ./my-app --framework react --output manifest.json
  uicontract scan ./my-app --verbose

Run "uicontract --help" for the full list of commands.
`;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

export interface ScanArgs {
  dir: string | undefined;
  framework: string | undefined;
  output: string | undefined;
  json: boolean;
  verbose: boolean;
  quiet: boolean;
  help: boolean;
}

export interface ScanArgsError {
  error: string;
}

/** Parse raw string[] args into a ScanArgs object or an error. */
export function parseScanArgs(args: string[]): ScanArgs | ScanArgsError {
  let framework: string | undefined;
  let output: string | undefined;
  let json = false;
  let verbose = false;
  let quiet = false;
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

    if (arg === '--verbose') {
      verbose = true;
      continue;
    }

    if (arg === '--quiet') {
      quiet = true;
      continue;
    }

    if (arg === '--framework') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('-')) {
        return { error: 'Missing value for --framework. Example: --framework react' };
      }
      framework = next;
      i++;
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('-')) {
        return { error: 'Missing value for --output / -o. Example: --output manifest.json' };
      }
      output = next;
      i++;
      continue;
    }

    if (arg !== undefined && arg.startsWith('-')) {
      return { error: `Unknown option: ${arg}. Run "uicontract scan --help" for usage.` };
    }

    if (arg !== undefined) {
      positionals.push(arg);
    }
  }

  if (!help && positionals.length === 0) {
    return { error: 'Missing required argument <directory>. Run "uicontract scan --help" for usage.' };
  }

  const dir = positionals[0];
  if (positionals.length > 1) {
    return {
      error: `Unexpected argument: "${positionals[1] ?? ''}". Run "uicontract scan --help" for usage.`,
    };
  }

  return { dir, framework, output, json, verbose, quiet, help };
}

function isScanArgsError(value: ScanArgs | ScanArgsError): value is ScanArgsError {
  return 'error' in value;
}

// ---------------------------------------------------------------------------
// Temp ID generation
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic placeholder agentId for a raw element.
 *
 * Format: <context>.<type>.<line>
 *
 * Where <context> is derived from the component name or route,
 * slugified to match the AGENT_ID_PATTERN: ^[a-z][a-z0-9.-]*$
 *
 * The real naming engine (Phase 2) will replace these with proper IDs.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/^[^a-z]+/, '')       // strip leading non-letter chars
    .replace(/-{2,}/g, '-')        // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '')       // strip leading/trailing hyphens
    || 'x';                        // fallback if everything was stripped
}

export function generateTempId(el: RawElement, index: number): string {
  const context =
    el.componentName !== null && el.componentName.length > 0
      ? slugify(el.componentName)
      : el.route !== null && el.route.length > 0
        ? slugify(el.route)
        : 'unknown';

  // Ensure context starts with a letter (AGENT_ID_PATTERN requires ^[a-z])
  const safeContext = /^[a-z]/.test(context) ? context : `c${context}`;

  const type = el.type;
  const discriminator = el.line > 0 ? String(el.line) : String(index);

  return `${safeContext}.${type}.${discriminator}`;
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

/**
 * Entry point for `uicontract scan`.
 *
 * @param args - raw CLI args after the "scan" subcommand has been stripped
 * @returns exit code (0 = success, 1 = failure)
 */
export async function scanCommand(args: string[]): Promise<number> {
  const parsed = parseScanArgs(args);

  if (isScanArgsError(parsed)) {
    process.stderr.write(`Error: ${parsed.error}\n`);
    return 1;
  }

  if (parsed.help) {
    process.stderr.write(SCAN_HELP);
    return 0;
  }

  // TypeScript narrowing: after the help/error checks, dir is defined.
  const rawDir = parsed.dir as string;

  const logLevel = parsed.verbose ? 'debug' : parsed.quiet ? 'error' : 'info';
  const logger = createLogger({ level: logLevel, prefix: 'uic:scan' });

  // Resolve directory
  const resolvedDir = path.resolve(rawDir);
  logger.debug('Resolved project directory', { dir: resolvedDir });

  try {
    const stat = await fs.stat(resolvedDir);
    if (!stat.isDirectory()) {
      process.stderr.write(
        `Error: "${resolvedDir}" is not a directory. Provide the path to your project root.\n`,
      );
      return 1;
    }
  } catch {
    process.stderr.write(
      `Error: Directory not found: "${resolvedDir}". Check the path and try again.\n`,
    );
    return 1;
  }

  // Load plugins and componentMap from config
  let componentMap: Record<string, string> | undefined;
  try {
    const config = await loadConfig(resolvedDir);
    if (config.plugins.length > 0) {
      const pluginResult = await loadPlugins(config.plugins, parserRegistry, logger);
      if (pluginResult.loaded.length > 0) {
        logger.debug('Loaded plugins', { plugins: pluginResult.loaded });
      }
    }
    if (Object.keys(config.componentMap).length > 0) {
      componentMap = config.componentMap;
      logger.debug('Loaded componentMap', { entries: Object.keys(config.componentMap).length });
    }
  } catch (err) {
    // Config errors should not block scanning - warn and continue
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Failed to load config/plugins: ${message}`);
  }

  // Resolve parser
  let parser;
  if (parsed.framework !== undefined) {
    parser = parserRegistry.get(parsed.framework);
    if (parser === undefined) {
      const available = parserRegistry.getAll().map((p) => p.framework).join(', ') || 'none';
      process.stderr.write(
        `Error: No parser registered for framework "${parsed.framework}". ` +
          `Available: ${available}. ` +
          `Run "uicontract scan --help" for usage.\n`,
      );
      return 1;
    }
    logger.debug('Using specified framework parser', { framework: parsed.framework });
  } else {
    logger.debug('Auto-detecting framework');
    parser = await parserRegistry.detect(resolvedDir);
    if (parser === undefined) {
      process.stderr.write(
        `Error: Could not auto-detect a framework in "${resolvedDir}". ` +
          `Try specifying --framework explicitly (e.g., --framework react). ` +
          `See docs/PARSERS.md for supported frameworks.\n`,
      );
      return 1;
    }
    logger.debug('Auto-detected framework', { framework: parser.framework });
  }

  // Discover elements
  logger.info(`Scanning "${resolvedDir}" with framework "${parser.framework}"`);

  let result;
  try {
    result = await parser.discover(resolvedDir, {
      ...(componentMap ? { componentMap: componentMap as Record<string, import('@uicontract/core').InteractiveElementType> } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `Error: Scan failed: ${message}\n` +
        `If this is unexpected, run with --verbose for more detail.\n`,
    );
    return 1;
  }

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      logger.warn(`Parser warning [${warning.code}]: ${warning.message}`, {
        filePath: warning.filePath,
        ...(warning.line !== undefined ? { line: warning.line } : {}),
      });
    }
  }

  // Map raw elements to named elements (Phase 2 will replace this with real naming)
  const named: NamedElement[] = result.elements.map((el, i) => ({
    ...el,
    agentId: generateTempId(el, i),
  }));

  // Build manifest
  const manifest = buildManifest({
    elements: named,
    framework: parser.framework,
    projectRoot: resolvedDir,
    filesScanned: result.metadata.filesScanned,
    warnings: result.warnings.length,
    generatorVersion: VERSION,
  });

  const json = serializeManifest(manifest);

  // Output
  if (parsed.output !== undefined) {
    const outputPath = path.resolve(parsed.output);
    try {
      await fs.writeFile(outputPath, json, 'utf-8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `Error: Failed to write manifest to "${outputPath}": ${message}\n` +
          `Check that the directory exists and you have write permission.\n`,
      );
      return 1;
    }
    if (!parsed.quiet) {
      process.stderr.write(
        `Manifest written to ${outputPath}\n` +
          `  Framework:  ${parser.framework}\n` +
          `  Files:      ${String(result.metadata.filesScanned)}\n` +
          `  Elements:   ${String(named.length)}\n` +
          `  Warnings:   ${String(result.warnings.length)}\n`,
      );
    }
  } else {
    process.stdout.write(json + '\n');
  }

  return 0;
}
