/**
 * @uicontract/namer — naming engine for UIC elements.
 *
 * Takes RawElements discovered by a parser and assigns stable,
 * hierarchical agentIds using deterministic rules (with an optional
 * AI-assisted mode for future use).
 */

import type { RawElement, NamedElement } from '@uicontract/core';
import { assignDeterministicName } from './deterministic-namer.js';
import { deduplicateNames } from './deduplicator.js';
import { assignAiName } from './ai-namer.js';

/** Options for the naming engine. */
export interface NamerOptions {
  /** Enable AI-assisted naming (falls back to deterministic if AI returns null). */
  ai?: boolean;
  /** Timeout in milliseconds for AI naming calls. */
  aiTimeout?: number;
}

/**
 * Name a list of raw elements, producing NamedElements with unique agentIds.
 *
 * 1. Each element is named via the deterministic namer (AI stub returns null).
 * 2. Duplicate IDs are resolved with numeric suffixes.
 *
 * @param elements - Raw elements from a parser's discovery phase.
 * @param options - Naming options (AI mode is stubbed for now).
 * @returns Array of NamedElements with unique agentIds.
 */
export function nameElements(
  elements: ReadonlyArray<RawElement>,
  options?: NamerOptions,
): NamedElement[] {
  const useAi = options?.ai ?? false;
  const aiTimeout = options?.aiTimeout;

  // Phase 1: assign names
  const named: NamedElement[] = elements.map((element) => {
    let agentId: string | null = null;

    // Attempt AI naming if enabled (currently a stub that returns null)
    if (useAi) {
      // AI naming is async but we handle it synchronously here since
      // the stub always returns null. When real AI is connected, this
      // function signature should become async.
      void assignAiName(element, { timeout: aiTimeout });
    }

    // Deterministic fallback (always used until AI is implemented)
    if (agentId === null) {
      agentId = assignDeterministicName(element);
    }

    return { ...element, agentId };
  });

  // Phase 2: deduplicate
  return deduplicateNames(named);
}

// Re-export individual modules for direct access and testing
export {
  sanitizeSegment,
  camelToKebab,
  routeToSegments,
  labelToSegment,
  handlerToSegment,
  componentToSegment,
} from './naming-rules.js';
export { assignDeterministicName } from './deterministic-namer.js';
export { deduplicateNames } from './deduplicator.js';
export { assignAiName } from './ai-namer.js';
export type { AiNamerOptions } from './ai-namer.js';
