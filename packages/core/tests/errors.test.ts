import { describe, it, expect } from 'vitest';
import { UicError } from '../src/index.js';
import type { UicErrorCode } from '../src/index.js';

describe('UicError', () => {
  it('constructs with code and message', () => {
    const err = new UicError('MANIFEST_NOT_FOUND', {
      message: 'Manifest file not found at ./uic-manifest.json',
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(UicError);
    expect(err.name).toBe('UicError');
    expect(err.code).toBe('MANIFEST_NOT_FOUND');
    expect(err.message).toBe('Manifest file not found at ./uic-manifest.json');
    expect(err.context).toEqual({});
  });

  it('includes context when provided', () => {
    const err = new UicError('FILE_READ_ERROR', {
      message: 'Cannot read file',
      context: { filePath: 'src/App.tsx', errno: -2 },
    });

    expect(err.context).toEqual({ filePath: 'src/App.tsx', errno: -2 });
  });

  it('chains cause when provided', () => {
    const cause = new Error('ENOENT: no such file');
    const err = new UicError('FILE_READ_ERROR', {
      message: 'Cannot read file',
      cause,
    });

    expect(err.cause).toBe(cause);
  });

  it('has no cause when not provided', () => {
    const err = new UicError('UNKNOWN', { message: 'Something went wrong' });
    expect(err.cause).toBeUndefined();
  });

  it('supports all error codes', () => {
    const codes: UicErrorCode[] = [
      'MANIFEST_NOT_FOUND',
      'MANIFEST_INVALID',
      'MANIFEST_VERSION_UNSUPPORTED',
      'DUPLICATE_AGENT_ID',
      'PARSER_NOT_FOUND',
      'PARSER_DUPLICATE',
      'SCAN_FAILED',
      'FILE_READ_ERROR',
      'FILE_WRITE_ERROR',
      'ANNOTATION_FAILED',
      'NAMING_FAILED',
      'UNKNOWN',
    ];

    for (const code of codes) {
      const err = new UicError(code, { message: `Error: ${code}` });
      expect(err.code).toBe(code);
    }
  });

  it('serializes to string with code and message', () => {
    const err = new UicError('SCAN_FAILED', {
      message: 'Scan failed after timeout',
    });

    const str = String(err);
    expect(str).toContain('UicError');
    expect(str).toContain('Scan failed after timeout');
  });
});
