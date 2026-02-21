/**
 * Context extraction helpers for the React AST visitor.
 * Each function extracts a specific piece of metadata from a JSX element's path.
 */

import * as path from 'node:path';
import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

// ---------------------------------------------------------------------------
// Component name
// ---------------------------------------------------------------------------

/**
 * Walk up the path ancestry to find the name of the enclosing React component.
 * Handles function declarations, arrow functions assigned to variables,
 * React.memo(), React.forwardRef(), and HOC wrappers.
 */
export function extractComponentName(nodePath: NodePath): string | null {
  let current: NodePath | null = nodePath.parentPath;

  while (current) {
    const node = current.node;

    // Named function declaration: `function MyComponent() { ... }`
    if (t.isFunctionDeclaration(node) && node.id) {
      return node.id.name;
    }

    // Arrow function or function expression assigned to variable:
    // `const MyComponent = () => ...`
    if (
      (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) &&
      t.isVariableDeclarator(current.parent) &&
      t.isIdentifier(current.parent.id)
    ) {
      return current.parent.id.name;
    }

    // Named function expression inside call (React.memo, React.forwardRef, HOC):
    // `React.memo(function MyComponent() { ... })`
    if (t.isFunctionExpression(node) && node.id) {
      return node.id.name;
    }

    // Class component: `class MyComponent extends React.Component { ... }`
    if (t.isClassDeclaration(node) && node.id) {
      return node.id.name;
    }

    if (t.isClassExpression(node) && node.id) {
      return node.id.name;
    }

    current = current.parentPath;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Route extraction (Next.js App Router)
// ---------------------------------------------------------------------------

/**
 * Infer a Next.js route from a file path.
 * Files under an `app/` directory named `page.tsx` or `layout.tsx` map to routes.
 * All other files return null.
 */
export function extractRoute(filePath: string, projectRoot: string): string | null {
  const rel = path.relative(projectRoot, filePath).replace(/\\/g, '/');

  // Look for the app/ directory segment
  const appIndex = rel.indexOf('app/');
  if (appIndex === -1) return null;

  const afterApp = rel.slice(appIndex + 'app/'.length);
  const fileName = path.basename(afterApp);

  if (fileName !== 'page.tsx' && fileName !== 'page.jsx' && fileName !== 'layout.tsx' && fileName !== 'layout.jsx') {
    return null;
  }

  const dirPart = path.dirname(afterApp).replace(/\\/g, '/');
  if (dirPart === '.') {
    return '/';
  }
  return '/' + dirPart;
}

// ---------------------------------------------------------------------------
// Label extraction
// ---------------------------------------------------------------------------

/** Try to extract a string value from a JSXAttribute's value node. */
function jsxAttrStringValue(attr: t.JSXAttribute): string | null {
  if (t.isStringLiteral(attr.value)) {
    return attr.value.value;
  }
  if (t.isJSXExpressionContainer(attr.value)) {
    const expr = attr.value.expression;
    if (t.isStringLiteral(expr)) {
      return expr.value;
    }
    if (t.isTemplateLiteral(expr) && expr.quasis.length === 1) {
      const quasi = expr.quasis[0];
      return quasi?.value.cooked ?? quasi?.value.raw ?? null;
    }
  }
  return null;
}

/** Get the string name of a JSX attribute. */
function attrName(attr: t.JSXAttribute | t.JSXSpreadAttribute): string | null {
  if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
    return attr.name.name;
  }
  return null;
}

/** Find an attribute by name in a JSX opening element. */
function findAttr(node: t.JSXOpeningElement, name: string): t.JSXAttribute | undefined {
  for (const attr of node.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === name) {
      return attr;
    }
  }
  return undefined;
}

/** Extract visible text from JSX children (shallow — only literals). */
function childrenText(jsxElement: t.JSXElement): string | null {
  const texts: string[] = [];
  for (const child of jsxElement.children) {
    if (t.isJSXText(child)) {
      const trimmed = child.value.trim();
      if (trimmed) texts.push(trimmed);
    } else if (t.isJSXExpressionContainer(child) && t.isStringLiteral(child.expression)) {
      texts.push(child.expression.value);
    }
  }
  return texts.length > 0 ? texts.join(' ') : null;
}

/**
 * Extract the best human-readable label for a JSX interactive element.
 * Priority: aria-label > children text > placeholder
 */
export function extractLabel(openingPath: NodePath<t.JSXOpeningElement>): string | null {
  const node = openingPath.node;

  // 1. aria-label
  const ariaLabel = findAttr(node, 'aria-label');
  if (ariaLabel) {
    const val = jsxAttrStringValue(ariaLabel);
    if (val) return val;
  }

  // 2. children text — need access to the parent JSXElement
  const parent = openingPath.parent;
  if (t.isJSXElement(parent)) {
    const text = childrenText(parent);
    if (text) return text;
  }

  // 3. placeholder
  const placeholder = findAttr(node, 'placeholder');
  if (placeholder) {
    const val = jsxAttrStringValue(placeholder);
    if (val) return val;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Handler extraction
// ---------------------------------------------------------------------------

/** Extract the event handler name from event props like onClick, onSubmit, etc. */
export function extractHandler(openingPath: NodePath<t.JSXOpeningElement>): string | null {
  const eventProps = ['onClick', 'onSubmit', 'onChange', 'onInput', 'onFocus', 'onBlur', 'onKeyDown', 'onKeyUp', 'onKeyPress'];

  for (const attr of openingPath.node.attributes) {
    if (!t.isJSXAttribute(attr)) continue;
    const name = attrName(attr);
    if (!name || !eventProps.includes(name)) continue;

    if (!t.isJSXExpressionContainer(attr.value)) continue;
    const expr = attr.value.expression;

    // onClick={handleFoo}
    if (t.isIdentifier(expr)) {
      return expr.name;
    }

    // onClick={this.handleFoo}
    if (t.isMemberExpression(expr) && t.isIdentifier(expr.property)) {
      return expr.property.name;
    }

    // Inline arrow / complex expression → null
  }

  return null;
}

// ---------------------------------------------------------------------------
// Data attribute extraction
// ---------------------------------------------------------------------------

/** Collect all data-* attributes from a JSX opening element. */
export function extractDataAttributes(openingPath: NodePath<t.JSXOpeningElement>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const attr of openingPath.node.attributes) {
    if (!t.isJSXAttribute(attr)) continue;
    const name = attrName(attr);
    if (!name || !name.startsWith('data-')) continue;
    const val = jsxAttrStringValue(attr);
    result[name] = val ?? '';
  }

  return result;
}

// ---------------------------------------------------------------------------
// Conditional / Dynamic detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the path is nested inside a ConditionalExpression (ternary)
 * or a LogicalExpression with && or ||.
 */
export function isConditional(nodePath: NodePath): boolean {
  let current: NodePath | null = nodePath.parentPath;
  while (current) {
    if (t.isConditionalExpression(current.node)) return true;
    if (t.isLogicalExpression(current.node) && (current.node.operator === '&&' || current.node.operator === '||')) {
      return true;
    }
    // Stop at function boundaries
    if (
      t.isFunctionDeclaration(current.node) ||
      t.isFunctionExpression(current.node) ||
      t.isArrowFunctionExpression(current.node)
    ) {
      break;
    }
    current = current.parentPath;
  }
  return false;
}

const DYNAMIC_CALLEES = new Set(['map', 'flatMap', 'reduce', 'filter', 'forEach', 'find', 'findIndex']);

/**
 * Returns true if the path is nested inside a .map() or similar array iteration call.
 */
export function isDynamic(nodePath: NodePath): boolean {
  let current: NodePath | null = nodePath.parentPath;
  while (current) {
    if (t.isCallExpression(current.node)) {
      const callee = current.node.callee;
      if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
        if (DYNAMIC_CALLEES.has(callee.property.name)) return true;
      }
    }
    // Stop at function boundaries (but not arrow functions passed as callbacks)
    if (t.isFunctionDeclaration(current.node)) {
      break;
    }
    current = current.parentPath;
  }
  return false;
}
