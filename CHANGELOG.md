# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project uses [Changesets](https://github.com/changesets/changesets) for versioning.
Semantic versioning applies to the **npm packages**. The **manifest schema** has its own version tracked in `schemaVersion`.

---

## [0.3.0] - 2026-02-22

### Added

- `sourceTagName` field on manifest elements — preserves the original JSX tag name for componentMap-mapped components (e.g., `"Button"` when mapped to `"button"`)
- Manifest schema bumped to **v1.1** (additive, backward-compatible)
- `--threshold` and `--limit` flags for `uicontract find` command
- componentMap round-trip integration test (scan -> name -> annotate -> verify)
- Schema validation test for invalid `sourceTagName` type
- Deserialization normalization test for pre-1.1 manifests

### Fixed

- **Annotator skipped componentMap elements** (#7): `data-agent-id` was not injected into custom component tags (e.g., `<Button>`) because the annotator matched against the native type (`"button"`) instead of the actual JSX tag name (`"Button"`)
- Old manifests without `sourceTagName` now normalize to `null` on deserialization instead of leaving `undefined`
- Flaky e2e scan test: stdout truncation at 8192 bytes — now writes to file instead
- React parser now excludes test files, stories, and setup files from scanning

---

## [0.2.1] - 2026-02-22

### Fixed

- VERSION constants in source code aligned to package version (were stuck at `0.0.0`)
- Generator name in test fixtures updated from `uic` to `uicontract`
- AI-assisted naming documentation added to CLI.md, namer README, and main README

---

## [0.2.0] - 2026-02-22

### Packages

| Package | Version |
|---------|---------|
| `uicontract` | 0.2.0 |
| `@uicontract/core` | 0.2.0 |
| `@uicontract/parser-react` | 0.2.0 |
| `@uicontract/parser-vue` | 0.2.0 |
| `@uicontract/namer` | 0.2.0 |
| `@uicontract/annotator` | 0.2.0 |
| `@uicontract/skill` | 0.2.0 |

### Added

**Parser (`@uicontract/parser-react`)**
- Route group stripping: Next.js App Router `(groupName)` segments are filtered from inferred routes (e.g., `app/(auth)/login/page.tsx` yields `/login`)
- Inline arrow handler extraction: `onClick={() => doThing()}` now extracts `"doThing"` instead of returning null
- RSC directive detection: `'use client'` and `'use server'` file-level directives are recorded on every element as `directive` field
- Server action `action` prop: `<form action={submitFn}>` extracts handler name, with `onSubmit` taking precedence when both are present
- `componentMap` support: custom components (e.g., `<Button>`) are discovered when mapped to native types via `.uicrc.json`

**Namer (`@uicontract/namer`)**
- AI-assisted naming: functional multi-provider implementation supporting OpenAI, Anthropic, and Google APIs
- `--ai` flag enables AI naming with deterministic fallback on failure or timeout
- `--ai-provider`, `--ai-model`, `--ai-timeout` flags for provider configuration
- Provider auto-detection from environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`)

**Annotator (`@uicontract/annotator`)**
- Vue SFC annotation: inserts `data-agent-id` attributes into Vue `<template>` blocks

**Core (`@uicontract/core`)**
- `directive` field added to manifest schema v1.0 (optional, backward-compatible)
- `loadConfig()` reads `.uicrc.json` for `componentMap` configuration
- Programmatic manifest validator validates `directive` enum values

### Changed

- `--ai-timeout` default aligned to 10000ms across CLI and namer library
- Manifest JSON Schema updated with `directive` property on elements

### Fixed

- Route inference for nested route groups (e.g., `app/(g1)/(g2)/dashboard/page.tsx` yields `/dashboard`)
- Inline arrow handlers with member expression calls (e.g., `onClick={() => obj.method()}` yields `"method"`)

---

## [0.1.0] - 2026-02-22

Initial public release of UI Contracts.

### Packages

| Package | Version |
|---------|---------|
| `uicontract` | 0.1.0 |
| `@uicontract/core` | 0.1.0 |
| `@uicontract/parser-react` | 0.1.0 |
| `@uicontract/parser-vue` | 0.1.0 |
| `@uicontract/namer` | 0.1.0 |
| `@uicontract/annotator` | 0.1.0 |

### Added

**CLI (`uicontract`)**
- `uicontract scan <dir>` - parse a React or Vue project and produce `manifest.json`
- `uicontract name` - assign stable hierarchical agent IDs to discovered elements
- `uicontract annotate [--dry-run]` - insert `data-agent-id` attributes into source files
- `uicontract find <query>` - fuzzy-search elements by label, handler, route, or ID
- `uicontract describe <agent-id>` - full detail for a single element
- `uicontract list [--type|--routes|--components]` - browse the full element inventory
- `uicontract diff [<old> <new>]` - detect breaking UI contract changes between two manifests
- All commands support `--json` for machine-readable output and `--help` for usage

**Core (`@uicontract/core`)**
- Manifest v1 JSON Schema with full validation
- Typed error class `UicError` with machine-readable `code` and structured `context`
- Structured logger with `debug`/`info`/`warn`/`error` levels, always to stderr
- Parser registry for framework auto-detection

**React Parser (`@uicontract/parser-react`)**
- AST-based discovery using `@babel/parser` and `@babel/traverse`
- Discovers: `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`, `onClick`/`onChange`/`onSubmit` handlers
- Context extraction: file path, line number, component name, label text, event handler name
- Route inference from Next.js `app/` and `pages/` directory structure
- Handles: function components, arrow components, `forwardRef`, `React.memo`, HOCs, conditional rendering

**Vue Parser (`@uicontract/parser-vue`)**
- SFC template parsing using `@vue/compiler-dom`
- Discovers interactive elements in `<template>` blocks
- Handles `v-on:click`, `@click`, `v-model` bindings
- Supports `<script setup>` and Options API

**Namer (`@uicontract/namer`)**
- Deterministic naming: derives stable IDs from route + component + label + element type
- ID format: `route.component.element-label.type` (e.g., `settings.billing.pause-subscription.button`)
- Collision detection and automatic deduplication

**Annotator (`@uicontract/annotator`)**
- Inserts `data-agent-id` attributes into JSX/TSX and Vue SFC source files
- Generates unified diff patches for review
- Creates `.uic-backup/` before any modification
- Requires clean git state before writing; `--dry-run` always safe

**Manifest Schema v1.0**
- Top-level fields: `schemaVersion`, `generatedAt`, `generator`, `metadata`, `elements`
- Per-element fields: `agentId`, `type`, `filePath`, `line`, `column`, `componentName`, `route`, `label`, `handler`, `attributes`, `conditional`, `dynamic`

---

For unreleased changes, see open pull requests and the [Changesets](https://github.com/sherifkozman/uicontract/tree/main/.changeset) directory.
