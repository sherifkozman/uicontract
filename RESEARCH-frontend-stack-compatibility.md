# UIC Frontend Stack Compatibility Research

**Date**: 2026-02-21
**Scope**: Static analysis feasibility for interactive UI element discovery across frontend frameworks
**Methodology**: Expert analysis based on documented APIs, published benchmarks, and ecosystem knowledge. All claims are tagged: `[DOCUMENTED]` = from official docs/APIs, `[VERIFIED]` = from widely-reported benchmarks/usage, `[ASSESSMENT]` = author's expert judgment.

---

## Table of Contents

1. [React / Next.js (Primary Target)](#1-react--nextjs-primary-target)
2. [Vue (Secondary Target)](#2-vue-secondary-target)
3. [Svelte (Tertiary Target)](#3-svelte-tertiary-target)
4. [Angular (Consideration)](#4-angular-consideration)
5. [Cross-Framework Concerns](#5-cross-framework-concerns)
6. [Existing Tools Doing Related Static Analysis](#6-existing-tools-doing-related-static-analysis)
7. [The Hard Problems](#7-the-hard-problems)
8. [Recommendations Summary](#8-recommendations-summary)

---

## 1. React / Next.js (Primary Target)

**Feasibility Rating: HIGH**

### 1.1 AST Parsers Compared

#### A. `@babel/parser` (formerly `babylon`)

- **npm package**: `@babel/parser`
- **Weekly downloads**: ~40-50M `[VERIFIED]`
- **Latest stable**: 7.x series (follows Babel version)
- **Companion packages**: `@babel/traverse` (AST walking), `@babel/types` (node type checks/builders), `@babel/generator` (code generation)

**Strengths:**
- The de facto standard for JSX/TSX parsing in the JavaScript ecosystem `[DOCUMENTED]`
- Produces an ESTree-compatible AST (with Babel extensions for JSX nodes)
- Plugin system: enable `jsx`, `typescript`, `decorators`, `dynamicImport`, etc. `[DOCUMENTED]`
- `@babel/traverse` provides a powerful visitor pattern for walking the AST
- Enormous ecosystem; most ESLint plugins, codemods, and analysis tools build on this
- `@babel/generator` can reproduce source code from modified AST

**Weaknesses:**
- Written in JavaScript; slower than Rust-based alternatives for very large codebases
- TypeScript support is syntax-only (parses TS syntax, does NOT perform type checking or type resolution) `[DOCUMENTED]`
- No type information means you cannot resolve `React.ComponentType<T>` or determine what a generic component renders

**JSX/TSX handling**: Full support via `plugins: ['jsx', 'typescript']` `[DOCUMENTED]`

**Example: Parse React component and find interactive elements**

```typescript
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

const code = `
  export function CheckoutForm() {
    return (
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" />
        <select name="plan">
          <option value="monthly">Monthly</option>
        </select>
        <button type="submit">Subscribe</button>
        <a href="/terms">Terms</a>
      </form>
    );
  }
`;

const ast = parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript'],
});

const INTERACTIVE_ELEMENTS = new Set([
  'button', 'input', 'select', 'textarea', 'a', 'form',
]);

const elements = [];

traverse(ast, {
  JSXOpeningElement(path) {
    const name = path.node.name;
    // Handle simple element names like <button>
    if (name.type === 'JSXIdentifier' && INTERACTIVE_ELEMENTS.has(name.name)) {
      elements.push({
        tag: name.name,
        line: path.node.loc.start.line,
        attributes: path.node.attributes.map(attr => {
          if (attr.type === 'JSXAttribute') {
            return { name: attr.name.name, value: attr.value?.value };
          }
          return null;
        }).filter(Boolean),
      });
    }
  },
});

// elements will contain all 5 interactive elements with their locations
```

**Verdict**: `[ASSESSMENT]` **Best default choice for UIC.** Mature, well-documented, enormous ecosystem. The lack of type information is a limitation but acceptable for element discovery which is primarily syntactic.

---

#### B. TypeScript Compiler API (`typescript` package)

- **npm package**: `typescript`
- **Weekly downloads**: ~45-55M `[VERIFIED]`
- **Latest stable**: 5.x series

**Strengths:**
- Full type information available through the type checker `[DOCUMENTED]`
- Can resolve what a component actually renders by following type definitions
- Can determine if a custom component ultimately renders a `<button>` (via type inference)
- Official support for JSX/TSX parsing (JSX factory support) `[DOCUMENTED]`
- `ts.createSourceFile()` for single-file parsing, `ts.createProgram()` for multi-file type-aware analysis

**Weaknesses:**
- API is low-level and verbose; no built-in visitor pattern like `@babel/traverse`
- AST format is TypeScript-specific (not ESTree-compatible)
- Significantly slower for full program creation (requires reading tsconfig, resolving modules) `[VERIFIED]`
- The type checker requires a full project context (tsconfig.json, all source files) to work
- JSX AST nodes use TypeScript's own naming: `JsxElement`, `JsxSelfClosingElement`, `JsxOpeningElement`

**Example: Type-aware analysis**

```typescript
import * as ts from 'typescript';

function findInteractiveElements(sourceFile: ts.SourceFile) {
  const elements: Array<{ tag: string; line: number }> = [];
  const interactive = new Set(['button', 'input', 'select', 'textarea', 'a', 'form']);

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName;
      if (ts.isIdentifier(tagName) && interactive.has(tagName.text)) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        elements.push({ tag: tagName.text, line });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return elements;
}

// Single-file parsing (no type info):
const sourceFile = ts.createSourceFile(
  'component.tsx',
  code,
  ts.ScriptTarget.Latest,
  true, // setParentNodes
  ts.ScriptKind.TSX,
);

// Full program (with type info, much slower):
const program = ts.createProgram(['./src/Component.tsx'], {
  jsx: ts.JsxEmit.React,
  target: ts.ScriptTarget.Latest,
  module: ts.ModuleKind.ESNext,
});
const checker = program.getTypeChecker();
```

**Verdict**: `[ASSESSMENT]` **Use as secondary/enhancement layer.** The type checker is invaluable for resolving component types but too heavy and slow for the primary parsing pass. Use Babel for discovery, TypeScript API for optional deep analysis.

---

#### C. SWC (`@swc/core`)

- **npm package**: `@swc/core`
- **Weekly downloads**: ~10-15M `[VERIFIED]`
- **Latest stable**: 1.x series
- **Written in**: Rust (with Node.js bindings via NAPI)

**Strengths:**
- 20-70x faster than Babel for parsing `[VERIFIED]` (widely benchmarked)
- Full JSX and TypeScript support `[DOCUMENTED]`
- Produces an ESTree-compatible AST (with JSX extensions)
- Used by Next.js internally for compilation `[DOCUMENTED]`

**Weaknesses:**
- AST visitor/traversal tooling is much less mature than `@babel/traverse`
- No equivalent to `@babel/traverse` with scope analysis built in
- Community tooling (codemods, analysis plugins) is smaller than Babel ecosystem
- The `@swc/core` npm package includes platform-specific native binaries (~30-60MB per platform) `[DOCUMENTED]`
- Code generation/modification from AST is less mature

**Example:**

```typescript
import { parseSync } from '@swc/core';

const ast = parseSync(code, {
  syntax: 'typescript',
  tsx: true,
  target: 'es2022',
});

// ast.body contains the program statements
// Must write custom traversal or use a generic AST walker
```

**Verdict**: `[ASSESSMENT]` **Consider for performance-critical paths** (e.g., scanning thousands of files in a monorepo). But for UIC's use case (parse once, modify once), Babel's richer ecosystem outweighs SWC's speed advantage. Parsing speed is unlikely to be the bottleneck.

---

#### D. `oxc-parser` (OXC project)

- **npm package**: `oxc-parser`
- **Weekly downloads**: ~100-300K `[VERIFIED]` (growing rapidly, still relatively new)
- **Written in**: Rust (NAPI bindings)
- **Part of**: The OXC project (oxlint, oxc-resolver, etc.)

**Strengths:**
- Claims to be 3-5x faster than SWC for parsing `[VERIFIED]` (benchmarks published by OXC team)
- Full JSX/TSX support `[DOCUMENTED]`
- Active development; backed by the Biome/OXC ecosystem
- `oxc-transform` for code modification

**Weaknesses:**
- Still maturing; API surface may change
- AST format is custom (not ESTree or Babel-compatible) -- requires learning a new node structure
- Traversal and code modification tooling is nascent compared to Babel
- Smaller community; fewer examples and guides
- `[ASSESSMENT]` Risk of breaking changes as the project evolves pre-1.0

**Verdict**: `[ASSESSMENT]` **Watch but don't adopt yet for UIC.** The ecosystem is too immature for a tool that needs reliable AST traversal and code modification. Revisit in 12-18 months.

---

#### E. `ts-morph`

- **npm package**: `ts-morph`
- **Weekly downloads**: ~1-2M `[VERIFIED]`
- **Built on**: TypeScript Compiler API (wraps it with a friendlier API)

**Strengths:**
- Much easier to use than raw TypeScript Compiler API `[DOCUMENTED]`
- Provides `.findDescendantsOfKind()`, `.getType()`, `.getText()`, etc.
- Built-in code modification that preserves formatting
- Navigate between AST nodes easily (get parent, get children of type, etc.)
- Can read `tsconfig.json` automatically

**Weaknesses:**
- Slower than Babel because it uses TypeScript under the hood
- Still inherits TypeScript's JSX AST naming conventions
- Memory-heavy for large projects (loads full program into memory)
- JSX traversal specifically is less ergonomic than `@babel/traverse`'s JSX-specific visitors

**Example:**

```typescript
import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: './tsconfig.json',
});

const sourceFile = project.getSourceFileOrThrow('./src/Component.tsx');

// Find all JSX self-closing elements
const jsxElements = sourceFile.getDescendantsOfKind(
  SyntaxKind.JsxSelfClosingElement
);

for (const el of jsxElements) {
  const tagName = el.getTagNameNode().getText();
  if (['button', 'input', 'select', 'a', 'form'].includes(tagName)) {
    console.log(`Found <${tagName}> at line ${el.getStartLineNumber()}`);
  }
}
```

**Verdict**: `[ASSESSMENT]` **Good alternative to raw TypeScript API** if you need type information. Friendlier API, but still heavier than Babel. Could be used for the "write-back" phase (inserting `data-agent-id` attributes) since it handles code modification well.

---

#### F. `recast`

- **npm package**: `recast`
- **Weekly downloads**: ~10-15M `[VERIFIED]`
- **Uses**: Any ESTree-compatible parser (Babel, Acorn, etc.) under the hood

**Strengths:**
- **Preserves original formatting** when modifying AST and regenerating code `[DOCUMENTED]`
- This is THE key advantage for UIC's write-back phase (inserting `data-agent-id` attributes)
- Works with Babel parser, so you get full JSX/TSX support
- `recast.print(ast).code` produces source with minimal diff from original

**Weaknesses:**
- Adds overhead on top of the parser (tracking formatting metadata)
- Not needed for read-only analysis; only valuable for the modification phase

**Example: Insert data-agent-id attribute**

```typescript
import * as recast from 'recast';
import { parse } from '@babel/parser';

// Use Babel parser through recast
const ast = recast.parse(code, {
  parser: {
    parse(source: string) {
      return parse(source, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
        tokens: true,
      });
    },
  },
});

// After modifying AST (adding JSXAttribute nodes):
const output = recast.print(ast).code;
// Output preserves original formatting, only adding the new attributes
```

**Verdict**: `[ASSESSMENT]` **Essential for the write-back phase.** When UIC writes `data-agent-id` attributes into source files, recast ensures the diff is minimal and formatting is preserved. This is critical for developer acceptance.

---

### 1.2 Recommended Parser Stack for React

**Primary recommendation** `[ASSESSMENT]`:

```
Parse:     @babel/parser (with jsx + typescript plugins)
Traverse:  @babel/traverse
Modify:    recast (wrapping @babel/parser)
Types:     @babel/types (for node creation and type guards)
Optional:  typescript or ts-morph (for type-aware deep analysis)
```

Rationale: This stack has the largest ecosystem, most documentation, and is battle-tested in tools like ESLint, Prettier, jscodeshift, and hundreds of codemods.

---

### 1.3 React Server Components vs Client Components

`[DOCUMENTED]` In Next.js App Router:
- **Server Components** are the default. They do NOT have the `'use client'` directive.
- **Client Components** are marked with `'use client'` at the top of the file.
- **Server Actions** are marked with `'use server'` at the top of the file or function.

**Static detection:**

```typescript
// Detection is trivial - it's a string literal directive at the top of the file
function detectComponentType(ast: t.File): 'client' | 'server' {
  const body = ast.program.body;
  for (const node of body) {
    if (
      node.type === 'ExpressionStatement' &&
      node.expression.type === 'StringLiteral'
    ) {
      if (node.expression.value === 'use client') return 'client';
      if (node.expression.value === 'use server') return 'server';
    }
    // Directives must appear before any other statements
    if (node.type !== 'ExpressionStatement') break;
  }
  // Default in App Router is server
  return 'server';
}
```

**Implications for UIC** `[ASSESSMENT]`:
- Interactive elements (`onClick`, `onChange`, `onSubmit`) only work in Client Components
- A `<button onClick={handleClick}>` in a Server Component is a build error in Next.js
- UIC should flag interactive elements in server components as potential issues
- However, HTML elements without event handlers CAN appear in Server Components (e.g., `<a href="/about">`)
- Forms with Server Actions (`<form action={serverAction}>`) ARE valid in Server Components `[DOCUMENTED]`

---

### 1.4 Next.js Route Discovery

#### App Router (Next.js 13+) `[DOCUMENTED]`

Routes are defined by filesystem convention in the `app/` directory:

```
app/
  page.tsx              → /
  layout.tsx            → layout wrapper for /
  about/
    page.tsx            → /about
  blog/
    page.tsx            → /blog
    [slug]/
      page.tsx          → /blog/:slug (dynamic segment)
  (marketing)/
    pricing/
      page.tsx          → /pricing (route group, parentheses not in URL)
  api/
    users/
      route.ts          → /api/users (API route)
  @modal/
    login/
      page.tsx          → parallel route (named slot)
```

**Static discovery algorithm** `[ASSESSMENT]`:

```typescript
import * as path from 'path';
import * as fs from 'fs';

interface Route {
  path: string;
  filePath: string;
  type: 'page' | 'layout' | 'api' | 'loading' | 'error';
  isDynamic: boolean;
}

function discoverAppRoutes(appDir: string, basePath = ''): Route[] {
  const routes: Route[] = [];
  const entries = fs.readdirSync(appDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      // Check for page.tsx, page.jsx, page.ts, page.js
      const match = entry.name.match(/^(page|layout|route|loading|error)\.(tsx?|jsx?)$/);
      if (match) {
        routes.push({
          path: basePath || '/',
          filePath: path.join(appDir, entry.name),
          type: match[1] as Route['type'],
          isDynamic: basePath.includes('['),
        });
      }
      continue;
    }

    let segment = entry.name;
    let urlSegment = segment;

    // Route groups: (marketing) -> doesn't appear in URL
    if (segment.startsWith('(') && segment.endsWith(')')) {
      urlSegment = '';
    }
    // Dynamic segments: [slug] -> :slug
    else if (segment.startsWith('[') && segment.endsWith(']')) {
      urlSegment = `:${segment.slice(1, -1)}`;
    }
    // Catch-all: [...slug] -> *slug
    else if (segment.startsWith('[...') && segment.endsWith(']')) {
      urlSegment = `*${segment.slice(4, -1)}`;
    }
    // Parallel routes: @modal -> skip from URL
    else if (segment.startsWith('@')) {
      urlSegment = '';
    }
    // Private folders: _components -> skip entirely
    else if (segment.startsWith('_')) {
      continue;
    }

    const nextBase = urlSegment ? `${basePath}/${urlSegment}` : basePath;
    routes.push(...discoverAppRoutes(path.join(appDir, segment), nextBase));
  }

  return routes;
}
```

#### Pages Router (Next.js legacy) `[DOCUMENTED]`

```
pages/
  index.tsx             → /
  about.tsx             → /about
  blog/
    index.tsx           → /blog
    [slug].tsx          → /blog/:slug
  api/
    users.ts            → /api/users
  _app.tsx              → custom App wrapper (NOT a route)
  _document.tsx         → custom Document (NOT a route)
  404.tsx               → custom 404 page
```

Discovery is simpler: every `.tsx`/`.jsx`/`.ts`/`.js` file under `pages/` (except `_app`, `_document`, `_error`) is a route. `[DOCUMENTED]`

---

### 1.5 React Patterns: What CAN and CANNOT Be Detected Statically

#### CAN detect `[ASSESSMENT]`:

| Pattern | Detectable? | How |
|---------|-------------|-----|
| `<button onClick={fn}>` | YES | JSXOpeningElement with name "button" |
| `<input type="text" />` | YES | JSXSelfClosingElement with name "input" |
| `<Link href="/about">` (Next.js) | YES | JSXOpeningElement where name is "Link" + known import from "next/link" |
| `<form onSubmit={fn}>` | YES | JSXOpeningElement with name "form" |
| `React.forwardRef((props, ref) => <button>)` | YES | Detect `forwardRef` call, analyze returned JSX in the callback body |
| `'use client'` directive | YES | String literal directive at file top |
| Named exports: `export function Button()` | YES | ExportNamedDeclaration |
| Default exports: `export default function Page()` | YES | ExportDefaultDeclaration |
| Component composition: `<Card><Button /></Card>` | YES | Nested JSXElements |

#### CAN detect WITH EFFORT `[ASSESSMENT]`:

| Pattern | Detectable? | How |
|---------|-------------|-----|
| `const MyButton = styled.button\`...\`` | PARTIAL | Detect `styled.X` pattern from styled-components import; `X` is the HTML element |
| `React.lazy(() => import('./Modal'))` | PARTIAL | Detect the import path, then analyze that file separately |
| `const DynamicComponent = dynamic(() => import('./Widget'))` | PARTIAL | Same as above for Next.js dynamic |
| HOC wrapping: `export default withAuth(Dashboard)` | PARTIAL | Detect HOC call, analyze the wrapped component |
| Render props: `<DataFetcher render={(data) => <Button />} />` | PARTIAL | Detect render prop pattern, analyze the callback |
| `<Radix.Dialog.Trigger asChild>` | PARTIAL | Detect Radix import, know that Dialog.Trigger renders a button by default |

#### CANNOT reliably detect `[ASSESSMENT]`:

| Pattern | Why |
|---------|-----|
| `const Tag = isAdmin ? 'button' : 'div'; <Tag />` | Variable element type; requires runtime knowledge of `isAdmin` |
| `<components[type] />` | Dynamic component lookup; type determined at runtime |
| `{items.map(item => <item.Component />)}` | Runtime component reference |
| Third-party component internals: what `<DataGrid>` renders | Would require analyzing the library's source or type definitions |
| Conditional rendering: `{isLoggedIn && <LogoutButton />}` | CAN detect the element exists, CANNOT determine if it will render |

---

### 1.6 Headless UI Libraries

#### Radix UI `[DOCUMENTED]`

Radix components map to interactive primitives in a discoverable way:

```tsx
import * as Dialog from '@radix-ui/react-dialog';

// Each primitive has a clear semantic role
<Dialog.Root>
  <Dialog.Trigger>  {/* renders <button> by default */}
  <Dialog.Portal>
    <Dialog.Overlay>
    <Dialog.Content>
      <Dialog.Title>
      <Dialog.Description>
      <Dialog.Close>  {/* renders <button> by default */}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**Static detection strategy** `[ASSESSMENT]`:
- Detect imports from `@radix-ui/react-*`
- Maintain a mapping of Radix component names to their interactive semantics:
  - `*.Trigger` -> button
  - `*.Close` -> button
  - `*.Input` -> input
  - `*.Link` -> anchor
  - `*.Form` -> form
- This requires a curated knowledge base of Radix component semantics

#### shadcn/ui `[DOCUMENTED]`

shadcn/ui copies component source into your project (NOT installed as npm dependency). This is actually BETTER for static analysis:

```tsx
// components/ui/button.tsx - this file is IN your project
import { Slot } from '@radix-ui/react-slot';

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} {...props} />;
  }
);
```

**Detection strategy** `[ASSESSMENT]`:
- shadcn/ui components are local source files, so UIC can parse them directly
- Follow component definitions to see they render `<button>`, `<input>`, etc.
- The `asChild` pattern (from Radix Slot) is the main complication: when `asChild` is true, the component delegates rendering to its child

#### Headless UI (Tailwind Labs) `[DOCUMENTED]`

```tsx
import { Menu } from '@headlessui/react';

<Menu>
  <Menu.Button>  {/* renders <button> */}
  <Menu.Items>   {/* renders <div role="menu"> */}
    <Menu.Item>  {/* renders the child element */}
      {({ active }) => <a href="/settings">Settings</a>}
    </Menu.Item>
  </Menu.Items>
</Menu>
```

**Detection**: Same strategy as Radix -- maintain a mapping of component names to interactive semantics. `[ASSESSMENT]`

---

## 2. Vue (Secondary Target)

**Feasibility Rating: HIGH**

### 2.1 Vue SFC Parsing

Vue Single File Components (`.vue` files) have three sections: `<template>`, `<script>`, and `<style>`. `[DOCUMENTED]`

#### `@vue/compiler-sfc`

- **npm package**: `@vue/compiler-sfc`
- **Weekly downloads**: ~5-8M `[VERIFIED]`
- **Part of**: Vue core (official parser)

This is THE official tool for parsing Vue SFCs. `[DOCUMENTED]`

```typescript
import { parse, compileTemplate } from '@vue/compiler-sfc';

const source = `
<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="email" type="email" placeholder="Email" />
    <select v-model="plan">
      <option value="monthly">Monthly</option>
    </select>
    <button type="submit">Subscribe</button>
    <a :href="termsUrl">Terms</a>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const email = ref('');
const plan = ref('monthly');
const termsUrl = '/terms';
function handleSubmit() { /* ... */ }
</script>
`;

const { descriptor, errors } = parse(source, { filename: 'Component.vue' });

// descriptor.template.ast contains the template AST
// descriptor.scriptSetup.content contains the <script setup> source
// descriptor.script.content contains the <script> source (if present)
```

#### `@vue/compiler-dom` (template AST)

- **npm package**: `@vue/compiler-dom`
- **Part of**: Vue core

Provides the template AST with typed nodes. `[DOCUMENTED]`

```typescript
import { parse as parseTemplate } from '@vue/compiler-dom';

// Parse just the template
const templateAst = parseTemplate(descriptor.template.content);

// templateAst.children contains the root nodes
// Each node has: type, tag, props, children, loc

const INTERACTIVE = new Set(['button', 'input', 'select', 'textarea', 'a', 'form']);

function findInteractive(nodes) {
  const elements = [];
  for (const node of nodes) {
    if (node.type === 1 /* NodeTypes.ELEMENT */ && INTERACTIVE.has(node.tag)) {
      elements.push({
        tag: node.tag,
        line: node.loc.start.line,
        props: node.props.map(p => ({
          name: p.type === 6 ? p.name : p.name, // 6=ATTRIBUTE, 7=DIRECTIVE
          isDynamic: p.type === 7,
        })),
      });
    }
    if (node.children) {
      elements.push(...findInteractive(node.children));
    }
  }
  return elements;
}
```

### 2.2 Vue Template Static Analysis

**What CAN be detected** `[ASSESSMENT]`:

| Pattern | Detectable? | How |
|---------|-------------|-----|
| `<button @click="fn">` | YES | Element node with tag "button" |
| `<input v-model="val">` | YES | Element node with tag "input" |
| `<RouterLink to="/about">` | YES | Element node with tag "RouterLink" (or "router-link") |
| `<component :is="dynamicComp">` | NO | Dynamic component; cannot determine type statically |
| `v-for` rendered elements | PARTIAL | Can detect the template element, but iteration count is runtime |
| `v-if` conditional elements | PARTIAL | Can detect element exists, cannot determine if it renders |
| `<slot>` content | NO | Slot content is provided by parent at runtime |

### 2.3 Vue Router Route Discovery `[DOCUMENTED]`

Vue Router defines routes in JavaScript/TypeScript:

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', component: () => import('../views/Home.vue') },
  { path: '/about', component: () => import('../views/About.vue') },
  { path: '/blog/:slug', component: () => import('../views/BlogPost.vue') },
  {
    path: '/dashboard',
    component: () => import('../views/Dashboard.vue'),
    children: [
      { path: 'settings', component: () => import('../views/Settings.vue') },
    ],
  },
];
```

**Static discovery** `[ASSESSMENT]`:
- Parse the router configuration file
- Extract the `routes` array definition
- For each route object, extract `path` string and `component` import path
- Follow dynamic imports to discover which `.vue` file each route maps to
- Handle nested routes via `children` arrays
- This IS feasible but requires more complex AST analysis (walking object literals, resolving variable references)

**Challenge**: Some projects use programmatic route generation or import routes from multiple files. `[ASSESSMENT]`

### 2.4 Composition API vs Options API `[DOCUMENTED]`

**Options API** (Vue 2 style):
```vue
<script>
export default {
  methods: {
    handleClick() { /* ... */ }
  },
  computed: {
    isDisabled() { return this.count > 5; }
  }
}
</script>
```

**Composition API with `<script setup>`** (Vue 3):
```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
const count = ref(0);
const isDisabled = computed(() => count.value > 5);
function handleClick() { /* ... */ }
</script>
```

**Impact on UIC** `[ASSESSMENT]`: Minimal. The interactive elements are in the `<template>` section regardless of API style. The `<script>` section affects how handlers are defined, but UIC's primary concern is discovering elements in the template. Both styles produce the same template AST.

---

## 3. Svelte (Tertiary Target)

**Feasibility Rating: HIGH**

### 3.1 Svelte File Parsing

#### `svelte/compiler` (official)

- **npm package**: `svelte` (the compiler is part of the main package)
- **Weekly downloads**: ~2-4M `[VERIFIED]`
- **API**: `svelte.parse()` returns an AST

```typescript
import { parse } from 'svelte/compiler';

const source = `
<script lang="ts">
  let email = '';
  function handleSubmit() { /* ... */ }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <input bind:value={email} type="email" placeholder="Email" />
  <button type="submit">Subscribe</button>
  <a href="/terms">Terms</a>
</form>
`;

const ast = parse(source);
// ast.html - the template AST
// ast.instance - the <script> AST (instance script)
// ast.module - the <script context="module"> AST
```

**Svelte 5 note** `[DOCUMENTED]`: Svelte 5 introduced runes (`$state`, `$derived`, `$effect`) but the template syntax for HTML elements remains the same. The `svelte.parse()` API is stable.

**Walking the Svelte AST** `[ASSESSMENT]`:

```typescript
import { walk } from 'svelte/compiler';
// OR use estree-walker which svelte recommends:
import { walk } from 'estree-walker';

const INTERACTIVE = new Set(['button', 'input', 'select', 'textarea', 'a', 'form']);

walk(ast.html, {
  enter(node) {
    if (node.type === 'Element' && INTERACTIVE.has(node.name)) {
      console.log(`Found <${node.name}> at line ${node.start}`);
    }
  },
});
```

### 3.2 SvelteKit Route Discovery `[DOCUMENTED]`

SvelteKit uses filesystem-based routing similar to Next.js:

```
src/routes/
  +page.svelte           → /
  +layout.svelte         → layout wrapper
  about/
    +page.svelte         → /about
  blog/
    +page.svelte         → /blog
    [slug]/
      +page.svelte       → /blog/:slug
      +page.server.ts    → server-side load function
  (marketing)/
    pricing/
      +page.svelte       → /pricing (route group)
  api/
    users/
      +server.ts         → /api/users (API route)
```

**Discovery algorithm**: Nearly identical to Next.js App Router discovery. Scan for `+page.svelte` files; directory structure maps to URL paths. Dynamic segments use `[param]`, catch-all uses `[...rest]`, route groups use `(name)`. `[DOCUMENTED]`

### 3.3 Svelte vs React for Static Analysis `[ASSESSMENT]`

Svelte is arguably EASIER to analyze statically than React:

1. **No JSX abstraction**: Svelte templates are closer to HTML, so HTML element names are directly in the AST
2. **No virtual DOM**: Components more directly represent what renders
3. **Less indirection**: No HOCs, render props are rare, composition patterns are simpler
4. **Single-file components**: Template, script, and style are co-located with clear boundaries
5. **Official parser**: `svelte/compiler` is the canonical parser maintained by the Svelte team

**Svelte-specific challenges**:
- `{#each}` blocks create repeated elements (same static analysis limitation as React `.map()`)
- `{#if}` conditional rendering (same as React ternary/&&)
- `<svelte:component this={dynamicComp}>` dynamic components (same as React dynamic)
- `<slot>` for component composition (cannot know what parent passes)

---

## 4. Angular (Consideration)

**Feasibility Rating: MEDIUM**

### 4.1 Angular Template Parsing

Angular separates templates from component logic. Templates can be inline or in separate `.html` files. `[DOCUMENTED]`

#### `@angular/compiler`

- **npm package**: `@angular/compiler`
- **Weekly downloads**: ~5-8M `[VERIFIED]`
- **API**: Provides template parsing via internal APIs

**Challenge** `[ASSESSMENT]`: Angular's compiler APIs are more internal/less stable than React's Babel or Vue's compiler-sfc. The Angular team does not publish `@angular/compiler` as a stable public API for third-party AST analysis. The APIs CAN be used but are not officially supported for this purpose.

```typescript
// Angular template parsing (using internal APIs)
import {
  parseTemplate,
  TmplAstElement,
  TmplAstBoundEvent,
} from '@angular/compiler';

const template = `
  <form (ngSubmit)="handleSubmit()">
    <input [(ngModel)]="email" type="email" placeholder="Email" />
    <select [(ngModel)]="plan">
      <option value="monthly">Monthly</option>
    </select>
    <button type="submit">Subscribe</button>
    <a [routerLink]="['/terms']">Terms</a>
  </form>
`;

const parsed = parseTemplate(template, 'component.html', {
  preserveWhitespaces: false,
});

// parsed.nodes contains template AST nodes
// TmplAstElement for HTML elements
// TmplAstBoundEvent for event bindings like (click)
```

#### Alternative: Parse as HTML

`[ASSESSMENT]` Since Angular templates are largely HTML with Angular-specific syntax (`*ngIf`, `*ngFor`, `[(ngModel)]`, `(click)`, `[routerLink]`), you could use a general HTML parser like `htmlparser2` or `parse5` and then handle Angular-specific attributes:

```typescript
import * as htmlparser2 from 'htmlparser2';

// Parse Angular template as HTML
const parser = new htmlparser2.Parser({
  onopentag(name, attrs) {
    if (INTERACTIVE.has(name)) {
      // Check for Angular event bindings
      const events = Object.keys(attrs).filter(
        a => a.startsWith('(') || a.startsWith('on')
      );
      console.log(`Found <${name}> with events: ${events}`);
    }
  },
});
```

### 4.2 Angular Router Discovery `[DOCUMENTED]`

Angular routes are defined in TypeScript modules:

```typescript
// app-routing.module.ts (NgModule style)
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'blog/:slug', component: BlogPostComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      { path: 'settings', component: SettingsComponent },
    ],
  },
  { path: '**', component: NotFoundComponent },
];

// Or standalone (Angular 17+):
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', loadComponent: () => import('./about.component').then(m => m.AboutComponent) },
];
```

**Static discovery**: Similar to Vue Router. Parse the route configuration file, extract the `routes` array, map paths to components. Angular's route definition is structured enough for static extraction. `[ASSESSMENT]`

### 4.3 Angular-Specific Challenges `[ASSESSMENT]`

1. **Separate template files**: Component TypeScript and template HTML are in different files; need to resolve the `templateUrl` reference
2. **Angular-specific syntax**: `*ngIf`, `*ngFor`, `[(ngModel)]` etc. are not standard HTML attributes
3. **Directives**: Angular directives can fundamentally alter what an element does (e.g., a `<div>` with a click directive becomes interactive)
4. **Modules and dependency injection**: Components are organized in modules; import relationships are more complex
5. **Standalone components (Angular 17+)**: Simpler than modules but still use Angular-specific decorators

### 4.4 Angular Feasibility Assessment

**MEDIUM feasibility** `[ASSESSMENT]`:
- Template parsing IS possible (either via `@angular/compiler` or HTML parsing)
- Interactive HTML elements CAN be discovered
- Route discovery IS feasible
- BUT: Angular's directive system means ANY element can become interactive if a directive is applied
- The overhead of supporting Angular's complexity may not justify the effort for initial UIC versions
- **Recommendation**: Defer Angular support to v2+. Focus on React, then Vue, then Svelte.

---

## 5. Cross-Framework Concerns

### 5.1 TypeScript vs JavaScript

**Impact: LOW** `[ASSESSMENT]`

Both Babel and TypeScript parsers handle both languages. The key decision is:

| Concern | Approach |
|---------|----------|
| File extension detection | `.tsx`/`.ts` -> enable TypeScript plugin; `.jsx`/`.js` -> disable it |
| `@babel/parser` | Add `'typescript'` to plugins array for TS files |
| SWC | Set `syntax: 'typescript'` vs `syntax: 'ecmascript'` |
| Type annotations in JSX | Babel strips them during parsing; they don't affect element discovery |

**Edge case** `[ASSESSMENT]`: Some `.js` files may contain JSX (especially in older projects). UIC should attempt to parse with JSX enabled and fall back if parsing fails, or detect JSX presence heuristically.

### 5.2 CSS-in-JS, Tailwind, CSS Modules

**Impact: NONE for element discovery** `[ASSESSMENT]`

CSS solutions do NOT affect the ability to discover interactive elements:

- **Tailwind**: Classes like `className="bg-blue-500 hover:bg-blue-700"` are attributes on JSX elements; the element itself is still `<button>` or `<input>`
- **CSS Modules**: `className={styles.button}` -- same thing; element tag is unchanged
- **styled-components**: `const StyledButton = styled.button\`...\`` -- CAN be detected because `styled.X` reveals the HTML element
- **Emotion**: `const Button = styled('button')({...})` -- same pattern
- **CSS-in-JS (general)**: Never changes what HTML elements exist, only their styling

**One exception** `[ASSESSMENT]`: `styled.div` could make a `<div>` look like a button visually, but semantically it's still a div. UIC should detect based on semantic HTML elements, not visual appearance. However, if UIC also checks for ARIA attributes (`role="button"`, `aria-*`), it can catch these cases.

### 5.3 Monorepo Support

**Impact: MEDIUM** `[ASSESSMENT]`

| Tool | Structure | Implication for UIC |
|------|-----------|---------------------|
| **Turborepo** | `packages/ui/`, `packages/web/`, `apps/frontend/` | UIC needs to follow import paths across package boundaries |
| **Nx** | `libs/ui/`, `apps/frontend/` | Same cross-package import resolution needed |
| **pnpm workspaces** | Similar to above | `node_modules` resolution may use symlinks |
| **Lerna** | Legacy but still common | Standard `packages/` directory structure |

**Key challenge**: When `apps/frontend/src/Page.tsx` imports `@company/ui/Button`, UIC needs to:
1. Resolve the import to the actual file path (e.g., `packages/ui/src/Button.tsx`)
2. Parse that file to understand what `<Button>` renders
3. Handle package.json `exports` field for path resolution

**Tools for import resolution** `[DOCUMENTED]`:
- `enhanced-resolve` (webpack's resolver): ~25M weekly downloads, handles aliases, package exports, symlinks
- `oxc-resolver`: Rust-based, faster alternative
- `tsconfig-paths`: Resolves TypeScript path aliases from `tsconfig.json`
- Node's built-in `require.resolve` algorithm

**Recommendation** `[ASSESSMENT]`: Use `enhanced-resolve` or `oxc-resolver` for import resolution. Both handle `tsconfig.json` paths, package.json exports, and symlinks. This is essential for monorepo support.

### 5.4 Component Libraries Detection

**Strategy**: Maintain a curated registry of known component libraries and their interactive element mappings. `[ASSESSMENT]`

#### Material UI (MUI) `[DOCUMENTED]`

```tsx
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import Link from '@mui/material/Link';

// Detection: import source '@mui/material/Button' -> interactive (button)
```

**Mapping**:
```typescript
const MUI_INTERACTIVE: Record<string, string> = {
  'Button': 'button',
  'IconButton': 'button',
  'TextField': 'input',
  'Select': 'select',
  'Checkbox': 'input[checkbox]',
  'Radio': 'input[radio]',
  'Switch': 'input[checkbox]',
  'Link': 'a',
  'Tab': 'button',
  'MenuItem': 'button',
  'Autocomplete': 'input',
  'Slider': 'input[range]',
  'Rating': 'input',
};
```

#### Ant Design `[DOCUMENTED]`

```tsx
import { Button, Input, Select, Form } from 'antd';
// Similar pattern; maintain mapping from Ant component names to semantic roles
```

#### Chakra UI `[DOCUMENTED]`

```tsx
import { Button, Input, Select, Link } from '@chakra-ui/react';
// Same pattern
```

**Scalable approach** `[ASSESSMENT]`:
1. Detect imports from known libraries via import source matching
2. Map imported component names to interactive semantics using a curated registry
3. Allow users to extend the registry with custom mappings in a UIC config file
4. For unknown libraries, fall back to detecting native HTML elements only

### 5.5 Build Tool Differences

**Impact: NONE for static analysis** `[ASSESSMENT]`

UIC reads source files directly. Build tools (Vite, Webpack, Turbopack, esbuild) only matter at BUILD time. Since UIC does NOT run the build or execute code, the choice of build tool has zero impact on static analysis.

**One caveat**: Build tool configuration may affect import resolution:
- **Vite**: `resolve.alias` in `vite.config.ts`
- **Webpack**: `resolve.alias` in `webpack.config.js`
- **Turbopack**: Configuration in `next.config.js`

UIC would need to read these configs to resolve imports correctly, OR rely on `tsconfig.json` paths which typically mirror the build tool aliases.

---

## 6. Existing Tools Doing Related Static Analysis

### 6.1 ESLint Plugin: `eslint-plugin-jsx-a11y`

- **npm package**: `eslint-plugin-jsx-a11y`
- **Weekly downloads**: ~10-15M `[VERIFIED]`
- **How it works** `[DOCUMENTED]`:
  - Uses Babel AST (via ESLint's parser)
  - Walks JSX elements and checks accessibility attributes
  - Maintains a mapping of element names to their semantic roles
  - Can detect interactive elements (checks for `onClick`, `role`, `tabIndex`, etc.)
  - Has a `componentMap` configuration to map custom components to HTML elements

**Relevance to UIC** `[ASSESSMENT]`: High. This plugin demonstrates that JSX element discovery via AST is a well-established pattern. Its `componentMap` concept (letting users declare that `<MyButton>` maps to `<button>`) is directly applicable to UIC.

**Key source to study**: The plugin's `src/util/isInteractiveElement.js` and `src/util/isNonInteractiveElement.js` contain the logic for classifying elements as interactive.

### 6.2 ESLint Plugin: `eslint-plugin-testing-library`

- **npm package**: `eslint-plugin-testing-library`
- **Weekly downloads**: ~5-8M `[VERIFIED]`
- **How it works** `[DOCUMENTED]`:
  - Detects Testing Library query patterns (`getByRole`, `getByLabelText`, etc.)
  - Analyzes how components are queried in tests
  - Uses AST analysis of test files

**Relevance to UIC**: Lower. Tests show how developers QUERY elements, which could inform what IDs would be useful, but doesn't directly help with source element discovery.

### 6.3 Storybook CSF (Component Story Format) Autodiscovery

- **How it works** `[DOCUMENTED]`:
  - Scans filesystem for files matching patterns like `*.stories.tsx`
  - Parses named exports to discover stories
  - Uses `@storybook/csf-tools` package for AST parsing of CSF files
  - Reads `export default { title: 'Components/Button' }` for hierarchy

**Relevance to UIC** `[ASSESSMENT]`: The filesystem scanning + AST parsing pattern is very similar to what UIC needs. If a project has Storybook, UIC could potentially USE story definitions to understand component hierarchies and generate better IDs.

### 6.4 `react-docgen`

- **npm package**: `react-docgen`
- **Weekly downloads**: ~3-5M `[VERIFIED]`
- **How it works** `[DOCUMENTED]`:
  - Parses React component files to extract documentation
  - Discovers component name, props (with types), default values, and description
  - Uses AST analysis (Babel-based) to find component definitions
  - Handles `React.forwardRef`, `React.memo`, HOCs, class components, function components

**Relevance to UIC**: High. `react-docgen` demonstrates sophisticated component boundary detection. Its resolver system (finding the actual component definition in a file that may have multiple exports, HOCs, etc.) is directly relevant.

**Key patterns to study**:
- `react-docgen`'s resolvers: how they find component definitions amid HOCs and re-exports
- Props extraction: shows how to traverse component parameter types

### 6.5 `react-scanner`

- **npm package**: `react-scanner`
- **Weekly downloads**: ~10-50K `[VERIFIED]`
- **Purpose**: Scans a codebase to produce component usage statistics

**How it works** `[DOCUMENTED]`:
- Walks the filesystem and parses JSX/TSX files
- Counts how often each component is used and with what props
- Outputs a report of component usage across the project

**Relevance to UIC**: High. This tool already does "scan codebase for JSX elements" which is very close to what UIC needs. Its scanning architecture could inform UIC's design.

### 6.6 TypeDoc and API Extractor

- **TypeDoc** (`typedoc`): Generates documentation from TypeScript source
- **API Extractor** (`@microsoft/api-extractor`): Extracts public API surface from TypeScript

Both analyze TypeScript code statically to extract type information. Their approach to resolving types and following import chains is relevant for UIC's deeper analysis mode.

### 6.7 `ast-grep`

- **npm package**: `@ast-grep/napi`
- **Weekly downloads**: ~50-200K `[VERIFIED]`
- **Written in**: Rust (with Node.js bindings)
- **How it works** `[DOCUMENTED]`:
  - Pattern-based AST searching using a CSS-selector-like syntax
  - Supports JSX, TypeScript, and many other languages
  - Very fast (Rust-based tree-sitter parsing)

**Example**:
```yaml
# ast-grep rule to find all <button> elements
rule:
  kind: jsx_self_closing_element
  has:
    kind: identifier
    regex: ^button$
```

**Relevance to UIC** `[ASSESSMENT]`: `ast-grep` could be used as a fast pre-filter to identify files containing interactive elements before doing full AST analysis. Its pattern-based approach is very expressive.

---

## 7. The Hard Problems

### 7.1 Server-Side Rendering (SSR)

**Impact: LOW for UIC** `[ASSESSMENT]`

UIC analyzes SOURCE CODE, not rendered output. SSR affects what HTML is produced at request time, but the source components are the same. A `<button>` in a React component is a `<button>` whether rendered on server or client.

**The one nuance**: In Next.js App Router, Server Components cannot have event handlers (`onClick`, etc.). UIC should note when interactive elements appear in server component files (files without `'use client'`). But as mentioned in section 1.3, `<form>` with server actions IS valid in Server Components.

### 7.2 Conditional Rendering

```tsx
// React
{isAdmin && <DeleteButton />}
{user ? <Dashboard /> : <LoginForm />}

// Vue
<DeleteButton v-if="isAdmin" />
<Dashboard v-if="user" /><LoginForm v-else />

// Svelte
{#if isAdmin}<DeleteButton />{/if}
```

**What static analysis CAN do** `[ASSESSMENT]`:
1. **Detect ALL conditionally-rendered elements**: The AST contains both branches of ternaries and both sides of `v-if`/`v-else`
2. **Flag them as conditional**: UIC can annotate these elements with `conditional: true` in the manifest
3. **Include the condition expression**: UIC can capture `isAdmin` or `user` as the condition variable name

**What static analysis CANNOT do**:
1. Determine which branch will render at runtime
2. Know the value of `isAdmin` or `user`

**Recommendation** `[ASSESSMENT]`: Include ALL conditionally-rendered elements in the manifest but mark them with metadata:

```json
{
  "id": "admin.delete.button",
  "conditional": true,
  "condition": "isAdmin",
  "element": "button"
}
```

### 7.3 Dynamic Component Rendering

```tsx
// Pattern 1: Variable element type
const Tag = isAdmin ? 'button' : 'div';
return <Tag onClick={handleClick}>Click me</Tag>;

// Pattern 2: Dynamic component map
const components = { header: Header, footer: Footer };
return <components[section] />;

// Pattern 3: Dynamic import
const DynamicWidget = dynamic(() => import(`./widgets/${type}`));
return <DynamicWidget />;
```

**What static analysis CAN do** `[ASSESSMENT]`:

| Pattern | Static Detection | Approach |
|---------|-----------------|----------|
| Ternary element type | PARTIAL | Can detect both possible values (`'button'`, `'div'`) from the ternary |
| Object lookup | PARTIAL | Can detect all values in the `components` object |
| Template literal import | NO | Path is determined at runtime; infinite possibilities |
| `React.lazy` with static path | YES | `React.lazy(() => import('./Modal'))` has a static import path |

**Recommendation** `[ASSESSMENT]`:
- For ternary/conditional element types: detect all possible values and include all of them
- For object lookups: detect all values in the object literal
- For template literal/dynamic imports: skip and log a warning
- For `React.lazy`/`next/dynamic` with static paths: follow the import and analyze the target file

### 7.4 Third-Party Component Wrapping

```tsx
// We use <DataGrid> but don't know what it renders internally
import { DataGrid } from '@mui/x-data-grid';

return (
  <DataGrid
    rows={rows}
    columns={columns}
    onRowClick={handleRowClick}
  />
);
```

**The fundamental limitation** `[ASSESSMENT]`: Static analysis CANNOT determine what `<DataGrid>` renders internally without analyzing MUI's source code (which is in `node_modules`).

**Tiered approach**:

1. **Tier 1 - Known library mappings**: For popular libraries (MUI, Ant, Chakra, Radix), maintain curated mappings of components to their interactive elements
2. **Tier 2 - Event handler detection**: If a component receives `onClick`, `onSubmit`, `onChange`, etc. as props, it's likely interactive even if we don't know what it renders
3. **Tier 3 - Node modules analysis**: Optionally, follow imports into `node_modules` and analyze the library's source. This is expensive but possible for libraries that ship unminified source
4. **Tier 4 - Type definition analysis**: Read `.d.ts` files to see if a component accepts interactive props (e.g., extends `ButtonHTMLAttributes<HTMLButtonElement>`)

**Recommendation** `[ASSESSMENT]`: Implement Tier 1 and Tier 2 for v1. Tier 1 handles the most common case (known libraries). Tier 2 catches the rest based on props heuristic. Tier 3 and 4 are nice-to-have for future versions.

### 7.5 Code Splitting and Lazy Loading

```tsx
// Next.js dynamic
const Modal = dynamic(() => import('./Modal'), { ssr: false });

// React.lazy
const Settings = React.lazy(() => import('./Settings'));

// Vue async component
const AsyncComponent = defineAsyncComponent(() => import('./Heavy.vue'));

// Svelte (SvelteKit handles this automatically)
```

**Static analysis approach** `[ASSESSMENT]`:

1. Detect `dynamic()`, `React.lazy()`, `defineAsyncComponent()` calls
2. Extract the import path from the arrow function argument
3. If the path is a static string (`'./Modal'`), resolve it and analyze that file
4. If the path is dynamic (template literal, variable), log a warning and skip

This is FULLY feasible for static import paths and covers the vast majority of real-world usage. Dynamic paths are rare in practice.

---

## 8. Recommendations Summary

### 8.1 Framework Priority and Feasibility

| Framework | Feasibility | Priority | Effort Estimate | Parser Stack |
|-----------|-------------|----------|-----------------|--------------|
| **React/Next.js** | **HIGH** | P0 | Medium | Babel + recast |
| **Vue** | **HIGH** | P1 | Medium | @vue/compiler-sfc + @vue/compiler-dom |
| **Svelte** | **HIGH** | P2 | Low | svelte/compiler |
| **Angular** | **MEDIUM** | P3 | High | @angular/compiler or HTML parser |

### 8.2 Recommended Core Architecture

```
                    +-----------------------+
                    |   UIC CLI Entrypoint  |
                    +-----------+-----------+
                                |
                    +-----------v-----------+
                    |   Framework Detector  |  (detect from package.json, file extensions)
                    +-----------+-----------+
                                |
              +-----------------+------------------+
              |                 |                   |
    +---------v-------+ +------v--------+ +--------v------+
    | React Analyzer  | | Vue Analyzer  | | Svelte Analyzer|
    | (Babel parser)  | | (compiler-sfc)| | (svelte/compiler)
    +---------+-------+ +------+--------+ +--------+------+
              |                 |                   |
              +-----------------+------------------+
                                |
                    +-----------v-----------+
                    |  Unified Element Model|  (framework-agnostic)
                    +-----------+-----------+
                                |
              +-----------------+------------------+
              |                 |                   |
    +---------v-------+ +------v--------+ +--------v------+
    | ID Generator    | | Manifest      | | Code Writer   |
    | (hierarchical)  | | (manifest.json)| | (recast/magic-string)
    +-----------------+ +---------------+ +---------------+
```

### 8.3 Recommended npm Dependencies

**Core parsing (always needed):**
```json
{
  "@babel/parser": "^7.24.0",
  "@babel/traverse": "^7.24.0",
  "@babel/types": "^7.24.0",
  "recast": "^0.23.0"
}
```

**Vue support (optional):**
```json
{
  "@vue/compiler-sfc": "^3.4.0",
  "@vue/compiler-dom": "^3.4.0"
}
```

**Svelte support (optional):**
```json
{
  "svelte": "^5.0.0"
}
```

**Import resolution:**
```json
{
  "enhanced-resolve": "^5.15.0"
}
```

**Utilities:**
```json
{
  "globby": "^14.0.0",
  "magic-string": "^0.30.0"
}
```

Note on `magic-string` `[DOCUMENTED]`: This is a lightweight alternative to recast for simple string insertions. It tracks character offsets and can insert text (like `data-agent-id="..."`) at specific positions in source code while generating a source map. It's faster than recast for simple attribute insertion and is used by Vite and Rollup internally. Consider using it instead of recast if you only need to INSERT attributes (not modify/remove them).

### 8.4 What to Build First (MVP Scope)

`[ASSESSMENT]` Recommended MVP for React/Next.js:

1. **File discovery**: Scan `src/`, `app/`, `pages/` for `.tsx`/`.jsx` files
2. **Route discovery**: Parse App Router (`app/` directory) and Pages Router (`pages/` directory) filesystem conventions
3. **Element discovery**: Parse each file with Babel, find native HTML interactive elements (`button`, `input`, `select`, `textarea`, `a`, `form`)
4. **Known library detection**: Map imports from `@mui/*`, `antd`, `@chakra-ui/*`, `@radix-ui/*`, `@headlessui/*` to interactive semantics
5. **ID generation**: Build hierarchical IDs from route path + component name + element type + distinguishing attributes
6. **Write-back**: Use recast or magic-string to insert `data-agent-id` attributes into source files
7. **Manifest generation**: Output `manifest.json` with all discovered elements, their IDs, file locations, and metadata

### 8.5 Known Limitations to Document

The following limitations should be documented for UIC users:

1. **Dynamic components**: Elements rendered via dynamic component selection cannot be discovered statically
2. **Template literal imports**: Files imported via template literals cannot be followed
3. **Third-party internals**: What a third-party component renders internally is not discoverable without library-specific mappings
4. **Runtime conditionals**: UIC discovers ALL conditional branches but cannot predict which will render
5. **HOC chains**: Deeply nested HOC wrapping may lose the connection between the original component and its rendered elements
6. **Slot/children content**: What a parent passes as children to a component is determined by usage, not by the component definition alone
7. **Server Components**: Interactive event handlers in Server Components will be flagged but may be intentional (e.g., form actions)

### 8.6 Gaps Not Covered in This Research

- **Performance benchmarking**: No actual benchmarks were run comparing parser speeds on real codebases. The speed claims are from published benchmarks by tool authors.
- **Angular deep dive**: Angular was assessed at a higher level than React/Vue/Svelte. A dedicated deep dive would be needed before implementing Angular support.
- **Web Components / Lit**: Not covered. Web Components use standard HTML with Shadow DOM; static analysis would need to handle `<template>` and custom element definitions differently.
- **React Native**: Not covered. React Native uses different primitives (`<View>`, `<TouchableOpacity>`, `<TextInput>`) that would need their own interactive element mappings.
- **Astro/Qwik/Solid**: Not covered. These newer frameworks have different component models that would each need investigation.
- **Real-world validation**: None of the parsing approaches were tested against actual production codebases. Edge cases will certainly emerge during implementation.
- **npm download counts**: Cited as approximate ranges based on training data (up to early 2025). Current numbers may differ.
