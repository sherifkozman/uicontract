/**
 * Vue SFC annotation logic.
 *
 * Inserts `data-agent-id` attributes into Vue `<template>` block elements.
 * Reuses the core string-manipulation annotator since Vue templates use
 * standard HTML tags and the Vue parser reports file-level line numbers.
 */

import type { AnnotationTarget, AnnotationResult } from './jsx-annotator.js';
import { annotateSource } from './jsx-annotator.js';

/**
 * Annotate a Vue SFC source string by inserting `data-agent-id` attributes.
 *
 * Works identically to `annotateSource` since the Vue parser reports
 * file-level (not template-relative) line numbers, and the string-based
 * annotator operates on raw HTML tags regardless of framework.
 *
 * @param source - The full `.vue` SFC source code.
 * @param targets - Annotation targets with file-level line/column positions.
 * @returns Annotation result with original and annotated source.
 */
export function annotateVueSource(
  source: string,
  targets: AnnotationTarget[],
): AnnotationResult {
  return annotateSource(source, targets);
}
