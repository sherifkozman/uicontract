# UIC -- UI Contracts for Agent Automation

UIC makes web application UIs machine-readable by scanning source code, discovering interactive elements, and generating a manifest with stable hierarchical IDs.

## Commands

### Scan a project

```
npx uic scan <directory> -o manifest.json
```

Discovers all interactive elements (buttons, inputs, links, forms, selects, textareas) in the project source code. Outputs a `manifest.json` file describing each element with a stable `agentId`.

Common flags:
- `-o, --output <path>` -- output file path (default: `manifest.json`)
- `--json` -- write raw JSON to stdout
- `--verbose` -- enable debug logging

### Find elements

```
npx uic find <query>
```

Search the manifest for elements matching a query. Supports fuzzy matching by default, so approximate or misspelled queries still return relevant results.

Common flags:
- `--manifest <path>` -- manifest file path (default: `manifest.json`)
- `--type <type>` -- filter by element type (e.g., `button`, `input`, `a`)
- `--exact` -- disable fuzzy matching, require exact substring match
- `--json` -- output as JSON array

Examples:
```
npx uic find "login"
npx uic find "pase subscribtion"      # fuzzy: finds "pause-subscription"
npx uic find "billing" --type button
npx uic find "checkout" --json
```

### Describe an element

```
npx uic describe <agent-id>
```

Print detailed information about a single element identified by its agent ID.

Common flags:
- `--manifest <path>` -- manifest file path (default: `manifest.json`)
- `--json` -- output as JSON object

### List elements

```
npx uic list
```

List all interactive elements in the manifest, with optional filters.

Common flags:
- `--manifest <path>` -- manifest file path (default: `manifest.json`)
- `--type <type>` -- filter by element type
- `--route <route>` -- filter by route prefix
- `--component <name>` -- filter by component name
- `--json` -- output as JSON array

### Diff manifests

```
npx uic diff <old-manifest> <new-manifest>
```

Compare two manifests to detect added, removed, and changed elements. Designed for CI pipelines to catch breaking changes to agent-facing IDs.

Common flags:
- `--json` -- output as JSON object
- `--fail-on <category>` -- exit code 1 when changes of a given category exist (e.g., `removed`)

## Typical Workflow

1. **Scan** the project:
   ```
   npx uic scan ./src -o manifest.json
   ```

2. **Find** the target element:
   ```
   npx uic find "submit order" --json
   ```

3. **Use the agent ID** to interact with the element in the DOM:
   ```
   [data-agent-id="checkout.submit-order.button"]
   ```

4. **Diff** against a baseline to detect regressions:
   ```
   npx uic diff baseline.json manifest.json --fail-on removed
   ```

## Key Concepts

- **Agent ID**: A stable, hierarchical identifier assigned to each interactive element. Format: `route.component.element-name.type`. Example: `settings.billing.pause-subscription.button`.
- **Manifest**: A JSON file listing all discovered interactive elements with their agent IDs, types, source locations, labels, and handlers.
- **`data-agent-id` attribute**: Added to the DOM by the annotator so that agents and test scripts can select elements by their stable ID.

## Tips

- Use `--json` for all programmatic consumption. The JSON output format is stable.
- Run `npx uic scan` after UI changes to regenerate the manifest.
- Commit the baseline manifest to version control for CI diffing.
- Use `--exact` when you know the precise term and want to avoid fuzzy false positives.
