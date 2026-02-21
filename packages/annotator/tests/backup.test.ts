import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createBackup, restoreBackup, cleanupBackup } from '../src/backup.js';

describe('backup', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'uic-backup-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('createBackup', () => {
    it('creates a backup directory', async () => {
      const filePath = path.join(tmpDir, 'test.tsx');
      await fs.writeFile(filePath, '<button>Click</button>');

      const backupDir = path.join(tmpDir, '.uic-backup');
      const result = await createBackup([filePath], { backupDir });

      expect(result.backupDir).toBe(backupDir);

      const stat = await fs.stat(backupDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('copies files correctly', async () => {
      const content = '<button>Click</button>';
      const filePath = path.join(tmpDir, 'test.tsx');
      await fs.writeFile(filePath, content);

      const backupDir = path.join(tmpDir, '.uic-backup');
      const result = await createBackup([filePath], { backupDir });

      // The backup should contain the file
      expect(result.files).toContain(filePath);

      // Read backed-up content
      const entries = await fs.readdir(backupDir, { recursive: true });
      const backedUpFiles = [];
      for (const entry of entries) {
        const entryPath = path.join(backupDir, entry);
        const stat = await fs.stat(entryPath);
        if (stat.isFile()) {
          backedUpFiles.push(entryPath);
        }
      }

      expect(backedUpFiles.length).toBe(1);
      const backedUpContent = await fs.readFile(backedUpFiles[0]!, 'utf-8');
      expect(backedUpContent).toBe(content);
    });

    it('handles nested paths', async () => {
      const nestedDir = path.join(tmpDir, 'src', 'components');
      await fs.mkdir(nestedDir, { recursive: true });

      const filePath = path.join(nestedDir, 'Button.tsx');
      await fs.writeFile(filePath, '<button>Click</button>');

      const backupDir = path.join(tmpDir, '.uic-backup');
      const result = await createBackup([filePath], { backupDir });

      expect(result.files).toContain(filePath);
      expect(result.files.length).toBe(1);
    });

    it('handles multiple files', async () => {
      const file1 = path.join(tmpDir, 'a.tsx');
      const file2 = path.join(tmpDir, 'b.tsx');
      await fs.writeFile(file1, 'content a');
      await fs.writeFile(file2, 'content b');

      const backupDir = path.join(tmpDir, '.uic-backup');
      const result = await createBackup([file1, file2], { backupDir });

      expect(result.files.length).toBe(2);
    });
  });

  describe('restoreBackup', () => {
    it('restores files from backup', async () => {
      const originalContent = '<button>Original</button>';
      const filePath = path.join(tmpDir, 'test.tsx');
      await fs.writeFile(filePath, originalContent);

      const backupDir = path.join(tmpDir, '.uic-backup');
      const backupResult = await createBackup([filePath], { backupDir });

      // Modify the original file
      await fs.writeFile(filePath, '<button data-agent-id="test">Modified</button>');

      // Restore
      await restoreBackup(backupResult);

      const restored = await fs.readFile(filePath, 'utf-8');
      expect(restored).toBe(originalContent);
    });
  });

  describe('cleanupBackup', () => {
    it('removes the backup directory', async () => {
      const filePath = path.join(tmpDir, 'test.tsx');
      await fs.writeFile(filePath, '<button>Click</button>');

      const backupDir = path.join(tmpDir, '.uic-backup');
      const backupResult = await createBackup([filePath], { backupDir });

      // Verify backup exists
      const existsBefore = await fs.stat(backupDir).then(
        () => true,
        () => false,
      );
      expect(existsBefore).toBe(true);

      // Cleanup
      await cleanupBackup(backupResult);

      // Verify backup is gone
      const existsAfter = await fs.stat(backupDir).then(
        () => true,
        () => false,
      );
      expect(existsAfter).toBe(false);
    });
  });
});
