/**
 * @uicontract/namer - naming engine for UIC elements.
 *
 * Takes RawElements discovered by a parser and assigns stable,
 * hierarchical agentIds using deterministic rules with an optional
 * AI-assisted mode for elements that lack strong context.
 */

import type { RawElement, NamedElement } from '@uicontract/core';
import { assignDeterministicName } from './deterministic-namer.js';
import { deduplicateNames } from './deduplicator.js';
import { assignAiNames } from './ai-namer.js';
import type { AiProvider } from './ai-namer.js';
import {
  routeToSegments,
  componentToSegment,
} from './naming-rules.js';

/** Options for the naming engine. */
export interface NamerOptions {
  /** Enable AI-assisted naming (falls back to deterministic if AI returns null). */
  ai?: boolean;
  /** Timeout in milliseconds for AI naming calls. */
  aiTimeout?: number;
  /** AI provider identifier (e.g., "openai", "anthropic", "google"). */
  aiProvider?: string;
  /** Model override for the AI provider. */
  aiModel?: string;
}

/**
 * Name a list of raw elements, producing NamedElements with unique agentIds.
 *
 * 1. Optionally batch-processes weak elements via AI for better name segments.
 * 2. Each element is named via the deterministic namer (with AI overrides).
 * 3. Duplicate IDs are resolved with numeric suffixes.
 *
 * @param elements - Raw elements from a parser's discovery phase.
 * @param options - Naming options.
 * @returns Array of NamedElements with unique agentIds.
 */
export async function nameElements(
  elements: ReadonlyArray<RawElement>,
  options?: NamerOptions,
): Promise<NamedElement[]> {
  const useAi = options?.ai ?? false;

  // Phase 1: try AI naming for weak elements
  let aiNames = new Map<number, string>();
  if (useAi) {
    aiNames = await assignAiNames(elements, {
      timeout: options?.aiTimeout,
      provider: options?.aiProvider as AiProvider | undefined,
      model: options?.aiModel,
    });
  }

  // Phase 2: assign names (deterministic, with AI overrides for weak elements)
  const named: NamedElement[] = elements.map((element, index) => {
    const aiSuggestion = aiNames.get(index);
    let agentId: string;

    if (aiSuggestion) {
      // AI provided a name segment — build the full ID using the same
      // structure as the deterministic namer: prefix.suggestion.type
      const routeSegs = element.route !== null ? routeToSegments(element.route) : [];
      const componentSeg =
        element.componentName !== null ? componentToSegment(element.componentName) : '';

      let prefix: string;
      if (routeSegs.length > 0) {
        prefix = routeSegs.join('.');
      } else if (componentSeg.length > 0) {
        prefix = componentSeg;
      } else {
        prefix = aiSuggestion;
      }

      // If prefix is the AI suggestion itself (no route/component), use suggestion.type
      // Otherwise use prefix.suggestion.type
      agentId =
        prefix === aiSuggestion
          ? `${aiSuggestion}.${element.type}`
          : `${prefix}.${aiSuggestion}.${element.type}`;
    } else {
      agentId = assignDeterministicName(element);
    }

    return { ...element, agentId };
  });

  // Phase 3: deduplicate
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
export { assignAiName, assignAiNames } from './ai-namer.js';
export type { AiNamerOptions, AiProvider } from './ai-namer.js';
