import { describe, it, expect } from 'vitest';
import type {
  InteractiveElementType,
  RawElement,
  NamedElement,
  ManifestElement,
  Manifest,
  ParserOptions,
  ParserWarning,
  DiscoveryResult,
  Parser,
} from '../src/index.js';

describe('types', () => {
  it('InteractiveElementType includes expected values', () => {
    const values: InteractiveElementType[] = [
      'button',
      'input',
      'select',
      'textarea',
      'a',
      'form',
      'div',
      'span',
      'img',
      'label',
    ];
    expect(values).toHaveLength(10);
  });

  it('RawElement has all required fields', () => {
    const el: RawElement = {
      type: 'button',
      filePath: 'src/App.tsx',
      line: 10,
      column: 5,
      componentName: 'App',
      route: '/',
      label: 'Submit',
      handler: 'handleSubmit',
      attributes: { 'data-testid': 'submit-btn' },
      conditional: false,
      dynamic: false,
      directive: null,
      sourceTagName: null,
    };
    expect(el.type).toBe('button');
    expect(el.filePath).toBe('src/App.tsx');
  });

  it('RawElement accepts null for optional fields', () => {
    const el: RawElement = {
      type: 'button',
      filePath: 'src/App.tsx',
      line: 10,
      column: 5,
      componentName: null,
      route: null,
      label: null,
      handler: null,
      attributes: {},
      conditional: false,
      dynamic: false,
      directive: null,
      sourceTagName: null,
    };
    expect(el.componentName).toBeNull();
    expect(el.route).toBeNull();
  });

  it('RawElement sourceTagName holds component name for mapped elements', () => {
    const el: RawElement = {
      type: 'button',
      filePath: 'src/App.tsx',
      line: 10,
      column: 5,
      componentName: 'App',
      route: '/',
      label: 'Click',
      handler: null,
      attributes: {},
      conditional: false,
      dynamic: false,
      directive: null,
      sourceTagName: 'Button',
    };
    expect(el.sourceTagName).toBe('Button');
  });

  it('NamedElement extends RawElement with agentId', () => {
    const el: NamedElement = {
      agentId: 'app.submit.button',
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
      sourceTagName: null,
    };
    expect(el.agentId).toBe('app.submit.button');
  });

  it('ManifestElement has all required fields', () => {
    const el: ManifestElement = {
      agentId: 'app.submit-button',
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
      sourceTagName: null,
    };
    expect(el.agentId).toBe('app.submit-button');
  });

  it('Manifest has required structure', () => {
    const manifest: Manifest = {
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      generator: { name: 'uicontract', version: '0.3.0' },
      metadata: {
        framework: 'react',
        projectRoot: '/project',
        filesScanned: 5,
        elementsDiscovered: 10,
        warnings: 0,
      },
      elements: [],
    };
    expect(manifest.schemaVersion).toBe('1.0');
    expect(manifest.elements).toEqual([]);
  });

  it('ParserOptions fields are optional', () => {
    const opts: ParserOptions = {};
    expect(opts.include).toBeUndefined();
    expect(opts.exclude).toBeUndefined();
  });

  it('ParserWarning has required fields', () => {
    const warning: ParserWarning = {
      code: 'W001',
      message: 'Something happened',
      filePath: 'src/App.tsx',
    };
    expect(warning.code).toBe('W001');
    // line is optional
    expect(warning.line).toBeUndefined();
  });

  it('DiscoveryResult has required structure', () => {
    const result: DiscoveryResult = {
      elements: [],
      warnings: [],
      metadata: {
        filesScanned: 0,
        filesSkipped: 0,
        scanDurationMs: 0,
      },
    };
    expect(result.elements).toEqual([]);
    expect(result.metadata.filesScanned).toBe(0);
  });

  it('Parser interface shape is correct', () => {
    // Verify the interface compiles with a mock implementation
    const mockParser: Parser = {
      framework: 'react',
      detect: async (_dir: string) => false,
      discover: async (_dir: string, _options) => ({
        elements: [],
        warnings: [],
        metadata: { filesScanned: 0, filesSkipped: 0, scanDurationMs: 0 },
      }),
    };
    expect(mockParser.framework).toBe('react');
  });
});
