/**
 * Unit tests for Vue context extraction helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  extractComponentName,
  extractRoute,
  extractLabel,
  extractHandler,
  extractDataAttributes,
  isConditional,
  isDynamic,
  hasEventDirective,
} from '../src/context-extractor.js';

// ---------------------------------------------------------------------------
// Helper to create mock element nodes
// ---------------------------------------------------------------------------

interface MockProp {
  type: 6 | 7;
  name: string;
  value?: { content: string };
  arg?: { content: string } | null;
  exp?: { content: string } | null;
}

interface MockElementNode {
  type: 1;
  tag: string;
  props: MockProp[];
  children: Array<{ type: number; content?: string }>;
  loc: { start: { line: number; column: number }; end: { line: number; column: number } };
}

function mockElement(
  tag: string,
  props: MockProp[] = [],
  children: Array<{ type: number; content?: string }> = [],
): MockElementNode {
  return {
    type: 1 as const,
    tag,
    props,
    children,
    loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } },
  };
}

function attr(name: string, value?: string): MockProp {
  return {
    type: 6 as const,
    name,
    value: value !== undefined ? { content: value } : undefined,
  };
}

function directive(name: string, arg?: string, exp?: string): MockProp {
  return {
    type: 7 as const,
    name,
    arg: arg ? { content: arg } : null,
    exp: exp ? { content: exp } : null,
  };
}

// ---------------------------------------------------------------------------
// extractComponentName
// ---------------------------------------------------------------------------

describe('extractComponentName', () => {
  it('extracts name from component file', () => {
    expect(extractComponentName('/project/src/components/MyButton.vue')).toBe('MyButton');
  });

  it('extracts name from page file', () => {
    expect(extractComponentName('/project/pages/settings.vue')).toBe('settings');
  });

  it('extracts name from index file', () => {
    expect(extractComponentName('/project/pages/index.vue')).toBe('index');
  });

  it('handles nested path', () => {
    expect(extractComponentName('/project/src/deep/nested/Widget.vue')).toBe('Widget');
  });
});

// ---------------------------------------------------------------------------
// extractRoute
// ---------------------------------------------------------------------------

describe('extractRoute', () => {
  it('returns / for pages/index.vue', () => {
    expect(extractRoute('/project/pages/index.vue', '/project')).toBe('/');
  });

  it('returns /about for pages/about.vue', () => {
    expect(extractRoute('/project/pages/about.vue', '/project')).toBe('/about');
  });

  it('returns /users/settings for pages/users/settings.vue', () => {
    expect(extractRoute('/project/pages/users/settings.vue', '/project')).toBe('/users/settings');
  });

  it('returns /users/[id] for dynamic pages', () => {
    expect(extractRoute('/project/pages/users/[id].vue', '/project')).toBe('/users/[id]');
  });

  it('returns null for non-pages files', () => {
    expect(extractRoute('/project/src/components/Foo.vue', '/project')).toBeNull();
  });

  it('returns null for files without pages directory', () => {
    expect(extractRoute('/project/src/App.vue', '/project')).toBeNull();
  });

  it('handles nested pages/index as root of nested route', () => {
    expect(extractRoute('/project/pages/admin/index.vue', '/project')).toBe('/admin');
  });
});

// ---------------------------------------------------------------------------
// extractLabel
// ---------------------------------------------------------------------------

describe('extractLabel', () => {
  it('extracts aria-label', () => {
    const node = mockElement('button', [attr('aria-label', 'Close')]);
    expect(extractLabel(node as never)).toBe('Close');
  });

  it('extracts text content', () => {
    const node = mockElement('button', [], [{ type: 2, content: 'Save' }]);
    expect(extractLabel(node as never)).toBe('Save');
  });

  it('extracts placeholder', () => {
    const node = mockElement('input', [attr('placeholder', 'Enter email')]);
    expect(extractLabel(node as never)).toBe('Enter email');
  });

  it('prefers aria-label over text content', () => {
    const node = mockElement(
      'button',
      [attr('aria-label', 'Close dialog')],
      [{ type: 2, content: 'X' }],
    );
    expect(extractLabel(node as never)).toBe('Close dialog');
  });

  it('returns null when no label available', () => {
    const node = mockElement('button');
    expect(extractLabel(node as never)).toBeNull();
  });

  it('trims whitespace from text content', () => {
    const node = mockElement('button', [], [{ type: 2, content: '  Save  ' }]);
    expect(extractLabel(node as never)).toBe('Save');
  });

  it('skips empty text nodes', () => {
    const node = mockElement('button', [], [{ type: 2, content: '   ' }]);
    expect(extractLabel(node as never)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractHandler
// ---------------------------------------------------------------------------

describe('extractHandler', () => {
  it('extracts simple handler name', () => {
    const node = mockElement('button', [directive('on', 'click', 'handleClick')]);
    expect(extractHandler(node as never)).toBe('handleClick');
  });

  it('extracts handler from submit event', () => {
    const node = mockElement('form', [directive('on', 'submit', 'handleSubmit')]);
    expect(extractHandler(node as never)).toBe('handleSubmit');
  });

  it('extracts handler from call expression', () => {
    const node = mockElement('button', [directive('on', 'click', 'doAction(item)')]);
    expect(extractHandler(node as never)).toBe('doAction');
  });

  it('returns null when no event handler', () => {
    const node = mockElement('button');
    expect(extractHandler(node as never)).toBeNull();
  });

  it('returns null for non-event directives', () => {
    const node = mockElement('div', [directive('if', undefined, 'show')]);
    expect(extractHandler(node as never)).toBeNull();
  });

  it('extracts handler from change event', () => {
    const node = mockElement('select', [directive('on', 'change', 'handleSort')]);
    expect(extractHandler(node as never)).toBe('handleSort');
  });
});

// ---------------------------------------------------------------------------
// extractDataAttributes
// ---------------------------------------------------------------------------

describe('extractDataAttributes', () => {
  it('extracts data-testid', () => {
    const node = mockElement('button', [attr('data-testid', 'submit-btn')]);
    expect(extractDataAttributes(node as never)).toEqual({ 'data-testid': 'submit-btn' });
  });

  it('extracts multiple data attributes', () => {
    const node = mockElement('button', [
      attr('data-testid', 'btn'),
      attr('data-action', 'submit'),
    ]);
    const attrs = extractDataAttributes(node as never);
    expect(attrs['data-testid']).toBe('btn');
    expect(attrs['data-action']).toBe('submit');
  });

  it('returns empty for no data attributes', () => {
    const node = mockElement('button', [attr('class', 'btn')]);
    expect(extractDataAttributes(node as never)).toEqual({});
  });

  it('ignores non-data attributes', () => {
    const node = mockElement('button', [
      attr('class', 'btn'),
      attr('id', 'my-btn'),
      attr('data-testid', 'test'),
    ]);
    const attrs = extractDataAttributes(node as never);
    expect(Object.keys(attrs)).toHaveLength(1);
    expect(attrs['data-testid']).toBe('test');
  });
});

// ---------------------------------------------------------------------------
// isConditional
// ---------------------------------------------------------------------------

describe('isConditional', () => {
  it('returns true for element with v-if', () => {
    const node = mockElement('button', [directive('if', undefined, 'show')]);
    expect(isConditional(node as never, [])).toBe(true);
  });

  it('returns true for element with v-else', () => {
    const node = mockElement('button', [directive('else')]);
    expect(isConditional(node as never, [])).toBe(true);
  });

  it('returns true for element with v-show', () => {
    const node = mockElement('div', [directive('show', undefined, 'visible')]);
    expect(isConditional(node as never, [])).toBe(true);
  });

  it('returns true when ancestor has v-if', () => {
    const ancestor = mockElement('div', [directive('if', undefined, 'show')]);
    const node = mockElement('button');
    expect(isConditional(node as never, [ancestor as never])).toBe(true);
  });

  it('returns false when no conditional directive', () => {
    const node = mockElement('button');
    expect(isConditional(node as never, [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDynamic
// ---------------------------------------------------------------------------

describe('isDynamic', () => {
  it('returns true when ancestor has v-for', () => {
    const ancestor = mockElement('div', [directive('for')]);
    expect(isDynamic([ancestor as never])).toBe(true);
  });

  it('returns false when no v-for ancestor', () => {
    const ancestor = mockElement('div');
    expect(isDynamic([ancestor as never])).toBe(false);
  });

  it('returns false with empty ancestors', () => {
    expect(isDynamic([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasEventDirective
// ---------------------------------------------------------------------------

describe('hasEventDirective', () => {
  it('returns true for @click', () => {
    const node = mockElement('div', [directive('on', 'click', 'handle')]);
    expect(hasEventDirective(node as never)).toBe(true);
  });

  it('returns true for @submit', () => {
    const node = mockElement('form', [directive('on', 'submit', 'handle')]);
    expect(hasEventDirective(node as never)).toBe(true);
  });

  it('returns false for non-event directive', () => {
    const node = mockElement('div', [directive('if', undefined, 'show')]);
    expect(hasEventDirective(node as never)).toBe(false);
  });

  it('returns false for no directives', () => {
    const node = mockElement('div');
    expect(hasEventDirective(node as never)).toBe(false);
  });

  it('returns false for unknown event types', () => {
    const node = mockElement('div', [directive('on', 'custom-event', 'handle')]);
    expect(hasEventDirective(node as never)).toBe(false);
  });
});
