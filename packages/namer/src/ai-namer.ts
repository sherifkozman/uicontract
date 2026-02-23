/**
 * AI-assisted naming engine.
 *
 * Connects to an AI provider (OpenAI, Anthropic, or Google) to generate
 * context-aware, human-friendly agent ID segments for elements where
 * deterministic naming produces weak fallback IDs (no label and no handler).
 *
 * When the AI namer fails or times out, the deterministic namer is used
 * as a fallback.
 *
 * TODO: Investigate how AI agent skills can detect and reuse the AI
 * environment they run within (e.g., Claude Code's API context, Gemini CLI's
 * credentials) instead of requiring separate API keys. This would enable
 * zero-config AI naming when invoked as a skill from an AI agent.
 */

import type { RawElement } from '@uicontract/core';
import { sanitizeSegment } from './naming-rules.js';

/** Supported AI providers. */
export type AiProvider = 'openai' | 'anthropic' | 'google';

/** Options for the AI naming provider. */
export interface AiNamerOptions {
  /** Timeout in milliseconds for the AI provider call. */
  timeout?: number;
  /** AI provider identifier. */
  provider?: AiProvider;
  /** Model override (provider-specific). */
  model?: string;
  /** API key override (defaults to env variable). */
  apiKey?: string;
}

/** Agent ID validation pattern. */
const AGENT_ID_PATTERN = /^[a-z][a-z0-9.-]*$/;

/** Default models per provider. */
const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5-20251001',
  google: 'gemini-2.0-flash',
};

/** Default timeout in milliseconds. */
const DEFAULT_TIMEOUT = 10_000;

/** Maximum elements per API batch. */
const BATCH_SIZE = 20;

/**
 * Detect AI provider from environment variables.
 * Returns null if no API key is found.
 */
export function detectProvider(): { provider: AiProvider; apiKey: string } | null {
  const openaiKey = process.env['OPENAI_API_KEY'];
  if (openaiKey) return { provider: 'openai', apiKey: openaiKey };

  const anthropicKey = process.env['ANTHROPIC_API_KEY'];
  if (anthropicKey) return { provider: 'anthropic', apiKey: anthropicKey };

  const googleKey = process.env['GOOGLE_API_KEY'] ?? process.env['GEMINI_API_KEY'];
  if (googleKey) return { provider: 'google', apiKey: googleKey };

  return null;
}

/**
 * Check whether an element would receive a weak deterministic name.
 *
 * A "weak" name falls to the deterministic namer's priority 5 fallback
 * (component.type.line or unknown.type.line), which happens when the
 * element has neither a label nor a handler.
 */
export function isWeakName(element: RawElement): boolean {
  return element.label === null && element.handler === null;
}

/**
 * Build a naming prompt for a batch of weak elements.
 */
function buildNamingPrompt(
  elements: ReadonlyArray<{ index: number; element: RawElement }>,
): string {
  const descriptions = elements
    .map(({ element }, i) => {
      const parts: string[] = [`${String(i + 1)}. Type: ${element.type}`];
      if (element.componentName) parts.push(`Component: ${element.componentName}`);
      if (element.route) parts.push(`Route: ${element.route}`);
      if (element.filePath) parts.push(`File: ${element.filePath}`);
      parts.push(`Line: ${String(element.line)}`);
      if (element.conditional) parts.push('(conditionally rendered)');
      if (element.dynamic) parts.push('(dynamically rendered)');
      const attrKeys = Object.keys(element.attributes);
      if (attrKeys.length > 0) parts.push(`Attributes: ${attrKeys.join(', ')}`);
      return parts.join(', ');
    })
    .join('\n');

  return [
    'You are a naming assistant for UI elements in a web application.',
    'Each element needs a short, descriptive kebab-case name (1-3 words) that describes its likely purpose.',
    '',
    'Rules:',
    '- Use lowercase letters, digits, and hyphens only',
    '- Must start with a letter',
    '- Be concise: 1-3 words separated by hyphens',
    '- Describe the element\'s purpose, not its type',
    '',
    'Elements:',
    descriptions,
    '',
    'Respond with ONLY a JSON array of strings, one name per element, in the same order.',
    'Example: ["search-query", "submit-form"]',
  ].join('\n');
}

/**
 * Parse the AI response to extract name suggestions.
 */
function parseAiResponse(text: string, expectedCount: number): Array<string | null> {
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return new Array<string | null>(expectedCount).fill(null);

  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return new Array<string | null>(expectedCount).fill(null);

    return (parsed as unknown[]).map((item: unknown) => {
      if (typeof item !== 'string') return null;
      return item;
    });
  } catch {
    return new Array<string | null>(expectedCount).fill(null);
  }
}

/**
 * Validate and sanitize an AI-suggested name.
 * Returns null if the name is invalid or empty after sanitization.
 */
export function validateAiName(suggestion: string): string | null {
  const sanitized = sanitizeSegment(suggestion);
  if (sanitized.length === 0) return null;
  if (sanitized.length > 40) return null;
  if (!AGENT_ID_PATTERN.test(sanitized)) return null;
  return sanitized;
}

// ---------------------------------------------------------------------------
// Provider API callers
// ---------------------------------------------------------------------------

interface OpenAIResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
}

interface GoogleResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

async function callOpenAI(
  prompt: string,
  apiKey: string,
  model: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 512,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${String(response.status)} ${response.statusText}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(
  prompt: string,
  apiKey: string,
  model: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${String(response.status)} ${response.statusText}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const textBlock = data.content?.find((b) => b.type === 'text');
  return textBlock?.text ?? '';
}

async function callGoogle(
  prompt: string,
  apiKey: string,
  model: string,
  signal: AbortSignal,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Google API error: ${String(response.status)} ${response.statusText}`);
  }

  const data = (await response.json()) as GoogleResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/**
 * Call the configured AI provider with the given prompt.
 */
async function callProvider(
  prompt: string,
  provider: AiProvider,
  apiKey: string,
  model: string,
  signal: AbortSignal,
): Promise<string> {
  switch (provider) {
    case 'openai':
      return callOpenAI(prompt, apiKey, model, signal);
    case 'anthropic':
      return callAnthropic(prompt, apiKey, model, signal);
    case 'google':
      return callGoogle(prompt, apiKey, model, signal);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assign AI-generated agent ID segments to weak elements in a batch.
 *
 * Identifies elements that would receive weak deterministic names (no label,
 * no handler), batches them, sends context to the configured AI provider,
 * and returns validated name suggestions.
 *
 * @param elements - All raw elements to consider for AI naming.
 * @param options - AI provider options.
 * @returns Map from element index to AI-suggested name segment.
 */
export async function assignAiNames(
  elements: ReadonlyArray<RawElement>,
  options?: AiNamerOptions,
): Promise<Map<number, string>> {
  const result = new Map<number, string>();

  // Find weak elements that would benefit from AI naming
  const weakElements: Array<{ index: number; element: RawElement }> = [];
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element && isWeakName(element)) {
      weakElements.push({ index: i, element });
    }
  }

  if (weakElements.length === 0) return result;

  // Resolve provider config
  const detected = detectProvider();
  const provider = options?.provider ?? detected?.provider;
  const apiKey = options?.apiKey ?? detected?.apiKey;

  if (!provider || !apiKey) {
    process.stderr.write(
      'Warning: AI naming enabled but no API key found. ' +
        'Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY. ' +
        'Falling back to deterministic naming.\n',
    );
    return result;
  }

  const model = options?.model ?? DEFAULT_MODELS[provider];
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

  // Process in batches to avoid overlong prompts
  for (let start = 0; start < weakElements.length; start += BATCH_SIZE) {
    const batch = weakElements.slice(start, start + BATCH_SIZE);
    const prompt = buildNamingPrompt(batch);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const responseText = await callProvider(
        prompt,
        provider,
        apiKey,
        model,
        controller.signal,
      );
      const suggestions = parseAiResponse(responseText, batch.length);

      for (let j = 0; j < batch.length; j++) {
        const suggestion = suggestions[j];
        if (suggestion) {
          const validated = validateAiName(suggestion);
          if (validated) {
            result.set(batch[j]!.index, validated);
          }
        }
      }
    } catch {
      // On error (timeout, network, parse failure), skip this batch.
      // Deterministic fallback will be used for these elements.
    } finally {
      clearTimeout(timer);
    }
  }

  return result;
}

/**
 * Attempt to assign an AI-generated agent ID to a single RawElement.
 *
 * @deprecated Use assignAiNames for batch processing.
 * @param element - The raw element to name.
 * @param options - AI provider options.
 * @returns AI-suggested name segment, or null on failure.
 */
export async function assignAiName(
  element: RawElement,
  options?: AiNamerOptions,
): Promise<string | null> {
  const names = await assignAiNames([element], options);
  return names.get(0) ?? null;
}
