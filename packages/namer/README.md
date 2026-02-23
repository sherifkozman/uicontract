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

## AI-Assisted Naming

For elements lacking strong naming signals (no label or handler), enable AI naming to get context-aware IDs instead of fallback line-number names.

```typescript
import { assignNames } from '@uicontract/namer';
import type { RawElement } from '@uicontract/core';

const named = await assignNames(rawElements, {
  projectRoot: '/path/to/my-app',
  ai: true, // requires OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY in env
});
```

### AiNamerOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | `10000` | Timeout in milliseconds per AI batch |
| `provider` | `'openai' \| 'anthropic' \| 'google'` | auto-detected | AI provider to use |
| `model` | `string` | provider-specific | Model override |
| `apiKey` | `string` | from env | API key override |

AI naming only targets "weak" elements (no label + no handler). All other elements use deterministic naming. If the AI call fails or times out, the element falls back to its deterministic ID.

See the [CLI docs](../../docs/CLI.md#ai-assisted-naming) for full setup and troubleshooting.

## Part of UI Contracts

This package is part of [UI Contracts](https://github.com/sherifkozman/uicontract) - making web app UIs machine-readable.

## License

[MIT](../../LICENSE)
