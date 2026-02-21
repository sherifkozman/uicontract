/**
 * Snapshot tests for the annotated-app fixture.
 *
 * Verifies that scanning the pre-annotated fixture produces elements
 * with the expected data-agent-id values already present as attributes.
 */

import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { ReactParser } from '@uic/parser-react';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const FIXTURES_DIR = path.resolve(__dirname, '../../../../fixtures');
const ANNOTATED_FIXTURE = path.join(FIXTURES_DIR, 'annotated-app');
const parser = new ReactParser();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Annotated fixture — annotated-app', () => {
  it('detects the annotated-app as a React project', async () => {
    const detected = await parser.detect(ANNOTATED_FIXTURE);
    expect(detected).toBe(true);
  });

  it('discovers all interactive elements across all files', async () => {
    const result = await parser.discover(ANNOTATED_FIXTURE, {});
    // Home page: button, input, a = 3
    // Settings page: form, 2 inputs, button, a = 5
    // Header component: 2 a, button = 3
    // Total = 11
    expect(result.elements.length).toBe(11);
  });

  it('every element has a data-agent-id attribute', async () => {
    const result = await parser.discover(ANNOTATED_FIXTURE, {});
    for (const el of result.elements) {
      expect(el.attributes['data-agent-id']).toBeDefined();
      expect(typeof el.attributes['data-agent-id']).toBe('string');
      expect(el.attributes['data-agent-id']!.length).toBeGreaterThan(0);
    }
  });

  it('home page elements have correct data-agent-id values', async () => {
    const result = await parser.discover(ANNOTATED_FIXTURE, {});
    const homeElements = result.elements.filter(
      (e) => e.filePath === 'src/app/page.tsx',
    );

    const ids = homeElements.map((e) => e.attributes['data-agent-id']);
    expect(ids).toContain('get-started.button');
    expect(ids).toContain('search.input');
    expect(ids).toContain('learn-more.a');
  });

  it('settings page elements have correct data-agent-id values', async () => {
    const result = await parser.discover(ANNOTATED_FIXTURE, {});
    const settingsElements = result.elements.filter(
      (e) => e.filePath === 'src/app/settings/page.tsx',
    );

    const ids = settingsElements.map((e) => e.attributes['data-agent-id']);
    expect(ids).toContain('settings.submit.form');
    expect(ids).toContain('settings.display-name.input');
    expect(ids).toContain('settings.email-address.input');
    expect(ids).toContain('settings.save-changes.button');
    expect(ids).toContain('settings.back-to-home.a');
  });

  it('header component elements have correct data-agent-id values', async () => {
    const result = await parser.discover(ANNOTATED_FIXTURE, {});
    const headerElements = result.elements.filter(
      (e) => e.filePath === 'src/components/Header.tsx',
    );

    const ids = headerElements.map((e) => e.attributes['data-agent-id']);
    expect(ids).toContain('header.home.a');
    expect(ids).toContain('header.settings.a');
    expect(ids).toContain('header.sign-out.button');
  });

  it('emits zero warnings for the well-formed annotated fixture', async () => {
    const result = await parser.discover(ANNOTATED_FIXTURE, {});
    expect(result.warnings).toHaveLength(0);
  });

  it('does not skip any files', async () => {
    const result = await parser.discover(ANNOTATED_FIXTURE, {});
    expect(result.metadata.filesSkipped).toBe(0);
  });

  it('all file paths are relative (no leading slash)', async () => {
    const result = await parser.discover(ANNOTATED_FIXTURE, {});
    for (const el of result.elements) {
      expect(el.filePath).not.toMatch(/^\//);
    }
  });

  it('extracts component names for all elements', async () => {
    const result = await parser.discover(ANNOTATED_FIXTURE, {});
    const withNames = result.elements.filter((e) => e.componentName !== null);
    expect(withNames.length).toBe(result.elements.length);
  });

  it('extracts routes for page file elements', async () => {
    const result = await parser.discover(ANNOTATED_FIXTURE, {});
    const homePageElements = result.elements.filter(
      (e) => e.filePath === 'src/app/page.tsx',
    );
    for (const el of homePageElements) {
      expect(el.route).toBe('/');
    }

    const settingsPageElements = result.elements.filter(
      (e) => e.filePath === 'src/app/settings/page.tsx',
    );
    for (const el of settingsPageElements) {
      expect(el.route).toBe('/settings');
    }
  });

  it('header component elements have null route (not under app/)', async () => {
    const result = await parser.discover(ANNOTATED_FIXTURE, {});
    const headerElements = result.elements.filter(
      (e) => e.filePath === 'src/components/Header.tsx',
    );
    for (const el of headerElements) {
      expect(el.route).toBeNull();
    }
  });

  it('matches the committed snapshot for annotated-app', async () => {
    const result = await parser.discover(ANNOTATED_FIXTURE, {});
    const stable = {
      elements: result.elements,
      warnings: result.warnings,
      filesScanned: result.metadata.filesScanned,
      filesSkipped: result.metadata.filesSkipped,
    };
    expect(stable).toMatchSnapshot();
  });
});
