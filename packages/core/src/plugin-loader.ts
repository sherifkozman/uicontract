/**
 * Plugin loader for third-party UIC parsers.
 *
 * Dynamically imports npm packages listed in `.uicrc.json` `plugins` and
 * registers them into the ParserRegistry. Invalid or missing plugins are
 * warned about but do not throw.
 */

import type { Parser } from './types.js';
import type { Logger } from './logger.js';
import { ParserRegistry } from './parser-registry.js';
import { UicError } from './errors.js';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isParser(value: unknown): value is Parser {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['framework'] === 'string' &&
    typeof obj['detect'] === 'function' &&
    typeof obj['discover'] === 'function'
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Result of loading plugins - which succeeded and which failed. */
export interface PluginLoadResult {
  loaded: string[];
  failed: string[];
}

/**
 * Dynamically import each plugin and register its Parser into the registry.
 *
 * Plugins are npm package names that export a Parser object. The loader tries
 * several export patterns:
 *
 * 1. Default export is a Parser
 * 2. Named `parser` export is a Parser
 * 3. Module object itself is a Parser (CommonJS default)
 *
 * Invalid or missing plugins are logged as warnings and added to `failed`.
 */
export async function loadPlugins(
  pluginNames: string[],
  registry: ParserRegistry,
  logger: Logger,
): Promise<PluginLoadResult> {
  const loaded: string[] = [];
  const failed: string[] = [];

  for (const name of pluginNames) {
    try {
      const mod: unknown = await import(name);

      // Resolve the Parser from common export patterns
      let parser: unknown;

      // Try default export first
      if (typeof mod === 'object' && mod !== null && 'default' in mod) {
        const defaultExport = (mod as Record<string, unknown>)['default'];
        if (isParser(defaultExport)) {
          parser = defaultExport;
        }
      }

      // Try named `parser` export
      if (!parser && typeof mod === 'object' && mod !== null && 'parser' in mod) {
        const namedExport = (mod as Record<string, unknown>)['parser'];
        if (isParser(namedExport)) {
          parser = namedExport;
        }
      }

      // Try module itself (CommonJS pattern).
      // Wrapped in try/catch because some module systems (including test mocks)
      // throw on property access for exports not defined in the module.
      if (!parser) {
        try {
          if (isParser(mod)) {
            parser = mod;
          }
        } catch {
          // Property access threw - module is not a valid Parser
        }
      }

      if (!isParser(parser)) {
        logger.warn(
          `Plugin "${name}" does not export a valid Parser. ` +
            `Expected an object with { framework: string, detect: Function, discover: Function }.`,
        );
        failed.push(name);
        continue;
      }

      try {
        registry.register(parser);
        loaded.push(name);
        logger.debug(`Loaded plugin "${name}" (framework: ${parser.framework})`);
      } catch (err) {
        if (err instanceof UicError && err.code === 'PARSER_DUPLICATE') {
          logger.warn(
            `Plugin "${name}" skipped: parser for framework "${parser.framework}" already registered.`,
          );
          failed.push(name);
        } else {
          throw err;
        }
      }
    } catch (err) {
      // Re-throw UicError (from registry internals), catch everything else
      if (err instanceof UicError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        `Failed to load plugin "${name}": ${message}. ` +
          `Ensure it is installed: pnpm add ${name}`,
      );
      failed.push(name);
    }
  }

  return { loaded, failed };
}
