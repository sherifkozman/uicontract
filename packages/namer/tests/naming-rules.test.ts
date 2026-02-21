import { describe, it, expect } from 'vitest';
import {
  sanitizeSegment,
  camelToKebab,
  routeToSegments,
  labelToSegment,
  handlerToSegment,
  componentToSegment,
} from '../src/naming-rules.js';

describe('camelToKebab', () => {
  it('converts simple camelCase', () => {
    expect(camelToKebab('handleClick')).toBe('handle-click');
  });

  it('converts PascalCase', () => {
    expect(camelToKebab('BillingSettings')).toBe('billing-settings');
  });

  it('converts consecutive uppercase (acronyms)', () => {
    expect(camelToKebab('MyHTTPClient')).toBe('my-http-client');
  });

  it('handles single word lowercase', () => {
    expect(camelToKebab('button')).toBe('button');
  });

  it('handles single uppercase letter', () => {
    expect(camelToKebab('A')).toBe('a');
  });

  it('handles empty string', () => {
    expect(camelToKebab('')).toBe('');
  });

  it('converts multi-word camelCase', () => {
    expect(camelToKebab('handlePauseSubscription')).toBe(
      'handle-pause-subscription',
    );
  });

  it('handles all uppercase', () => {
    expect(camelToKebab('HTTP')).toBe('http');
  });
});

describe('sanitizeSegment', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(sanitizeSegment('Hello World')).toBe('hello-world');
  });

  it('replaces underscores with hyphens', () => {
    expect(sanitizeSegment('my_variable_name')).toBe('my-variable-name');
  });

  it('handles camelCase by converting to kebab', () => {
    expect(sanitizeSegment('myVariableName')).toBe('my-variable-name');
  });

  it('removes special characters', () => {
    expect(sanitizeSegment('Click here!')).toBe('click-here');
  });

  it('collapses consecutive hyphens', () => {
    expect(sanitizeSegment('a---b')).toBe('a-b');
  });

  it('trims leading and trailing hyphens', () => {
    expect(sanitizeSegment('-hello-')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeSegment('')).toBe('');
  });

  it('strips leading digits', () => {
    expect(sanitizeSegment('123abc')).toBe('abc');
  });

  it('handles string with only special characters', () => {
    expect(sanitizeSegment('!!!')).toBe('');
  });

  it('handles string with only digits', () => {
    expect(sanitizeSegment('123')).toBe('');
  });

  it('handles mixed special chars and valid chars', () => {
    expect(sanitizeSegment('$pause@subscription!')).toBe('pause-subscription');
  });
});

describe('routeToSegments', () => {
  it('splits a normal route', () => {
    expect(routeToSegments('/settings/billing')).toEqual([
      'settings',
      'billing',
    ]);
  });

  it('handles root route', () => {
    expect(routeToSegments('/')).toEqual([]);
  });

  it('handles route with trailing slash', () => {
    expect(routeToSegments('/settings/')).toEqual(['settings']);
  });

  it('handles deeply nested route', () => {
    expect(routeToSegments('/a/b/c/d')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('sanitizes route segments', () => {
    expect(routeToSegments('/My Settings/Billing Info')).toEqual([
      'my-settings',
      'billing-info',
    ]);
  });

  it('filters out empty segments from double slashes', () => {
    expect(routeToSegments('/settings//billing')).toEqual([
      'settings',
      'billing',
    ]);
  });
});

describe('labelToSegment', () => {
  it('converts a label with spaces', () => {
    expect(labelToSegment('Pause subscription')).toBe('pause-subscription');
  });

  it('removes special characters from label', () => {
    expect(labelToSegment('Click here!')).toBe('click-here');
  });

  it('returns empty for empty label', () => {
    expect(labelToSegment('')).toBe('');
  });

  it('handles single word label', () => {
    expect(labelToSegment('Submit')).toBe('submit');
  });
});

describe('handlerToSegment', () => {
  it('strips handle prefix and converts', () => {
    expect(handlerToSegment('handlePauseSubscription')).toBe(
      'pause-subscription',
    );
  });

  it('strips on prefix and converts', () => {
    expect(handlerToSegment('onClick')).toBe('click');
  });

  it('handles handler without prefix', () => {
    expect(handlerToSegment('submit')).toBe('submit');
  });

  it('handles "handle" exactly (no stripping since nothing follows)', () => {
    // "handle" has length 6, stripped.length > 6 is false, so no stripping
    expect(handlerToSegment('handle')).toBe('handle');
  });

  it('handles "on" exactly (no stripping since nothing follows)', () => {
    expect(handlerToSegment('on')).toBe('on');
  });

  it('strips on prefix with uppercase following', () => {
    expect(handlerToSegment('onSubmit')).toBe('submit');
  });

  it('does not strip on when followed by lowercase', () => {
    // "onclick" - the char at index 2 is 'c' (lowercase), so no stripping
    expect(handlerToSegment('onclick')).toBe('onclick');
  });
});

describe('componentToSegment', () => {
  it('converts PascalCase component name', () => {
    expect(componentToSegment('BillingSettings')).toBe('billing-settings');
  });

  it('handles single-word component', () => {
    expect(componentToSegment('App')).toBe('app');
  });

  it('handles acronym component name', () => {
    expect(componentToSegment('MyHTTPClient')).toBe('my-http-client');
  });

  it('handles already lowercase', () => {
    expect(componentToSegment('sidebar')).toBe('sidebar');
  });
});
