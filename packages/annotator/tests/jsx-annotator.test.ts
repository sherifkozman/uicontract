import { describe, it, expect } from 'vitest';
import { annotateSource, type AnnotationTarget } from '../src/jsx-annotator.js';

describe('annotateSource', () => {
  it('inserts attribute on a simple self-closing tag', () => {
    const source = '<input />';
    const targets: AnnotationTarget[] = [
      { agentId: 'test.input', line: 1, column: 1, type: 'input', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotatedSource).toBe('<input data-agent-id="test.input" />');
    expect(result.modified).toBe(true);
    expect(result.annotationsApplied).toBe(1);
    expect(result.annotationsSkipped).toBe(0);
  });

  it('inserts attribute on an open tag', () => {
    const source = '<button>Click</button>';
    const targets: AnnotationTarget[] = [
      { agentId: 'test.button', line: 1, column: 1, type: 'button', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotatedSource).toBe(
      '<button data-agent-id="test.button">Click</button>',
    );
    expect(result.modified).toBe(true);
    expect(result.annotationsApplied).toBe(1);
  });

  it('inserts attribute on a tag with existing attributes', () => {
    const source = '<button className="btn">Click</button>';
    const targets: AnnotationTarget[] = [
      { agentId: 'test.btn', line: 1, column: 1, type: 'button', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotatedSource).toBe(
      '<button data-agent-id="test.btn" className="btn">Click</button>',
    );
    expect(result.annotationsApplied).toBe(1);
  });

  it('skips when correct data-agent-id already present', () => {
    const source = '<button data-agent-id="test.button">Click</button>';
    const targets: AnnotationTarget[] = [
      { agentId: 'test.button', line: 1, column: 1, type: 'button', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotatedSource).toBe(source);
    expect(result.modified).toBe(false);
    expect(result.annotationsApplied).toBe(0);
    expect(result.annotationsSkipped).toBe(1);
  });

  it('updates when data-agent-id exists with wrong value', () => {
    const source = '<button data-agent-id="old.id">Click</button>';
    const targets: AnnotationTarget[] = [
      { agentId: 'new.id', line: 1, column: 1, type: 'button', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotatedSource).toBe(
      '<button data-agent-id="new.id">Click</button>',
    );
    expect(result.modified).toBe(true);
    expect(result.annotationsApplied).toBe(1);
    expect(result.annotationsSkipped).toBe(0);
  });

  it('handles multiline JSX tags', () => {
    const source = [
      '<button',
      '  className="btn"',
      '  onClick={handleClick}',
      '>',
      '  Click me',
      '</button>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'test.multiline', line: 1, column: 1, type: 'button', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    const expected = [
      '<button data-agent-id="test.multiline"',
      '  className="btn"',
      '  onClick={handleClick}',
      '>',
      '  Click me',
      '</button>',
    ].join('\n');

    expect(result.annotatedSource).toBe(expected);
    expect(result.annotationsApplied).toBe(1);
  });

  it('handles multiple annotations on the same file', () => {
    const source = [
      '<div>',
      '  <button>Click</button>',
      '  <input />',
      '</div>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'test.button', line: 2, column: 3, type: 'button', sourceTagName: null },
      { agentId: 'test.input', line: 3, column: 3, type: 'input', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    const expected = [
      '<div>',
      '  <button data-agent-id="test.button">Click</button>',
      '  <input data-agent-id="test.input" />',
      '</div>',
    ].join('\n');

    expect(result.annotatedSource).toBe(expected);
    expect(result.annotationsApplied).toBe(2);
  });

  it('returns correct counts with mixed skip and apply', () => {
    const source = [
      '<button data-agent-id="a.btn">A</button>',
      '<button>B</button>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'a.btn', line: 1, column: 1, type: 'button', sourceTagName: null },
      { agentId: 'b.btn', line: 2, column: 1, type: 'button', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotationsApplied).toBe(1);
    expect(result.annotationsSkipped).toBe(1);
    expect(result.modified).toBe(true);
  });

  it('returns unmodified result when no targets provided', () => {
    const source = '<button>Click</button>';

    const result = annotateSource(source, []);

    expect(result.annotatedSource).toBe(source);
    expect(result.modified).toBe(false);
    expect(result.annotationsApplied).toBe(0);
    expect(result.annotationsSkipped).toBe(0);
  });

  it('handles indented tags with correct column', () => {
    const source = '    <input type="text" />';
    const targets: AnnotationTarget[] = [
      { agentId: 'form.email', line: 1, column: 5, type: 'input', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotatedSource).toBe(
      '    <input data-agent-id="form.email" type="text" />',
    );
    expect(result.annotationsApplied).toBe(1);
  });

  it('handles self-closing tags without space before />', () => {
    const source = '<input/>';
    const targets: AnnotationTarget[] = [
      { agentId: 'test.input', line: 1, column: 1, type: 'input', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotatedSource).toBe(
      '<input data-agent-id="test.input"/>',
    );
    expect(result.annotationsApplied).toBe(1);
  });

  it('handles tag at end of line (multiline continues next line)', () => {
    const source = [
      '<button',
      '>',
      '  Click',
      '</button>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'test.btn', line: 1, column: 1, type: 'button', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    const expected = [
      '<button data-agent-id="test.btn"',
      '>',
      '  Click',
      '</button>',
    ].join('\n');

    expect(result.annotatedSource).toBe(expected);
    expect(result.annotationsApplied).toBe(1);
  });

  it('handles multiline tag with existing data-agent-id on a different line', () => {
    const source = [
      '<button',
      '  data-agent-id="old.value"',
      '  className="btn"',
      '>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'new.value', line: 1, column: 1, type: 'button', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    const expected = [
      '<button',
      '  data-agent-id="new.value"',
      '  className="btn"',
      '>',
    ].join('\n');

    expect(result.annotatedSource).toBe(expected);
    expect(result.annotationsApplied).toBe(1);
  });

  it('preserves original source in result', () => {
    const source = '<button>Click</button>';
    const targets: AnnotationTarget[] = [
      { agentId: 'test.button', line: 1, column: 1, type: 'button', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    expect(result.originalSource).toBe(source);
    expect(result.annotatedSource).not.toBe(source);
  });

  it('skips targets with out-of-range line numbers', () => {
    const source = '<button>Click</button>';
    const targets: AnnotationTarget[] = [
      { agentId: 'test.button', line: 99, column: 1, type: 'button', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotatedSource).toBe(source);
    expect(result.modified).toBe(false);
    expect(result.annotationsApplied).toBe(0);
  });

  it('handles single-quoted data-agent-id values', () => {
    const source = "<button data-agent-id='old.id'>Click</button>";
    const targets: AnnotationTarget[] = [
      { agentId: 'new.id', line: 1, column: 1, type: 'button', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotatedSource).toBe(
      '<button data-agent-id="new.id">Click</button>',
    );
    expect(result.annotationsApplied).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // sourceTagName: componentMap elements use source tag name for matching
  // ---------------------------------------------------------------------------

  it('annotates a custom component tag when sourceTagName is provided', () => {
    const source = '<Button onClick={handle}>Click</Button>';
    const targets: AnnotationTarget[] = [
      { agentId: 'test.button', line: 1, column: 1, type: 'button', sourceTagName: 'Button' },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotatedSource).toBe(
      '<Button data-agent-id="test.button" onClick={handle}>Click</Button>',
    );
    expect(result.modified).toBe(true);
    expect(result.annotationsApplied).toBe(1);
  });

  it('annotates a self-closing custom component tag', () => {
    const source = '<TextInput placeholder="name" />';
    const targets: AnnotationTarget[] = [
      { agentId: 'form.name', line: 1, column: 1, type: 'input', sourceTagName: 'TextInput' },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotatedSource).toBe(
      '<TextInput data-agent-id="form.name" placeholder="name" />',
    );
    expect(result.annotationsApplied).toBe(1);
  });

  it('native element annotation still works with sourceTagName null', () => {
    const source = '<button>Click</button>';
    const targets: AnnotationTarget[] = [
      { agentId: 'test.native', line: 1, column: 1, type: 'button', sourceTagName: null },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotatedSource).toBe(
      '<button data-agent-id="test.native">Click</button>',
    );
    expect(result.annotationsApplied).toBe(1);
  });

  it('updates existing data-agent-id on a custom component tag', () => {
    const source = '<Button data-agent-id="old.id" onClick={handle}>Click</Button>';
    const targets: AnnotationTarget[] = [
      { agentId: 'new.id', line: 1, column: 1, type: 'button', sourceTagName: 'Button' },
    ];

    const result = annotateSource(source, targets);

    expect(result.annotatedSource).toBe(
      '<Button data-agent-id="new.id" onClick={handle}>Click</Button>',
    );
    expect(result.annotationsApplied).toBe(1);
  });
});
