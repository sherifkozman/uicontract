/**
 * CLI command exports.
 */
export { scanCommand, parseScanArgs, generateTempId, SCAN_HELP } from './scan.js';
export type { ScanArgs, ScanArgsError } from './scan.js';

export { findCommand, parseFindArgs, elementMatchesQuery, FIND_HELP } from './find.js';
export type { FindArgs, FindArgsError } from './find.js';

export { describeCommand, parseDescribeArgs, DESCRIBE_HELP } from './describe.js';
export type { DescribeArgs, DescribeArgsError } from './describe.js';

export { listCommand, parseListArgs, LIST_HELP } from './list.js';
export type { ListArgs, ListArgsError } from './list.js';

export { diffCommand, parseDiffArgs, diffManifests, DIFF_HELP } from './diff.js';
export type { DiffArgs, DiffArgsError, DiffChange, DiffCategory, DiffResult, DiffSummary } from './diff.js';
