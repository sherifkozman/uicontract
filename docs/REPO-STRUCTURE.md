# UIC Repository Structure

## Directory Layout

```
uic/
├── packages/
│   ├── core/                          -- Shared foundation
│   │   ├── src/
│   │   │   ├── index.ts               -- Public API re-exports
│   │   │   ├── types.ts               -- All shared types (RawElement, NamedElement, Parser interface, etc.)
│   │   │   ├── errors.ts              -- UicError base class and error codes
│   │   │   ├── logger.ts              -- Structured logger (debug/info/warn/error to stderr)
│   │   │   ├── schema/
│   │   │   │   ├── manifest.v1.schema.json   -- JSON Schema for manifest v1
│   │   │   │   └── manifest.ts               -- Schema validation, serialization, deserialization
│   │   │   └── parser-registry.ts     -- Registry for framework parsers
│   │   ├── tests/
│   │   │   ├── types.test.ts
│   │   │   ├── errors.test.ts
│   │   │   ├── schema.test.ts
│   │   │   └── parser-registry.test.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── parser-react/                  -- React/Next.js parser
│   │   ├── src/
│   │   │   ├── index.ts               -- Exports ReactParser implementing Parser interface
│   │   │   ├── react-parser.ts        -- Main parser orchestrator
│   │   │   ├── element-discovery.ts   -- Finds interactive JSX elements in AST
│   │   │   ├── context-extraction.ts  -- Extracts route, labels, handlers, component hierarchy
│   │   │   ├── route-inference.ts     -- Next.js app/ and pages/ routing
│   │   │   └── label-extraction.ts    -- aria-label, children text, htmlFor
│   │   ├── tests/
│   │   │   ├── element-discovery.test.ts
│   │   │   ├── context-extraction.test.ts
│   │   │   ├── route-inference.test.ts
│   │   │   ├── label-extraction.test.ts
│   │   │   ├── react-parser.test.ts           -- Golden file / snapshot tests
│   │   │   └── integration/
│   │   │       └── fixture-scan.test.ts       -- Scan fixture app, verify output
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── parser-vue/                    -- Vue/Nuxt parser (Phase 5)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── vue-parser.ts
│   │   │   ├── template-discovery.ts  -- Finds interactive elements in <template>
│   │   │   ├── context-extraction.ts
│   │   │   └── route-inference.ts     -- Nuxt file-based routing
│   │   ├── tests/
│   │   │   └── (mirrors parser-react structure)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── namer/                         -- Naming engine
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── deterministic-namer.ts -- Rule-based naming (route + component + label + type)
│   │   │   ├── ai-namer.ts           -- AI-assisted naming (calls IDE AI, falls back to deterministic)
│   │   │   ├── deduplicator.ts       -- Detects and resolves ID collisions
│   │   │   └── naming-rules.ts       -- Naming patterns, abbreviations, reserved words
│   │   ├── tests/
│   │   │   ├── deterministic-namer.test.ts
│   │   │   ├── deduplicator.test.ts
│   │   │   ├── naming-rules.test.ts
│   │   │   └── integration/
│   │   │       └── naming-pipeline.test.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── annotator/                     -- Source code modifier
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── annotator.ts           -- Main annotator orchestrator
│   │   │   ├── jsx-annotator.ts       -- Inserts data-agent-id into JSX/TSX
│   │   │   ├── vue-annotator.ts       -- Inserts data-agent-id into Vue templates (Phase 5)
│   │   │   ├── patch-generator.ts     -- Generates unified diff patches
│   │   │   └── backup.ts             -- Creates .uic-backup/ before modification
│   │   ├── tests/
│   │   │   ├── jsx-annotator.test.ts
│   │   │   ├── patch-generator.test.ts
│   │   │   ├── backup.test.ts
│   │   │   └── integration/
│   │   │       └── annotate-fixture.test.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── cli/                           -- CLI entry point
│   │   ├── src/
│   │   │   ├── index.ts               -- CLI entry point, argument parsing
│   │   │   ├── commands/
│   │   │   │   ├── index.ts           -- Command registry
│   │   │   │   ├── scan.ts            -- npx uic scan <dir>
│   │   │   │   ├── name.ts            -- npx uic name <manifest>
│   │   │   │   ├── annotate.ts        -- npx uic annotate <dir>
│   │   │   │   ├── find.ts            -- npx uic find <query>
│   │   │   │   ├── describe.ts        -- npx uic describe <agent-id>
│   │   │   │   ├── list.ts            -- npx uic list [--routes|--components|--type]
│   │   │   │   ├── diff.ts            -- npx uic diff <old> <new>
│   │   │   │   └── strip.ts           -- npx uic strip <dir> (remove data-agent-id)
│   │   │   └── formatters/
│   │   │       ├── table.ts           -- Human-readable table output
│   │   │       └── json.ts            -- JSON output (--json flag)
│   │   ├── tests/
│   │   │   ├── commands/
│   │   │   │   ├── scan.test.ts
│   │   │   │   ├── find.test.ts
│   │   │   │   ├── diff.test.ts
│   │   │   │   └── ... (one per command)
│   │   │   └── integration/
│   │   │       ├── scan.integration.test.ts
│   │   │       ├── find.integration.test.ts
│   │   │       └── full-pipeline.integration.test.ts
│   │   ├── bin/
│   │   │   └── uic.ts                 -- Shebang entry point
│   │   ├── package.json               -- bin: { "uic": "./bin/uic.ts" }
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── skill/                         -- Agent skill files
│       ├── SKILL.md                   -- Core skill file (Claude Code YAML frontmatter)
│       ├── references/
│       │   ├── manifest-schema.md     -- Full manifest field reference
│       │   ├── browser-tool-bridge.md -- Tool-specific selector patterns
│       │   └── workflow-patterns.md   -- Automation recipes
│       └── package.json
│
├── fixtures/                          -- Test fixture apps
│   ├── react-app/                     -- 5+ components, Next.js routing, 15+ elements
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   └── billing/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   └── components/
│   │   │       ├── LoginForm.tsx
│   │   │       ├── SearchBar.tsx
│   │   │       ├── BillingSettings.tsx
│   │   │       ├── UserProfile.tsx
│   │   │       └── NavigationMenu.tsx
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── react-minimal/                 -- 1 component, 3 elements (smoke test)
│   │   └── src/
│   │       └── App.tsx
│   │
│   ├── react-edge-cases/              -- forwardRef, memo, HOCs, render props, portals
│   │   └── src/
│   │       ├── WithAuth.tsx           -- HOC
│   │       ├── ForwardedInput.tsx     -- forwardRef
│   │       ├── MemoizedButton.tsx     -- React.memo
│   │       ├── RenderPropList.tsx     -- render props
│   │       └── PortalModal.tsx        -- createPortal
│   │
│   ├── vue-app/                       -- (Phase 5) Vue 3 + Nuxt
│   │   └── ...
│   │
│   └── annotated-app/                 -- Pre-annotated React app for round-trip tests
│       └── src/
│           └── App.tsx                -- Already has data-agent-id attributes
│
├── tests/
│   └── e2e/                           -- End-to-end pipeline tests
│       ├── scan-to-query.test.ts      -- scan -> find -> verify
│       ├── scan-to-annotate.test.ts   -- scan -> name -> annotate -> re-scan -> verify
│       └── diff-pipeline.test.ts      -- scan -> modify -> re-scan -> diff -> verify
│
├── docs/
│   ├── ARCHITECTURE.md                -- Architecture overview and layer diagram
│   ├── MILESTONES.md                  -- Project phases and acceptance criteria
│   ├── CLI.md                         -- CLI command reference
│   ├── PARSERS.md                     -- Parser documentation
│   ├── TESTING.md                     -- Testing strategy
│   ├── BENCHMARKS.md                  -- Benchmark methodology and metrics
│   ├── INTEGRATION-AGENTS.md          -- Agent integration patterns
│   ├── INTEGRATION-PLAYWRIGHT.md      -- Playwright integration guide
│   └── rfcs/
│       └── TEMPLATE.md                -- RFC template
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                     -- Lint, typecheck, test on every PR
│   │   ├── release.yml                -- Changeset-based npm publish
│   │   └── canary.yml                 -- Canary release on merge to main
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug-report.yml
│   │   └── feature-request.yml
│   └── PULL_REQUEST_TEMPLATE.md
│
├── CLAUDE.md                          -- Contributor contract (this is the law)
├── CONTRIBUTING.md                    -- Contribution guide
├── CODE_OF_CONDUCT.md
├── LICENSE                            -- MIT
├── package.json                       -- Root workspace config
├── pnpm-workspace.yaml                -- packages/* workspace definition
├── tsconfig.base.json                 -- Shared TypeScript config
├── .eslintrc.cjs                      -- ESLint config
├── .prettierrc                        -- Prettier config
├── vitest.config.ts                   -- Root Vitest config
├── .changeset/
│   └── config.json                    -- Changesets configuration
└── .uicrc.json                        -- UIC config for dogfooding (protectedScopes, etc.)
```

## Rationale for This Structure

### Why monorepo with packages/?

- Each layer (core, parser, namer, annotator, cli) has clear boundaries and its own dependency tree.
- Parsers are separate packages so they can be tree-shaken. A project using only React doesn't need `@vue/compiler-sfc`.
- The CLI is the composition root; it imports from all other packages but no package imports from it.
- Testing each package in isolation catches boundary violations early.

### Why not packages/parser/ with a single parser?

Each framework's AST library is a significant dependency (`ts-morph` for React, `@vue/compiler-sfc` for Vue). Splitting them ensures users only install what they need and each parser can version independently.

### Why fixtures/ at root instead of per-package?

Fixtures are shared across tests. The React fixture is used by `parser-react` (scan), `namer` (naming), `annotator` (annotation), and `cli` (integration tests). Duplicating fixtures per package creates drift. One source of truth at the root.

### Why tests/e2e/ at root?

E2E tests exercise the full pipeline across packages. They don't belong to any single package. The root `tests/` directory makes this clear.

### Why skill/ as a package?

Agent skill files need versioning (they reference CLI commands and manifest schema). Packaging them means they can be published to npm (`npx uic skill --print`) and consumed by agent tool registries.

## Package Dependency Graph

```
@uicontract/cli
  ├── @uicontract/core
  ├── @uicontract/parser-react
  ├── @uicontract/parser-vue (optional peer dependency)
  ├── @uicontract/namer
  └── @uicontract/annotator

@uicontract/parser-react
  └── @uicontract/core

@uicontract/parser-vue
  └── @uicontract/core

@uicontract/namer
  └── @uicontract/core

@uicontract/annotator
  └── @uicontract/core

@uicontract/skill
  └── (no runtime dependencies -- just markdown files)
```

## npm Package Names

| Package | npm name | Published |
|---------|----------|-----------|
| core | `@uicontract/core` | Yes |
| cli | `uic` (bin: `uic`) | Yes |
| parser-react | `@uicontract/parser-react` | Yes |
| parser-vue | `@uicontract/parser-vue` | Yes (Phase 5) |
| namer | `@uicontract/namer` | Yes |
| annotator | `@uicontract/annotator` | Yes |
| skill | `@uicontract/skill` | Yes |

The main CLI package is `uic` (no scope) for ease of use: `npx uic scan`.
All library packages use the `@uicontract/` scope.
