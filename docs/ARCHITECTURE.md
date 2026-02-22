# UIC Architecture

## Overview

UIC is a CLI tool and library ecosystem organized as a six-layer pipeline. Each layer has a single responsibility and depends only on layers below it. No circular dependencies.

```
                    +-----------------+
                    |   Governance    |  uicontract diff, CI integration
                    +-----------------+
                            |
                    +-----------------+
                    |     Query       |  uicontract find / describe / list
                    +-----------------+
                            |
              +-------------+-------------+
              |                           |
      +--------------+          +-----------------+
      |   Annotator  |          |     Manifest    |  schema, validation, serialization
      +--------------+          +-----------------+
              |                           |
      +--------------+          +-----------------+
      |    Namer     |          |     Parser      |  framework-specific discovery
      +--------------+          +-----------------+
              |                           |
              +-------------+-------------+
                            |
                    +-----------------+
                    |      Core       |  types, schema, logger, errors
                    +-----------------+
```

## Layers

### Core (`packages/core`)

The foundation. Everything else depends on it. Nothing depends on it except the other layers.

Responsibilities:
- Shared TypeScript types: `RawElement`, `NamedElement`, `ManifestElement`, `Parser`, `ParserOptions`, `DiscoveryResult`
- Manifest JSON Schema (`manifest.v1.schema.json`) and validation
- Structured logger: `debug`, `info`, `warn`, `error` - always to stderr
- Error base class: `UicError` with machine-readable `code` and structured `context`
- Parser registry: discovers and loads framework parsers

### Parser (`packages/parser-react`, `packages/parser-vue`)

Framework-specific AST parsing. Produces `RawElement[]`.

Responsibilities:
- Detect whether a directory uses the framework (`detect(dir): Promise<boolean>`)
- Walk the AST and discover interactive elements: `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`, elements with `onClick`/`onChange`/`onSubmit`
- Extract context per element: file path, line number, component name, route (inferred from file-based routing), label text, event handler name
- Return `DiscoveryResult` with element list, warnings array, and scan metadata

Parsers **never throw** on unexpected input. Unknown patterns produce a warning and are skipped. The skip count appears in manifest metadata.

### Namer (`packages/namer`)

Takes `RawElement[]` from the parser, produces `NamedElement[]` with stable hierarchical IDs.

Responsibilities:
- Deterministic naming: derives ID from `route + component + label + element-type` following slug rules (`/settings/billing` + `BillingSettings` + `"Pause subscription"` + `button` → `settings.billing.pause-subscription.button`)
- Deduplication: detects collisions and appends numeric suffixes
- AI naming (opt-in, Phase 4): passes element context to an AI provider for better names; falls back to deterministic on failure

The namer is **stateless and pure**: same input always produces the same output. It reads no files and writes no files.

### Manifest (`packages/core/src/schema/`)

Serializes `NamedElement[]` to `manifest.json` and validates against the JSON Schema.

Responsibilities:
- `generateManifest()`: accepts named elements + metadata, returns validated manifest object
- `writeManifest()`: serializes to disk
- `readManifest()`: deserializes and validates; rejects manifests from incompatible schema versions
- Schema versioning: `schemaVersion: "major.minor"` - tools must refuse to read newer major versions

### Annotator (`packages/annotator`)

Reads source files and inserts `data-agent-id` attributes at the locations produced by the parser.

Responsibilities:
- Receive element locations (file path, line, column) from parser output - does **not** re-parse source code
- Generate patches (unified diff format) for each file
- Apply patches in-place with backup to `.uic-backup/`
- `--dry-run` outputs patches without modifying any files
- Refuse to run on uncommitted changes (requires clean git state)

### Query (`packages/cli/src/commands/find.ts`, `describe.ts`, `list.ts`)

Reads `manifest.json` and provides search and filtering over it.

Responsibilities:
- `uicontract find <query>`: fuzzy search by label, handler, route, component name, or agent ID
- `uicontract describe <agent-id>`: full details of one element
- `uicontract list [--type|--routes|--components]`: filtered listing
- All commands support `--json` for machine consumption
- Stateless: reads manifest, formats output, exits

### Governance (`packages/cli/src/commands/diff.ts`)

Compares two manifests and classifies changes.

Responsibilities:
- Categorize changes: added (non-breaking), removed/renamed/type-changed/route-changed (breaking), label-changed (informational)
- Exit 0 for no breaking changes, exit 1 for breaking changes
- Enforce `protectedScopes` from `.uicrc.json`: blocks even `--allow-breaking` for protected prefixes
- CI integration: readable output for PR comments

## Boundary Rules

```
Parsers    → may import from: core
Namer      → may import from: core
Annotator  → may import from: core
Query      → may import from: core
Governance → may import from: core
CLI        → may import from: all layers (it is the composition root)
```

No layer may import from a layer above it. No circular imports. Violations caught by TypeScript project references and enforced in CI.

## Package Dependency Graph

```
uic (cli)
  ├── @uicontract/core
  ├── @uicontract/parser-react
  ├── @uicontract/parser-vue
  ├── @uicontract/namer
  └── @uicontract/annotator

@uicontract/parser-react  →  @uicontract/core
@uicontract/parser-vue    →  @uicontract/core
@uicontract/namer         →  @uicontract/core
@uicontract/annotator     →  @uicontract/core
```

Parsers are separate packages so downstream consumers can tree-shake. A React-only project does not pay the cost of `@vue/compiler-dom`.

## Data Flow

```
Source files
    │
    ▼
Parser.discover(dir)
    │  produces RawElement[]
    ▼
Namer.assignNames(elements)
    │  produces NamedElement[]
    ▼
generateManifest(named, metadata)
    │  produces manifest.json
    ├──▶ Annotator.annotate(manifest, dir)
    │        writes data-agent-id to source files
    ├──▶ Query commands (find / describe / list)
    │        reads manifest, produces output
    └──▶ Governance (diff)
             compares old vs new manifest
```

## Design Principles

**No state.** Every function takes input and returns output. No singletons, no global mutable registries at runtime.

**Parsers are guests, not hosts.** Parsers discover elements. They do not name, annotate, validate, or write to disk. Any parser that does more than produce `RawElement[]` is violating its boundary.

**Fail loudly at boundaries, softly internally.** Parsers never throw on unexpected JSX patterns - they warn and skip. But the CLI will exit non-zero and print a clear message when the manifest is missing, invalid, or incompatible.

**One manifest format, all frameworks.** `manifest.json` is framework-agnostic. React and Vue elements share the same schema. Parsers normalize their output to `RawElement`; the schema does not know what framework generated it.

**Stability over richness.** The agent ID format (`route.component.label.type`) is intentionally simple and derivable from source code without any runtime execution. An ID that can be recomputed from source is an ID that survives refactors.
