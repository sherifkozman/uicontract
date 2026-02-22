# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project uses [Changesets](https://github.com/changesets/changesets) for versioning.
Semantic versioning applies to the **npm packages**. The **manifest schema** has its own version tracked in `schemaVersion`.

---

## [0.1.0] - 2026-02-22

Initial public release of UIC (UI Contracts).

### Packages

| Package | Version |
|---------|---------|
| `uic` | 0.1.0 |
| `@uic/core` | 0.1.0 |
| `@uic/parser-react` | 0.1.0 |
| `@uic/parser-vue` | 0.1.0 |
| `@uic/namer` | 0.1.0 |
| `@uic/annotator` | 0.1.0 |

### Added

**CLI (`uic`)**
- `uic scan <dir>` — parse a React or Vue project and produce `manifest.json`
- `uic name` — assign stable hierarchical agent IDs to discovered elements
- `uic annotate [--dry-run]` — insert `data-agent-id` attributes into source files
- `uic find <query>` — fuzzy-search elements by label, handler, route, or ID
- `uic describe <agent-id>` — full detail for a single element
- `uic list [--type|--routes|--components]` — browse the full element inventory
- `uic diff [<old> <new>]` — detect breaking UI contract changes between two manifests
- All commands support `--json` for machine-readable output and `--help` for usage

**Core (`@uic/core`)**
- Manifest v1 JSON Schema with full validation
- Typed error class `UicError` with machine-readable `code` and structured `context`
- Structured logger with `debug`/`info`/`warn`/`error` levels, always to stderr
- Parser registry for framework auto-detection

**React Parser (`@uic/parser-react`)**
- AST-based discovery using `@babel/parser` and `@babel/traverse`
- Discovers: `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`, `onClick`/`onChange`/`onSubmit` handlers
- Context extraction: file path, line number, component name, label text, event handler name
- Route inference from Next.js `app/` and `pages/` directory structure
- Handles: function components, arrow components, `forwardRef`, `React.memo`, HOCs, conditional rendering

**Vue Parser (`@uic/parser-vue`)**
- SFC template parsing using `@vue/compiler-dom`
- Discovers interactive elements in `<template>` blocks
- Handles `v-on:click`, `@click`, `v-model` bindings
- Supports `<script setup>` and Options API

**Namer (`@uic/namer`)**
- Deterministic naming: derives stable IDs from route + component + label + element type
- ID format: `route.component.element-label.type` (e.g., `settings.billing.pause-subscription.button`)
- Collision detection and automatic deduplication

**Annotator (`@uic/annotator`)**
- Inserts `data-agent-id` attributes into JSX/TSX and Vue SFC source files
- Generates unified diff patches for review
- Creates `.uic-backup/` before any modification
- Requires clean git state before writing; `--dry-run` always safe

**Manifest Schema v1.0**
- Top-level fields: `schemaVersion`, `generatedAt`, `generator`, `metadata`, `elements`
- Per-element fields: `agentId`, `type`, `filePath`, `line`, `column`, `componentName`, `route`, `label`, `handler`, `attributes`, `conditional`, `dynamic`

---

For unreleased changes, see open pull requests and the [Changesets](https://github.com/sherifkozman/uicontract/tree/main/.changeset) directory.
