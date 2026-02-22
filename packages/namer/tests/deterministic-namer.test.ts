import { describe, it, expect } from 'vitest';
import type { RawElement } from '@uicontract/core';
import { assignDeterministicName } from '../src/deterministic-namer.js';

const AGENT_ID_PATTERN = /^[a-z][a-z0-9.-]*$/;

function makeElement(overrides: Partial<RawElement> = {}): RawElement {
  return {
    type: 'button',
    filePath: 'src/components/Example.tsx',
    line: 10,
    column: 4,
    componentName: null,
    route: null,
    label: null,
    handler: null,
    attributes: {},
    conditional: false,
    dynamic: false,
    ...overrides,
  };
}

describe('assignDeterministicName', () => {
  describe('priority 1: route + label + type', () => {
    it('produces route.label.type when both route and label are present', () => {
      const el = makeElement({
        route: '/settings/billing',
        label: 'Pause subscription',
        type: 'button',
      });
      expect(assignDeterministicName(el)).toBe(
        'settings.billing.pause-subscription.button',
      );
    });

    it('prefers route+label over route+handler', () => {
      const el = makeElement({
        route: '/settings',
        label: 'Save',
        handler: 'handleSave',
        type: 'button',
      });
      expect(assignDeterministicName(el)).toBe('settings.save.button');
    });
  });

  describe('priority 2: route + handler + type', () => {
    it('produces route.handler.type when route+handler but no label', () => {
      const el = makeElement({
        route: '/settings/billing',
        handler: 'handleClick',
        type: 'button',
      });
      expect(assignDeterministicName(el)).toBe(
        'settings.billing.click.button',
      );
    });
  });

  describe('priority 3: component + label + type', () => {
    it('produces component.label.type when component+label but no route', () => {
      const el = makeElement({
        componentName: 'BillingSettings',
        label: 'Pause subscription',
        type: 'button',
      });
      expect(assignDeterministicName(el)).toBe(
        'billing-settings.pause-subscription.button',
      );
    });
  });

  describe('priority 4: component + handler + type', () => {
    it('produces component.handler.type with no route and no label', () => {
      const el = makeElement({
        componentName: 'BillingSettings',
        handler: 'handleClick',
        type: 'button',
      });
      expect(assignDeterministicName(el)).toBe(
        'billing-settings.click.button',
      );
    });
  });

  describe('priority 5: fallback', () => {
    it('uses component.type.line when only component is present', () => {
      const el = makeElement({
        componentName: 'BillingSettings',
        line: 42,
        type: 'button',
      });
      expect(assignDeterministicName(el)).toBe(
        'billing-settings.button.42',
      );
    });

    it('uses unknown.type.line when nothing is available', () => {
      const el = makeElement({ line: 99, type: 'input' });
      expect(assignDeterministicName(el)).toBe('unknown.input.99');
    });
  });

  describe('pattern validation', () => {
    it('always matches the agent ID pattern', () => {
      const elements: RawElement[] = [
        makeElement({ route: '/settings', label: 'Save', type: 'button' }),
        makeElement({ componentName: 'App', handler: 'onClick', type: 'a' }),
        makeElement({ line: 1, type: 'div' }),
        makeElement({
          route: '/dashboard',
          handler: 'handleSubmit',
          type: 'form',
        }),
      ];

      for (const el of elements) {
        const id = assignDeterministicName(el);
        expect(id).toMatch(AGENT_ID_PATTERN);
      }
    });
  });

  describe('stability', () => {
    it('produces the same output for the same input', () => {
      const el = makeElement({
        route: '/settings/billing',
        label: 'Pause subscription',
        type: 'button',
        componentName: 'BillingSettings',
        handler: 'handlePause',
      });

      const first = assignDeterministicName(el);
      const second = assignDeterministicName(el);
      expect(first).toBe(second);
    });
  });

  describe('edge cases', () => {
    it('handles root route with label but no component', () => {
      const el = makeElement({
        route: '/',
        label: 'Home',
        type: 'a',
      });
      // Root route "/" produces no route segments, so hasRoute is false.
      // No component either, so falls to fallback: unknown.type.line
      expect(assignDeterministicName(el)).toBe('unknown.a.10');
    });

    it('handles root route with label and component', () => {
      const el = makeElement({
        route: '/',
        label: 'Home',
        componentName: 'NavBar',
        type: 'a',
      });
      // Root route "/" has no segments, falls to component + label
      expect(assignDeterministicName(el)).toBe('nav-bar.home.a');
    });

    it('handles element with all fields populated', () => {
      const el = makeElement({
        route: '/settings',
        label: 'Submit',
        handler: 'handleSubmit',
        componentName: 'SettingsForm',
        type: 'button',
      });
      // Priority 1 wins: route + label + type
      expect(assignDeterministicName(el)).toBe('settings.submit.button');
    });
  });
});
