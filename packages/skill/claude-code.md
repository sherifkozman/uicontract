# UIC Skill for Claude Code

UIC (UI Contracts) makes web app UIs machine-readable by scanning source code, discovering interactive elements, and generating a manifest with stable hierarchical IDs.

## Quick Start

### 1. Scan a project

```bash
npx uic scan <directory> -o manifest.json
```

Scans the project directory, discovers interactive elements (buttons, inputs, links, forms, etc.), assigns stable agent IDs, and writes a `manifest.json` file.

Options:
- `-o, --output <path>` -- output file path (default: `manifest.json`)
- `--json` -- output raw JSON to stdout instead of writing a file
- `--verbose` -- show debug-level logs

### 2. Find elements

```bash
npx uic find <query>
```

Search for elements by name, label, route, handler, or type. Fuzzy matching is enabled by default.

Examples:
```bash
npx uic find "login"
npx uic find "pase subscribtion"    # fuzzy match finds "pause-subscription"
npx uic find "billing" --type button
npx uic find "settings" --exact     # strict substring match only
npx uic find "checkout" --json      # machine-readable output
```

Options:
- `--manifest <path>` -- path to manifest file (default: `manifest.json`)
- `--type <type>` -- filter results to a specific element type
- `--exact` -- disable fuzzy matching, use exact substring matching
- `--json` -- output as JSON array

### 3. Describe an element

```bash
npx uic describe <agent-id>
```

Show detailed information about a specific element by its agent ID.

Examples:
```bash
npx uic describe settings.billing.pause-subscription.button
npx uic describe settings.billing.pause-subscription.button --json
```

Options:
- `--manifest <path>` -- path to manifest file (default: `manifest.json`)
- `--json` -- output as JSON object

### 4. List elements

```bash
npx uic list
```

List all interactive elements in the manifest.

Examples:
```bash
npx uic list
npx uic list --type button
npx uic list --route "/settings"
npx uic list --component BillingSettings
npx uic list --json
```

Options:
- `--manifest <path>` -- path to manifest file (default: `manifest.json`)
- `--type <type>` -- filter by element type
- `--route <route>` -- filter by route prefix
- `--component <name>` -- filter by component name
- `--json` -- output as JSON array

### 5. Check for breaking changes

```bash
npx uic diff <old-manifest> <new-manifest>
```

Compare two manifests and report added, removed, and changed elements. Useful in CI to catch breaking changes to agent-facing IDs.

Examples:
```bash
npx uic diff baseline.json manifest.json
npx uic diff baseline.json manifest.json --json
```

Options:
- `--json` -- output diff as JSON object
- `--fail-on <category>` -- exit with code 1 if changes of this category are found (e.g., `removed`, `renamed`)

## Example Workflow

A typical workflow for using UIC in automated testing:

1. **Scan** the project to generate a manifest:
   ```bash
   npx uic scan ./src -o manifest.json
   ```

2. **Find** the element you want to interact with:
   ```bash
   npx uic find "submit order" --json
   ```

3. **Use the agent ID** in your test or automation script. The `data-agent-id` attribute is added to the DOM, so you can select elements with:
   ```javascript
   document.querySelector('[data-agent-id="checkout.submit-order.button"]');
   ```

4. **Check for regressions** in CI by diffing against a baseline manifest:
   ```bash
   npx uic diff baseline.json manifest.json --fail-on removed
   ```

## Tips

- Always use `--json` when consuming output programmatically. The JSON output is stable and machine-parseable.
- Use `--exact` if you know the precise substring you are looking for and want to avoid fuzzy matches.
- Run `npx uic scan` after any UI change to keep the manifest up to date.
- Commit your baseline `manifest.json` to version control so `uic diff` can detect breaking changes in pull requests.
- Element agent IDs follow the pattern: `route.component.element-name.type` (e.g., `settings.billing.pause-subscription.button`).
