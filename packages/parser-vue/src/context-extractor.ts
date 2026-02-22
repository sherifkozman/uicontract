/**
 * Context extraction helpers for Vue SFC template AST.
 * Extracts component names, routes, labels, handlers, data attributes,
 * and conditional/dynamic flags from Vue template elements.
 */

import * as path from 'node:path';

// ---------------------------------------------------------------------------
// @vue/compiler-dom node types (avoid importing enums for ESM compat)
// ---------------------------------------------------------------------------

/** Vue compiler-dom node prop with type 6 = attribute, type 7 = directive */
interface VueAttributeNode {
  type: 6;
  name: string;
  value?: { content: string } | undefined;
}

interface VueDirectiveNode {
  type: 7;
  name: string;
  arg?: { content: string } | null;
  exp?: { content: string } | null;
}

type VuePropNode = VueAttributeNode | VueDirectiveNode;

/** Vue compiler-dom element node (type 1) */
interface VueElementNode {
  type: 1;
  tag: string;
  props: VuePropNode[];
  children: VueChildNode[];
  loc: { start: { line: number; column: number }; end: { line: number; column: number } };
}

/** Vue compiler-dom text node (type 2) */
interface VueTextNode {
  type: 2;
  content: string;
}

/** Vue compiler-dom interpolation node (type 5) */
interface VueInterpolationNode {
  type: 5;
  content: { content: string };
}

type VueChildNode = VueElementNode | VueTextNode | VueInterpolationNode | { type: number };

// ---------------------------------------------------------------------------
// Component name
// ---------------------------------------------------------------------------

/**
 * Extract a component name from the file path.
 * Vue components are named by their filename: `MyComponent.vue` -> `MyComponent`.
 */
export function extractComponentName(filePath: string): string | null {
  const base = path.basename(filePath, '.vue');
  return base || null;
}

// ---------------------------------------------------------------------------
// Route extraction (Nuxt pages/ convention)
// ---------------------------------------------------------------------------

/**
 * Infer a Nuxt route from a file path.
 * Files under a `pages/` directory map to routes:
 * - `pages/index.vue` -> `/`
 * - `pages/about.vue` -> `/about`
 * - `pages/users/[id].vue` -> `/users/[id]`
 */
export function extractRoute(filePath: string, projectRoot: string): string | null {
  const rel = path.relative(projectRoot, filePath).replace(/\\/g, '/');

  const pagesIndex = rel.indexOf('pages/');
  if (pagesIndex === -1) return null;

  const afterPages = rel.slice(pagesIndex + 'pages/'.length);
  const withoutExt = afterPages.replace(/\.vue$/, '');

  // index -> /
  if (withoutExt === 'index') {
    return '/';
  }

  // Remove trailing /index
  const route = withoutExt.replace(/\/index$/, '');
  return '/' + route;
}

// ---------------------------------------------------------------------------
// Label extraction
// ---------------------------------------------------------------------------

/**
 * Extract the best human-readable label for a Vue template element.
 * Priority: aria-label > text content children > placeholder
 */
export function extractLabel(node: VueElementNode): string | null {
  // 1. aria-label attribute
  for (const prop of node.props) {
    if (prop.type === 6 && prop.name === 'aria-label' && prop.value) {
      return prop.value.content;
    }
  }

  // 2. Children text content
  const textParts: string[] = [];
  for (const child of node.children) {
    if (child.type === 2) {
      // TextNode
      const trimmed = (child as VueTextNode).content.trim();
      if (trimmed) textParts.push(trimmed);
    } else if (child.type === 5) {
      // InterpolationNode {{ expr }} - skip dynamic content
    }
  }
  if (textParts.length > 0) {
    return textParts.join(' ');
  }

  // 3. placeholder attribute
  for (const prop of node.props) {
    if (prop.type === 6 && prop.name === 'placeholder' && prop.value) {
      return prop.value.content;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Handler extraction
// ---------------------------------------------------------------------------

/**
 * Extract the event handler name from Vue directives.
 * @click="handleClick" → "handleClick"
 * v-on:submit="handleSubmit" → "handleSubmit"
 */
export function extractHandler(node: VueElementNode): string | null {
  const eventNames = ['click', 'submit', 'change', 'input', 'focus', 'blur', 'keydown', 'keyup', 'keypress'];

  for (const prop of node.props) {
    if (prop.type !== 7 || prop.name !== 'on') continue;

    const arg = prop.arg;
    if (!arg || !eventNames.includes(arg.content)) continue;

    const exp = prop.exp;
    if (!exp) continue;

    const content = exp.content.trim();

    // Simple identifier: handleClick
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(content)) {
      return content;
    }

    // Member expression: obj.method - extract last part
    const dotMatch = /\.([a-zA-Z_$][a-zA-Z0-9_$]*)$/.exec(content);
    if (dotMatch?.[1]) {
      return dotMatch[1];
    }

    // Call expression: handleClick() - extract function name
    const callMatch = /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/.exec(content);
    if (callMatch?.[1]) {
      return callMatch[1];
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Data attribute extraction
// ---------------------------------------------------------------------------

/**
 * Collect all data-* attributes from a Vue element.
 */
export function extractDataAttributes(node: VueElementNode): Record<string, string> {
  const result: Record<string, string> = {};

  for (const prop of node.props) {
    if (prop.type === 6 && prop.name.startsWith('data-')) {
      result[prop.name] = prop.value?.content ?? '';
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Conditional detection
// ---------------------------------------------------------------------------

/**
 * Check if a node or any of its ancestors has v-if, v-else-if, v-else, or v-show.
 */
export function isConditional(node: VueElementNode, ancestors: VueElementNode[]): boolean {
  // Check current node
  if (hasDirective(node, ['if', 'else-if', 'else', 'show'])) {
    return true;
  }

  // Check ancestors
  for (const ancestor of ancestors) {
    if (hasDirective(ancestor, ['if', 'else-if', 'else', 'show'])) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Dynamic detection
// ---------------------------------------------------------------------------

/**
 * Check if any ancestor has a v-for directive.
 */
export function isDynamic(ancestors: VueElementNode[]): boolean {
  for (const ancestor of ancestors) {
    if (hasDirective(ancestor, ['for'])) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasDirective(node: VueElementNode, names: string[]): boolean {
  for (const prop of node.props) {
    if (prop.type === 7 && names.includes(prop.name)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a Vue element node has any event handler directives (@click, v-on:*, etc.)
 */
export function hasEventDirective(node: VueElementNode): boolean {
  const eventNames = ['click', 'submit', 'change', 'input', 'focus', 'blur', 'keydown', 'keyup', 'keypress'];
  for (const prop of node.props) {
    if (prop.type === 7 && prop.name === 'on') {
      const arg = prop.arg;
      if (arg && eventNames.includes(arg.content)) {
        return true;
      }
    }
  }
  return false;
}
