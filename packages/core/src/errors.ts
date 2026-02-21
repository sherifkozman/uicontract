/**
 * Error types for the UIC system.
 */

/** All known error codes */
export type UicErrorCode =
  | 'MANIFEST_NOT_FOUND'
  | 'MANIFEST_INVALID'
  | 'MANIFEST_VERSION_UNSUPPORTED'
  | 'DUPLICATE_AGENT_ID'
  | 'PARSER_NOT_FOUND'
  | 'PARSER_DUPLICATE'
  | 'SCAN_FAILED'
  | 'FILE_READ_ERROR'
  | 'FILE_WRITE_ERROR'
  | 'ANNOTATION_FAILED'
  | 'NAMING_FAILED'
  | 'UNKNOWN';

/** Options for constructing a UicError */
interface UicErrorOptions {
  message: string;
  context?: Record<string, unknown>;
  cause?: Error;
}

/** Base error class with structured code and context */
export class UicError extends Error {
  readonly code: UicErrorCode;
  readonly context: Record<string, unknown>;

  constructor(code: UicErrorCode, options: UicErrorOptions) {
    super(options.message);
    this.name = 'UicError';
    this.code = code;
    this.context = options.context ?? {};
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}
