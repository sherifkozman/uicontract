# Playwright Integration Guide

This guide shows how to use UI Contracts with Playwright for stable, maintainable end-to-end tests.

## Overview

UI Contracts assigns stable `data-agent-id` attributes to interactive elements in your source code. Playwright tests can use these IDs as selectors instead of brittle CSS selectors or XPaths that break when the UI changes.

**Before UI Contracts:**
```typescript
// Fragile - breaks when CSS changes
await page.click('.billing-section > div:nth-child(3) > button.btn-danger');
```

**After UI Contracts:**
```typescript
// Stable - survives refactors
await page.click('[data-agent-id="settings.billing.pause-subscription.button"]');
```

## Setup

### 1. Install and Scan

```bash
# Install UI Contracts
pnpm add -D @uicontract/cli

# Scan your project
npx uicontract scan ./src -o manifest.json

# Assign agent IDs
npx uicontract name manifest.json -o named-manifest.json

# Preview annotation changes
npx uicontract annotate --manifest named-manifest.json --dry-run

# Apply annotations to source files
npx uicontract annotate --manifest named-manifest.json --write
```

After annotation, your source files contain `data-agent-id` attributes:

```tsx
<button
  data-agent-id="settings.billing.pause-subscription.button"
  onClick={handlePause}
>
  Pause subscription
</button>
```

### 2. Create a Helper

Create a helper to build selectors from agent IDs:

```typescript
// tests/helpers/uic.ts
import { Page, Locator } from '@playwright/test';

export function byAgentId(page: Page, agentId: string): Locator {
  return page.locator(`[data-agent-id="${agentId}"]`);
}
```

### 3. Write Tests

```typescript
import { test, expect } from '@playwright/test';
import { byAgentId } from './helpers/uic';

test('pause subscription flow', async ({ page }) => {
  await page.goto('/settings/billing');

  // Click the pause button using its stable agent ID
  await byAgentId(page, 'settings.billing.pause-subscription.button').click();

  // Fill in the reason form
  await byAgentId(page, 'settings.billing.pause-reason.select').selectOption('too-expensive');
  await byAgentId(page, 'settings.billing.pause-confirm.button').click();

  // Verify the result
  await expect(byAgentId(page, 'settings.billing.resume-subscription.button')).toBeVisible();
});
```

## Finding Agent IDs

Use UI Contracts commands to discover the right agent ID for your test:

```bash
# Search by name or label
npx uicontract find "pause subscription"

# List all buttons on a route
npx uicontract list --route /settings/billing --type button

# Get full details for an element
npx uicontract describe settings.billing.pause-subscription.button
```

## CI Pipeline

Add UI Contracts diff checking to your CI to catch when UI changes break agent IDs:

```yaml
# .github/workflows/test.yml
jobs:
  uic-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm build

      # Generate current manifest
      - run: npx uicontract scan ./src -o /tmp/current.json

      # Compare against committed baseline
      - run: npx uicontract diff manifest.json /tmp/current.json

  playwright:
    runs-on: ubuntu-latest
    needs: [uic-check]
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: npx playwright test
```

### Workflow

1. Commit `manifest.json` as your baseline
2. On every PR, scan and diff against baseline
3. If agent IDs changed, the diff step fails
4. Review changes: if intentional, update the baseline; if accidental, fix the code
5. Playwright tests use the same stable IDs

## Best Practices

- **Commit your baseline manifest** to version control so `uicontract diff` can detect regressions.
- **Run `uicontract scan` after UI changes** to keep the manifest in sync.
- **Use `--json` flag** for programmatic consumption of UI Contracts output in CI scripts.
- **Protect critical scopes** in `.uicrc.json` to prevent accidental changes to important elements:
  ```json
  {
    "protectedScopes": ["checkout", "settings.billing"]
  }
  ```
- **Don't hard-code agent IDs** in test data. Use the `uicontract find` command or read from the manifest file to make tests self-documenting.

## Stripping Attributes in Production

If you prefer not to ship `data-agent-id` attributes to production, you can strip them at build time. UI Contracts provides guidance on configuring Babel or SWC plugins to remove `data-agent-id` attributes during production builds while keeping them in development and test environments.
