/**
 * Unit tests for Vue SFC template parsing.
 */

import { describe, it, expect } from 'vitest';
import { parseVueFile } from '../src/sfc-visitor.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parse(template: string, filePath = '/project/src/components/Test.vue') {
  const source = `<template>\n${template}\n</template>\n<script setup lang="ts">\n</script>`;
  return parseVueFile(source, filePath, '/project');
}

// ---------------------------------------------------------------------------
// Basic element discovery
// ---------------------------------------------------------------------------

describe('Basic element discovery', () => {
  it('discovers button elements', () => {
    const elements = parse('<button @click="handleClick">Click me</button>');
    expect(elements.length).toBe(1);
    expect(elements[0]!.type).toBe('button');
    expect(elements[0]!.label).toBe('Click me');
  });

  it('discovers input elements', () => {
    const elements = parse('<input placeholder="Search..." />');
    expect(elements.length).toBe(1);
    expect(elements[0]!.type).toBe('input');
    expect(elements[0]!.label).toBe('Search...');
  });

  it('discovers select elements', () => {
    const elements = parse('<select @change="handleSort"><option>A</option></select>');
    expect(elements.length).toBe(1);
    expect(elements[0]!.type).toBe('select');
  });

  it('discovers textarea elements', () => {
    const elements = parse('<textarea placeholder="Write here"></textarea>');
    expect(elements.length).toBe(1);
    expect(elements[0]!.type).toBe('textarea');
  });

  it('discovers anchor elements', () => {
    const elements = parse('<a href="/about">About</a>');
    expect(elements.length).toBe(1);
    expect(elements[0]!.type).toBe('a');
    expect(elements[0]!.label).toBe('About');
  });

  it('discovers form elements', () => {
    const elements = parse('<form @submit.prevent="handleSubmit"><button>Go</button></form>');
    expect(elements.length).toBe(2);
    const types = elements.map((e) => e.type);
    expect(types).toContain('form');
    expect(types).toContain('button');
  });

  it('discovers all interactive elements in a complex template', () => {
    const elements = parse(`
      <div>
        <form @submit.prevent="handleLogin">
          <input placeholder="Email" />
          <input type="password" placeholder="Password" />
          <button>Log In</button>
          <a href="/forgot">Forgot?</a>
        </form>
      </div>
    `);
    expect(elements.length).toBe(5); // form, 2 inputs, button, a
  });
});

// ---------------------------------------------------------------------------
// Event handler extraction
// ---------------------------------------------------------------------------

describe('Event handler extraction', () => {
  it('extracts @click handler name', () => {
    const elements = parse('<button @click="handleClick">Go</button>');
    expect(elements[0]!.handler).toBe('handleClick');
  });

  it('extracts v-on:click handler name', () => {
    const elements = parse('<button v-on:click="doSomething">Go</button>');
    expect(elements[0]!.handler).toBe('doSomething');
  });

  it('extracts @submit handler name', () => {
    const elements = parse('<form @submit.prevent="handleSubmit"><button>Go</button></form>');
    const form = elements.find((e) => e.type === 'form');
    expect(form?.handler).toBe('handleSubmit');
  });

  it('extracts handler with call expression', () => {
    const elements = parse('<button @click="doAction(item)">Go</button>');
    expect(elements[0]!.handler).toBe('doAction');
  });

  it('returns null when no event handler', () => {
    const elements = parse('<button>Static</button>');
    expect(elements[0]!.handler).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Label extraction
// ---------------------------------------------------------------------------

describe('Label extraction', () => {
  it('extracts aria-label over text content', () => {
    const elements = parse('<button @click="go" aria-label="Close dialog">X</button>');
    expect(elements[0]!.label).toBe('Close dialog');
  });

  it('extracts text content as label', () => {
    const elements = parse('<button @click="go">Save Changes</button>');
    expect(elements[0]!.label).toBe('Save Changes');
  });

  it('extracts placeholder from input', () => {
    const elements = parse('<input placeholder="Enter email" />');
    expect(elements[0]!.label).toBe('Enter email');
  });

  it('extracts placeholder from textarea', () => {
    const elements = parse('<textarea placeholder="Write here"></textarea>');
    expect(elements[0]!.label).toBe('Write here');
  });

  it('returns null when no label available', () => {
    const elements = parse('<button @click="go"></button>');
    expect(elements[0]!.label).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Component name extraction
// ---------------------------------------------------------------------------

describe('Component name extraction', () => {
  it('extracts component name from file path', () => {
    const elements = parse(
      '<button @click="go">Go</button>',
      '/project/src/components/MyButton.vue',
    );
    expect(elements[0]!.componentName).toBe('MyButton');
  });

  it('extracts name from pages/ file', () => {
    const elements = parse(
      '<button @click="go">Go</button>',
      '/project/pages/settings.vue',
    );
    expect(elements[0]!.componentName).toBe('settings');
  });
});

// ---------------------------------------------------------------------------
// Route extraction
// ---------------------------------------------------------------------------

describe('Route extraction', () => {
  it('extracts route from pages/index.vue', () => {
    const elements = parse(
      '<button @click="go">Go</button>',
      '/project/pages/index.vue',
    );
    expect(elements[0]!.route).toBe('/');
  });

  it('extracts route from pages/about.vue', () => {
    const elements = parse(
      '<a href="/about">About</a>',
      '/project/pages/about.vue',
    );
    expect(elements[0]!.route).toBe('/about');
  });

  it('extracts route from nested pages', () => {
    const elements = parse(
      '<button @click="go">Go</button>',
      '/project/pages/users/settings.vue',
    );
    expect(elements[0]!.route).toBe('/users/settings');
  });

  it('returns null for non-pages files', () => {
    const elements = parse(
      '<button @click="go">Go</button>',
      '/project/src/components/MyButton.vue',
    );
    expect(elements[0]!.route).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Conditional detection (v-if, v-else, v-show)
// ---------------------------------------------------------------------------

describe('Conditional detection', () => {
  it('marks v-if elements as conditional', () => {
    const elements = parse(`
      <div>
        <button v-if="isAdmin" @click="admin">Admin</button>
        <button @click="always">Always</button>
      </div>
    `);
    const admin = elements.find((e) => e.label === 'Admin');
    const always = elements.find((e) => e.label === 'Always');
    expect(admin?.conditional).toBe(true);
    expect(always?.conditional).toBe(false);
  });

  it('marks v-else elements as conditional', () => {
    const elements = parse(`
      <div>
        <button v-if="isAdmin" @click="admin">Admin</button>
        <button v-else @click="user">User</button>
      </div>
    `);
    for (const el of elements) {
      expect(el.conditional).toBe(true);
    }
  });

  it('marks v-show elements as conditional', () => {
    const elements = parse(`
      <div v-show="visible">
        <button @click="go">Go</button>
      </div>
    `);
    expect(elements[0]!.conditional).toBe(true);
  });

  it('marks child of v-if parent as conditional', () => {
    const elements = parse(`
      <div v-if="show">
        <button @click="go">Go</button>
      </div>
    `);
    expect(elements[0]!.conditional).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Dynamic detection (v-for)
// ---------------------------------------------------------------------------

describe('Dynamic detection', () => {
  it('marks elements inside v-for as dynamic', () => {
    const elements = parse(`
      <div v-for="item in items" :key="item.id">
        <button @click="select(item)">{{ item.name }}</button>
      </div>
    `);
    expect(elements[0]!.dynamic).toBe(true);
  });

  it('does not mark non-v-for elements as dynamic', () => {
    const elements = parse('<button @click="go">Static</button>');
    expect(elements[0]!.dynamic).toBe(false);
  });

  it('marks deeply nested v-for children as dynamic', () => {
    const elements = parse(`
      <div v-for="item in items" :key="item.id">
        <div>
          <a :href="item.url">Link</a>
        </div>
      </div>
    `);
    expect(elements[0]!.dynamic).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Data attribute extraction
// ---------------------------------------------------------------------------

describe('Data attribute extraction', () => {
  it('extracts data-testid attribute', () => {
    const elements = parse('<button @click="go" data-testid="submit-btn">Go</button>');
    expect(elements[0]!.attributes['data-testid']).toBe('submit-btn');
  });

  it('extracts multiple data attributes', () => {
    const elements = parse('<button @click="go" data-testid="btn" data-action="submit">Go</button>');
    expect(elements[0]!.attributes['data-testid']).toBe('btn');
    expect(elements[0]!.attributes['data-action']).toBe('submit');
  });

  it('returns empty object when no data attributes', () => {
    const elements = parse('<button @click="go">Go</button>');
    expect(Object.keys(elements[0]!.attributes)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Generic interactive elements
// ---------------------------------------------------------------------------

describe('Generic interactive elements', () => {
  it('captures div with @click event', () => {
    const elements = parse('<div @click="handleClick">Clickable div</div>');
    expect(elements.length).toBe(1);
    expect(elements[0]!.type).toBe('div');
  });

  it('does not capture div without event handler', () => {
    const elements = parse('<div>Just a div</div>');
    expect(elements.length).toBe(0);
  });

  it('captures span with @click event', () => {
    const elements = parse('<span @click="handleClick">Clickable span</span>');
    expect(elements.length).toBe(1);
    expect(elements[0]!.type).toBe('span');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('returns empty array for file with no template', () => {
    const source = '<script setup>\nconst x = 1;\n</script>';
    const elements = parseVueFile(source, '/project/src/Test.vue', '/project');
    expect(elements).toHaveLength(0);
  });

  it('returns empty array for empty template', () => {
    const elements = parse('');
    expect(elements).toHaveLength(0);
  });

  it('handles template with only non-interactive elements', () => {
    const elements = parse('<div><p>Hello</p><span>World</span></div>');
    expect(elements).toHaveLength(0);
  });

  it('produces relative file paths', () => {
    const elements = parse(
      '<button @click="go">Go</button>',
      '/project/src/components/Foo.vue',
    );
    expect(elements[0]!.filePath).toBe('src/components/Foo.vue');
    expect(elements[0]!.filePath).not.toMatch(/^\//);
  });

  it('handles combined conditional + dynamic', () => {
    const elements = parse(`
      <div v-for="item in items" :key="item.id">
        <button v-if="item.active" @click="select(item)">Select</button>
      </div>
    `);
    expect(elements[0]!.conditional).toBe(true);
    expect(elements[0]!.dynamic).toBe(true);
  });
});
