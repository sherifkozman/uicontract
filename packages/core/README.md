# @uicontract/core

Core types, schema, validation, logger, and error classes for UI Contracts.

## Install

```bash
npm install @uicontract/core
```

## Usage

```typescript
import { type ManifestElement, validateManifest, createLogger, UicError } from '@uicontract/core';

// Validate a manifest against the JSON Schema
const result = validateManifest(manifest);
if (!result.valid) {
  console.error(result.errors);
}

// Create a structured logger
const logger = createLogger({ level: 'info' });
logger.info('Scan complete', { filesScanned: 42 });

// Typed errors with code and context
throw new UicError('MANIFEST_NOT_FOUND', {
  message: 'No manifest.json found. Run "npx uicontract scan <dir>" first.',
  path: '/my-app',
});
```

## API

- **Types**: `ManifestElement`, `RawElement`, `NamedElement`, `ParserPlugin`, `DiscoveryResult`, and more
- **`validateManifest(manifest)`**: Validates a manifest object against the v1.1 JSON Schema; returns `{ valid, errors }`
- **`createLogger(options)`**: Returns a structured logger with `debug`, `info`, `warn`, and `error` methods
- **`UicError`**: Base error class with `code` and `context` properties for all UI Contracts packages

All shared types and interfaces live here. Framework-specific packages (`@uicontract/parser-react`, `@uicontract/parser-vue`) and the naming/annotation layers all depend on this package.

## Part of UI Contracts

This package is part of [UI Contracts](https://github.com/sherifkozman/uicontract) - making web app UIs machine-readable.

## License

[MIT](../../LICENSE)
