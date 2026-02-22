# @uicontract/namer

Naming engine that assigns hierarchical agent IDs to UI elements.

## Install

```bash
npm install @uicontract/namer
```

## Usage

```typescript
import { assignNames } from '@uicontract/namer';
import type { RawElement } from '@uicontract/core';

const rawElements: RawElement[] = [
  /* output from a parser */
];

const named = await assignNames(rawElements, {
  projectRoot: '/path/to/my-app',
});

// Each element now has a stable, hierarchical agentId:
// "settings.billing.pause-subscription.button"
console.log(named[0].agentId);
```

## API

- **`assignNames(elements, options)`**: Takes `RawElement[]` produced by a parser and returns `NamedElement[]`, each with a stable `agentId` in `route.component.element-name.type` dot-separated format.

ID format: `<route>.<component>.<label>.<type>`

Examples:
- `settings.billing.pause-subscription.button`
- `login.login-form.email.input`
- `nav.header.sign-out.link`

The namer is deterministic: the same element always receives the same ID across runs. It does not read source files or write anything to disk.

## Part of UIC

This package is part of [UIC (UI Contracts)](https://github.com/sherifkozman/uicontract) - making web app UIs machine-readable.

## License

[MIT](../../LICENSE)
