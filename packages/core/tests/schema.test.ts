import { describe, it, expect } from 'vitest';
import {
  validateManifest,
  buildManifest,
  serializeManifest,
  deserializeManifest,
} from '../src/index.js';
import type { Manifest, NamedElement } from '../src/index.js';

function validManifest(): Manifest {
  return {
    schemaVersion: '1.0',
    generatedAt: '2025-01-15T10:30:00.000Z',
    generator: {
      name: 'uicontract',
      version: '0.1.0',
    },
    metadata: {
      framework: 'react',
      projectRoot: '/home/user/my-app',
      filesScanned: 42,
      elementsDiscovered: 3,
      warnings: 1,
    },
    elements: [
      {
        agentId: 'login.email-input',
        type: 'input',
        filePath: 'src/Login.tsx',
        line: 15,
        column: 8,
        componentName: 'LoginForm',
        route: '/login',
        label: 'Email address',
        handler: null,
        attributes: { 'data-testid': 'email-input' },
        conditional: false,
        dynamic: false,
        directive: null,
      },
      {
        agentId: 'login.submit-button',
        type: 'button',
        filePath: 'src/Login.tsx',
        line: 25,
        column: 8,
        componentName: 'LoginForm',
        route: '/login',
        label: 'Sign In',
        handler: 'handleSubmit',
        attributes: {},
        conditional: false,
        dynamic: false,
        directive: null,
      },
      {
        agentId: 'nav.home-link',
        type: 'a',
        filePath: 'src/Nav.tsx',
        line: 8,
        column: 6,
        componentName: 'Nav',
        route: null,
        label: 'Home',
        handler: null,
        attributes: {},
        conditional: false,
        dynamic: false,
        directive: null,
      },
    ],
  };
}

describe('validateManifest', () => {
  it('accepts a valid manifest', () => {
    const result = validateManifest(validManifest());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects non-object input', () => {
    const result = validateManifest('not an object');
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_TYPE');
  });

  it('rejects null input', () => {
    const result = validateManifest(null);
    expect(result.valid).toBe(false);
  });

  it('fails when schemaVersion is missing', () => {
    const manifest = validManifest();
    const partial = { ...manifest } as Record<string, unknown>;
    delete partial['schemaVersion'];

    const result = validateManifest(partial);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'schemaVersion')).toBe(true);
  });

  it('fails when schemaVersion has wrong format', () => {
    const manifest = validManifest();
    const modified = { ...manifest, schemaVersion: 'v1' };

    const result = validateManifest(modified);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_FORMAT')).toBe(true);
  });

  it('fails for future major version (2.0)', () => {
    const manifest = validManifest();
    const modified = { ...manifest, schemaVersion: '2.0' };

    const result = validateManifest(modified);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'VERSION_UNSUPPORTED')).toBe(true);
  });

  it('accepts forward-compatible minor version (1.5)', () => {
    const manifest = validManifest();
    const modified = { ...manifest, schemaVersion: '1.5' };

    const result = validateManifest(modified);
    expect(result.valid).toBe(true);
  });

  it('fails when agentId is empty', () => {
    const manifest = validManifest();
    manifest.elements[0] = { ...manifest.elements[0]!, agentId: '' };

    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'EMPTY_AGENT_ID')).toBe(true);
  });

  it('fails when agentId has invalid format (uppercase)', () => {
    const manifest = validManifest();
    manifest.elements[0] = { ...manifest.elements[0]!, agentId: 'Login.EmailInput' };

    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_AGENT_ID')).toBe(true);
  });

  it('fails when agentId starts with a number', () => {
    const manifest = validManifest();
    manifest.elements[0] = { ...manifest.elements[0]!, agentId: '1invalid' };

    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_AGENT_ID')).toBe(true);
  });

  it('fails on duplicate agentIds', () => {
    const manifest = validManifest();
    manifest.elements[1] = { ...manifest.elements[1]!, agentId: 'login.email-input' };

    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_AGENT_ID')).toBe(true);
  });

  it('fails when required element fields are missing', () => {
    const manifest = validManifest();
    // Replace element with one missing most fields
    const broken = { agentId: 'test.broken' } as unknown;
    manifest.elements = [broken as Manifest['elements'][0]];

    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('fails when elements is not an array', () => {
    const manifest = validManifest();
    const modified = { ...manifest, elements: 'not-an-array' };

    const result = validateManifest(modified);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'elements')).toBe(true);
  });

  it('fails when element is not an object', () => {
    const manifest = validManifest();
    manifest.elements = ['not-an-object' as unknown as Manifest['elements'][0]];

    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
  });

  it('fails when generator is missing', () => {
    const manifest = validManifest();
    const modified = { ...manifest } as Record<string, unknown>;
    delete modified['generator'];

    const result = validateManifest(modified);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'generator')).toBe(true);
  });

  it('fails when metadata is missing', () => {
    const manifest = validManifest();
    const modified = { ...manifest } as Record<string, unknown>;
    delete modified['metadata'];

    const result = validateManifest(modified);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'metadata')).toBe(true);
  });

  it('accepts empty elements array', () => {
    const manifest = validManifest();
    manifest.elements = [];
    manifest.metadata.elementsDiscovered = 0;

    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
  });

  it('fails when line is zero', () => {
    const manifest = validManifest();
    manifest.elements[0] = { ...manifest.elements[0]!, line: 0 };

    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
  });

  it('fails when column is negative', () => {
    const manifest = validManifest();
    manifest.elements[0] = { ...manifest.elements[0]!, column: -1 };

    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
  });

  it('fails when attributes values are not strings', () => {
    const manifest = validManifest();
    manifest.elements[0] = {
      ...manifest.elements[0]!,
      attributes: { key: 123 as unknown as string },
    };

    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
  });
});

describe('buildManifest', () => {
  it('creates a valid manifest from named elements', () => {
    const elements: NamedElement[] = [
      {
        agentId: 'app.submit-btn',
        type: 'button',
        filePath: 'src/App.tsx',
        line: 10,
        column: 5,
        componentName: 'App',
        route: '/',
        label: 'Submit',
        handler: 'handleSubmit',
        attributes: {},
        conditional: false,
        dynamic: false,
        directive: null,
      },
    ];

    const manifest = buildManifest({
      elements,
      framework: 'react',
      projectRoot: '/home/user/project',
      filesScanned: 10,
      warnings: 0,
      generatorVersion: '0.1.0',
    });

    expect(manifest.schemaVersion).toBe('1.0');
    expect(manifest.generator.name).toBe('uicontract');
    expect(manifest.generator.version).toBe('0.1.0');
    expect(manifest.metadata.framework).toBe('react');
    expect(manifest.metadata.filesScanned).toBe(10);
    expect(manifest.metadata.elementsDiscovered).toBe(1);
    expect(manifest.elements).toHaveLength(1);
    expect(manifest.elements[0]?.agentId).toBe('app.submit-btn');

    // Validate the built manifest
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
  });

  it('includes generatedAt as ISO string', () => {
    const manifest = buildManifest({
      elements: [],
      framework: 'vue',
      projectRoot: '/tmp',
      filesScanned: 0,
      warnings: 0,
      generatorVersion: '1.0.0',
    });

    expect(manifest.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('serializeManifest', () => {
  it('outputs valid pretty-printed JSON', () => {
    const manifest = validManifest();
    const json = serializeManifest(manifest);

    expect(json).toContain('\n');
    expect(json).toContain('  ');

    const parsed = JSON.parse(json) as unknown;
    expect(parsed).toEqual(manifest);
  });
});

describe('deserializeManifest', () => {
  it('round-trips correctly', () => {
    const original = validManifest();
    const json = serializeManifest(original);
    const restored = deserializeManifest(json);

    expect(restored).toEqual(original);
  });

  it('throws on invalid JSON', () => {
    expect(() => deserializeManifest('not json')).toThrow('Failed to parse manifest JSON');
  });

  it('throws on invalid manifest structure', () => {
    expect(() => deserializeManifest('{}')).toThrow('Invalid manifest');
  });

  it('throws on future major version', () => {
    const manifest = validManifest();
    manifest.schemaVersion = '2.0';
    const json = JSON.stringify(manifest);

    expect(() => deserializeManifest(json)).toThrow('Invalid manifest');
  });
});
