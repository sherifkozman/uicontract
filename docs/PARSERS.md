# Parser Documentation

Parsers are the framework-specific layer of UI Contracts. Each parser knows how to scan a project directory, detect whether a given framework is in use, and discover all interactive UI elements.

## Supported Frameworks

| Framework | Package | Auto-Detection |
|-----------|---------|---------------|
| React / Next.js | `@uicontract/parser-react` | Checks for `react` in `package.json` dependencies |
| Vue / Nuxt | `@uicontract/parser-vue` | Checks for `vue` in `package.json` dependencies |

Both parsers are built-in and registered automatically by the CLI.

## Parser Interface

Every parser must implement the `Parser` interface from `@uicontract/core`:

```typescript
interface Parser {
  /** Unique framework identifier (e.g., "react", "vue", "svelte") */
  readonly framework: string;

  /** Detect if a directory uses this framework */
  detect(dir: string): Promise<boolean>;

  /** Discover all interactive elements in the project */
  discover(dir: string, options: ParserOptions): Promise<DiscoveryResult>;
}
```

### ParserOptions

```typescript
interface ParserOptions {
  include?: string[];   // Glob patterns for files to include
  exclude?: string[];   // Glob patterns for files to exclude
  maxDepth?: number;    // Maximum directory traversal depth
}
```

### DiscoveryResult

```typescript
interface DiscoveryResult {
  elements: RawElement[];
  warnings: ParserWarning[];
  metadata: {
    filesScanned: number;
    filesSkipped: number;
    scanDurationMs: number;
  };
}
```

### RawElement

Each discovered element contains:

```typescript
interface RawElement {
  type: InteractiveElementType;  // "button", "input", "a", "form", etc.
  filePath: string;              // Relative path to source file
  line: number;                  // Line number in source
  column: number;                // Column number in source
  componentName: string | null;  // React/Vue component name
  route: string | null;          // Inferred route (from file-based routing)
  label: string | null;          // User-visible label text
  handler: string | null;        // Event handler name (e.g., "handleClick")
  attributes: Record<string, string>;  // HTML attributes (data-testid, etc.)
  conditional: boolean;          // true if rendered conditionally
  dynamic: boolean;              // true if dynamically generated
  sourceTagName: string | null;  // Original JSX tag name for componentMap elements
}
```

### Supported Element Types

```typescript
type InteractiveElementType =
  | 'button'    // <button>, elements with onClick
  | 'input'     // <input> of any type
  | 'select'    // <select> dropdowns
  | 'textarea'  // <textarea> fields
  | 'a'         // <a> links
  | 'form'      // <form> elements
  | 'div'       // <div> with event handlers
  | 'span'      // <span> with event handlers
  | 'img'       // <img> with event handlers
  | 'label';    // <label> elements
```

### ParserWarning

```typescript
interface ParserWarning {
  code: string;       // Machine-readable code (e.g., "PARSE_ERROR")
  message: string;    // Human-readable description
  filePath: string;   // File that triggered the warning
  line?: number;      // Optional line number
}
```

## How Auto-Detection Works

When `uicontract scan` is invoked without `--framework`, the CLI calls `ParserRegistry.detect()`, which iterates through all registered parsers and calls each parser's `detect()` method. The first parser that returns `true` is selected.

Detection order is determined by registration order. Built-in parsers are registered first (React, then Vue), followed by any plugins from `.uicrc.json`.

Each parser's `detect()` typically checks:
1. Whether the framework appears in `package.json` dependencies
2. Whether framework-specific config files exist (e.g., `next.config.js`, `nuxt.config.ts`)

## Element Discovery Rules

### Always Interactive

These JSX/template elements are always considered interactive:

- `<button>` - always interactive
- `<input>` - always interactive
- `<select>` - always interactive
- `<textarea>` - always interactive
- `<a>` - always interactive (links)
- `<form>` - always interactive

### Conditionally Interactive

These elements are only interactive when they have event handlers:

- `<div>` - only with `onClick`, `onSubmit`, etc.
- `<span>` - only with event handlers
- `<img>` - only with `onClick`
- `<label>` - only with `htmlFor` or `onClick`

### Context Extraction

Parsers extract contextual information for each element:

**Route inference:** For file-based routing frameworks (Next.js, Nuxt), the parser infers routes from the file path. For example, `src/app/settings/billing/page.tsx` maps to `/settings/billing`.

**Label extraction:** Parsers look for:
- Direct text children: `<button>Submit</button>` - label: "Submit"
- `aria-label` attribute
- `title` attribute
- `placeholder` for inputs
- `alt` for images

**Handler extraction:** Parsers extract the name of the event handler function:
- `onClick={handleSubmit}` - handler: "handleSubmit"
- `onClick={() => submit()}` - handler: "submit" (when possible)
- `@click="onLogin"` (Vue) - handler: "onLogin"

**Component name:** Extracted from the function/class declaration or the default export.

## Write Your Own Parser

Follow these steps to create a third-party parser plugin for UI Contracts.

### Step 1: Create the Package

```bash
mkdir uic-parser-svelte
cd uic-parser-svelte
pnpm init
```

Your `package.json` should include `@uicontract/core` as a peer dependency:

```json
{
  "name": "uic-parser-svelte",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@uicontract/core": ">=0.3.0"
  }
}
```

### Step 2: Implement the Parser Interface

```typescript
// src/index.ts
import type { Parser, ParserOptions, DiscoveryResult } from '@uicontract/core';

export const svelteParser: Parser = {
  framework: 'svelte',

  async detect(dir: string): Promise<boolean> {
    // Check for svelte in package.json dependencies
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    try {
      const pkgPath = path.join(dir, 'package.json');
      const raw = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      const deps = {
        ...(pkg['dependencies'] as Record<string, string> | undefined),
        ...(pkg['devDependencies'] as Record<string, string> | undefined),
      };
      return 'svelte' in deps;
    } catch {
      return false;
    }
  },

  async discover(dir: string, options: ParserOptions): Promise<DiscoveryResult> {
    // Scan .svelte files, parse templates, extract interactive elements
    // Return RawElement[] with source locations, labels, handlers, etc.
    return {
      elements: [],
      warnings: [],
      metadata: { filesScanned: 0, filesSkipped: 0, scanDurationMs: 0 },
    };
  },
};

// Export as default AND named export for maximum compatibility
export default svelteParser;
export { svelteParser as parser };
```

### Step 3: Export the Parser

The plugin loader tries three export patterns in order:

1. **Default export** - `export default myParser`
2. **Named `parser` export** - `export { myParser as parser }`
3. **Module object itself** - for CommonJS modules that directly export a Parser

At least one of these must be a valid `Parser` object.

### Step 4: Register via Configuration

Users install your package and add it to `.uicrc.json`:

```bash
pnpm add uic-parser-svelte
```

```json
{
  "plugins": ["uic-parser-svelte"]
}
```

The CLI loads plugins at startup, validates they implement `Parser`, and registers them in the parser registry.

### Step 5: Test with Fixtures

Create a minimal fixture app for your framework:

```
fixtures/svelte-app/
  package.json          # with svelte dependency
  src/
    App.svelte          # components with interactive elements
    routes/
      +page.svelte      # file-based routing
```

Write tests that scan the fixture and verify discovered elements:

```typescript
import { describe, it, expect } from 'vitest';
import { svelteParser } from '../src/index.js';

describe('svelteParser', () => {
  it('detects svelte projects', async () => {
    expect(await svelteParser.detect('fixtures/svelte-app')).toBe(true);
    expect(await svelteParser.detect('fixtures/react-app')).toBe(false);
  });

  it('discovers interactive elements', async () => {
    const result = await svelteParser.discover('fixtures/svelte-app', {});
    expect(result.elements.length).toBeGreaterThan(0);
    expect(result.elements[0]?.type).toBeDefined();
    expect(result.elements[0]?.filePath).toBeDefined();
  });
});
```

### Parser Conventions

- **Never throw on unexpected input.** Return the element list with a `warnings` array for anything the parser could not handle.
- **Relative paths.** `filePath` should be relative to the project root passed to `discover()`.
- **Accurate source locations.** `line` and `column` should point to the opening tag of the element.
- **Meaningful labels.** Extract user-visible text content, `aria-label`, `title`, or `placeholder` when available.
- **Skip test files.** Exclude `*.test.*`, `*.spec.*`, `__tests__/`, and `__mocks__/` by default.
- **Performance.** Parsers should handle projects with 1000+ files. Use streaming file reads when possible.

## Testing Parsers

### Golden File Pattern

Commit a fixture app's expected manifest as a snapshot. When parser logic changes, the snapshot test fails, forcing an intentional review of the change:

```typescript
it('matches golden file', async () => {
  const result = await myParser.discover('fixtures/my-app', {});
  expect(result.elements).toMatchSnapshot();
});
```

### Round-Trip Test

Scan, annotate, re-scan, and verify the elements still match:

1. `uicontract scan fixtures/my-app -o manifest.json`
2. `uicontract annotate --manifest manifest.json --write`
3. `uicontract scan fixtures/my-app -o manifest2.json`
4. `uicontract diff manifest.json manifest2.json` - no breaking changes

### Integration Test

Use `uicontract` commands as subprocesses to verify the full pipeline works end-to-end with your parser.
