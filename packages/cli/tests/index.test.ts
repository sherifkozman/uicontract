import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index.js';

describe('uic CLI', () => {
  it('should be importable', () => {
    expect(VERSION).toBe('0.0.0');
  });
});
