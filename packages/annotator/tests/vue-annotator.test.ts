import { describe, it, expect } from 'vitest';
import { annotateVueSource } from '../src/vue-annotator.js';
import type { AnnotationTarget } from '../src/jsx-annotator.js';

describe('annotateVueSource', () => {
  it('inserts data-agent-id on a button inside a Vue template', () => {
    const source = [
      '<template>',
      '  <button>Click me</button>',
      '</template>',
      '',
      '<script setup lang="ts">',
      '// component logic',
      '</script>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'app.click.button', line: 2, column: 3, type: 'button', sourceTagName: null },
    ];

    const result = annotateVueSource(source, targets);

    expect(result.annotatedSource).toContain(
      '<button data-agent-id="app.click.button">Click me</button>',
    );
    expect(result.modified).toBe(true);
    expect(result.annotationsApplied).toBe(1);
  });

  it('handles multiple elements in a Vue template', () => {
    const source = [
      '<template>',
      '  <div>',
      '    <input type="text" />',
      '    <button>Submit</button>',
      '  </div>',
      '</template>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'form.email.input', line: 3, column: 5, type: 'input', sourceTagName: null },
      { agentId: 'form.submit.button', line: 4, column: 5, type: 'button', sourceTagName: null },
    ];

    const result = annotateVueSource(source, targets);

    expect(result.annotatedSource).toContain(
      '<input data-agent-id="form.email.input" type="text" />',
    );
    expect(result.annotatedSource).toContain(
      '<button data-agent-id="form.submit.button">Submit</button>',
    );
    expect(result.annotationsApplied).toBe(2);
  });

  it('handles self-closing elements', () => {
    const source = [
      '<template>',
      '  <input />',
      '</template>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'test.input', line: 2, column: 3, type: 'input', sourceTagName: null },
    ];

    const result = annotateVueSource(source, targets);

    expect(result.annotatedSource).toContain(
      '<input data-agent-id="test.input" />',
    );
    expect(result.annotationsApplied).toBe(1);
  });

  it('preserves existing attributes on Vue elements', () => {
    const source = [
      '<template>',
      '  <button class="btn" @click="handleClick">Save</button>',
      '</template>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'form.save.button', line: 2, column: 3, type: 'button', sourceTagName: null },
    ];

    const result = annotateVueSource(source, targets);

    expect(result.annotatedSource).toContain(
      '<button data-agent-id="form.save.button" class="btn" @click="handleClick">Save</button>',
    );
    expect(result.annotationsApplied).toBe(1);
  });

  it('handles multiline Vue template tags', () => {
    const source = [
      '<template>',
      '  <button',
      '    class="btn"',
      '    @click="handleClick"',
      '  >',
      '    Save',
      '  </button>',
      '</template>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'form.save.button', line: 2, column: 3, type: 'button', sourceTagName: null },
    ];

    const result = annotateVueSource(source, targets);

    const lines = result.annotatedSource.split('\n');
    expect(lines[1]).toBe('  <button data-agent-id="form.save.button"');
    expect(result.annotationsApplied).toBe(1);
  });

  it('skips when correct data-agent-id already exists', () => {
    const source = [
      '<template>',
      '  <button data-agent-id="test.button">Click</button>',
      '</template>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'test.button', line: 2, column: 3, type: 'button', sourceTagName: null },
    ];

    const result = annotateVueSource(source, targets);

    expect(result.modified).toBe(false);
    expect(result.annotationsSkipped).toBe(1);
    expect(result.annotationsApplied).toBe(0);
  });

  it('updates incorrect data-agent-id value', () => {
    const source = [
      '<template>',
      '  <button data-agent-id="old.id">Click</button>',
      '</template>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'new.id', line: 2, column: 3, type: 'button', sourceTagName: null },
    ];

    const result = annotateVueSource(source, targets);

    expect(result.annotatedSource).toContain(
      '<button data-agent-id="new.id">Click</button>',
    );
    expect(result.annotationsApplied).toBe(1);
  });

  it('does not modify script or style blocks', () => {
    const source = [
      '<template>',
      '  <button>Click</button>',
      '</template>',
      '',
      '<script setup lang="ts">',
      'const msg = "hello"',
      '</script>',
      '',
      '<style scoped>',
      '.btn { color: red; }',
      '</style>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'test.button', line: 2, column: 3, type: 'button', sourceTagName: null },
    ];

    const result = annotateVueSource(source, targets);

    // Only the button in template should be annotated
    expect(result.annotationsApplied).toBe(1);
    // Script and style blocks should remain unchanged
    expect(result.annotatedSource).toContain('const msg = "hello"');
    expect(result.annotatedSource).toContain('.btn { color: red; }');
  });

  it('returns unmodified result with no targets', () => {
    const source = [
      '<template>',
      '  <button>Click</button>',
      '</template>',
    ].join('\n');

    const result = annotateVueSource(source, []);

    expect(result.annotatedSource).toBe(source);
    expect(result.modified).toBe(false);
  });

  it('handles Vue-specific directives alongside data-agent-id', () => {
    const source = [
      '<template>',
      '  <button v-if="showBtn" :disabled="isDisabled">Click</button>',
      '</template>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'cond.button', line: 2, column: 3, type: 'button', sourceTagName: null },
    ];

    const result = annotateVueSource(source, targets);

    expect(result.annotatedSource).toContain(
      '<button data-agent-id="cond.button" v-if="showBtn" :disabled="isDisabled">Click</button>',
    );
    expect(result.annotationsApplied).toBe(1);
  });

  it('handles a element (link) in Vue template', () => {
    const source = [
      '<template>',
      '  <a href="/home">Home</a>',
      '</template>',
    ].join('\n');

    const targets: AnnotationTarget[] = [
      { agentId: 'nav.home.a', line: 2, column: 3, type: 'a', sourceTagName: null },
    ];

    const result = annotateVueSource(source, targets);

    expect(result.annotatedSource).toContain(
      '<a data-agent-id="nav.home.a" href="/home">Home</a>',
    );
    expect(result.annotationsApplied).toBe(1);
  });
});
