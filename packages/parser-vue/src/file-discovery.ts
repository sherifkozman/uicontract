/**
 * File discovery for Vue SFC files.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ParserOptions } from '@uicontract/core';

const DEFAULT_INCLUDE = ['**/*.vue'];
const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/coverage/**',
  '**/__tests__/**',
  '**/*.test.vue',
  '**/*.spec.vue',
];

/**
 * Recursively discover .vue files in a directory.
 */
export async function discoverFiles(
  dir: string,
  options: ParserOptions,
): Promise<string[]> {
  const includePatterns = options.include ?? DEFAULT_INCLUDE;
  const excludePatterns = options.exclude ?? DEFAULT_EXCLUDE;
  const maxDepth = options.maxDepth ?? 10;

  const files: string[] = [];
  await walkDir(dir, dir, files, includePatterns, excludePatterns, 0, maxDepth);
  return files.sort();
}

async function walkDir(
  baseDir: string,
  currentDir: string,
  results: string[],
  _include: string[],
  _exclude: string[],
  depth: number,
  maxDepth: number,
): Promise<void> {
  if (depth > maxDepth) return;

  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true }) as import('node:fs').Dirent[];
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    // Check excludes
    if (isExcluded(relPath, entry.name, _exclude)) continue;

    if (entry.isDirectory()) {
      await walkDir(baseDir, fullPath, results, _include, _exclude, depth + 1, maxDepth);
    } else if (entry.isFile() && entry.name.endsWith('.vue')) {
      results.push(fullPath);
    }
  }
}

function isExcluded(relPath: string, name: string, excludePatterns: string[]): boolean {
  for (const pattern of excludePatterns) {
    // Simple pattern matching for common cases
    if (pattern === '**/node_modules/**' && relPath.includes('node_modules')) return true;
    if (pattern === '**/dist/**' && relPath.includes('dist/')) return true;
    if (pattern === '**/build/**' && relPath.includes('build/')) return true;
    if (pattern === '**/.nuxt/**' && relPath.includes('.nuxt')) return true;
    if (pattern === '**/.output/**' && relPath.includes('.output')) return true;
    if (pattern === '**/coverage/**' && relPath.includes('coverage/')) return true;
    if (pattern === '**/__tests__/**' && relPath.includes('__tests__/')) return true;
    if (pattern === '**/*.test.vue' && name.endsWith('.test.vue')) return true;
    if (pattern === '**/*.spec.vue' && name.endsWith('.spec.vue')) return true;
  }
  return false;
}
