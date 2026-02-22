/**
 * File discovery for React/JSX projects.
 * Finds .tsx/.jsx/.ts/.js files respecting include/exclude patterns and maxDepth.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ParserOptions } from '@uicontract/core';

const DEFAULT_INCLUDE = ['**/*.tsx', '**/*.jsx'];
const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/build/**',
  '**/.cache/**',
  '**/coverage/**',
];
const DEFAULT_MAX_DEPTH = 20;

/**
 * Converts a glob pattern segment to a RegExp source string.
 * Supports `**`, `*`, `?`, and literal characters.
 */
function globToRegex(glob: string): RegExp {
  let pattern = '^';
  let i = 0;
  while (i < glob.length) {
    const char = glob[i];
    if (char === '*' && glob[i + 1] === '*') {
      // ** matches any number of path segments including none
      pattern += '(?:.+/)?';
      i += 2;
      // skip trailing slash if present
      if (glob[i] === '/') i++;
    } else if (char === '*') {
      // * matches any character except /
      pattern += '[^/]*';
      i++;
    } else if (char === '?') {
      pattern += '[^/]';
      i++;
    } else if ('.+^${}()|[]\\'.includes(char ?? '')) {
      pattern += '\\' + char;
      i++;
    } else {
      pattern += char;
      i++;
    }
  }
  pattern += '$';
  return new RegExp(pattern);
}

function matchesAny(relPath: string, patterns: string[]): boolean {
  const normalized = relPath.replace(/\\/g, '/');
  return patterns.some((glob) => {
    const regex = globToRegex(glob);
    return regex.test(normalized);
  });
}

/**
 * Recursively walks a directory and collects files that match include patterns
 * and don't match exclude patterns, up to maxDepth levels deep.
 */
async function walkDir(
  dir: string,
  rootDir: string,
  include: string[],
  exclude: string[],
  maxDepth: number,
  currentDepth: number,
  results: string[],
): Promise<void> {
  if (currentDepth > maxDepth) return;

  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true }) as import('node:fs').Dirent[];
  } catch {
    // Unreadable directory - skip silently
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name as string);
    const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

    if (matchesAny(relPath, exclude)) continue;

    if (entry.isDirectory()) {
      await walkDir(fullPath, rootDir, include, exclude, maxDepth, currentDepth + 1, results);
    } else if (entry.isFile() && matchesAny(relPath, include)) {
      results.push(fullPath);
    }
  }
}

/**
 * Discovers React/JSX source files in the given directory.
 * Returns absolute paths.
 */
export async function discoverFiles(dir: string, options: ParserOptions): Promise<string[]> {
  const include = options.include ?? DEFAULT_INCLUDE;
  const exclude = options.exclude ?? DEFAULT_EXCLUDE;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  const results: string[] = [];
  await walkDir(dir, dir, include, exclude, maxDepth, 0, results);
  return results;
}
