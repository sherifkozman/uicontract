/**
 * CLI command exports.
 */
export { scanCommand, parseScanArgs, generateTempId, SCAN_HELP } from './scan.js';
export type { ScanArgs, ScanArgsError } from './scan.js';

export { findCommand, parseFindArgs, elementMatchesQuery, scoreElement, FIND_HELP } from './find.js';
export type { FindArgs, FindArgsError, ScoredElement } from './find.js';

export { describeCommand, parseDescribeArgs, DESCRIBE_HELP } from './describe.js';
export type { DescribeArgs, DescribeArgsError } from './describe.js';

export { listCommand, parseListArgs, LIST_HELP } from './list.js';
export type { ListArgs, ListArgsError } from './list.js';

export { diffCommand, parseDiffArgs, diffManifests, DIFF_HELP } from './diff.js';
export type { DiffArgs, DiffArgsError, DiffChange, DiffCategory, DiffResult, DiffSummary } from './diff.js';

export { nameCommand, parseNameArgs, NAME_HELP } from './name.js';
export type { NameArgs, NameArgsError } from './name.js';

export { annotateCommand, parseAnnotateArgs, ANNOTATE_HELP } from './annotate.js';
export type { AnnotateArgs, AnnotateArgsError } from './annotate.js';
