/**
 * AST visitor that discovers interactive JSX elements in a parsed file.
 */

import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { RawElement, InteractiveElementType } from '@uicontract/core';
import {
  extractComponentName,
  extractRoute,
  extractLabel,
  extractHandler,
  extractDataAttributes,
  isConditional,
  isDynamic,
} from './context-extractor.js';

// @babel/traverse ships as CJS; handle default import for ESM interop
const traverse = (_traverse.default ?? _traverse) as typeof _traverse.default;

/** Interactive HTML element tag names that are always captured. */
const ALWAYS_INTERACTIVE = new Set<string>([
  'button',
  'input',
  'select',
  'textarea',
  'a',
  'form',
]);

/** JSX event handler prop names that make any element interactive. */
const EVENT_HANDLER_PROPS = new Set<string>([
  'onClick',
  'onSubmit',
  'onChange',
  'onInput',
  'onFocus',
  'onBlur',
  'onKeyDown',
  'onKeyUp',
  'onKeyPress',
]);

/** Elements that can appear in InteractiveElementType but aren't always interactive. */
const GENERIC_INTERACTIVE_TYPES = new Set<string>(['div', 'span', 'img', 'label']);

/** All valid InteractiveElementType values. */
const VALID_ELEMENT_TYPES = new Set<string>([
  'button', 'input', 'select', 'textarea', 'a', 'form',
  'div', 'span', 'img', 'label',
]);

function toInteractiveType(tagName: string): InteractiveElementType | null {
  if (VALID_ELEMENT_TYPES.has(tagName)) {
    return tagName as InteractiveElementType;
  }
  return null;
}

/** Check whether a JSX opening element has any event handler props. */
function hasEventHandlerProp(node: t.JSXOpeningElement): boolean {
  for (const attr of node.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
      if (EVENT_HANDLER_PROPS.has(attr.name.name)) return true;
    }
  }
  return false;
}

/** Parse a React/JSX/TS source file and return discovered interactive elements. */
export function parseFile(
  source: string,
  absoluteFilePath: string,
  projectRoot: string,
): RawElement[] {
  const ast = parse(source, {
    sourceType: 'module',
    plugins: [
      'typescript',
      'jsx',
      'decorators-legacy',
      'classProperties',
      'optionalChaining',
      'nullishCoalescingOperator',
    ],
  });

  const elements: RawElement[] = [];

  traverse(ast, {
    JSXOpeningElement(nodePath) {
      const nameNode = nodePath.node.name;

      // Only handle plain HTML elements (lowercase tag names)
      if (!t.isJSXIdentifier(nameNode)) return;

      const tagName = nameNode.name;
      const isAlwaysInteractive = ALWAYS_INTERACTIVE.has(tagName);
      const isGenericWithHandler =
        GENERIC_INTERACTIVE_TYPES.has(tagName) && hasEventHandlerProp(nodePath.node);

      if (!isAlwaysInteractive && !isGenericWithHandler) return;

      const elementType = toInteractiveType(tagName);
      if (!elementType) return;

      const loc = nodePath.node.loc;
      const line = loc?.start.line ?? 0;
      const column = (loc?.start.column ?? 0) + 1; // convert 0-based to 1-based

      const componentName = extractComponentName(nodePath);
      const route = extractRoute(absoluteFilePath, projectRoot);
      const label = extractLabel(nodePath as Parameters<typeof extractLabel>[0]);
      const handler = extractHandler(nodePath as Parameters<typeof extractHandler>[0]);
      const attributes = extractDataAttributes(nodePath as Parameters<typeof extractDataAttributes>[0]);
      const conditional = isConditional(nodePath);
      const dynamic = isDynamic(nodePath);

      const relFilePath = absoluteFilePath
        .replace(/\\/g, '/')
        .replace(projectRoot.replace(/\\/g, '/').replace(/\/?$/, '/'), '');

      elements.push({
        type: elementType,
        filePath: relFilePath,
        line,
        column,
        componentName,
        route,
        label,
        handler,
        attributes,
        conditional,
        dynamic,
      });
    },
  });

  return elements;
}
