/**
 * @uicontract/parser-vue - Vue/Nuxt parser for UIC.
 * Implements the Parser interface from @uicontract/core.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Parser, DiscoveryResult, ParserOptions, RawElement, ParserWarning } from '@uicontract/core';
import { discoverFiles } from './file-discovery.js';
import { parseVueFile } from './sfc-visitor.js';

export const VERSION = '0.2.1';

/** Detect whether a directory likely contains a Vue project. */
async function detectVue(dir: string): Promise<boolean> {
  // Check for package.json with vue or nuxt dependency
  try {
    const pkgPath = path.join(dir, 'package.json');
    const raw = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const deps = {
      ...(typeof pkg['dependencies'] === 'object' && pkg['dependencies'] !== null
        ? (pkg['dependencies'] as Record<string, unknown>)
        : {}),
      ...(typeof pkg['devDependencies'] === 'object' && pkg['devDependencies'] !== null
        ? (pkg['devDependencies'] as Record<string, unknown>)
        : {}),
      ...(typeof pkg['peerDependencies'] === 'object' && pkg['peerDependencies'] !== null
        ? (pkg['peerDependencies'] as Record<string, unknown>)
        : {}),
    };
    if ('vue' in deps || 'nuxt' in deps) return true;
  } catch {
    // No package.json or unreadable - fall through to file check
  }

  // Fallback: any .vue file present
  try {
    const files = await discoverFiles(dir, { maxDepth: 3 });
    return files.length > 0;
  } catch {
    return false;
  }
}

/** The Vue/Nuxt parser implementation. */
export class VueParser implements Parser {
  readonly framework = 'vue';

  async detect(dir: string): Promise<boolean> {
    return detectVue(dir);
  }

  async discover(dir: string, options: ParserOptions): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const warnings: ParserWarning[] = [];
    const elements: RawElement[] = [];
    let filesSkipped = 0;

    const files = await discoverFiles(dir, options);

    for (const file of files) {
      try {
        const source = await fs.readFile(file, 'utf-8');
        const fileElements = parseVueFile(source, file, dir);
        elements.push(...fileElements);
      } catch (error) {
        filesSkipped++;
        warnings.push({
          code: 'PARSE_ERROR',
          message: `Failed to parse: ${error instanceof Error ? error.message : String(error)}`,
          filePath: path.relative(dir, file),
        });
      }
    }

    return {
      elements,
      warnings,
      metadata: {
        filesScanned: files.length,
        filesSkipped,
        scanDurationMs: Date.now() - startTime,
      },
    };
  }
}

export const vueParser = new VueParser();

// Re-export internal modules for consumers that need direct access
export { discoverFiles } from './file-discovery.js';
export { parseVueFile } from './sfc-visitor.js';
