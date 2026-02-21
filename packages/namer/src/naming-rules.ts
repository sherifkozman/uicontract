/**
 * Character sanitization and naming rules for agent ID segments.
 *
 * Agent IDs must match: ^[a-z][a-z0-9.-]*$
 * Each segment is a dot-separated part of the ID.
 */

/**
 * Convert camelCase or PascalCase text to kebab-case.
 *
 * Handles consecutive uppercase letters (acronyms) by treating them as a
 * single group followed by the next lowercase run.
 * e.g. "MyHTTPClient" -> "my-http-client"
 */
export function camelToKebab(text: string): string {
  if (text.length === 0) return '';

  // Insert hyphen between lowercase/digit and uppercase
  let result = text.replace(/([a-z0-9])([A-Z])/g, '$1-$2');
  // Insert hyphen between consecutive uppercase and uppercase+lowercase
  result = result.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2');

  return result.toLowerCase();
}

/**
 * Sanitize a text string into a valid agent ID segment.
 *
 * - Lowercases
 * - Replaces spaces, underscores, and camelCase boundaries with hyphens
 * - Removes special characters (keeps letters, digits, hyphens)
 * - Collapses consecutive hyphens
 * - Trims leading and trailing hyphens
 * - Strips leading digits so the segment starts with a letter
 */
export function sanitizeSegment(text: string): string {
  if (text.length === 0) return '';

  // First convert camelCase to kebab-case
  let result = camelToKebab(text);

  // Replace spaces and underscores with hyphens
  result = result.replace(/[\s_]+/g, '-');

  // Replace anything that isn't a lowercase letter, digit, or hyphen with a hyphen
  result = result.replace(/[^a-z0-9-]+/g, '-');

  // Collapse consecutive hyphens
  result = result.replace(/-{2,}/g, '-');

  // Trim leading and trailing hyphens
  result = result.replace(/^-+|-+$/g, '');

  // Strip leading digits so result starts with a letter
  result = result.replace(/^[0-9]+/, '');

  // Trim hyphens again after digit stripping
  result = result.replace(/^-+/, '');

  return result;
}

/**
 * Split a route path into sanitized segments.
 *
 * e.g. "/settings/billing" -> ["settings", "billing"]
 */
export function routeToSegments(route: string): string[] {
  return route
    .split('/')
    .map((s) => sanitizeSegment(s))
    .filter((s) => s.length > 0);
}

/**
 * Convert a label string into a sanitized segment.
 *
 * e.g. "Pause subscription" -> "pause-subscription"
 */
export function labelToSegment(label: string): string {
  return sanitizeSegment(label);
}

/**
 * Convert an event handler name into a sanitized segment.
 *
 * Strips common prefixes ("handle", "on") before converting.
 * e.g. "handlePauseSubscription" -> "pause-subscription"
 * e.g. "onClick" -> "click"
 */
export function handlerToSegment(handler: string): string {
  let stripped = handler;

  // Strip "handle" prefix (case-sensitive, expect camelCase)
  if (stripped.startsWith('handle') && stripped.length > 6) {
    stripped = stripped.slice(6);
    // Lowercase the first character of the remaining text
    stripped = stripped.charAt(0).toLowerCase() + stripped.slice(1);
  }
  // Strip "on" prefix (case-sensitive)
  else if (stripped.startsWith('on') && stripped.length > 2 && /[A-Z]/.test(stripped.charAt(2))) {
    stripped = stripped.slice(2);
    stripped = stripped.charAt(0).toLowerCase() + stripped.slice(1);
  }

  return sanitizeSegment(stripped);
}

/**
 * Convert a component name (PascalCase/camelCase) into a sanitized segment.
 *
 * e.g. "BillingSettings" -> "billing-settings"
 */
export function componentToSegment(componentName: string): string {
  return sanitizeSegment(componentName);
}
