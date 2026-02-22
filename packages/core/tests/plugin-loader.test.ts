import { describe, it, expect, vi } from 'vitest';
import { loadPlugins } from '../src/plugin-loader.js';
import { ParserRegistry } from '../src/parser-registry.js';
import type { Logger } from '../src/logger.js';
import type { Parser } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createMockParser(framework: string): Parser {
  return {
    framework,
    detect: vi.fn().mockResolvedValue(false),
    discover: vi.fn().mockResolvedValue({
      elements: [],
      warnings: [],
      metadata: { filesScanned: 0, filesSkipped: 0, scanDurationMs: 0 },
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('loadPlugins', () => {
  it('returns empty results for empty plugin list', async () => {
    const registry = new ParserRegistry();
    const logger = createMockLogger();
    const result = await loadPlugins([], registry, logger);

    expect(result.loaded).toEqual([]);
    expect(result.failed).toEqual([]);
  });

  it('warns and adds to failed when module is not found', async () => {
    const registry = new ParserRegistry();
    const logger = createMockLogger();
    const result = await loadPlugins(['nonexistent-uic-plugin-xyz'], registry, logger);

    expect(result.loaded).toEqual([]);
    expect(result.failed).toEqual(['nonexistent-uic-plugin-xyz']);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load plugin "nonexistent-uic-plugin-xyz"'),
    );
  });

  it('warns when module does not export a valid Parser', async () => {
    // Mock a module that exports an object with all required keys but wrong types.
    // vi.doMock requires exported keys to exist, so we provide them with wrong types
    // to trigger our isParser validation rather than vitest internals.
    vi.doMock('fake-no-parser', () => ({
      default: { framework: 123, detect: 'not-fn', discover: 'not-fn' },
    }));

    const registry = new ParserRegistry();
    const logger = createMockLogger();
    const result = await loadPlugins(['fake-no-parser'], registry, logger);

    expect(result.loaded).toEqual([]);
    expect(result.failed).toEqual(['fake-no-parser']);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('does not export a valid Parser'),
    );

    vi.doUnmock('fake-no-parser');
  });

  it('loads a module with a default export Parser', async () => {
    const mockParser = createMockParser('svelte');
    vi.doMock('uic-parser-svelte-default', () => ({
      default: mockParser,
    }));

    const registry = new ParserRegistry();
    const logger = createMockLogger();
    const result = await loadPlugins(['uic-parser-svelte-default'], registry, logger);

    expect(result.loaded).toEqual(['uic-parser-svelte-default']);
    expect(result.failed).toEqual([]);
    expect(registry.get('svelte')).toBe(mockParser);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Loaded plugin "uic-parser-svelte-default"'),
    );

    vi.doUnmock('uic-parser-svelte-default');
  });

  it('loads a module with a named "parser" export', async () => {
    const mockParser = createMockParser('angular');
    vi.doMock('uic-parser-angular-named', () => ({
      parser: mockParser,
    }));

    const registry = new ParserRegistry();
    const logger = createMockLogger();
    const result = await loadPlugins(['uic-parser-angular-named'], registry, logger);

    expect(result.loaded).toEqual(['uic-parser-angular-named']);
    expect(result.failed).toEqual([]);
    expect(registry.get('angular')).toBe(mockParser);

    vi.doUnmock('uic-parser-angular-named');
  });

  it('warns and fails on duplicate framework registration', async () => {
    const mockParser = createMockParser('react');
    vi.doMock('uic-parser-react-dup', () => ({
      default: mockParser,
    }));

    const registry = new ParserRegistry();
    // Pre-register react so the plugin is a duplicate
    registry.register(createMockParser('react'));

    const logger = createMockLogger();
    const result = await loadPlugins(['uic-parser-react-dup'], registry, logger);

    expect(result.loaded).toEqual([]);
    expect(result.failed).toEqual(['uic-parser-react-dup']);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('already registered'),
    );

    vi.doUnmock('uic-parser-react-dup');
  });

  it('handles multiple plugins with mix of success and failure', async () => {
    const goodParser = createMockParser('solid');
    vi.doMock('uic-parser-solid', () => ({ default: goodParser }));
    vi.doMock('uic-parser-bad', () => ({ default: { broken: true } }));

    const registry = new ParserRegistry();
    const logger = createMockLogger();
    const result = await loadPlugins(
      ['uic-parser-solid', 'uic-parser-bad', 'nonexistent-xyz'],
      registry,
      logger,
    );

    expect(result.loaded).toEqual(['uic-parser-solid']);
    expect(result.failed).toEqual(['uic-parser-bad', 'nonexistent-xyz']);

    vi.doUnmock('uic-parser-solid');
    vi.doUnmock('uic-parser-bad');
  });

  it('validates Parser requires framework as string', async () => {
    vi.doMock('uic-parser-no-framework', () => ({
      default: { detect: vi.fn(), discover: vi.fn() },
    }));

    const registry = new ParserRegistry();
    const logger = createMockLogger();
    const result = await loadPlugins(['uic-parser-no-framework'], registry, logger);

    expect(result.failed).toEqual(['uic-parser-no-framework']);

    vi.doUnmock('uic-parser-no-framework');
  });

  it('validates Parser requires detect as function', async () => {
    vi.doMock('uic-parser-no-detect', () => ({
      default: { framework: 'test', detect: 'not-a-function', discover: vi.fn() },
    }));

    const registry = new ParserRegistry();
    const logger = createMockLogger();
    const result = await loadPlugins(['uic-parser-no-detect'], registry, logger);

    expect(result.failed).toEqual(['uic-parser-no-detect']);

    vi.doUnmock('uic-parser-no-detect');
  });

  it('validates Parser requires discover as function', async () => {
    vi.doMock('uic-parser-no-discover', () => ({
      default: { framework: 'test', detect: vi.fn(), discover: 'not-a-function' },
    }));

    const registry = new ParserRegistry();
    const logger = createMockLogger();
    const result = await loadPlugins(['uic-parser-no-discover'], registry, logger);

    expect(result.failed).toEqual(['uic-parser-no-discover']);

    vi.doUnmock('uic-parser-no-discover');
  });
});
