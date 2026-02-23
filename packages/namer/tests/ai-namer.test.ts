import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RawElement } from '@uicontract/core';
import {
  detectProvider,
  isWeakName,
  validateAiName,
  assignAiNames,
  assignAiName,
} from '../src/ai-namer.js';

const AGENT_ID_PATTERN = /^[a-z][a-z0-9.-]*$/;

function makeElement(overrides: Partial<RawElement> = {}): RawElement {
  return {
    type: 'button',
    filePath: 'src/Example.tsx',
    line: 10,
    column: 4,
    componentName: null,
    route: null,
    label: null,
    handler: null,
    attributes: {},
    conditional: false,
    dynamic: false,
    directive: null,
    sourceTagName: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// detectProvider
// ---------------------------------------------------------------------------

describe('detectProvider', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns openai when OPENAI_API_KEY is set', () => {
    process.env['OPENAI_API_KEY'] = 'sk-test-123';
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['GOOGLE_API_KEY'];
    delete process.env['GEMINI_API_KEY'];
    const result = detectProvider();
    expect(result).toEqual({ provider: 'openai', apiKey: 'sk-test-123' });
  });

  it('returns anthropic when ANTHROPIC_API_KEY is set', () => {
    delete process.env['OPENAI_API_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test';
    delete process.env['GOOGLE_API_KEY'];
    delete process.env['GEMINI_API_KEY'];
    const result = detectProvider();
    expect(result).toEqual({ provider: 'anthropic', apiKey: 'sk-ant-test' });
  });

  it('returns google when GOOGLE_API_KEY is set', () => {
    delete process.env['OPENAI_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    process.env['GOOGLE_API_KEY'] = 'goog-test';
    delete process.env['GEMINI_API_KEY'];
    const result = detectProvider();
    expect(result).toEqual({ provider: 'google', apiKey: 'goog-test' });
  });

  it('returns google when GEMINI_API_KEY is set', () => {
    delete process.env['OPENAI_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['GOOGLE_API_KEY'];
    process.env['GEMINI_API_KEY'] = 'gemini-test';
    const result = detectProvider();
    expect(result).toEqual({ provider: 'google', apiKey: 'gemini-test' });
  });

  it('returns null when no API keys are set', () => {
    delete process.env['OPENAI_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['GOOGLE_API_KEY'];
    delete process.env['GEMINI_API_KEY'];
    expect(detectProvider()).toBeNull();
  });

  it('prefers openai over anthropic when both are set', () => {
    process.env['OPENAI_API_KEY'] = 'sk-test';
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test';
    const result = detectProvider();
    expect(result?.provider).toBe('openai');
  });
});

// ---------------------------------------------------------------------------
// isWeakName
// ---------------------------------------------------------------------------

describe('isWeakName', () => {
  it('returns true when element has no label and no handler', () => {
    const el = makeElement({ label: null, handler: null });
    expect(isWeakName(el)).toBe(true);
  });

  it('returns false when element has a label', () => {
    const el = makeElement({ label: 'Submit' });
    expect(isWeakName(el)).toBe(false);
  });

  it('returns false when element has a handler', () => {
    const el = makeElement({ handler: 'handleClick' });
    expect(isWeakName(el)).toBe(false);
  });

  it('returns false when element has both label and handler', () => {
    const el = makeElement({ label: 'Go', handler: 'handleGo' });
    expect(isWeakName(el)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateAiName
// ---------------------------------------------------------------------------

describe('validateAiName', () => {
  it('accepts a valid kebab-case name', () => {
    expect(validateAiName('search-query')).toBe('search-query');
  });

  it('sanitizes camelCase to kebab-case', () => {
    expect(validateAiName('searchQuery')).toBe('search-query');
  });

  it('returns null for empty string', () => {
    expect(validateAiName('')).toBeNull();
  });

  it('returns null for a name exceeding 40 characters', () => {
    const long = 'a'.repeat(41);
    expect(validateAiName(long)).toBeNull();
  });

  it('strips special characters', () => {
    expect(validateAiName('search_query!')).toBe('search-query');
  });

  it('returns a valid name that matches agent ID pattern', () => {
    const result = validateAiName('billing-action');
    expect(result).toBe('billing-action');
    expect(result).toMatch(AGENT_ID_PATTERN);
  });

  it('returns null for string that becomes empty after sanitization', () => {
    expect(validateAiName('!!!')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// assignAiNames (with mocked fetch)
// ---------------------------------------------------------------------------

describe('assignAiNames', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env['OPENAI_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['GOOGLE_API_KEY'];
    delete process.env['GEMINI_API_KEY'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('returns empty map when no elements are weak', async () => {
    const elements = [
      makeElement({ label: 'Submit', handler: 'handleSubmit' }),
      makeElement({ label: 'Cancel' }),
    ];
    const result = await assignAiNames(elements, {
      provider: 'openai',
      apiKey: 'test-key',
    });
    expect(result.size).toBe(0);
  });

  it('returns empty map when no API key is available', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const elements = [makeElement()]; // weak element
    const result = await assignAiNames(elements);
    expect(result.size).toBe(0);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('no API key found'),
    );
  });

  it('returns AI names from mocked OpenAI response', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '["billing-action", "search-filter"]' } }],
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const elements = [
      makeElement({ componentName: 'BillingPanel', line: 42 }),
      makeElement({ componentName: 'SearchBar', line: 15 }),
    ];

    const result = await assignAiNames(elements, {
      provider: 'openai',
      apiKey: 'test-key',
      timeout: 5000,
    });

    expect(result.size).toBe(2);
    expect(result.get(0)).toBe('billing-action');
    expect(result.get(1)).toBe('search-filter');
  });

  it('returns AI names from mocked Anthropic response', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '["save-draft"]' }],
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const elements = [makeElement({ componentName: 'Editor', line: 10 })];

    const result = await assignAiNames(elements, {
      provider: 'anthropic',
      apiKey: 'test-key',
    });

    expect(result.size).toBe(1);
    expect(result.get(0)).toBe('save-draft');
  });

  it('returns AI names from mocked Google response', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '["toggle-menu"]' }] } }],
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const elements = [makeElement({ componentName: 'NavBar', line: 5 })];

    const result = await assignAiNames(elements, {
      provider: 'google',
      apiKey: 'test-key',
    });

    expect(result.size).toBe(1);
    expect(result.get(0)).toBe('toggle-menu');
  });

  it('falls back gracefully when AI returns invalid names', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '["", "!!!"]' } }],
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const elements = [
      makeElement({ componentName: 'A', line: 1 }),
      makeElement({ componentName: 'B', line: 2 }),
    ];

    const result = await assignAiNames(elements, {
      provider: 'openai',
      apiKey: 'test-key',
    });

    // Both names are invalid, so neither should be in the result
    expect(result.size).toBe(0);
  });

  it('falls back gracefully when API returns error', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const elements = [makeElement({ componentName: 'Panel', line: 10 })];

    const result = await assignAiNames(elements, {
      provider: 'openai',
      apiKey: 'test-key',
    });

    expect(result.size).toBe(0);
  });

  it('falls back gracefully when fetch throws (network error)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const elements = [makeElement({ componentName: 'Panel', line: 10 })];

    const result = await assignAiNames(elements, {
      provider: 'openai',
      apiKey: 'test-key',
    });

    expect(result.size).toBe(0);
  });

  it('falls back gracefully when response is not valid JSON array', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not a json array' } }],
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const elements = [makeElement({ componentName: 'Panel', line: 10 })];

    const result = await assignAiNames(elements, {
      provider: 'openai',
      apiKey: 'test-key',
    });

    expect(result.size).toBe(0);
  });

  it('only processes weak elements, skipping strong ones', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '["weak-action"]' } }],
      }),
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const elements = [
      makeElement({ label: 'Strong', handler: 'onClick', line: 1 }), // strong - index 0
      makeElement({ componentName: 'Panel', line: 10 }), // weak - index 1
    ];

    const result = await assignAiNames(elements, {
      provider: 'openai',
      apiKey: 'test-key',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.has(0)).toBe(false); // strong element not in result
    expect(result.get(1)).toBe('weak-action');
  });
});

// ---------------------------------------------------------------------------
// assignAiName (single-element wrapper)
// ---------------------------------------------------------------------------

describe('assignAiName', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when element is not weak', async () => {
    const el = makeElement({ label: 'Submit' });
    // No API key needed since the element won't be processed
    const result = await assignAiName(el, {
      provider: 'openai',
      apiKey: 'test-key',
    });
    expect(result).toBeNull();
  });

  it('returns AI name for a weak element', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '["action-button"]' } }],
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const el = makeElement({ componentName: 'Panel', line: 10 });
    const result = await assignAiName(el, {
      provider: 'openai',
      apiKey: 'test-key',
    });
    expect(result).toBe('action-button');
  });
});
