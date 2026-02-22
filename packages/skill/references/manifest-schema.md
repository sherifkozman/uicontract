# Manifest Schema Reference

The manifest is a JSON file produced by running `npx uicontract scan <dir>` followed by `npx uicontract name`. It describes every interactive element in a web application, giving each a stable hierarchical ID that browser automation tools can target.

## Top-Level Structure

```jsonc
{
  "schemaVersion": "1.0",
  "generatedAt": "2026-02-21T00:00:00Z",
  "generator": { "name": "uicontract", "version": "0.1.0" },
  "metadata": {
    "framework": "react",
    "projectRoot": "/path/to/project",
    "filesScanned": 42,
    "elementsDiscovered": 87,
    "warnings": 3
  },
  "elements": [
    { /* ... element objects ... */ }
  ]
}
```

| Field           | Type   | Description                              |
|-----------------|--------|------------------------------------------|
| schemaVersion   | string | Schema version, currently `"1.0"`        |
| generatedAt     | string | ISO 8601 datetime of manifest generation |
| generator       | object | Tool name and version that produced this |
| metadata        | object | Summary statistics about the scan        |
| elements        | array  | List of discovered interactive elements  |

## Metadata

| Field              | Type   | Example    | Description                        |
|--------------------|--------|------------|------------------------------------|
| framework          | string | `"react"`  | Detected framework (`react`, `vue`) |
| projectRoot        | string | `"/app"`   | Absolute path to project root      |
| filesScanned       | number | `42`       | Number of source files scanned     |
| elementsDiscovered | number | `87`       | Total interactive elements found   |
| warnings           | number | `3`        | Count of parser warnings           |

## Element Fields

Each object in the `elements` array describes one interactive element:

| Field         | Type           | Description                                        |
|---------------|----------------|----------------------------------------------------|
| agentId       | string         | Stable hierarchical ID -- the primary selector target |
| type          | string         | Element kind: `button`, `input`, `select`, `a`, `form`, `textarea` |
| label         | string\|null   | Human-readable description of the element          |
| route         | string\|null   | URL path where the element appears                 |
| handler       | string\|null   | Event handler function name (e.g. `handleSubmit`)  |
| conditional   | boolean        | `true` if the element may not always be visible    |
| dynamic       | boolean        | `true` if rendered from dynamic data               |
| filePath      | string         | Source file path relative to project root           |
| line          | number         | Line number in source file (1-indexed)             |
| column        | number         | Column number in source file (1-indexed)           |
| componentName | string\|null   | Name of the React/Vue component containing this element |

## Agent ID Format

Agent IDs follow the pattern:

```
route.component.element-name.type
```

IDs use dot-separated segments with kebab-case within each segment. Examples:

- `settings.billing.pause-subscription.button` -- a button in the BillingSettings component on the /settings/billing route
- `login.login-form.email.input` -- an email input in the LoginForm component on the /login route
- `dashboard.header.notifications.a` -- a notifications link in the Header component on the /dashboard route

The hierarchical structure enables prefix-based selectors. For example, `settings.billing.*` matches every interactive element on the billing settings page, useful for scoping automation tasks to a specific section of the UI.
