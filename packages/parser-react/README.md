# @uicontract/parser-react

React and Next.js parser for discovering interactive UI elements.

## Install

```bash
npm install @uicontract/parser-react
```

## Usage

```typescript
import { ReactParser } from '@uicontract/parser-react';

const parser = new ReactParser();

// Detect whether a project uses React
const isReact = await parser.detect('/path/to/my-app');

// Discover all interactive elements
const { elements, warnings, metadata } = await parser.discover('/path/to/my-app', {
  include: ['src/**/*.{tsx,jsx}'],
});

console.log(`Found ${elements.length} elements in ${metadata.filesScanned} files`);
// elements: RawElement[] ready for @uicontract/namer
```

## API

- **`ReactParser`**: Implements the `Parser` interface from `@uicontract/core`.
  - **`detect(dir)`**: Returns `true` if the directory contains a React project.
  - **`discover(dir, options)`**: AST-parses `.tsx` and `.jsx` files using `@babel/parser` and `@babel/traverse`. Returns `{ elements, warnings, metadata }`.

Discovered element types: `button`, `a` (link), `input`, `select`, `textarea`, `form`.

Supported patterns: JSX, TSX, `forwardRef`, `memo`, HOCs, dynamic imports, conditional rendering, file-based routing (Next.js).

Unexpected syntax produces a `warning` entry rather than throwing, so partial results are always returned.

## Part of UIC

This package is part of [UIC (UI Contracts)](https://github.com/sherifkozman/uicontract) - making web app UIs machine-readable.

## License

[MIT](../../LICENSE)
