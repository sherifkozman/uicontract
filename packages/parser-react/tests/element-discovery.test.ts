/**
 * Unit tests for interactive element discovery via parseFile().
 * Tests which elements are found, their types, positions, and file path handling.
 */

import { describe, it, expect } from 'vitest';
import { parseFile } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = '/project';
const FILE = '/project/src/App.tsx';

function parse(source: string, file = FILE, root = ROOT) {
  return parseFile(source, file, root);
}

// ---------------------------------------------------------------------------
// Always-interactive element types
// ---------------------------------------------------------------------------

describe('element discovery', () => {
  describe('always-interactive elements', () => {
    it('finds button elements', () => {
      const elements = parse(
        `export default function App() { return <button>Click</button>; }`,
      );
      expect(elements).toHaveLength(1);
      expect(elements[0]!.type).toBe('button');
    });

    it('finds input elements', () => {
      const elements = parse(
        `export default function App() { return <input type="text" />; }`,
      );
      expect(elements).toHaveLength(1);
      expect(elements[0]!.type).toBe('input');
    });

    it('finds select elements', () => {
      const elements = parse(
        `export default function App() { return <select><option value="a">A</option></select>; }`,
      );
      expect(elements).toHaveLength(1);
      expect(elements[0]!.type).toBe('select');
    });

    it('finds textarea elements', () => {
      const elements = parse(
        `export default function App() { return <textarea placeholder="Write here" />; }`,
      );
      expect(elements).toHaveLength(1);
      expect(elements[0]!.type).toBe('textarea');
    });

    it('finds anchor elements', () => {
      const elements = parse(
        `export default function App() { return <a href="/about">About</a>; }`,
      );
      expect(elements).toHaveLength(1);
      expect(elements[0]!.type).toBe('a');
    });

    it('finds form elements', () => {
      const elements = parse(
        `export default function App() { return <form onSubmit={() => {}}><button>Submit</button></form>; }`,
      );
      const types = elements.map((e) => e.type);
      expect(types).toContain('form');
      expect(types).toContain('button');
    });
  });

  // ---------------------------------------------------------------------------
  // Generic elements - only interactive when they have event handlers
  // ---------------------------------------------------------------------------

  describe('generic elements with event handlers', () => {
    it('finds div with onClick', () => {
      const elements = parse(
        `export default function App() { const h = () => {}; return <div onClick={h}>text</div>; }`,
      );
      expect(elements).toHaveLength(1);
      expect(elements[0]!.type).toBe('div');
    });

    it('finds span with onClick', () => {
      const elements = parse(
        `export default function App() { return <span onClick={() => {}}>click</span>; }`,
      );
      expect(elements).toHaveLength(1);
      expect(elements[0]!.type).toBe('span');
    });

    it('finds label with onClick', () => {
      const elements = parse(
        `export default function App() { return <label onClick={() => {}}>label text</label>; }`,
      );
      expect(elements).toHaveLength(1);
      expect(elements[0]!.type).toBe('label');
    });

    it('does NOT find plain div without event handler', () => {
      const elements = parse(
        `export default function App() { return <div>text</div>; }`,
      );
      expect(elements).toHaveLength(0);
    });

    it('does NOT find plain span without event handler', () => {
      const elements = parse(
        `export default function App() { return <span>text</span>; }`,
      );
      expect(elements).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Custom React components (uppercase) - must NOT be discovered
  // ---------------------------------------------------------------------------

  describe('custom React components (uppercase tags)', () => {
    it('does NOT find uppercase custom components as elements', () => {
      const elements = parse(
        `function MyButton() { return <button>x</button>; }
         export default function App() { return <MyButton />; }`,
      );
      // <MyButton /> must not be in elements; <button> inside must be
      expect(elements).toHaveLength(1);
      expect(elements[0]!.type).toBe('button');
    });

    it('does NOT find member expression components (e.g. Icons.Close)', () => {
      const elements = parse(
        `import Icons from './icons';
         export default function App() { return <Icons.Close />; }`,
      );
      expect(elements).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple elements in one component
  // ---------------------------------------------------------------------------

  describe('multiple elements', () => {
    it('finds multiple elements in one component', () => {
      const elements = parse(
        `export default function App() {
          return <form onSubmit={() => {}}>
            <input type="text" />
            <button>Submit</button>
          </form>;
        }`,
      );
      expect(elements.length).toBeGreaterThanOrEqual(3); // form + input + button
    });

    it('finds elements across sibling components in the same file', () => {
      const elements = parse(
        `function Header() { return <button>Menu</button>; }
         function Footer() { return <a href="/privacy">Privacy</a>; }
         export default function Page() { return <div><Header /><Footer /></div>; }`,
      );
      expect(elements).toHaveLength(2);
      const types = elements.map((e) => e.type).sort();
      expect(types).toEqual(['a', 'button']);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases: empty / no-JSX files
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles empty file', () => {
      const elements = parse('', '/project/src/Empty.tsx', '/project');
      expect(elements).toHaveLength(0);
    });

    it('handles file with no JSX', () => {
      const elements = parse(
        `export const add = (a: number, b: number) => a + b;`,
        '/project/src/utils.ts',
        '/project',
      );
      expect(elements).toHaveLength(0);
    });

    it('handles file that only imports and re-exports', () => {
      const elements = parse(
        `export { default as Button } from './Button';
         export { default as Input } from './Input';`,
        '/project/src/index.ts',
        '/project',
      );
      expect(elements).toHaveLength(0);
    });

    it('handles TypeScript generics and complex syntax without crashing', () => {
      const source = `
        import React from 'react';
        function List<T extends { id: string }>({ items }: { items: T[] }) {
          return <ul>{items.map(i => <li key={i.id}>{String(i)}</li>)}</ul>;
        }
        export default List;
      `;
      // Should not throw; li is not an interactive element
      expect(() => parse(source)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Position information
  // ---------------------------------------------------------------------------

  describe('position information', () => {
    it('extracts correct line number', () => {
      const source = `export default function App() {\n  return <button>Click</button>;\n}`;
      const elements = parse(source);
      expect(elements).toHaveLength(1);
      expect(elements[0]!.line).toBe(2);
    });

    it('extracts positive column number (1-based)', () => {
      const source = `export default function App() {\n  return <button>Click</button>;\n}`;
      const elements = parse(source);
      expect(elements[0]!.column).toBeGreaterThan(0);
    });

    it('line numbers are non-zero', () => {
      const elements = parse(
        `export default function App() { return <button>Click</button>; }`,
      );
      expect(elements[0]!.line).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // File path handling
  // ---------------------------------------------------------------------------

  describe('file path handling', () => {
    it('produces relative file paths (strips project root)', () => {
      const elements = parse(
        `export default function App() { return <button>x</button>; }`,
        '/project/src/App.tsx',
        '/project',
      );
      expect(elements[0]!.filePath).toBe('src/App.tsx');
    });

    it('does not start with a leading slash', () => {
      const elements = parse(
        `export default function App() { return <button>x</button>; }`,
        '/project/src/components/Button.tsx',
        '/project',
      );
      expect(elements[0]!.filePath).not.toMatch(/^\//);
    });

    it('preserves nested directory structure in relative path', () => {
      const elements = parse(
        `export default function Page() { return <button>Go</button>; }`,
        '/project/src/app/settings/billing/page.tsx',
        '/project',
      );
      expect(elements[0]!.filePath).toBe('src/app/settings/billing/page.tsx');
    });
  });

  // ---------------------------------------------------------------------------
  // Event handler varieties (which handlers trigger detection for generic elements)
  // ---------------------------------------------------------------------------

  describe('event handler detection', () => {
    const handlerProps = [
      'onClick',
      'onSubmit',
      'onChange',
      'onFocus',
      'onBlur',
      'onKeyDown',
      'onKeyUp',
    ] as const;

    for (const prop of handlerProps) {
      it(`finds div with ${prop}`, () => {
        const elements = parse(
          `export default function App() { return <div ${prop}={() => {}}>x</div>; }`,
        );
        expect(elements).toHaveLength(1);
      });
    }
  });

  // ---------------------------------------------------------------------------
  // componentMap: custom components mapped to native element types
  // ---------------------------------------------------------------------------

  describe('componentMap', () => {
    function parseWithMap(
      source: string,
      componentMap: Record<string, string>,
      file = FILE,
      root = ROOT,
    ) {
      return parseFile(source, file, root, componentMap as Record<string, import('@uicontract/core').InteractiveElementType>);
    }

    it('discovers a mapped custom component as its native type', () => {
      const elements = parseWithMap(
        `export default function App() { return <Button onClick={handle}>Click</Button>; }`,
        { Button: 'button' },
      );
      expect(elements).toHaveLength(1);
      expect(elements[0]!.type).toBe('button');
    });

    it('discovers multiple mapped components', () => {
      const elements = parseWithMap(
        `export default function App() {
          return (
            <div>
              <TextInput placeholder="name" />
              <Link href="/home">Home</Link>
            </div>
          );
        }`,
        { TextInput: 'input', Link: 'a' },
      );
      expect(elements).toHaveLength(2);
      expect(elements[0]!.type).toBe('input');
      expect(elements[1]!.type).toBe('a');
    });

    it('skips uppercase components not in componentMap', () => {
      const elements = parseWithMap(
        `export default function App() { return <CustomButton>Click</CustomButton>; }`,
        { Button: 'button' }, // CustomButton is not mapped
      );
      expect(elements).toHaveLength(0);
    });

    it('still discovers native elements alongside mapped components', () => {
      const elements = parseWithMap(
        `export default function App() {
          return (
            <div>
              <button>Native</button>
              <IconButton onClick={handle}>Mapped</IconButton>
            </div>
          );
        }`,
        { IconButton: 'button' },
      );
      expect(elements).toHaveLength(2);
      expect(elements[0]!.type).toBe('button');
      expect(elements[1]!.type).toBe('button');
    });

    it('without componentMap, uppercase components are skipped (existing behavior)', () => {
      const elements = parse(
        `export default function App() { return <Button onClick={handle}>Click</Button>; }`,
      );
      expect(elements).toHaveLength(0);
    });
  });
});
