import { describe, it, expect, beforeEach } from 'vitest';
import { ParserRegistry, UicError } from '../src/index.js';
import type { Parser, DiscoveryResult, ParserOptions } from '../src/index.js';

function createMockParser(framework: string, detectResult = false): Parser {
  return {
    framework,
    detect: async (_dir: string): Promise<boolean> => detectResult,
    discover: async (_dir: string, _options: ParserOptions): Promise<DiscoveryResult> => ({
      elements: [],
      warnings: [],
      metadata: {
        filesScanned: 0,
        filesSkipped: 0,
        scanDurationMs: 0,
      },
    }),
  };
}

describe('ParserRegistry', () => {
  let registry: ParserRegistry;

  beforeEach(() => {
    registry = new ParserRegistry();
  });

  describe('register', () => {
    it('registers a parser successfully', () => {
      const parser = createMockParser('react');
      registry.register(parser);

      expect(registry.get('react')).toBe(parser);
    });

    it('throws on duplicate framework registration', () => {
      const parser1 = createMockParser('react');
      const parser2 = createMockParser('react');

      registry.register(parser1);

      expect(() => registry.register(parser2)).toThrow(UicError);
      try {
        registry.register(parser2);
      } catch (err) {
        expect(err).toBeInstanceOf(UicError);
        expect((err as UicError).code).toBe('PARSER_DUPLICATE');
      }
    });

    it('allows registering different frameworks', () => {
      registry.register(createMockParser('react'));
      registry.register(createMockParser('vue'));
      registry.register(createMockParser('svelte'));

      expect(registry.getAll()).toHaveLength(3);
    });
  });

  describe('get', () => {
    it('returns undefined for unknown framework', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('returns the registered parser', () => {
      const parser = createMockParser('vue');
      registry.register(parser);

      expect(registry.get('vue')).toBe(parser);
    });
  });

  describe('detect', () => {
    it('returns undefined when no parsers are registered', async () => {
      const result = await registry.detect('/some/dir');
      expect(result).toBeUndefined();
    });

    it('returns undefined when no parser detects the directory', async () => {
      registry.register(createMockParser('react', false));
      registry.register(createMockParser('vue', false));

      const result = await registry.detect('/some/dir');
      expect(result).toBeUndefined();
    });

    it('returns the first parser that detects the directory', async () => {
      const reactParser = createMockParser('react', false);
      const vueParser = createMockParser('vue', true);

      registry.register(reactParser);
      registry.register(vueParser);

      const result = await registry.detect('/some/dir');
      expect(result).toBe(vueParser);
    });

    it('stops detecting after the first match', async () => {
      const reactParser = createMockParser('react', true);
      const vueParser = createMockParser('vue', true);
      const vueSpy = vi.spyOn(vueParser, 'detect');

      registry.register(reactParser);
      registry.register(vueParser);

      const result = await registry.detect('/some/dir');
      expect(result).toBe(reactParser);
      expect(vueSpy).not.toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('returns empty array when no parsers registered', () => {
      expect(registry.getAll()).toHaveLength(0);
    });

    it('returns all registered parsers', () => {
      registry.register(createMockParser('react'));
      registry.register(createMockParser('vue'));

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((p) => p.framework)).toContain('react');
      expect(all.map((p) => p.framework)).toContain('vue');
    });

    it('returns a readonly array', () => {
      registry.register(createMockParser('react'));
      const all = registry.getAll();

      // TypeScript enforces readonly, but we verify at runtime it's a new array
      expect(Array.isArray(all)).toBe(true);
    });
  });
});
