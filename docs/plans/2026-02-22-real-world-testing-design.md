# Real-World Testing Design

**Date**: 2026-02-22
**Status**: Approved

## Problem

UIC has 1,336 unit/integration tests across 64 files but no end-to-end pipeline tests and no validation against real-world codebases. Unit tests verify individual functions; they don't catch issues like CLI argument parsing interacting with parser output, or subtle AST patterns that only appear in large production codebases.

## Goals

1. **E2E pipeline coverage**: Subprocess-based tests that invoke the real CLI binary and assert on stdout, stderr, and exit codes.
2. **Real-world validation**: Run UIC against popular OSS projects to discover bugs and edge cases.
3. **Richer fixtures**: Example apps in the repo that demonstrate UIC's capabilities and stress-test more patterns.

## Design

### Track 1: E2E Test Suite

**Location**: `tests/e2e/`
**Runner**: Vitest with `execFile` (not `exec`, to prevent shell injection)
**Count**: 15-20 tests

Tests invoke `node packages/cli/dist/bin/uic.js` as a subprocess. Each test captures stdout, stderr, and exit code.

#### Test categories

**Full pipeline (3 tests)**:
- scan -> name -> annotate --dry-run -> diff (React fixture)
- scan -> name -> annotate --dry-run -> diff (Vue fixture)
- Round-trip: annotate -> re-scan -> verify manifest matches

**Scan command (3 tests)**:
- `--json` output validates against manifest JSON Schema
- `--framework react` skips auto-detection
- Non-existent directory exits 1 with helpful error

**Name command (2 tests)**:
- Deterministic naming produces stable output (run twice, compare)
- Named manifest has zero duplicate agentIds

**Annotate command (2 tests)**:
- `--dry-run` produces valid unified diff
- `--dry-run` output contains `data-agent-id` attributes

**Query commands (3 tests)**:
- `find "pause"` returns matching elements with correct fields
- `describe <agent-id>` returns full element detail
- `list --type button --json` returns only buttons

**Diff command (2 tests)**:
- Identical manifests exit 0, report no changes
- Removed element exits 1, reports breaking change

**Config and plugins (1-2 tests)**:
- `.uicrc.json` with `exclude` patterns respected
- Invalid plugin name warns but doesn't crash

**Cross-framework (1 test)**:
- Same logical component in React and Vue produces equivalent manifest structure

#### Helper module

`tests/e2e/helpers.ts` exports:
- `runUic(args: string[], options?): Promise<{ stdout, stderr, exitCode }>` - subprocess wrapper using `execFile`
- `loadManifest(path: string): Manifest` - parse and validate
- `tempDir()` - create/cleanup temp directory

### Track 2: Real-World OSS Validation

**Purpose**: Manual/scripted validation, not committed as CI tests. Discover bugs, turn bugs into regression fixtures.

**Target repos**:

| Repo | Framework | Why |
|------|-----------|-----|
| cal.com | Next.js (App Router) | Large, real-world, deep nesting, i18n, dynamic routes |
| Nuxt UI docs | Vue 3 + Nuxt | Official Nuxt ecosystem, `<script setup>`, composables |
| shadcn/ui examples | React | Component library usage patterns, Radix primitives |
| Docusaurus (optional) | React | Static site generator, MDX, plugin system |

**Validation script** (`scripts/validate-oss.sh`):
1. Clone repo to temp directory (shallow clone)
2. Run `uicontract scan --json -o /tmp/manifest.json`
3. Check exit code and warning count
4. Log element count, file count, scan duration
5. Run `uicontract name` on the manifest
6. Check for duplicate agentIds
7. Output summary report

**Bug workflow**: Bug found -> create minimal reproduction in `fixtures/` -> add regression test -> fix.

### Track 3: Richer Example Fixtures

Two new fixture apps that serve as both test targets and OSS examples.

#### `fixtures/react-dashboard/`

Next.js App Router dashboard (~40-50 elements):
- Multi-step form (wizard pattern with next/back/submit)
- Data table with sort, filter, pagination, row actions (edit/delete)
- Modal dialogs (confirmation, form-in-modal)
- Dynamic routes (`/dashboard/[id]/edit`)
- Conditional rendering (role-based UI: admin panel, user panel)
- Layout with nested navigation (sidebar + breadcrumbs)
- Toast notifications (dynamic, programmatic)
- i18n-style labels (template literals, variables)

#### `fixtures/vue-storefront/`

Nuxt 3 storefront (~30-40 elements):
- Product listing with filter sidebar (checkboxes, range slider)
- Shopping cart (add/remove/quantity, computed totals)
- Checkout form (multi-field, validation, submit)
- `<script setup>` components mixed with Options API
- Slots and scoped slots
- `v-for` lists with per-item actions
- Composables for shared state
- Nuxt file-based routing (`/products/[slug]`)

## What This Design Does NOT Cover

- Browser-based testing (Playwright/Cypress running against a live app)
- Performance benchmarking beyond scan duration logging
- Visual regression testing
- Testing the agent skill files with actual AI agents (manual process)

## Success Criteria

- All 15-20 E2E tests pass in CI
- At least 3 OSS repos scanned without crashes
- Bugs found in OSS validation are captured as regression fixtures
- Both new fixture apps produce valid manifests with expected element counts
- No decrease in existing test coverage
