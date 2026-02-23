import { describe, it, expect } from 'vitest';
import type { RawElement } from '@uicontract/core';
import { nameElements } from '../src/index.js';

const AGENT_ID_PATTERN = /^[a-z][a-z0-9.-]*$/;

function makeElement(overrides: Partial<RawElement> = {}): RawElement {
  return {
    type: 'button',
    filePath: 'src/Example.tsx',
    line: 10,
    column: 4,
    componentName: null,
    route: null,
    label: null,
    handler: null,
    attributes: {},
    conditional: false,
    dynamic: false,
    directive: null,
    ...overrides,
  };
}

describe('nameElements', () => {
  it('returns empty array for empty input', async () => {
    expect(await nameElements([])).toEqual([]);
  });

  it('names a list of RawElements', async () => {
    const elements: RawElement[] = [
      makeElement({
        route: '/settings',
        label: 'Save',
        type: 'button',
        line: 10,
      }),
      makeElement({
        componentName: 'Dashboard',
        handler: 'handleRefresh',
        type: 'button',
        line: 20,
      }),
      makeElement({
        route: '/profile',
        label: 'Upload',
        type: 'input',
        line: 30,
      }),
    ];

    const result = await nameElements(elements);

    expect(result).toHaveLength(3);
    expect(result[0]?.agentId).toBe('settings.save.button');
    expect(result[1]?.agentId).toBe('dashboard.refresh.button');
    expect(result[2]?.agentId).toBe('profile.upload.input');
  });

  it('produces no duplicate IDs in result', async () => {
    const elements: RawElement[] = [
      makeElement({
        route: '/settings',
        label: 'Save',
        type: 'button',
        line: 10,
      }),
      makeElement({
        route: '/settings',
        label: 'Save',
        type: 'button',
        line: 20,
      }),
      makeElement({
        route: '/settings',
        label: 'Save',
        type: 'button',
        line: 30,
      }),
    ];

    const result = await nameElements(elements);
    const ids = result.map((e) => e.agentId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all IDs match the agent ID pattern', async () => {
    const elements: RawElement[] = [
      makeElement({
        route: '/settings/billing',
        label: 'Pause subscription',
        type: 'button',
        line: 1,
      }),
      makeElement({ componentName: 'App', type: 'div', line: 2 }),
      makeElement({ handler: 'onClick', type: 'a', line: 3 }),
      makeElement({ type: 'input', line: 4 }),
    ];

    const result = await nameElements(elements);
    for (const el of result) {
      expect(el.agentId).toMatch(AGENT_ID_PATTERN);
    }
  });

  it('preserves all original RawElement fields', async () => {
    const original = makeElement({
      route: '/test',
      label: 'Click',
      type: 'button',
      filePath: 'src/Test.tsx',
      line: 42,
      column: 8,
      componentName: 'TestComp',
      handler: 'handleClick',
      attributes: { 'data-testid': 'my-btn' },
      conditional: true,
      dynamic: true,
    });

    const result = await nameElements([original]);
    const named = result[0];
    expect(named).toBeDefined();
    expect(named?.filePath).toBe('src/Test.tsx');
    expect(named?.line).toBe(42);
    expect(named?.column).toBe(8);
    expect(named?.componentName).toBe('TestComp');
    expect(named?.handler).toBe('handleClick');
    expect(named?.attributes).toEqual({ 'data-testid': 'my-btn' });
    expect(named?.conditional).toBe(true);
    expect(named?.dynamic).toBe(true);
    expect(named?.type).toBe('button');
    expect(named?.route).toBe('/test');
    expect(named?.label).toBe('Click');
  });

  it('accepts NamerOptions without error', async () => {
    const elements: RawElement[] = [
      makeElement({ route: '/test', label: 'Go', type: 'button' }),
    ];
    // AI mode without an API key falls back to deterministic names
    const result = await nameElements(elements, { ai: true, aiTimeout: 5000 });
    expect(result).toHaveLength(1);
    expect(result[0]?.agentId).toMatch(AGENT_ID_PATTERN);
  });
});
