# UIC — UI Contracts

[![npm](https://img.shields.io/npm/v/uic)](https://www.npmjs.com/package/uic)
[![license](https://img.shields.io/npm/l/uic)](LICENSE)
[![node](https://img.shields.io/node/v/uic)](package.json)
[![CI](https://github.com/sherifkozman/uicontract/actions/workflows/ci.yml/badge.svg)](https://github.com/sherifkozman/uicontract/actions)

**Make web app UIs machine-readable.**

UIC parses your source code to discover every interactive element, assigns stable hierarchical IDs, annotates source with `data-agent-id` attributes, generates a manifest describing the full UI surface, and provides a CI diff gate for breaking changes.

Think of it as **OpenAPI for UIs** — a typed, queryable contract between your frontend and anything that needs to interact with it: AI agents, test automation, accessibility audits.

---

## Quick Start

```bash
# Scan a React or Vue project
npx uic scan ./my-app

# Assign stable hierarchical IDs
npx uic name

# Preview annotation (no files changed)
npx uic annotate --dry-run

# Apply data-agent-id attributes to source files
npx uic annotate

# Query the manifest
npx uic find "login"
npx uic describe settings.billing.pause-subscription.button
npx uic list --type button

# Detect breaking UI changes in CI
npx uic diff
```

---

## What UIC Produces

**1. A manifest** — every interactive element in your app, with stable IDs:

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

**2. Annotated source** — `data-agent-id` attributes in your components:

```tsx
<button
  data-agent-id="settings.billing.pause-subscription.button"
  onClick={handlePauseSubscription}
>
  Pause subscription
</button>
```

**3. A diff gate** — CI blocks merges that silently remove or rename UI elements:

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
| AI agents can't discover what's clickable | `manifest.json` gives agents a typed inventory |
| Silent UI regressions reach production | `uic diff` in CI blocks breaking changes |
| Accessibility audits require manual mapping | `uic list` generates a complete element inventory |

---

## Supported Frameworks

| Framework | Status |
|-----------|--------|
| React / Next.js | Full support |
| Vue 3 / Nuxt | Full support |

---

## Integration

UIC agent IDs work with any browser automation tool:

```bash
# Playwright
await page.locator('[data-agent-id="settings.billing.pause-subscription.button"]').click();

# Cypress
cy.get('[data-agent-id="settings.billing.pause-subscription.button"]').click();

# CSS selector
document.querySelector('[data-agent-id="settings.billing.pause-subscription.button"]')
```

For AI agents, see [`packages/skill/SKILL.md`](packages/skill/SKILL.md).

---

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [`uic`](packages/cli) | `npm i uic` | CLI — all commands |
| [`@uic/core`](packages/core) | `npm i @uic/core` | Types, schema, validation, logger, errors |
| [`@uic/parser-react`](packages/parser-react) | `npm i @uic/parser-react` | React/Next.js AST parser |
| [`@uic/parser-vue`](packages/parser-vue) | `npm i @uic/parser-vue` | Vue/Nuxt SFC parser |
| [`@uic/namer`](packages/namer) | `npm i @uic/namer` | Hierarchical ID naming engine |
| [`@uic/annotator`](packages/annotator) | `npm i @uic/annotator` | Source code annotator |

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
