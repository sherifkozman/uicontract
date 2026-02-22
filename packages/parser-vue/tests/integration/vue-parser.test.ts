/**
 * Integration tests for VueParser.discover() against the vue-app fixture.
 */

import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { VueParser } from '../../src/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const FIXTURES_DIR = path.resolve(__dirname, '../../../../fixtures');
const parser = new VueParser();

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

describe('VueParser.detect()', () => {
  it('returns true for fixtures/vue-app (has vue dep in package.json)', async () => {
    const detected = await parser.detect(path.join(FIXTURES_DIR, 'vue-app'));
    expect(detected).toBe(true);
  });

  it('returns false for fixtures/react-app (no vue dep)', async () => {
    const detected = await parser.detect(path.join(FIXTURES_DIR, 'react-app'));
    expect(detected).toBe(false);
  });

  it('returns false for fixtures/react-minimal (no vue dep)', async () => {
    const detected = await parser.detect(path.join(FIXTURES_DIR, 'react-minimal'));
    expect(detected).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Discovery — vue-app fixture
// ---------------------------------------------------------------------------

describe('VueParser integration — vue-app', () => {
  const fixtureDir = path.join(FIXTURES_DIR, 'vue-app');

  it('discovers at least 15 interactive elements across all components', async () => {
    // LoginForm: form, 2 inputs, button, a = 5
    // UserList: button(Refresh), button(select), a(View), select = 4
    // ConditionalButtons: 3 buttons, form, input, textarea, button(Save) = 7
    // DataTable: 2 buttons(edit, delete), button(Add) = 3
    // pages/index: a, button = 2
    // pages/settings: form, input, select, 2 buttons = 5
    const result = await parser.discover(fixtureDir, {});
    expect(result.elements.length).toBeGreaterThanOrEqual(15);
  });

  it('emits zero warnings for the fixture', async () => {
    const result = await parser.discover(fixtureDir, {});
    expect(result.warnings).toHaveLength(0);
  });

  it('reports filesScanned > 0', async () => {
    const result = await parser.discover(fixtureDir, {});
    expect(result.metadata.filesScanned).toBeGreaterThan(0);
  });

  it('reports filesSkipped = 0', async () => {
    const result = await parser.discover(fixtureDir, {});
    expect(result.metadata.filesSkipped).toBe(0);
  });

  it('all file paths are relative (no leading slash)', async () => {
    const result = await parser.discover(fixtureDir, {});
    for (const el of result.elements) {
      expect(el.filePath).not.toMatch(/^\//);
    }
  });

  it('all elements have valid type values', async () => {
    const validTypes = new Set([
      'button', 'input', 'select', 'textarea', 'a', 'form',
      'div', 'span', 'img', 'label',
    ]);
    const result = await parser.discover(fixtureDir, {});
    for (const el of result.elements) {
      expect(validTypes.has(el.type)).toBe(true);
    }
  });

  it('all elements have positive line numbers', async () => {
    const result = await parser.discover(fixtureDir, {});
    for (const el of result.elements) {
      expect(el.line).toBeGreaterThan(0);
    }
  });

  it('extracts component names for all elements', async () => {
    const result = await parser.discover(fixtureDir, {});
    const withNames = result.elements.filter((e) => e.componentName !== null);
    expect(withNames.length).toBe(result.elements.length);
  });

  // -----------------------------------------------------------------------
  // Route extraction
  // -----------------------------------------------------------------------

  it('extracts / route for pages/index.vue', async () => {
    const result = await parser.discover(fixtureDir, {});
    const rootRouteElements = result.elements.filter((e) => e.route === '/');
    expect(rootRouteElements.length).toBeGreaterThanOrEqual(1);
  });

  it('extracts /settings route for pages/settings.vue', async () => {
    const result = await parser.discover(fixtureDir, {});
    const settingsElements = result.elements.filter((e) => e.route === '/settings');
    expect(settingsElements.length).toBeGreaterThanOrEqual(1);
  });

  it('returns null route for component files (not in pages/)', async () => {
    const result = await parser.discover(fixtureDir, {});
    const componentElements = result.elements.filter(
      (e) => e.filePath.includes('components/'),
    );
    for (const el of componentElements) {
      expect(el.route).toBeNull();
    }
  });

  // -----------------------------------------------------------------------
  // Conditional / Dynamic detection
  // -----------------------------------------------------------------------

  it('detects conditional elements (v-if, v-else, v-show)', async () => {
    const result = await parser.discover(fixtureDir, {});
    const conditionals = result.elements.filter((e) => e.conditional);
    // ConditionalButtons: v-if, v-else, v-show child
    // DataTable: v-if inside v-for
    expect(conditionals.length).toBeGreaterThanOrEqual(3);
  });

  it('detects dynamic elements (v-for)', async () => {
    const result = await parser.discover(fixtureDir, {});
    const dynamics = result.elements.filter((e) => e.dynamic);
    // UserList: button + a inside v-for
    // DataTable: edit + delete buttons inside v-for
    expect(dynamics.length).toBeGreaterThanOrEqual(2);
  });

  // -----------------------------------------------------------------------
  // Label and handler extraction
  // -----------------------------------------------------------------------

  it('extracts "Log In" label from LoginForm button', async () => {
    const result = await parser.discover(fixtureDir, {});
    const loginBtn = result.elements.find(
      (e) => e.type === 'button' && e.label === 'Log In',
    );
    expect(loginBtn).toBeDefined();
    expect(loginBtn!.componentName).toBe('LoginForm');
  });

  it('extracts aria-label "Refresh users" from UserList', async () => {
    const result = await parser.discover(fixtureDir, {});
    const refreshBtn = result.elements.find(
      (e) => e.type === 'button' && e.label === 'Refresh users',
    );
    expect(refreshBtn).toBeDefined();
  });

  it('extracts handler names from event directives', async () => {
    const result = await parser.discover(fixtureDir, {});
    const handlers = result.elements
      .map((e) => e.handler)
      .filter((h): h is string => h !== null);
    expect(handlers.length).toBeGreaterThan(3);
  });

  it('extracts data-testid from DataTable edit button', async () => {
    const result = await parser.discover(fixtureDir, {});
    const editBtn = result.elements.find(
      (e) => e.attributes['data-testid'] === 'edit-btn',
    );
    expect(editBtn).toBeDefined();
  });

  it('extracts "Delete account" aria-label from settings page', async () => {
    const result = await parser.discover(fixtureDir, {});
    const deleteBtn = result.elements.find(
      (e) => e.label === 'Delete account',
    );
    expect(deleteBtn).toBeDefined();
    expect(deleteBtn!.route).toBe('/settings');
  });
});

// ---------------------------------------------------------------------------
// Golden file test
// ---------------------------------------------------------------------------

describe('VueParser golden file — vue-app', () => {
  const fixtureDir = path.join(FIXTURES_DIR, 'vue-app');

  it('matches the committed snapshot for vue-app', async () => {
    const result = await parser.discover(fixtureDir, {});
    const stable = {
      elements: result.elements,
      warnings: result.warnings,
      filesScanned: result.metadata.filesScanned,
      filesSkipped: result.metadata.filesSkipped,
    };
    expect(stable).toMatchSnapshot();
  });
});
