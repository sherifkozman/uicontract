/**
 * Registry for framework parsers.
 * Parsers register themselves; the CLI uses the registry to detect and discover.
 */

import type { Parser } from './types.js';
import { UicError } from './errors.js';

/** Registry that holds framework parsers and supports detection. */
export class ParserRegistry {
  private readonly parsers = new Map<string, Parser>();

  /** Register a parser. Throws if a parser for the same framework is already registered. */
  register(parser: Parser): void {
    if (this.parsers.has(parser.framework)) {
      throw new UicError('PARSER_DUPLICATE', {
        message: `A parser for framework "${parser.framework}" is already registered. Each framework can only have one parser.`,
        context: { framework: parser.framework },
      });
    }
    this.parsers.set(parser.framework, parser);
  }

  /** Get a parser by framework name. */
  get(framework: string): Parser | undefined {
    return this.parsers.get(framework);
  }

  /** Try each registered parser's detect() and return the first match. */
  async detect(dir: string): Promise<Parser | undefined> {
    for (const parser of this.parsers.values()) {
      const detected = await parser.detect(dir);
      if (detected) {
        return parser;
      }
    }
    return undefined;
  }

  /** Get all registered parsers. */
  getAll(): readonly Parser[] {
    return Array.from(this.parsers.values());
  }
}

/** Singleton parser registry instance. */
export const parserRegistry = new ParserRegistry();
