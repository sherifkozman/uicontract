/**
 * Rule-based deterministic naming engine.
 *
 * Assigns agentIds to RawElements using a priority-based strategy that
 * combines route, label, handler, component name, and element type.
 */

import type { RawElement } from '@uicontract/core';
import {
  routeToSegments,
  labelToSegment,
  handlerToSegment,
  componentToSegment,
} from './naming-rules.js';

/** Agent ID validation pattern */
const AGENT_ID_PATTERN = /^[a-z][a-z0-9.-]*$/;

/**
 * Join non-empty segments with dots and append the element type.
 */
function buildId(segments: string[], type: string): string {
  const parts = [...segments, type].filter((s) => s.length > 0);
  return parts.join('.');
}

/**
 * Ensure an agentId matches the required pattern.
 *
 * If the id doesn't start with a letter, prefix with "el".
 * If the id is empty, return "unknown".
 */
function ensureValid(id: string): string {
  if (id.length === 0) return 'unknown';
  if (AGENT_ID_PATTERN.test(id)) return id;

  // Strip any remaining invalid characters
  let cleaned = id.replace(/[^a-z0-9.-]/g, '');
  // Ensure starts with a letter
  cleaned = cleaned.replace(/^[^a-z]+/, '');
  if (cleaned.length === 0) return 'unknown';

  return cleaned;
}

/**
 * Assign a deterministic agent ID to a RawElement.
 *
 * Priority order:
 * 1. Route + label + type
 * 2. Route + handler + type
 * 3. Component + label + type
 * 4. Component + handler + type
 * 5. Fallback: component (or "unknown") + type + line
 */
export function assignDeterministicName(element: RawElement): string {
  const routeSegments =
    element.route !== null ? routeToSegments(element.route) : [];
  const hasRoute = routeSegments.length > 0;

  const labelSeg =
    element.label !== null ? labelToSegment(element.label) : '';
  const hasLabel = labelSeg.length > 0;

  const handlerSeg =
    element.handler !== null ? handlerToSegment(element.handler) : '';
  const hasHandler = handlerSeg.length > 0;

  const componentSeg =
    element.componentName !== null
      ? componentToSegment(element.componentName)
      : '';
  const hasComponent = componentSeg.length > 0;

  // Priority 1: route + label + type
  if (hasRoute && hasLabel) {
    return ensureValid(buildId([...routeSegments, labelSeg], element.type));
  }

  // Priority 2: route + handler + type
  if (hasRoute && hasHandler) {
    return ensureValid(buildId([...routeSegments, handlerSeg], element.type));
  }

  // Priority 3: component + label + type
  if (hasComponent && hasLabel) {
    return ensureValid(buildId([componentSeg, labelSeg], element.type));
  }

  // Priority 4: component + handler + type
  if (hasComponent && hasHandler) {
    return ensureValid(buildId([componentSeg, handlerSeg], element.type));
  }

  // Priority 5: fallback - component (or "unknown") + type + line
  const base = hasComponent ? componentSeg : 'unknown';
  return ensureValid(`${base}.${element.type}.${element.line}`);
}
