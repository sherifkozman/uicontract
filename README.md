# UIC - UI Contracts

[![npm](https://img.shields.io/npm/v/uicontract)](https://www.npmjs.com/package/uicontract)
[![license](https://img.shields.io/npm/l/uicontract)](LICENSE)
[![node](https://img.shields.io/node/v/uicontract)](package.json)
[![CI](https://github.com/sherifkozman/uicontract/actions/workflows/ci.yml/badge.svg)](https://github.com/sherifkozman/uicontract/actions)

**Make web app UIs machine-readable.**

UIC parses your source code to discover every interactive element, assigns stable hierarchical IDs, annotates source with `data-agent-id` attributes, generates a manifest describing the full UI surface, and provides a CI diff gate for breaking changes.

Think of it as **OpenAPI for UIs** - a typed, queryable contract between your frontend and anything that needs to interact with it: AI agents, test automation, accessibility audits.

---

## Quick Start

```bash
# Scan a React or Vue project
npx uicontract scan ./my-app

# Assign stable hierarchical IDs
npx uicontract name

# Preview annotation (no files changed)
npx uicontract annotate --dry-run

# Apply data-agent-id attributes to source files
npx uicontract annotate

# Query the manifest
npx uicontract find "login"
npx uicontract describe settings.billing.pause-subscription.button
npx uicontract list --type button

# Detect breaking UI changes in CI
npx uicontract diff
```

---

## What UIC Produces

**1. A manifest** - every interactive element in your app, with stable IDs:

```jsonc
{
  "schemaVersion": "1.0",
  "elements": [
    {
      "agentId": "settings.billing.pause-subscription.button",
      "type": "button",
      "filePath": "src/components/BillingSettings.tsx",
      "line": 47,
      "label": "Pause subscription",
      "route": "/settings/billing",
      "handler": "handlePauseSubscription"
    }
  ]
}
```

**2. Annotated source** - `data-agent-id` attributes in your components:

```tsx
<button
  data-agent-id="settings.billing.pause-subscription.button"
  onClick={handlePauseSubscription}
>
  Pause subscription
</button>
```

**3. A diff gate** - CI blocks merges that silently remove or rename UI elements:

```
BREAKING: 2 elements removed
  - settings.billing.pause-subscription.button  (BillingSettings.tsx:47)
  - settings.billing.cancel-plan.button         (BillingSettings.tsx:61)
```

---

## Why UIC

| Problem | UIC Solution |
|---------|-------------|
| Browser automation breaks on class/text changes | Stable `data-agent-id` selectors survive refactors |
| AI agents cannot discover what's clickable | `manifest.json` gives agents a typed inventory |
| Silent UI regressions reach production | `uicontract diff` in CI blocks breaking changes |
| Accessibility audits require manual mapping | `uicontract list` generates a complete element inventory |

---

## How It Works

UIC follows a four-step pipeline:

**1. Discover** - The parser walks your source AST (Babel for React/TSX, `@vue/compiler-dom` for Vue SFCs) and finds every interactive element: `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`, and any element with an `onClick`, `onChange`, or `onSubmit` handler. No runtime execution required.

**2. Name** - The namer derives a stable hierarchical ID from four signals: route (inferred from file-based routing), component name, element label (aria-label, children text, or htmlFor), and element type. Example: `/settings/billing` + `BillingSettings` + `"Pause subscription"` + `button` produces `settings.billing.pause-subscription.button`. The same source always produces the same ID.

**3. Annotate** - The annotator inserts `data-agent-id="<id>"` directly into source files at the exact line and column the parser recorded. Run `--dry-run` to preview a unified diff patch without touching files. The annotator requires a clean git state and creates `.uic-backup/` before writing.

**4. Query** - AI agents, test runners, and CI scripts read `manifest.json` to look up elements by label, route, component, or ID. The manifest is framework-agnostic JSON that any tool can consume.

Agent IDs survive refactors because they are recomputed from source structure, not from runtime DOM state. If you rename a CSS class or restructure a component file, the ID stays the same. If you change the semantic meaning (route, label, type), `uicontract diff` catches it in CI before it reaches production.

---

## Supported Frameworks

| Framework | Status |
|-----------|--------|
| React / Next.js | Full support |
| Vue 3 / Nuxt | Full support |

---

## Integration

UIC agent IDs work with any browser automation tool:

```js
// Playwright
await page.locator('[data-agent-id="settings.billing.pause-subscription.button"]').click();

// Cypress
cy.get('[data-agent-id="settings.billing.pause-subscription.button"]').click();

// CSS selector
document.querySelector('[data-agent-id="settings.billing.pause-subscription.button"]')
```

For AI coding agents, see [`packages/skill/SKILL.md`](packages/skill/SKILL.md).

---

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [`uicontract`](packages/cli) | `npm i uicontract` | CLI - all commands |
| [`@uicontract/core`](packages/core) | `npm i @uicontract/core` | Types, schema, validation, logger, errors |
| [`@uicontract/parser-react`](packages/parser-react) | `npm i @uicontract/parser-react` | React/Next.js AST parser |
| [`@uicontract/parser-vue`](packages/parser-vue) | `npm i @uicontract/parser-vue` | Vue/Nuxt SFC parser |
| [`@uicontract/namer`](packages/namer) | `npm i @uicontract/namer` | Hierarchical ID naming engine |
| [`@uicontract/annotator`](packages/annotator) | `npm i @uicontract/annotator` | Source code annotator |
| [`@uicontract/skill`](packages/skill) | `npm i @uicontract/skill` | Agent skill files for AI coding tools |

---

## Development

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9
git clone https://github.com/sherifkozman/uicontract.git
cd uicontract
pnpm install
pnpm build
pnpm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines, architecture overview, and code conventions.

---

## License

[MIT](LICENSE)
