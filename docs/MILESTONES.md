# UIC Project Phases & Milestones

## Phase 0: Foundation

**Goal**: Repo is buildable, testable, lintable, and CI-green from the first commit.

**Scope**:
- pnpm monorepo with workspace configuration
- TypeScript strict mode across all packages
- Vitest configured for unit + integration
- ESLint + Prettier
- GitHub Actions: lint, typecheck, test on every PR
- Changesets for versioning
- CLAUDE.md committed (the contributor contract)
- `packages/core` with manifest schema (JSON Schema + TypeScript types)
- Empty shells for `packages/cli`, `packages/parser-react`
- Fixture directory with a minimal React app (3-5 components)

**Acceptance Criteria**:
- [ ] `pnpm install && pnpm build` succeeds
- [ ] `pnpm test` runs and passes (even if only skeleton tests)
- [ ] `pnpm lint` passes with zero warnings
- [ ] CI pipeline runs on PR and blocks merge on failure
- [ ] Manifest v1 JSON Schema is defined and validates a hand-written example
- [ ] TypeScript strict mode enabled, `noUncheckedIndexedAccess: true`, zero `any` types

**Dependencies**: None
**Complexity**: S
**Risks**: Monorepo tooling churn. Mitigate by using pnpm workspaces (stable, no extra build orchestrator needed initially).
**Timeline**: 3-5 days

---

## Phase 1: Core Parser + Manifest

**Goal**: Given a React/Next project directory, produce a complete manifest.json listing all interactive elements with their context.

**Scope**:
- `packages/parser-react`: AST-based parser using `@babel/parser` + `@babel/traverse` + `recast`
- Element discovery: `<button>`, `<input>`, `<select>`, `<textarea>`, `<a>`, `<form>`, elements with `onClick`/`onSubmit`/`onChange`
- Context extraction per element:
  - File path + line number
  - Component name (function/class name)
  - Route (inferred from file path for Next.js file-based routing; explicit for React Router)
  - Nearest label text (aria-label, children text, associated `<label>`)
  - Event handler name (onClick={handlePause} -> "handlePause")
  - Existing `data-testid` or `data-agent-id` if present
- `packages/core`: Manifest v1 schema, types, validation, serialization
- CLI entry point: `npx uic scan <dir>` outputs manifest.json to stdout or file

**Acceptance Criteria**:
- [ ] `npx uic scan fixtures/react-app` produces valid manifest.json
- [ ] Manifest validates against JSON Schema
- [ ] Parser handles: function components, arrow components, forwardRef, memo
- [ ] Parser handles: JSX spread props, computed handler names (warns on these)
- [ ] Parser extracts route from Next.js app/ directory structure
- [ ] Parser extracts label from aria-label, literal children, htmlFor association
- [ ] Fixture app has at least 15 interactive elements across 5+ components
- [ ] Unit tests for each extraction (label, handler, route, component hierarchy)
- [ ] Golden file test: fixture manifest matches committed snapshot
- [ ] Performance: scans 100-file project in under 5 seconds

**Dependencies**: Phase 0
**Complexity**: L
**Risks**:
- JSX AST edge cases (conditional rendering, array.map, render props). Mitigate: start with direct JSX, flag but skip complex patterns in v1, track skip count in manifest metadata.
- TypeScript type-only imports confusing parser. Mitigate: @babel/parser handles TS syntax natively via `plugins: ['typescript']`.

**Timeline**: 1-2 weeks

---

## Phase 2: AI Naming + Source Annotator

**Goal**: Every discovered element gets a meaningful hierarchical ID, and those IDs are written into source code as `data-agent-id` attributes.

**Scope**:
- `packages/namer`: Naming engine
  - Input: raw element list from parser (file, component, label, handler, route)
  - Output: hierarchical ID for each element (e.g., `settings.billing.pause-subscription.button`)
  - Strategy 1 (deterministic): rule-based naming from route + component + label + element type
  - Strategy 2 (AI-assisted): pass context to IDE's AI for naming suggestions, with deterministic fallback
  - Deduplication: detect and suffix collisions
- `packages/annotator`: Source code modifier
  - Reads original source file
  - Inserts `data-agent-id="..."` attribute on identified JSX elements
  - Produces a diff/patch per file
  - Can write in-place or output patch files
- CLI commands:
  - `npx uic name <manifest.json>` -- adds names to manifest, outputs named manifest
  - `npx uic annotate <dir>` -- writes data-agent-id into source files
  - `npx uic annotate --dry-run <dir>` -- outputs patch without modifying files

**Acceptance Criteria**:
- [ ] Deterministic namer produces stable names (same input -> same output, every time)
- [ ] AI namer can be invoked; falls back to deterministic on failure/timeout
- [ ] Names follow pattern: `[route].[section].[action].[element-type]`
- [ ] No duplicate IDs in a single manifest
- [ ] Annotator correctly inserts attribute on self-closing and open tags
- [ ] Annotator preserves formatting (indentation, trailing commas, comments)
- [ ] Annotator does not modify files that already have the correct data-agent-id
- [ ] `--dry-run` produces a reviewable diff
- [ ] Round-trip test: annotate -> scan -> manifest matches named manifest
- [ ] Snapshot test: annotated fixture files match committed snapshots

**Dependencies**: Phase 1
**Complexity**: L
**Risks**:
- Source modification is destructive. Mitigate: always generate patch first, require explicit `--write` flag, keep `.uic-backup/` of originals.
- AI naming non-determinism. Mitigate: deterministic is default, AI naming is opt-in flag.
- Formatting preservation. Mitigate: use `recast` (preserves formatting) instead of raw AST-to-code generation.

**Timeline**: 1-2 weeks

---

## Phase 3: CLI Query Interface + Agent Skill

**Goal**: Agents and humans can query the manifest to find elements and understand the UI surface.

**Scope**:
- CLI commands:
  - `npx uic find <query>` -- fuzzy search by name, label, route, handler
  - `npx uic describe <agent-id>` -- full details of one element
  - `npx uic list` -- all elements, filterable by route/component/type
  - `npx uic list --routes` -- all routes with element counts
  - `npx uic list --components` -- all components with element counts
- Agent skill files:
  - `packages/skill/claude-code.md` -- instructions for Claude Code agents
  - `packages/skill/universal.md` -- framework-agnostic instructions any IDE agent can follow
  - Skill describes: how to run uic, how to interpret manifest, how to use find/describe
- Help text for every command (`--help`)

**Acceptance Criteria**:
- [ ] `npx uic find "pause"` returns matching elements with agent-id, file:line, label
- [ ] `npx uic find` with no manifest present gives clear error with instructions
- [ ] `npx uic describe billing.pause.button` returns full element details
- [ ] `npx uic list --type button` filters correctly
- [ ] Fuzzy matching works: `npx uic find "pase subscribtion"` finds "pause-subscription"
- [ ] All commands have `--json` output flag for machine consumption
- [ ] All commands have `--help` that matches man page
- [ ] Agent skill file is tested: give it to Claude Code, ask it to find an element, verify it succeeds
- [ ] Integration test: scan fixture -> find element -> verify output matches expected

**Dependencies**: Phase 1 (Phase 2 optional -- query works with or without AI names)
**Complexity**: M
**Risks**:
- Fuzzy search quality. Mitigate: use `fuse.js` or similar battle-tested fuzzy library.
- Agent skill prompt engineering is iterative. Mitigate: test with real agents early, budget time for revision.

**Timeline**: 1 week

---

## Phase 4: CI Governance

**Goal**: Teams can detect breaking UI contract changes in PRs before merge.

**Scope**:
- `npx uic diff <old-manifest> <new-manifest>` -- reports:
  - Added elements
  - Removed elements (BREAKING)
  - Renamed elements (BREAKING)
  - Changed type (BREAKING)
  - Changed route (BREAKING)
  - Changed label (informational)
- Exit codes: 0 = no breaking changes, 1 = breaking changes found
- `npx uic diff --allow-breaking <reason>` -- explicit override with reason logged
- `.uicrc.json` config file:
  - `protectedScopes`: list of ID prefixes that require explicit approval to change
  - `breakingChangePolicy`: "block" | "warn"
- GitHub Action (or generic CI script):
  - Runs `uic scan` on PR branch
  - Runs `uic diff` against base branch manifest
  - Posts comment with diff summary
  - Blocks merge if breaking changes and no override

**Acceptance Criteria**:
- [ ] `uic diff` correctly categorizes: additions, removals, renames, type changes
- [ ] Protected scope violation exits non-zero even with `--allow-breaking`
- [ ] CI script works in GitHub Actions (tested in this repo's own CI)
- [ ] PR comment is readable and actionable (not a wall of JSON)
- [ ] Dogfooding: UIC's own CI runs `uic diff` on its fixture manifests
- [ ] Integration test: modify fixture, generate new manifest, diff, verify output

**Dependencies**: Phase 1
**Complexity**: M
**Risks**:
- Manifest instability (parser changes cause false diffs). Mitigate: golden file tests from Phase 1 catch this early.
- CI environment differences. Mitigate: test in containerized CI from the start.

**Timeline**: 1 week

---

## Phase 5: Vue Support + Hardening

**Goal**: Vue/Nuxt projects get the same treatment as React/Next.

**Scope**:
- `packages/parser-vue`: SFC parser using `@vue/compiler-sfc`
  - Same element discovery as React parser
  - Template-based extraction (v-on:click, @click, v-model)
  - `<script setup>` and Options API support
  - Nuxt file-based routing inference
- Hardening across both parsers:
  - Conditional rendering (`v-if`, ternary in JSX)
  - Loop rendering (`v-for`, `.map()`)
  - HOCs and wrapped components
  - Dynamic components (`<component :is="...">`, React.lazy)
  - Slot/children forwarding
- `packages/core`: parser interface contract (shared interface both parsers implement)

**Acceptance Criteria**:
- [ ] `npx uic scan` auto-detects framework (React vs Vue) or accepts `--framework` flag
- [ ] Vue fixture app produces valid manifest
- [ ] Same manifest schema for both frameworks (manifests are framework-agnostic)
- [ ] Conditional elements flagged with `conditional: true` in manifest
- [ ] Loop elements flagged with `dynamic: true` in manifest
- [ ] HOC-wrapped components resolved to their inner interactive elements
- [ ] Unit tests for each Vue-specific pattern
- [ ] Golden file tests for Vue fixture
- [ ] Cross-framework test: same logical UI in React and Vue produces equivalent manifests

**Dependencies**: Phase 1 (parser interface), Phase 2 (annotator needs Vue template support)
**Complexity**: L
**Risks**:
- Vue template compiler API changes between Vue 2/3. Mitigate: target Vue 3 only initially.
- SFC annotation is different from JSX (template vs render function). Mitigate: annotator abstraction from Phase 2 must be designed for extensibility.

**Timeline**: 1-2 weeks

---

## Phase 6: Community & Ecosystem

**Goal**: External contributors can add frameworks, integrations, and extensions.

**Scope**:
- Plugin architecture:
  - `ParserPlugin` interface: implement to add a framework
  - `NamerPlugin` interface: implement custom naming strategies
  - Plugin discovery via package naming convention (`uic-parser-*`)
- Documentation site:
  - Getting started guide
  - API reference (auto-generated from TypeScript types)
  - "Write a parser" tutorial
  - "Integrate with Playwright" guide
  - "Integrate with agent-browser" guide
  - "Integrate with Stagehand" guide
- Example repos:
  - `uic-example-react` -- full Next.js app with UIC integrated
  - `uic-example-vue` -- full Nuxt app with UIC integrated
- Contribution guide (CONTRIBUTING.md)
- Issue templates, PR templates
- RFC process for breaking changes

**Acceptance Criteria**:
- [ ] A third-party parser can be registered and used via config
- [ ] Documentation site deploys and is navigable
- [ ] "Write a parser" tutorial is followable end-to-end
- [ ] Example repos have CI that runs `uic scan`, `uic diff`
- [ ] CONTRIBUTING.md exists and covers: setup, testing, PR process, RFC process
- [ ] At least 2 integration guides (Playwright + one agent framework) published

**Dependencies**: Phase 1-4 stable
**Complexity**: M
**Risks**:
- Plugin API design locks in internal structure prematurely. Mitigate: mark plugin API as experimental/unstable until v2.
- Documentation maintenance. Mitigate: auto-generate API docs from types.

**Timeline**: 2 weeks

---

## Summary

| Phase | Name | Size | Depends On | Duration |
|-------|------|------|------------|----------|
| 0 | Foundation | S | -- | 3-5 days |
| 1 | Core Parser + Manifest | L | Phase 0 | 1-2 weeks |
| 2 | AI Naming + Annotator | L | Phase 1 | 1-2 weeks |
| 3 | CLI Query + Agent Skill | M | Phase 1 | 1 week |
| 4 | CI Governance | M | Phase 1 | 1 week |
| 5 | Vue + Hardening | L | Phase 1, 2 | 1-2 weeks |
| 6 | Community & Ecosystem | M | Phase 1-4 | 2 weeks |

Phases 3 and 4 can run in parallel after Phase 1.
Phase 5 can start after Phase 2 (needs annotator abstraction).
Phase 6 starts after Phases 1-4 are stable.

**Fastest path to usable tool**: Phase 0 -> Phase 1 -> Phase 3 (scan + query in ~3-4 weeks).
