/**
 * Unified diff patch generation.
 *
 * Produces standard unified diff output for annotated files,
 * with `---`/`+++` headers, `@@` hunk headers, and 3 lines of context.
 */

/** A patch for a single file. */
export interface FilePatch {
  filePath: string;
  original: string;
  modified: string;
  diff: string; // unified diff format
}

const CONTEXT_LINES = 3;

/**
 * Generate a FilePatch from original and modified source strings.
 * Returns a patch with an empty diff string if the files are identical.
 */
export function generatePatch(
  filePath: string,
  original: string,
  modified: string,
): FilePatch {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');

  const diff = formatUnifiedDiff(filePath, originalLines, modifiedLines);

  return {
    filePath,
    original,
    modified,
    diff,
  };
}

/** Represents a single changed line and its index in each version. */
interface Change {
  originalIdx: number; // -1 if added
  modifiedIdx: number; // -1 if removed
  type: 'add' | 'remove' | 'equal';
}

/**
 * Produce a simple line-by-line diff by finding changed lines.
 * This is not a full LCS algorithm -- it identifies contiguous groups
 * of changed lines by comparing original and modified line-by-line.
 */
function computeChanges(
  originalLines: string[],
  modifiedLines: string[],
): Change[] {
  const changes: Change[] = [];
  let oi = 0;
  let mi = 0;

  while (oi < originalLines.length && mi < modifiedLines.length) {
    if (originalLines[oi] === modifiedLines[mi]) {
      changes.push({ originalIdx: oi, modifiedIdx: mi, type: 'equal' });
      oi++;
      mi++;
    } else {
      // Try to find a sync point ahead
      const syncResult = findSync(originalLines, modifiedLines, oi, mi);

      if (syncResult) {
        // Emit removals from original up to sync
        for (let i = oi; i < syncResult.oi; i++) {
          changes.push({ originalIdx: i, modifiedIdx: -1, type: 'remove' });
        }
        // Emit additions from modified up to sync
        for (let i = mi; i < syncResult.mi; i++) {
          changes.push({ originalIdx: -1, modifiedIdx: i, type: 'add' });
        }
        oi = syncResult.oi;
        mi = syncResult.mi;
      } else {
        // No sync found -- rest of both are different
        while (oi < originalLines.length) {
          changes.push({ originalIdx: oi, modifiedIdx: -1, type: 'remove' });
          oi++;
        }
        while (mi < modifiedLines.length) {
          changes.push({ originalIdx: -1, modifiedIdx: mi, type: 'add' });
          mi++;
        }
      }
    }
  }

  // Remaining lines in original are removals
  while (oi < originalLines.length) {
    changes.push({ originalIdx: oi, modifiedIdx: -1, type: 'remove' });
    oi++;
  }

  // Remaining lines in modified are additions
  while (mi < modifiedLines.length) {
    changes.push({ originalIdx: -1, modifiedIdx: mi, type: 'add' });
    mi++;
  }

  return changes;
}

/**
 * Look ahead in both arrays to find a matching line that can serve as a
 * sync point. Searches within a reasonable window to keep it fast.
 */
function findSync(
  originalLines: string[],
  modifiedLines: string[],
  oi: number,
  mi: number,
): { oi: number; mi: number } | null {
  const maxLookahead = 20;
  const oEnd = Math.min(originalLines.length, oi + maxLookahead);
  const mEnd = Math.min(modifiedLines.length, mi + maxLookahead);

  // Prefer the closest sync point
  for (let dist = 1; dist < maxLookahead; dist++) {
    // Check if original[oi+dist] matches modified[mi+dist]
    // (both sides advanced equally -- common for single-line changes)
    if (oi + dist < oEnd && mi + dist < mEnd) {
      if (originalLines[oi + dist] === modifiedLines[mi + dist]) {
        return { oi: oi + dist, mi: mi + dist };
      }
    }

    // Check if original[oi] matches modified[mi+dist] (addition)
    if (mi + dist < mEnd && originalLines[oi] === modifiedLines[mi + dist]) {
      return { oi, mi: mi + dist };
    }

    // Check if original[oi+dist] matches modified[mi] (removal)
    if (oi + dist < oEnd && originalLines[oi + dist] === modifiedLines[mi]) {
      return { oi: oi + dist, mi };
    }
  }

  return null;
}

/** A hunk in unified diff format. */
interface Hunk {
  originalStart: number; // 1-based
  originalCount: number;
  modifiedStart: number; // 1-based
  modifiedCount: number;
  lines: string[];
}

/**
 * Group changes into hunks with context lines, then format as unified diff.
 */
export function formatUnifiedDiff(
  filePath: string,
  originalLines: string[],
  modifiedLines: string[],
): string {
  const changes = computeChanges(originalLines, modifiedLines);

  // Find indices of changed lines
  const changedIndices: number[] = [];
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i]!;
    if (change.type !== 'equal') {
      changedIndices.push(i);
    }
  }

  if (changedIndices.length === 0) {
    return '';
  }

  // Group changed indices into hunk ranges (with context)
  const hunkRanges: Array<{ start: number; end: number }> = [];
  let currentStart = changedIndices[0]!;
  let currentEnd = changedIndices[0]!;

  for (let i = 1; i < changedIndices.length; i++) {
    const idx = changedIndices[i]!;
    // If this change is within 2*CONTEXT_LINES of the previous, merge
    if (idx - currentEnd <= CONTEXT_LINES * 2) {
      currentEnd = idx;
    } else {
      hunkRanges.push({ start: currentStart, end: currentEnd });
      currentStart = idx;
      currentEnd = idx;
    }
  }
  hunkRanges.push({ start: currentStart, end: currentEnd });

  // Build hunks
  const hunks: Hunk[] = [];
  for (const range of hunkRanges) {
    const contextStart = Math.max(0, range.start - CONTEXT_LINES);
    const contextEnd = Math.min(changes.length - 1, range.end + CONTEXT_LINES);

    const hunkLines: string[] = [];
    let origCount = 0;
    let modCount = 0;
    let origStart = -1;
    let modStart = -1;

    for (let i = contextStart; i <= contextEnd; i++) {
      const change = changes[i]!;
      switch (change.type) {
        case 'equal':
          hunkLines.push(` ${originalLines[change.originalIdx]!}`);
          origCount++;
          modCount++;
          if (origStart === -1) origStart = change.originalIdx + 1;
          if (modStart === -1) modStart = change.modifiedIdx + 1;
          break;
        case 'remove':
          hunkLines.push(`-${originalLines[change.originalIdx]!}`);
          origCount++;
          if (origStart === -1) origStart = change.originalIdx + 1;
          if (modStart === -1) {
            // Derive from context
            modStart = findModifiedStart(changes, i);
          }
          break;
        case 'add':
          hunkLines.push(`+${modifiedLines[change.modifiedIdx]!}`);
          modCount++;
          if (modStart === -1) modStart = change.modifiedIdx + 1;
          if (origStart === -1) {
            origStart = findOriginalStart(changes, i);
          }
          break;
      }
    }

    hunks.push({
      originalStart: origStart === -1 ? 1 : origStart,
      originalCount: origCount,
      modifiedStart: modStart === -1 ? 1 : modStart,
      modifiedCount: modCount,
      lines: hunkLines,
    });
  }

  // Format output
  const output: string[] = [];
  output.push(`--- a/${filePath}`);
  output.push(`+++ b/${filePath}`);

  for (const hunk of hunks) {
    output.push(
      `@@ -${hunk.originalStart},${hunk.originalCount} +${hunk.modifiedStart},${hunk.modifiedCount} @@`,
    );
    output.push(...hunk.lines);
  }

  return output.join('\n');
}

/**
 * Find the modified-side start line number for a hunk that begins with removals.
 */
function findModifiedStart(changes: Change[], fromIdx: number): number {
  // Look backward for the nearest equal or add change
  for (let i = fromIdx - 1; i >= 0; i--) {
    const c = changes[i]!;
    if (c.modifiedIdx >= 0) {
      return c.modifiedIdx + 2; // +1 for 1-based, +1 because it's the next line
    }
  }
  return 1;
}

/**
 * Find the original-side start line number for a hunk that begins with additions.
 */
function findOriginalStart(changes: Change[], fromIdx: number): number {
  // Look backward for the nearest equal or remove change
  for (let i = fromIdx - 1; i >= 0; i--) {
    const c = changes[i]!;
    if (c.originalIdx >= 0) {
      return c.originalIdx + 2;
    }
  }
  return 1;
}
