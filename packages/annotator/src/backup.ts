/**
 * Backup management for safe file modification.
 *
 * Creates backups of files before annotation, supports restore and cleanup.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/** Options for creating a backup. */
export interface BackupOptions {
  backupDir?: string; // default: '.uic-backup'
}

/** Result of a backup operation. */
export interface BackupResult {
  backupDir: string;
  files: string[]; // absolute paths of backed-up files (original locations)
}

const DEFAULT_BACKUP_DIR = '.uic-backup';

/**
 * Create backups of the given files.
 *
 * Copies each file to `<backupDir>/<relative-path>`, preserving directory
 * structure relative to the common parent of all file paths.
 */
export async function createBackup(
  filePaths: string[],
  options?: BackupOptions,
): Promise<BackupResult> {
  const backupDir = path.resolve(options?.backupDir ?? DEFAULT_BACKUP_DIR);

  // Ensure backup directory exists
  await fs.mkdir(backupDir, { recursive: true });

  const absolutePaths = filePaths.map((p) => path.resolve(p));

  // Find common parent directory
  const commonParent = findCommonParent(absolutePaths);

  // Copy each file
  for (const absPath of absolutePaths) {
    const relativePath = path.relative(commonParent, absPath);
    const destPath = path.join(backupDir, relativePath);
    const destDir = path.dirname(destPath);

    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(absPath, destPath);
  }

  return {
    backupDir,
    files: absolutePaths,
  };
}

/**
 * Restore files from a backup.
 *
 * Copies backed-up files back to their original locations.
 */
export async function restoreBackup(backupResult: BackupResult): Promise<void> {
  const commonParent = findCommonParent(backupResult.files);

  for (const originalPath of backupResult.files) {
    const relativePath = path.relative(commonParent, originalPath);
    const backupPath = path.join(backupResult.backupDir, relativePath);

    const destDir = path.dirname(originalPath);
    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(backupPath, originalPath);
  }
}

/**
 * Clean up a backup by removing the backup directory.
 */
export async function cleanupBackup(
  backupResult: BackupResult,
): Promise<void> {
  await fs.rm(backupResult.backupDir, { recursive: true, force: true });
}

/**
 * Find the longest common parent directory of a set of absolute paths.
 */
function findCommonParent(paths: string[]): string {
  if (paths.length === 0) {
    return process.cwd();
  }
  if (paths.length === 1) {
    return path.dirname(paths[0]!);
  }

  const segments = paths.map((p) => p.split(path.sep));
  const first = segments[0]!;
  let commonLength = 0;

  for (let i = 0; i < first.length; i++) {
    const segment = first[i];
    const allMatch = segments.every((s) => s[i] === segment);
    if (allMatch) {
      commonLength = i + 1;
    } else {
      break;
    }
  }

  return segments[0]!.slice(0, commonLength).join(path.sep) || path.sep;
}
