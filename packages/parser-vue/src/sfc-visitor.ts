/**
 * SFC template visitor that discovers interactive elements in Vue templates.
 * Uses @vue/compiler-dom to parse the <template> block of .vue files.
 */

import { parse as compilerParse } from '@vue/compiler-dom';
import type { RootNode } from '@vue/compiler-dom';
import type { RawElement, InteractiveElementType } from '@uicontract/core';
import {
  extractComponentName,
  extractRoute,
  extractLabel,
  extractHandler,
  extractDataAttributes,
  isConditional,
  isDynamic,
  hasEventDirective,
} from './context-extractor.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Interactive HTML element tag names that are always captured. */
const ALWAYS_INTERACTIVE = new Set<string>([
  'button',
  'input',
  'select',
  'textarea',
  'a',
  'form',
]);

/** Elements that are interactive only when they have event handlers. */
const GENERIC_INTERACTIVE = new Set<string>(['div', 'span', 'img', 'label']);

/** All valid InteractiveElementType values. */
const VALID_ELEMENT_TYPES = new Set<string>([
  'button', 'input', 'select', 'textarea', 'a', 'form',
  'div', 'span', 'img', 'label',
]);

// ---------------------------------------------------------------------------
// Internal types for AST nodes (avoid importing enums)
// ---------------------------------------------------------------------------

interface VueElementNode {
  type: 1;
  tag: string;
  props: VuePropNode[];
  children: VueChildNode[];
  loc: { start: { line: number; column: number }; end: { line: number; column: number } };
}

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
type VueChildNode = {
  type: number;
  tag?: string;
  props?: VuePropNode[];
  children?: VueChildNode[];
  loc?: VueElementNode['loc'];
};

// ---------------------------------------------------------------------------
// Template extraction
// ---------------------------------------------------------------------------

/**
 * Extract the template content and its line offset from a .vue SFC file.
 * Returns null if no <template> block is found.
 */
function extractTemplate(source: string): { content: string; lineOffset: number } | null {
  const openTagPattern = /<template[^>]*>/;
  const closeTag = '</template>';

  const openMatch = openTagPattern.exec(source);
  if (!openMatch) return null;

  const contentStart = openMatch.index + openMatch[0].length;
  const closeIndex = source.lastIndexOf(closeTag);
  if (closeIndex === -1 || closeIndex <= contentStart) return null;

  const content = source.slice(contentStart, closeIndex);

  // Count newlines before the template content to calculate line offset
  const lineOffset = source.slice(0, contentStart).split('\n').length - 1;

  return { content, lineOffset };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a Vue SFC file and return discovered interactive elements.
 */
export function parseVueFile(
  source: string,
  absoluteFilePath: string,
  projectRoot: string,
): RawElement[] {
  const template = extractTemplate(source);
  if (!template) return [];

  let ast: RootNode;
  try {
    ast = compilerParse(template.content);
  } catch {
    return [];
  }

  const elements: RawElement[] = [];
  const componentName = extractComponentName(absoluteFilePath);
  const route = extractRoute(absoluteFilePath, projectRoot);

  const relFilePath = absoluteFilePath
    .replace(/\\/g, '/')
    .replace(projectRoot.replace(/\\/g, '/').replace(/\/?$/, '/'), '');

  walkNode(
    ast as unknown as VueChildNode,
    elements,
    relFilePath,
    componentName,
    route,
    template.lineOffset,
    [],
  );

  return elements;
}

// ---------------------------------------------------------------------------
// AST walking
// ---------------------------------------------------------------------------

function walkNode(
  node: VueChildNode,
  elements: RawElement[],
  filePath: string,
  componentName: string | null,
  route: string | null,
  lineOffset: number,
  ancestors: VueElementNode[],
): void {
  const children = node.children;
  if (!children) return;

  for (const child of children) {
    if (child.type === 1) {
      // NodeTypes.ELEMENT
      const elementNode = child as unknown as VueElementNode;
      processElement(elementNode, elements, filePath, componentName, route, lineOffset, ancestors);
      walkNode(
        child,
        elements,
        filePath,
        componentName,
        route,
        lineOffset,
        [...ancestors, elementNode],
      );
    }
  }
}

function processElement(
  node: VueElementNode,
  elements: RawElement[],
  filePath: string,
  componentName: string | null,
  route: string | null,
  lineOffset: number,
  ancestors: VueElementNode[],
): void {
  const tag = node.tag;

  const isAlwaysInteractive = ALWAYS_INTERACTIVE.has(tag);
  const isGenericWithHandler = GENERIC_INTERACTIVE.has(tag) && hasEventDirective(node);

  if (!isAlwaysInteractive && !isGenericWithHandler) return;

  if (!VALID_ELEMENT_TYPES.has(tag)) return;

  const elementType = tag as InteractiveElementType;
  const line = node.loc.start.line + lineOffset;
  const column = node.loc.start.column;

  elements.push({
    type: elementType,
    filePath,
    line,
    column,
    componentName,
    route,
    label: extractLabel(node),
    handler: extractHandler(node),
    attributes: extractDataAttributes(node),
    conditional: isConditional(node, ancestors),
    dynamic: isDynamic(ancestors),
  });
}
