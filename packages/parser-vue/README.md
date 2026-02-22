# @uicontract/parser-vue

Vue and Nuxt parser for discovering interactive UI elements.

## Install

```bash
npm install @uicontract/parser-vue
```

## Usage

```typescript
import { VueParser } from '@uicontract/parser-vue';

const parser = new VueParser();

// Detect whether a project uses Vue
const isVue = await parser.detect('/path/to/my-app');

// Discover all interactive elements
const { elements, warnings, metadata } = await parser.discover('/path/to/my-app', {
  include: ['src/**/*.vue'],
});

console.log(`Found ${elements.length} elements in ${metadata.filesScanned} files`);
// elements: RawElement[] ready for @uicontract/namer
```

## API

- **`VueParser`**: Implements the `Parser` interface from `@uicontract/core`.
  - **`detect(dir)`**: Returns `true` if the directory contains a Vue 3 or Nuxt project.
  - **`discover(dir, options)`**: Parses `.vue` Single File Component templates using `@vue/compiler-dom`. Returns `{ elements, warnings, metadata }`.

Discovered element types: `button`, `a` (link), `input`, `select`, `textarea`, `form`.

Targets Vue 3 and Nuxt projects. Unexpected syntax produces a `warning` entry rather than throwing, so partial results are always returned.

## Part of UI Contracts

This package is part of [UI Contracts](https://github.com/sherifkozman/uicontract) - making web app UIs machine-readable.

## License

[MIT](../../LICENSE)
