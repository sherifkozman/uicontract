import { describe, it, expect } from 'vitest';
import { generatePatch, formatUnifiedDiff } from '../src/patch-generator.js';

describe('generatePatch', () => {
  it('generates a FilePatch with the correct structure', () => {
    const original = '<button>Click</button>';
    const modified = '<button data-agent-id="test.btn">Click</button>';

    const patch = generatePatch('src/App.tsx', original, modified);

    expect(patch.filePath).toBe('src/App.tsx');
    expect(patch.original).toBe(original);
    expect(patch.modified).toBe(modified);
    expect(patch.diff).toContain('---');
    expect(patch.diff).toContain('+++');
  });

  it('returns empty diff when files are identical', () => {
    const source = '<button>Click</button>';

    const patch = generatePatch('src/App.tsx', source, source);

    expect(patch.diff).toBe('');
  });
});

describe('formatUnifiedDiff', () => {
  it('produces valid unified diff format', () => {
    const original = ['<button>Click</button>'];
    const modified = ['<button data-agent-id="test.btn">Click</button>'];

    const diff = formatUnifiedDiff('src/App.tsx', original, modified);

    expect(diff).toContain('--- a/src/App.tsx');
    expect(diff).toContain('+++ b/src/App.tsx');
    expect(diff).toContain('@@');
  });

  it('includes --- and +++ headers', () => {
    const original = ['line 1', 'line 2'];
    const modified = ['line 1', 'line 2 modified'];

    const diff = formatUnifiedDiff('test.ts', original, modified);

    const lines = diff.split('\n');
    expect(lines[0]).toBe('--- a/test.ts');
    expect(lines[1]).toBe('+++ b/test.ts');
  });

  it('includes @@ range headers', () => {
    const original = ['line 1', 'line 2'];
    const modified = ['line 1', 'line 2 modified'];

    const diff = formatUnifiedDiff('test.ts', original, modified);

    expect(diff).toMatch(/@@ -\d+,\d+ \+\d+,\d+ @@/);
  });

  it('shows changed lines with +/- prefixes', () => {
    const original = ['hello'];
    const modified = ['world'];

    const diff = formatUnifiedDiff('test.ts', original, modified);

    expect(diff).toContain('-hello');
    expect(diff).toContain('+world');
  });

  it('includes context lines around changes', () => {
    const original = [
      'line 1',
      'line 2',
      'line 3',
      'line 4 original',
      'line 5',
      'line 6',
      'line 7',
    ];
    const modified = [
      'line 1',
      'line 2',
      'line 3',
      'line 4 modified',
      'line 5',
      'line 6',
      'line 7',
    ];

    const diff = formatUnifiedDiff('test.ts', original, modified);

    // Should include context lines before and after the change
    expect(diff).toContain(' line 2');
    expect(diff).toContain(' line 3');
    expect(diff).toContain('-line 4 original');
    expect(diff).toContain('+line 4 modified');
    expect(diff).toContain(' line 5');
    expect(diff).toContain(' line 6');
  });

  it('returns empty string when files are identical', () => {
    const lines = ['line 1', 'line 2', 'line 3'];

    const diff = formatUnifiedDiff('test.ts', lines, lines);

    expect(diff).toBe('');
  });

  it('handles additions at end of file', () => {
    const original = ['line 1'];
    const modified = ['line 1', 'line 2'];

    const diff = formatUnifiedDiff('test.ts', original, modified);

    expect(diff).toContain('+line 2');
  });

  it('handles removals', () => {
    const original = ['line 1', 'line 2'];
    const modified = ['line 1'];

    const diff = formatUnifiedDiff('test.ts', original, modified);

    expect(diff).toContain('-line 2');
  });

  it('handles multiple changes in the same file', () => {
    const original = [
      'line 1',
      'line 2 original',
      'line 3',
      'line 4',
      'line 5',
      'line 6',
      'line 7',
      'line 8',
      'line 9',
      'line 10 original',
      'line 11',
    ];
    const modified = [
      'line 1',
      'line 2 modified',
      'line 3',
      'line 4',
      'line 5',
      'line 6',
      'line 7',
      'line 8',
      'line 9',
      'line 10 modified',
      'line 11',
    ];

    const diff = formatUnifiedDiff('test.ts', original, modified);

    expect(diff).toContain('-line 2 original');
    expect(diff).toContain('+line 2 modified');
    expect(diff).toContain('-line 10 original');
    expect(diff).toContain('+line 10 modified');
  });
});
