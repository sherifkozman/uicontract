# AI Agent Integration Guide

This guide shows how AI agents can use UIC manifests to understand and interact with web application UIs.

## Overview

UIC makes web UIs machine-readable by scanning source code and generating a manifest of all interactive elements with stable, hierarchical IDs. AI agents can use this manifest to:

- **Discover** what interactive elements exist in an application
- **Navigate** to specific elements by their stable agent ID
- **Interact** with elements using `data-agent-id` selectors in the DOM
- **Detect regressions** when UI changes break expected elements

## Agent Skill Files

UIC ships with pre-built skill files that teach agents the available commands:

- `packages/skill/universal.md` - framework-agnostic skill for any agent
- `packages/skill/SKILL.md` - optimized for AI coding agents

These files describe the UIC CLI commands, typical workflows, and tips for programmatic usage. Install them as agent context or system prompts.

## Typical Agent Workflow

### 1. Scan the Project

```bash
npx uicontract scan ./src -o manifest.json
```

The agent scans the project to discover all interactive elements.

### 2. Query the Manifest

```bash
# Find elements related to a task
npx uicontract find "login" --json

# List all form elements
npx uicontract list --type form --json

# Get details about a specific element
npx uicontract describe settings.billing.pause-subscription.button --json
```

The `--json` flag returns machine-parseable output for programmatic consumption.

### 3. Interact with Elements

Agent IDs map directly to DOM selectors via the `data-agent-id` attribute:

```javascript
// In browser automation
document.querySelector('[data-agent-id="checkout.submit-order.button"]');
```

```python
# In Selenium
driver.find_element(By.CSS_SELECTOR, '[data-agent-id="checkout.submit-order.button"]')
```

```typescript
// In Playwright
page.locator('[data-agent-id="checkout.submit-order.button"]')
```

### 4. Verify UI Stability

```bash
# Compare current UI against a baseline
npx uicontract diff baseline.json manifest.json --json
```

Agents can check for regressions before executing a workflow that depends on specific elements.

## Programmatic API

### Reading the Manifest

The manifest is a JSON file that can be loaded directly:

```typescript
import * as fs from 'node:fs/promises';

interface ManifestElement {
  agentId: string;
  type: string;
  filePath: string;
  line: number;
  componentName: string | null;
  route: string | null;
  label: string | null;
  handler: string | null;
}

interface Manifest {
  schemaVersion: string;
  elements: ManifestElement[];
  metadata: {
    framework: string;
    filesScanned: number;
    elementsDiscovered: number;
  };
}

const raw = await fs.readFile('manifest.json', 'utf-8');
const manifest: Manifest = JSON.parse(raw);
```

### Querying Elements

Filter the manifest to find elements relevant to an agent's task:

```typescript
// Find all buttons on the checkout page
const checkoutButtons = manifest.elements.filter(
  el => el.route === '/checkout' && el.type === 'button'
);

// Find an element by partial ID match
const submitBtn = manifest.elements.find(
  el => el.agentId.includes('submit-order')
);

// Find all elements in a component
const billingElements = manifest.elements.filter(
  el => el.componentName === 'BillingSettings'
);
```

### Building Selectors

```typescript
function toSelector(agentId: string): string {
  return `[data-agent-id="${agentId}"]`;
}

// Usage
const selector = toSelector('checkout.submit-order.button');
// → '[data-agent-id="checkout.submit-order.button"]'
```

## Agent ID Format

Agent IDs follow a hierarchical, dot-separated format:

```
route.component.element-name.type
```

Examples:
- `settings.billing.pause-subscription.button`
- `checkout.payment-form.card-number.input`
- `login.email.input`
- `nav.home.a`

Each segment uses `kebab-case` and the full ID matches the pattern `^[a-z][a-z0-9.-]*$`.

## Best Practices for Agents

### Use `--json` for All Programmatic Output

```bash
npx uicontract find "login" --json    # Returns JSON array
npx uicontract list --json             # Returns JSON array
npx uicontract describe <id> --json   # Returns JSON object
npx uicontract diff a.json b.json --json  # Returns JSON object
```

### Use Fuzzy Search

UIC supports fuzzy matching by default. Agents can search with approximate terms:

```bash
npx uicontract find "pase subscribtion"  # Finds "pause-subscription"
```

Use `--exact` when you know the precise term and want to avoid false positives.

### Check for Breaking Changes Before Executing

Before running a workflow that depends on specific elements, verify they still exist:

```bash
npx uicontract describe checkout.submit-order.button --json
```

If the element is not found, the agent should re-scan or report the issue.

### Keep the Manifest Updated

Run `npx uicontract scan` after any UI changes to keep the manifest in sync with the codebase.

### Commit the Baseline Manifest

Store `manifest.json` in version control so `uicontract diff` can detect changes in pull requests.
