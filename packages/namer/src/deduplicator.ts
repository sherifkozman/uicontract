/**
 * ID collision resolution for named elements.
 *
 * Detects duplicate agentIds and appends numeric suffixes (.0, .1, .2)
 * to ALL duplicates. Duplicates are ordered by line number for stability.
 */

import type { NamedElement } from '@uicontract/core';

/**
 * Deduplicate named elements by appending numeric suffixes to collisions.
 *
 * When two or more elements share the same agentId, ALL of them receive
 * a numeric suffix (.0, .1, .2, ...) ordered by line number (ascending).
 *
 * Elements with unique IDs are returned unchanged.
 *
 * @param elements - Array of named elements, potentially with duplicate IDs.
 * @returns New array with unique agentIds. Original array is not mutated.
 */
export function deduplicateNames(elements: NamedElement[]): NamedElement[] {
  // Group element indices by agentId
  const idGroups = new Map<string, number[]>();

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el === undefined) continue;
    const existing = idGroups.get(el.agentId);
    if (existing !== undefined) {
      existing.push(i);
    } else {
      idGroups.set(el.agentId, [i]);
    }
  }

  // Create a new array with resolved IDs
  const result: NamedElement[] = elements.map((el) => ({ ...el }));

  for (const indices of idGroups.values()) {
    // Skip groups with no duplicates
    if (indices.length <= 1) continue;

    // Sort duplicate indices by line number for stable ordering
    const sortedIndices = [...indices].sort((a, b) => {
      const elA = elements[a];
      const elB = elements[b];
      if (elA === undefined || elB === undefined) return 0;
      return elA.line - elB.line;
    });

    // Assign numeric suffixes
    for (let suffixIdx = 0; suffixIdx < sortedIndices.length; suffixIdx++) {
      const elementIndex = sortedIndices[suffixIdx];
      if (elementIndex === undefined) continue;
      const el = result[elementIndex];
      if (el === undefined) continue;
      el.agentId = `${el.agentId}.${suffixIdx}`;
    }
  }

  return result;
}
