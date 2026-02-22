/**
 * AI-assisted naming engine (stub).
 *
 * TODO: Connect to an AI provider (e.g., OpenAI, Gemini) to generate
 * context-aware, human-friendly agent IDs. The AI namer should receive
 * the full element context (surrounding code, component hierarchy, route
 * structure) and produce a naming suggestion that is validated against
 * the agent ID pattern before use. When the AI namer returns null or
 * fails, the deterministic namer is used as a fallback.
 */

import type { RawElement } from '@uicontract/core';

/** Options for the AI naming provider. */
export interface AiNamerOptions {
  /** Timeout in milliseconds for the AI provider call. */
  timeout?: number;
  /** AI provider identifier (e.g., "openai", "anthropic"). */
  provider?: string;
}

/**
 * Attempt to assign an AI-generated agent ID to a RawElement.
 *
 * Currently a stub that always returns null, causing the caller
 * to fall back to deterministic naming.
 *
 * @param _element - The raw element to name.
 * @param _options - AI provider options.
 * @returns null (stub - AI naming not yet implemented).
 */
export async function assignAiName(
  _element: RawElement,
  _options?: AiNamerOptions,
): Promise<string | null> {
  // TODO: Implement AI naming. This function should:
  // 1. Serialize the element context into a prompt
  // 2. Call the configured AI provider
  // 3. Validate the response matches ^[a-z][a-z0-9.-]*$
  // 4. Return the validated name, or null on failure/timeout
  return null;
}
