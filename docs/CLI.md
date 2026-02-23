# CLI Command Reference

UI Contracts provides a command-line interface for scanning projects, querying manifests, and managing UI contracts.

## Installation

```bash
npm install -g @uicontract/cli
# or use npx
npx uicontract <command>
```

## Global Options

```
--version, -V       Print the uic version and exit
--help, -h          Show help message
```

Run `uic <command> --help` for command-specific help.

---

## `uicontract scan`

Scan a project directory for interactive UI elements and emit a manifest.

```
uicontract scan <directory> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<directory>` | Path to the project root to scan |

**Options:**

| Option | Description |
|--------|-------------|
| `--framework <name>` | Framework to use (`react`, `vue`). Auto-detected if omitted. |
| `--output, -o <file>` | Write manifest to a file instead of stdout. |
| `--json` | Output manifest as JSON (default when writing to stdout). |
| `--verbose` | Enable debug logging. |
| `--quiet` | Suppress all non-error output. |
| `--help, -h` | Show help message. |

**Examples:**

```bash
uicontract scan ./my-app
uicontract scan ./my-app --framework react --output manifest.json
uicontract scan ./my-app --verbose
```

**Exit codes:**

| Code | Meaning |
|------|---------|
| `0` | Scan completed successfully |
| `1` | Error (directory not found, no framework detected, scan failure) |

---

## `uicontract name`

Assign stable, hierarchical agent IDs to elements in a manifest.

```
uicontract name <manifest> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<manifest>` | Path to a `manifest.json` produced by `uicontract scan` |

**Options:**

| Option | Description |
|--------|-------------|
| `--output, -o <file>` | Write named manifest to a file instead of stdout. |
| `--ai` | Use AI-assisted naming (experimental, falls back to deterministic). |
| `--ai-provider <name>` | AI provider: `openai`, `anthropic`, or `google` (auto-detected from env). |
| `--ai-model <model>` | Override the default model for the AI provider. |
| `--ai-timeout <ms>` | Timeout for AI naming in milliseconds (default: 10000). |
| `--json` | Output as JSON (default). |
| `--help, -h` | Show help message. |

**Examples:**

```bash
uicontract name manifest.json
uicontract name manifest.json -o named-manifest.json
uicontract name manifest.json --ai
uicontract name manifest.json --ai --ai-timeout 10000
```

### AI-Assisted Naming

The `--ai` flag enables AI-assisted naming for elements that lack strong naming signals (no label and no handler). These "weak" elements normally get fallback IDs like `component.button.47`. With `--ai`, an LLM analyzes the element's context (component name, route, surrounding code) and suggests human-readable name segments instead.

**Setup**

Set one of these environment variables with your API key:

| Variable | Provider |
|----------|----------|
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic |
| `GOOGLE_API_KEY` or `GEMINI_API_KEY` | Google |

The provider is auto-detected in this priority order: OpenAI, Anthropic, Google. Use `--ai-provider` to override.

**Default models**

| Provider | Default Model |
|----------|---------------|
| OpenAI | `gpt-4o-mini` |
| Anthropic | `claude-haiku-4-5-20251001` |
| Google | `gemini-2.0-flash` |

Use `--ai-model` to override (e.g., `--ai-model gpt-4o` for higher quality at higher cost).

**Examples**

```bash
# Auto-detect provider from env
export OPENAI_API_KEY=sk-...
uicontract name manifest.json --ai

# Explicit provider and model
uicontract name manifest.json --ai --ai-provider anthropic --ai-model claude-sonnet-4-5-20250514

# Increase timeout for slow connections
uicontract name manifest.json --ai --ai-timeout 20000

# Write output to file
uicontract name manifest.json --ai -o named-manifest.json
```

**How it works**

1. The namer scores each element. Elements with a label or handler get deterministic IDs as usual.
2. Elements with neither (weak names) are batched (up to 20 per request) and sent to the AI provider with their component name, route, file path, and element type.
3. The AI suggests a kebab-case name segment. The namer validates the response (format, length, uniqueness) before applying it.
4. If the AI call fails, times out, or returns an invalid name, the element falls back to its deterministic ID silently. AI naming never blocks the pipeline.

**Troubleshooting**

| Issue | Cause | Fix |
|-------|-------|-----|
| `No AI provider detected` | No API key in environment | Set `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_API_KEY` |
| `AI naming timed out` | Provider too slow or network issue | Increase `--ai-timeout` (default: 10000ms) |
| Some elements still have weak names | AI returned invalid format or duplicate | Expected; deterministic fallback is intentional |
| All elements unchanged | No elements qualified as "weak" | AI only targets elements with no label and no handler |

---

## `uicontract annotate`

Insert `data-agent-id` attributes into source files based on a manifest.

```
uicontract annotate [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--manifest <path>` | Path to manifest file (default: `manifest.json`). |
| `--dry-run` | Show patches without modifying files (default). |
| `--write` | Modify source files in-place (creates backup first). |
| `--backup-dir <dir>` | Backup directory (default: `.uic-backup`). |
| `--json` | Output results as JSON. |
| `--help, -h` | Show help message. |

**Examples:**

```bash
uicontract annotate
uicontract annotate --manifest named-manifest.json --dry-run
uicontract annotate --write
uicontract annotate --write --backup-dir ./my-backup
uicontract annotate --json
```

**Safety:** The annotator creates a backup in `.uic-backup/` before modifying any files when using `--write`. Use `--dry-run` (default) to preview changes first.

---

## `uicontract find`

Search for interactive UI elements in a manifest by name, label, route, or handler.

```
uicontract find <query> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<query>` | Text to search for (case-insensitive) |

**Options:**

| Option | Description |
|--------|-------------|
| `--manifest <path>` | Path to manifest file (default: `manifest.json`). |
| `--type <type>` | Filter results to a specific element type. |
| `--threshold <n>` | Minimum fuzzy match score between 0 and 1 (default: 0.6). Lower values include weaker matches. |
| `--limit <n>` | Maximum number of results to return (default: 10). |
| `--exact` | Use exact substring matching (no fuzzy matching). |
| `--fuzzy` | Use fuzzy matching (default). |
| `--json` | Output matching elements as JSON array. |
| `--help, -h` | Show help message. |

**Examples:**

```bash
uicontract find "login"
uicontract find "pase subscribtion"          # fuzzy match finds "pause-subscription"
uicontract find "button" --type button
uicontract find "settings" --exact           # strict substring match only
uicontract find "settings" --manifest dist/manifest.json --json
uicontract find "billing" --threshold 0.8      # stricter matching
uicontract find "billing" --limit 5            # return at most 5 results
```

---

## `uicontract describe`

Show full details of an interactive UI element by its agent ID.

```
uicontract describe <agent-id> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<agent-id>` | The agent ID of the element to describe |

**Options:**

| Option | Description |
|--------|-------------|
| `--manifest <path>` | Path to manifest file (default: `manifest.json`). |
| `--json` | Output element as JSON. |
| `--help, -h` | Show help message. |

**Examples:**

```bash
uicontract describe settings.billing.pause-btn.button
uicontract describe login.email.input --json
uicontract describe nav.home.a --manifest dist/manifest.json
```

---

## `uicontract list`

List all interactive UI elements in a manifest.

```
uicontract list [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--manifest <path>` | Path to manifest file (default: `manifest.json`). |
| `--type <type>` | Filter by element type (`button`, `input`, `a`, etc.). |
| `--route <route>` | Filter by route. |
| `--component <name>` | Filter by component name. |
| `--routes` | Show route summary (unique routes with element counts). |
| `--components` | Show component summary (unique components with element counts). |
| `--json` | Output as JSON. |
| `--help, -h` | Show help message. |

**Examples:**

```bash
uicontract list
uicontract list --type button
uicontract list --route /settings/billing
uicontract list --component LoginForm
uicontract list --routes
uicontract list --components
uicontract list --json --manifest dist/manifest.json
```

---

## `uicontract diff`

Compare two manifests and report changes. Designed for CI pipelines to catch breaking changes to agent-facing IDs.

```
uicontract diff <old-manifest> <new-manifest> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<old-manifest>` | Path to the baseline manifest |
| `<new-manifest>` | Path to the new/current manifest |

**Options:**

| Option | Description |
|--------|-------------|
| `--allow-breaking <reason>` | Override exit code to 0 even with breaking changes. |
| `--config <path>` | Path to `.uicrc.json` config file (auto-detected if omitted). |
| `--json` | Output diff result as JSON. |
| `--help, -h` | Show help message. |

**Change categories:**

| Category | Type | Description |
|----------|------|-------------|
| `REMOVED` | Breaking | Element was deleted |
| `RENAMED` | Breaking | Agent ID changed |
| `TYPE_CHANGED` | Breaking | Element type changed |
| `ROUTE_CHANGED` | Breaking | Route changed |
| `ADDED` | Informational | New element added |
| `LABEL_CHANGED` | Informational | Label text changed |
| `HANDLER_CHANGED` | Informational | Handler name changed |
| `MOVED` | Informational | File path changed |

**Exit codes:**

| Code | Meaning |
|------|---------|
| `0` | No breaking changes (or `--allow-breaking` used with no protected scope violations) |
| `1` | Breaking changes found, error, or protected scope violation |

**Examples:**

```bash
uicontract diff baseline.json current.json
uicontract diff old.json new.json --json
uicontract diff old.json new.json --allow-breaking "Intentional redesign of nav"
uicontract diff old.json new.json --config ./my-config.json
```

---

## Configuration

UI Contracts is configured via a `.uicrc.json` file in your project root. The CLI searches the target directory and its parents for this file.

### Schema

```json
{
  "protectedScopes": ["settings.billing", "checkout"],
  "breakingChangePolicy": "block",
  "plugins": ["uic-parser-svelte"],
  "componentMap": {
    "Button": "button",
    "Link": "a",
    "TextInput": "input"
  }
}
```

### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `protectedScopes` | `string[]` | `[]` | Agent ID prefixes that require explicit approval to change. `uicontract diff` exits non-zero when elements under these scopes are modified, even with `--allow-breaking`. |
| `breakingChangePolicy` | `"block" \| "warn"` | `"block"` | How `uicontract diff` handles breaking changes. `"block"` exits non-zero, `"warn"` prints a warning but exits 0. |
| `plugins` | `string[]` | `[]` | npm package names implementing the `Parser` interface. Loaded automatically by `uicontract scan`. See [PARSERS.md](./PARSERS.md) for how to write a parser plugin. |
| `componentMap` | `Record<string, string>` | `{}` | Maps custom component names to native element types. When scanning, `<Button>` is normally skipped because it's an uppercase (custom) component. Adding `"Button": "button"` tells the parser to discover it as a `button` element. Valid types: `button`, `input`, `select`, `textarea`, `a`, `form`, `div`, `span`, `img`, `label`. |

### Plugin Configuration

Plugins are npm packages that export a `Parser` object. Add them to your project and list them in `.uicrc.json`:

```bash
pnpm add uic-parser-svelte
```

```json
{
  "plugins": ["uic-parser-svelte"]
}
```

The CLI loads plugins at startup and registers them into the parser registry. See [PARSERS.md](./PARSERS.md) for details on writing parser plugins.

---

## Typical Workflow

```bash
# 1. Scan your project
uicontract scan ./src -o manifest.json

# 2. Assign proper agent IDs
uicontract name manifest.json -o named-manifest.json

# 3. Annotate source files (preview first)
uicontract annotate --manifest named-manifest.json --dry-run
uicontract annotate --manifest named-manifest.json --write

# 4. Query the manifest
uicontract find "login"
uicontract describe settings.billing.pause-btn.button
uicontract list --type button

# 5. Detect regressions in CI
uicontract diff baseline.json manifest.json
```
