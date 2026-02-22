/**
 * @uicontract/core — foundation types and utilities for UIC.
 */
export const VERSION = '0.0.0';

// Types
export type {
  InteractiveElementType,
  RawElement,
  NamedElement,
  ManifestElement,
  Manifest,
  ParserOptions,
  ParserWarning,
  DiscoveryResult,
  Parser,
} from './types.js';

// Errors
export { UicError } from './errors.js';
export type { UicErrorCode } from './errors.js';

// Logger
export { createLogger, LOG_LEVELS } from './logger.js';
export type { LogLevel, Logger } from './logger.js';

// Schema / Manifest
export {
  validateManifest,
  buildManifest,
  serializeManifest,
  deserializeManifest,
} from './schema/manifest.js';
export type { ValidationError, ValidationResult } from './schema/manifest.js';

// Parser Registry
export { ParserRegistry, parserRegistry } from './parser-registry.js';

// Config
export { loadConfig, validateConfig, DEFAULT_CONFIG } from './config.js';
export type { UicConfig } from './config.js';

// Plugin Loader
export { loadPlugins } from './plugin-loader.js';
export type { PluginLoadResult } from './plugin-loader.js';
