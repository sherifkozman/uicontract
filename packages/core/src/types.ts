/**
 * Shared types for the UIC (UI Contracts) system.
 */

/** Element types discovered by parsers */
export type InteractiveElementType =
  | 'button'
  | 'input'
  | 'select'
  | 'textarea'
  | 'a'
  | 'form'
  | 'div'
  | 'span'
  | 'img'
  | 'label';

/** React Server Component directive detected at file level */
export type RSCDirective = 'use client' | 'use server';

/** Raw element discovered by parser (before naming) */
export interface RawElement {
  type: InteractiveElementType;
  filePath: string;
  line: number;
  column: number;
  componentName: string | null;
  route: string | null;
  label: string | null;
  handler: string | null;
  attributes: Record<string, string>;
  conditional: boolean;
  dynamic: boolean;
  directive: RSCDirective | null;
  /** Original JSX tag name in source code. Non-null for componentMap elements (e.g., "Button"). */
  sourceTagName: string | null;
}

/** Named element (after naming engine assigns an agentId) */
export interface NamedElement extends RawElement {
  agentId: string;
}

/** Manifest element (serialized to JSON) - identical to NamedElement by design. */
export type ManifestElement = NamedElement;

/** Full manifest structure */
export interface Manifest {
  schemaVersion: string;
  generatedAt: string;
  generator: {
    name: string;
    version: string;
  };
  metadata: {
    framework: string;
    projectRoot: string;
    filesScanned: number;
    elementsDiscovered: number;
    warnings: number;
  };
  elements: ManifestElement[];
}

/** Options for parser discovery */
export interface ParserOptions {
  include?: string[];
  exclude?: string[];
  maxDepth?: number;
  /** Map custom component names to native element types (e.g., { "Button": "button" }). */
  componentMap?: Record<string, InteractiveElementType>;
}

/** Warning emitted during parsing */
export interface ParserWarning {
  code: string;
  message: string;
  filePath: string;
  line?: number;
}

/** Result of a parser's discover() call */
export interface DiscoveryResult {
  elements: RawElement[];
  warnings: ParserWarning[];
  metadata: {
    filesScanned: number;
    filesSkipped: number;
    scanDurationMs: number;
  };
}

/** Interface that framework parsers must implement */
export interface Parser {
  readonly framework: string;
  detect(dir: string): Promise<boolean>;
  discover(dir: string, options: ParserOptions): Promise<DiscoveryResult>;
}
