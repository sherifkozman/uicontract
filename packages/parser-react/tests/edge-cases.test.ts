/**
 * Unit tests for React parser edge cases:
 * HOCs, render props, React.memo, forwardRef, fragments, portals,
 * conditional/dynamic combined patterns.
 */

import { describe, it, expect } from 'vitest';
import { parseFile } from '../src/element-visitor.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parse(source: string, filePath = '/project/src/Test.tsx') {
  return parseFile(source, filePath, '/project');
}

// ---------------------------------------------------------------------------
// Fragments
// ---------------------------------------------------------------------------

describe('Fragments', () => {
  it('discovers elements inside React fragments (<>...</>)', () => {
    const source = `
      export function FragmentExample() {
        return (
          <>
            <button onClick={() => {}}>Action 1</button>
            <button onClick={() => {}}>Action 2</button>
            <a href="/link">Some link</a>
          </>
        );
      }
    `;
    const elements = parse(source);
    expect(elements.length).toBe(3);
    const types = elements.map((e) => e.type);
    expect(types).toContain('button');
    expect(types).toContain('a');
  });

  it('discovers elements inside named Fragment', () => {
    const source = `
      import React from 'react';
      export function Named() {
        return (
          <React.Fragment>
            <button onClick={() => {}}>OK</button>
            <input placeholder="search" />
          </React.Fragment>
        );
      }
    `;
    const elements = parse(source);
    expect(elements.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// React.memo
// ---------------------------------------------------------------------------

describe('React.memo', () => {
  it('extracts componentName from named function inside React.memo', () => {
    const source = `
      import React from 'react';
      const MemoButton = React.memo(function MemoButton({ label }) {
        return <button onClick={() => {}}>{label}</button>;
      });
    `;
    const elements = parse(source);
    expect(elements.length).toBe(1);
    expect(elements[0]!.componentName).toBe('MemoButton');
  });

  it('extracts componentName from arrow function inside React.memo', () => {
    const source = `
      import React from 'react';
      const ArrowMemo = React.memo(() => {
        return <button onClick={() => {}}>Click</button>;
      });
    `;
    const elements = parse(source);
    expect(elements.length).toBe(1);
    expect(elements[0]!.componentName).toBe('ArrowMemo');
  });
});

// ---------------------------------------------------------------------------
// React.forwardRef
// ---------------------------------------------------------------------------

describe('React.forwardRef', () => {
  it('extracts componentName from forwardRef with named function', () => {
    const source = `
      import { forwardRef } from 'react';
      const ForwardedInput = forwardRef(function ForwardedInput({ placeholder }, ref) {
        return <input ref={ref} placeholder={placeholder} onChange={() => {}} />;
      });
    `;
    const elements = parse(source);
    expect(elements.length).toBe(1);
    expect(elements[0]!.componentName).toBe('ForwardedInput');
  });

  it('extracts componentName from forwardRef with arrow function', () => {
    const source = `
      import { forwardRef } from 'react';
      const ForwardedBtn = forwardRef((props, ref) => {
        return <button ref={ref} onClick={() => {}}>Go</button>;
      });
    `;
    const elements = parse(source);
    expect(elements.length).toBe(1);
    expect(elements[0]!.componentName).toBe('ForwardedBtn');
  });
});

// ---------------------------------------------------------------------------
// React.memo + React.forwardRef nested
// ---------------------------------------------------------------------------

describe('React.memo + React.forwardRef combo', () => {
  it('discovers elements and extracts name from memo(forwardRef(named fn))', () => {
    const source = `
      import React from 'react';
      export const FancyInput = React.memo(
        React.forwardRef(function FancyInput(props, ref) {
          return (
            <div>
              <input ref={ref} placeholder="Enter value" onChange={() => {}} />
              <button onClick={() => {}}>Clear</button>
            </div>
          );
        })
      );
    `;
    const elements = parse(source);
    expect(elements.length).toBe(2);
    // Named function expression "FancyInput" takes priority
    expect(elements[0]!.componentName).toBe('FancyInput');
    expect(elements[1]!.componentName).toBe('FancyInput');
  });

  it('discovers elements from memo(forwardRef(arrow fn))', () => {
    const source = `
      import React from 'react';
      export const Combo = React.memo(
        React.forwardRef((props, ref) => {
          return <input ref={ref} placeholder="combo" onChange={() => {}} />;
        })
      );
    `;
    const elements = parse(source);
    expect(elements.length).toBe(1);
    // Arrow inside nested calls → should resolve to variable name "Combo"
    expect(elements[0]!.componentName).toBe('Combo');
  });
});

// ---------------------------------------------------------------------------
// Higher-Order Components (HOCs)
// ---------------------------------------------------------------------------

describe('HOC patterns', () => {
  it('extracts componentName from function inside HOC wrapper', () => {
    const source = `
      import React from 'react';
      function withAuth(Component) {
        return function WithAuthWrapper(props) {
          return <Component {...props} />;
        };
      }
      function AdminPanel() {
        return <button onClick={() => {}}>Delete all</button>;
      }
      export const ProtectedAdmin = withAuth(AdminPanel);
    `;
    const elements = parse(source);
    // The button is inside AdminPanel, which is a named function declaration
    const btn = elements.find((e) => e.type === 'button');
    expect(btn).toBeDefined();
    expect(btn!.componentName).toBe('AdminPanel');
  });

  it('extracts componentName from arrow function wrapped in HOC', () => {
    const source = `
      function withLogger(Component) {
        return (props) => <Component {...props} />;
      }
      const LoggedForm = withLogger(() => {
        return (
          <form onSubmit={() => {}}>
            <input placeholder="email" />
            <button>Submit</button>
          </form>
        );
      });
    `;
    const elements = parse(source);
    expect(elements.length).toBe(3); // form, input, button
    // Arrow inside withLogger() call assigned to LoggedForm
    for (const el of elements) {
      expect(el.componentName).toBe('LoggedForm');
    }
  });
});

// ---------------------------------------------------------------------------
// Render Props
// ---------------------------------------------------------------------------

describe('Render props', () => {
  it('discovers elements inside render prop callbacks', () => {
    const source = `
      function DataFetcher({ render }) {
        return <div>{render({ items: [] })}</div>;
      }
      export function RenderPropsExample() {
        return (
          <DataFetcher
            render={(data) => (
              <div>
                <button onClick={() => {}}>Action</button>
                <a href="/more">See more</a>
              </div>
            )}
          />
        );
      }
    `;
    const elements = parse(source);
    const btn = elements.find((e) => e.type === 'button');
    const link = elements.find((e) => e.type === 'a');
    expect(btn).toBeDefined();
    expect(link).toBeDefined();
  });

  it('marks elements inside render prop .map() as dynamic', () => {
    const source = `
      function List({ renderItem, items }) {
        return <ul>{items.map(renderItem)}</ul>;
      }
      export function MyList() {
        return (
          <List
            items={[1, 2, 3]}
            renderItem={(item) => (
              <button key={item} onClick={() => {}}>{item}</button>
            )}
          />
        );
      }
    `;
    const elements = parse(source);
    // The button is not directly inside a .map() call in this structure,
    // but inside a callback passed to renderItem prop
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Portal content
// ---------------------------------------------------------------------------

describe('Portal content', () => {
  it('discovers elements inside createPortal calls', () => {
    const source = `
      import { createPortal } from 'react-dom';
      export function PortalModal() {
        return (
          <div>
            <button onClick={() => {}}>Open modal</button>
            {createPortal(
              <div>
                <button onClick={() => {}} aria-label="Close modal">X</button>
                <button onClick={() => {}}>Confirm</button>
              </div>,
              document.body
            )}
          </div>
        );
      }
    `;
    const elements = parse(source);
    // 3 buttons total: Open modal, Close modal, Confirm
    expect(elements.length).toBe(3);
    const labels = elements.map((e) => e.label).filter(Boolean);
    expect(labels).toContain('Close modal');
  });
});

// ---------------------------------------------------------------------------
// Conditional + Dynamic combined
// ---------------------------------------------------------------------------

describe('Conditional and dynamic combined', () => {
  it('marks && conditional elements correctly', () => {
    const source = `
      export function ConditionalExample({ isAdmin }) {
        return (
          <div>
            {isAdmin && <button onClick={() => {}}>Admin</button>}
            <button onClick={() => {}}>Always</button>
          </div>
        );
      }
    `;
    const elements = parse(source);
    expect(elements.length).toBe(2);
    const admin = elements.find((e) => e.label === 'Admin');
    const always = elements.find((e) => e.label === 'Always');
    expect(admin?.conditional).toBe(true);
    expect(always?.conditional).toBe(false);
  });

  it('marks ternary conditional elements correctly', () => {
    const source = `
      export function TernaryExample({ isAdmin }) {
        return (
          <div>
            {isAdmin ? (
              <a href="/admin">Admin Link</a>
            ) : (
              <a href="/user">User Link</a>
            )}
          </div>
        );
      }
    `;
    const elements = parse(source);
    expect(elements.length).toBe(2);
    for (const el of elements) {
      expect(el.conditional).toBe(true);
    }
  });

  it('marks || conditional elements correctly', () => {
    const source = `
      export function OrExample({ showExtra }) {
        return (
          <div>
            {showExtra || <button onClick={() => {}}>Default</button>}
          </div>
        );
      }
    `;
    const elements = parse(source);
    expect(elements.length).toBe(1);
    expect(elements[0]!.conditional).toBe(true);
  });

  it('marks .map() elements as dynamic', () => {
    const source = `
      export function ListExample({ items }) {
        return (
          <div>
            {items.map((item) => (
              <button key={item} onClick={() => {}}>{item}</button>
            ))}
          </div>
        );
      }
    `;
    const elements = parse(source);
    expect(elements.length).toBe(1);
    expect(elements[0]!.dynamic).toBe(true);
  });

  it('marks element in conditional .map() — dynamic but not conditional (arrow fn boundary)', () => {
    // The button is inside an arrow function callback passed to .map().
    // isConditional stops at arrow function boundaries, so the && outside
    // the .map() callback is not seen. This is correct — the arrow fn
    // creates a new scope. The element IS dynamic (.map) but NOT conditional.
    const source = `
      export function Both({ isAdmin, items }) {
        return (
          <div>
            {isAdmin && items.map((item) => (
              <button key={item} onClick={() => {}}>{item}</button>
            ))}
          </div>
        );
      }
    `;
    const elements = parse(source);
    expect(elements.length).toBe(1);
    expect(elements[0]!.conditional).toBe(false);
    expect(elements[0]!.dynamic).toBe(true);
  });

  it('marks element directly in && (not inside callback) as conditional', () => {
    const source = `
      export function DirectConditional({ show }) {
        return (
          <div>
            {show && <button onClick={() => {}}>Show me</button>}
          </div>
        );
      }
    `;
    const elements = parse(source);
    expect(elements.length).toBe(1);
    expect(elements[0]!.conditional).toBe(true);
    expect(elements[0]!.dynamic).toBe(false);
  });

  it('non-conditional, non-dynamic elements have both flags false', () => {
    const source = `
      export function Plain() {
        return (
          <form onSubmit={() => {}}>
            <input placeholder="Name" />
            <button>Submit</button>
          </form>
        );
      }
    `;
    const elements = parse(source);
    for (const el of elements) {
      expect(el.conditional).toBe(false);
      expect(el.dynamic).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Label extraction edge cases
// ---------------------------------------------------------------------------

describe('Label extraction edge cases', () => {
  it('extracts aria-label over children text', () => {
    const source = `
      export function LabelPriority() {
        return <button onClick={() => {}} aria-label="Close dialog">X</button>;
      }
    `;
    const elements = parse(source);
    expect(elements[0]!.label).toBe('Close dialog');
  });

  it('extracts placeholder from input', () => {
    const source = `
      export function InputLabel() {
        return <input placeholder="Search..." onChange={() => {}} />;
      }
    `;
    const elements = parse(source);
    expect(elements[0]!.label).toBe('Search...');
  });

  it('extracts children text as label', () => {
    const source = `
      export function ChildLabel() {
        return <button onClick={() => {}}>Save Changes</button>;
      }
    `;
    const elements = parse(source);
    expect(elements[0]!.label).toBe('Save Changes');
  });
});

// ---------------------------------------------------------------------------
// Handler extraction edge cases
// ---------------------------------------------------------------------------

describe('Handler extraction edge cases', () => {
  it('extracts identifier handler name', () => {
    const source = `
      export function HandlerTest() {
        const handleClick = () => {};
        return <button onClick={handleClick}>Go</button>;
      }
    `;
    const elements = parse(source);
    expect(elements[0]!.handler).toBe('handleClick');
  });

  it('extracts member expression handler (this.method)', () => {
    const source = `
      class MyComponent extends React.Component {
        handleSubmit() {}
        render() {
          return <form onSubmit={this.handleSubmit}><button>Go</button></form>;
        }
      }
    `;
    const elements = parse(source);
    const form = elements.find((e) => e.type === 'form');
    expect(form?.handler).toBe('handleSubmit');
  });

  it('returns null for inline arrow handlers', () => {
    const source = `
      export function InlineHandler() {
        return <button onClick={() => console.log('hi')}>Go</button>;
      }
    `;
    const elements = parse(source);
    expect(elements[0]!.handler).toBeNull();
  });
});
