# uic

CLI tool that makes web app UIs machine-readable for AI agents.

## Install

```bash
npm install -g uic
# or use without installing:
npx uicontract <command>
```

## Usage

```bash
# Scan a project and produce a manifest
npx uicontract scan ./my-app

# Find elements by label or ID pattern
npx uicontract find "login"

# Describe a specific element
npx uicontract describe settings.billing.pause-subscription.button

# List all elements in the manifest
npx uicontract list

# Insert data-agent-id attributes into source files (dry run first)
npx uicontract annotate --dry-run
npx uicontract annotate

# Diff the current manifest against a baseline (CI gate)
npx uicontract diff

# All commands support --help and --json
npx uicontract scan --help
npx uicontract list --json
```

## Commands

| Command    | Description                                                    |
|------------|----------------------------------------------------------------|
| `scan`     | Parse source files and generate `manifest.json`               |
| `name`     | Assign hierarchical agent IDs to discovered elements          |
| `annotate` | Insert `data-agent-id` attributes into source files           |
| `find`     | Search elements by label, ID pattern, or type                 |
| `describe` | Show full details for a single element by agent ID            |
| `list`     | List all elements in the manifest                             |
| `diff`     | Compare two manifests and report breaking changes             |

Every command accepts `--help` for flag documentation and `--json` for machine-readable output.

## Part of UI Contracts

This package is part of [UI Contracts](https://github.com/sherifkozman/uicontract) - making web app UIs machine-readable.

## License

[MIT](../../LICENSE)
