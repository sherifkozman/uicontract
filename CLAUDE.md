# UIC Contributor Contract

UIC (UI Contracts) is a CLI tool and agent skill that makes web app UIs machine-readable. It parses source code to discover interactive elements, names them with stable hierarchical IDs, annotates source with `data-agent-id` attributes, generates a manifest describing the UI surface, and provides a CI diff gate for breaking changes. Think of it as OpenAPI for UIs. It is NOT a runtime library, NOT an MCP server, and NOT a browser extension.

**Spec**: `docs/SPEC.md`
**Architecture**: `docs/ARCHITECTURE.md`
**Milestones**: `docs/MILESTONES.md`
**Benchmarks**: `docs/BENCHMARKS.md`

---

## 1. Critical Rules

### Every PR Must

1. Pass `pnpm build && pnpm lint && pnpm test` with zero errors and zero warnings.
2. Pass `npx uicontract diff` on UIC's own fixture manifests (dogfooding). If fixture manifests change, the diff must be reviewed and committed intentionally.
3. Include tests for any new or changed behavior. No exceptions.
4. Have zero `any` types. Use `unknown` + type narrowing instead.
5. Not add a dependency without a justification comment in the PR description explaining why it's necessary and what alternatives were considered.

### Every New CLI Command Must Have

- Unit tests for argument parsing and output formatting
- Integration test with fixture data
- `--help` text that documents all flags
- `--json` output flag for machine consumption
- Entry in `docs/CLI.md`

### Every New Parser Must Have

- Unit tests for each element type it discovers
- Golden file tests with a fixture app
- Integration test: scan -> annotate -> re-scan -> verify round-trip
- Entry in `docs/PARSERS.md`

### TypeScript

- `strict: true` in all tsconfigs
- `noUncheckedIndexedAccess: true`
- `noImplicitReturns: true`
- No `any`. No `@ts-ignore`. `@ts-expect-error` only with a comment explaining the bug being worked around.
- Prefer `interface` over `type` for object shapes. Use `type` for unions, intersections, and mapped types.

---

## 2. Decision Framework

### Process

**Think**: Understand the problem. Read existing code. Identify constraints.
**Draft**: Write the simplest solution that could work.
**Peer Review / Challenge**: Ask "what breaks?" and "what's unnecessary?"
**Synthesize**: Incorporate feedback. Simplify further.
**Decide**: Commit to one approach. Document why.

### Principles

- **When in doubt, simplify.** If a feature needs more than one paragraph to explain to a developer, it's too complex.
- **Prefer composition over abstraction.** A function that calls two other functions is better than a class hierarchy.
- **When choosing between "correct but complex" and "simple but 90% correct", choose simple.** File an issue for the 10%.
- **No invented hybrids.** When choosing between approach A and approach B, pick one. Only combine if the combination is a recognized pattern with prior art.
- **Edge cases are common practice.** Conditional rendering, i18n, HOCs, dynamic imports -- these are not rare. Design for them or explicitly document that you don't handle them (with a skip count in output).

---

## 3. Code Conventions

### Package Structure

```
packages/<name>/
  src/
    index.ts          -- public API (re-exports only)
    <feature>.ts      -- implementation files
    types.ts          -- package-specific types
  tests/
    <feature>.test.ts -- unit tests
    integration/      -- integration tests (if any)
  package.json
  tsconfig.json
  README.md           -- what this package does, its public API
```

### Naming

- **Files**: `kebab-case.ts` (e.g., `element-discovery.ts`)
- **Types/Interfaces**: `PascalCase` (e.g., `ManifestElement`, `ParserPlugin`)
- **Functions**: `camelCase` (e.g., `discoverElements`, `generateManifest`)
- **Constants**: `SCREAMING_SNAKE_CASE` for true constants (e.g., `MAX_SCAN_DEPTH`)
- **CLI commands**: `kebab-case` (e.g., `uicontract scan`, `uicontract find`)
- **Agent IDs**: `dot.separated.kebab-case` (e.g., `settings.billing.pause-subscription.button`)
- **Test files**: mirror source file name with `.test.ts` suffix

### Error Handling

- Use typed error classes extending `Error`. One base class `UicError` with `code` and `context` properties.
- Parsers never throw on unexpected input. They return the element list with a `warnings` array for anything they couldn't handle.
- CLI commands print errors to stderr, output to stdout. Exit code 1 on failure.
- Every error message must include: what happened, what the user can do about it, and a reference to relevant docs if applicable.

```typescript
// Good
throw new UicError('MANIFEST_NOT_FOUND', {
  message: `No manifest.json found at ${path}. Run "npx uicontract scan <dir>" first.`,
  path,
});

// Bad
throw new Error('File not found');
```

### Logging

- No `console.log` in library code. Use a structured logger (`packages/core/src/logger.ts`).
- Log levels: `debug`, `info`, `warn`, `error`.
- CLI commands default to `warn` level. `--verbose` sets `debug`. `--quiet` sets `error`.
- Logs go to stderr, never stdout (stdout is reserved for command output).

### How to Add a New CLI Command

1. Create `packages/cli/src/commands/<command-name>.ts`.
2. Export a function matching the command interface: `(args: ParsedArgs) => Promise<number>` (returns exit code).
3. Register in `packages/cli/src/commands/index.ts`.
4. Add `--help` text as a constant in the command file.
5. Add unit test in `packages/cli/tests/commands/<command-name>.test.ts`.
6. Add integration test in `packages/cli/tests/integration/<command-name>.integration.test.ts`.
7. Add entry to `docs/CLI.md`.

### How to Add a New Parser

1. Create `packages/parser-<framework>/` following the package structure above.
2. Implement the `Parser` interface from `packages/core/src/types.ts`:

```typescript
interface Parser {
  /** Unique framework identifier */
  readonly framework: string;

  /** Detect if a directory uses this framework */
  detect(dir: string): Promise<boolean>;

  /** Discover all interactive elements in the project */
  discover(dir: string, options: ParserOptions): Promise<DiscoveryResult>;
}

interface DiscoveryResult {
  elements: RawElement[];
  warnings: ParserWarning[];
  metadata: {
    filesScanned: number;
    filesSkipped: number;
    scanDurationMs: number;
  };
}
```

3. Register the parser in `packages/core/src/parser-registry.ts`.
4. Create fixture app in `fixtures/<framework>-app/`.
5. Add golden file test.
6. Add entry to `docs/PARSERS.md`.

---

## 4. Architecture Boundaries

Six layers. Each layer depends only on the layers below it. No circular dependencies.

```
                    +-----------------+
                    |   Governance    |  npx uicontract diff, CI integration
                    +-----------------+
                            |
                    +-----------------+
                    |     Query       |  npx uicontract find/describe/list
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

**Core** (`packages/core`): Types, JSON Schema, validation, logger, error classes. No framework-specific code.

**Parser** (`packages/parser-react`, `packages/parser-vue`): Framework-specific AST parsing. Produces `RawElement[]`. Knows nothing about naming, annotation, or manifests beyond the raw element type.

**Namer** (`packages/namer`): Takes `RawElement[]`, produces `NamedElement[]` with hierarchical IDs. Does not read source code or write files.

**Manifest** (`packages/core/src/manifest/`): Serializes `NamedElement[]` to `manifest.json`. Validates against schema. Handles versioning.

**Annotator** (`packages/annotator`): Reads source files, inserts `data-agent-id` attributes. Produces patches. Does not parse (that's the parser's job -- it receives element locations from the parser output).

**Query** (`packages/cli/src/commands/find.ts`, etc.): Reads manifest.json, searches, filters, formats output. Stateless.

**Governance** (`packages/cli/src/commands/diff.ts`, CI scripts): Compares two manifests, categorizes changes, enforces policies.

### Boundary Rules

- Parsers do NOT import from namer, annotator, query, or governance.
- Namer does NOT import from annotator, query, or governance.
- Annotator does NOT import from query or governance.
- Everything imports from core.
- CLI is the composition root -- it wires layers together.
- No layer persists state. All functions take input and return output.

---

## 5. Testing Strategy

### Test Types

| Type | Tool | Location | Runs in CI |
|------|------|----------|------------|
| Unit | Vitest | `packages/*/tests/*.test.ts` | Yes |
| Integration | Vitest | `packages/*/tests/integration/*.test.ts` | Yes |
| Golden file | Vitest snapshots | `packages/*/tests/__snapshots__/` | Yes |
| E2E | Vitest + CLI subprocess | `tests/e2e/*.test.ts` | Yes |
| AI naming | Vitest (structure only) | `packages/namer/tests/` | Partial |

### Coverage Requirements

- Core: 90%+ line coverage
- Parsers: 85%+ line coverage
- CLI commands: 80%+ line coverage
- Overall: must not decrease on any PR

### What Gets Tested

**Unit tests**: Every public function. Every error path. Every CLI argument combination.

**Integration tests**: Parser on fixture app -> verify element count and properties. Annotator on fixture file -> verify output. Namer on realistic element list -> verify naming.

**Golden file tests**: Fixture app manifest committed as snapshot. Parser changes that alter manifest output are caught and must be intentionally updated.

**E2E tests**: Full pipeline -- `uicontract scan <fixture>` -> `uicontract name` -> `uicontract annotate --dry-run` -> verify patch -> `uicontract diff` against baseline.

**AI naming tests**: Test structure (returns string, follows naming pattern, no duplicates) not content. AI tests are marked with `test.skip` in CI and run manually/on-demand.

### Fixture Apps

- `fixtures/react-app/`: 5+ components, 15+ interactive elements, Next.js file-based routing, dynamic imports, conditional rendering
- `fixtures/react-minimal/`: 1 component, 3 elements (smoke test)
- `fixtures/react-edge-cases/`: forwardRef, memo, HOCs, render props, portals, fragments
- `fixtures/vue-app/`: (Phase 5) equivalent of react-app in Vue 3 + Nuxt
- `fixtures/annotated-app/`: pre-annotated React app for round-trip testing

---

## 6. Manifest Schema

### Version Policy

- Manifest schema has its own version number, independent of the npm package version.
- Schema version is `major.minor`: major = breaking change, minor = additive field.
- Manifests include `schemaVersion` field. Tools must check compatibility.
- Old tools must refuse to read newer major versions with a clear error.

### Schema v1 Shape (Summary)

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
    {
      "agentId": "settings.billing.pause-subscription.button",
      "type": "button",
      "filePath": "src/components/BillingSettings.tsx",
      "line": 47,
      "column": 8,
      "componentName": "BillingSettings",
      "route": "/settings/billing",
      "label": "Pause subscription",
      "handler": "handlePauseSubscription",
      "attributes": {
        "data-testid": "pause-btn"
      },
      "conditional": false,
      "dynamic": false,
      "directive": "use client"
    }
  ]
}
```

Full schema: `packages/core/src/schema/manifest.v1.schema.json`

---

## 7. Release & Versioning

- **npm package**: Semantic versioning. Use Changesets for version management.
- **Breaking changes**: Major version bump. Must be preceded by a deprecation period in the prior minor release when feasible.
- **Manifest schema**: Separate version from package. `schemaVersion: "1.0"` can exist across many package versions.
- **Pre-1.0**: Breaking changes allowed in minor versions. After 1.0, standard semver rules apply.
- **Release process**: Changesets -> PR -> merge -> CI publishes to npm.
- **Canary releases**: Every merge to main publishes a canary version (`0.1.0-canary.abc1234`).

---

## 8. Security

- **No secrets in manifests.** Manifests contain file paths, component names, and labels. Never API keys, tokens, or user data.
- **`data-agent-id` in production**: By default, attributes persist in production builds. Document how to strip them via Babel/SWC plugin if desired. Provide a `uicontract strip` command for manual removal.
- **Supply chain**: `pnpm-lock.yaml` must be committed. Dependabot or Renovate enabled. New dependencies require justification in PR description. Run `pnpm audit` in CI.
- **Source annotator safety**: Annotator creates `.uic-backup/` before modifying files. `--dry-run` is documented as the recommended first step. Annotator refuses to run on uncommitted changes (requires clean git state).

---

## 9. Open Source Governance

### Contribution Workflow

1. **Issue first.** All work starts with a GitHub issue. Bug reports, feature requests, and questions.
2. **Discussion for non-trivial changes.** Before writing code for new features or architectural changes, open a Discussion or comment on the issue with your proposed approach.
3. **Fork and PR.** Fork the repo, create a feature branch, submit a PR against `main`.
4. **PR requirements**: All CI checks pass. At least one maintainer review. Changeset included if the change affects published packages. `uicontract diff` passes on fixture manifests.
5. **Review turnaround**: Maintainers aim to review within 3 business days.

### RFC Process

Changes that affect the manifest schema, CLI command interface, parser plugin API, or architecture boundaries require an RFC.

1. Copy `docs/rfcs/TEMPLATE.md` to `docs/rfcs/NNN-<title>.md`.
2. Fill in: Problem, Proposed Solution, Alternatives Considered, Migration Path, Open Questions.
3. Submit as a PR. Label with `rfc`.
4. Discussion period: 1 week minimum.
5. Decision recorded in the RFC document itself.

### Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). See `CODE_OF_CONDUCT.md`.

---

## 10. Environment & Setup

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9

# Clone and install
git clone https://github.com/sherifkozman/uicontract.git
cd uicontract
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @uicontract/parser-react test

# Lint
pnpm lint

# Type check
pnpm typecheck

# Scan the fixture app (after building)
npx uicontract scan fixtures/react-app
```

### Monorepo Structure

```
uic/
  packages/
    core/           -- types, schema, validation, logger, errors
    cli/            -- CLI entry point and commands
    parser-react/   -- React/Next.js parser
    parser-vue/     -- Vue/Nuxt parser (Phase 5)
    namer/          -- naming engine (deterministic + AI)
    annotator/      -- source code modifier
    skill/          -- agent skill files
  fixtures/         -- test fixture apps
  tests/
    e2e/            -- end-to-end pipeline tests
  docs/             -- documentation
  .github/          -- CI, issue templates, PR templates
  CLAUDE.md         -- this file
  CONTRIBUTING.md   -- contribution guide
  CODE_OF_CONDUCT.md
```

---

## 11. AI Agent Contributors

No AI agents (Claude Code, Codex, Cursor, etc.) are to be mentioned or references anywhere in the code even if they are contributors. Additional rules for AI agents:

- **Read this file first.** Before making any change, read `CLAUDE.md`.
- **Run tests before submitting.** Always run `pnpm test` and `pnpm lint` before declaring work complete.
- **Do not invent abstractions.** If the task says "add a parser for Svelte," add a parser for Svelte. Do not also refactor the parser interface, add a plugin system, or create utility libraries unless the task explicitly asks for it.
- **Prefer small PRs.** One feature or fix per PR. If a task requires multiple PRs, say so.
- **When unsure, ask.** Do not guess at requirements. If the task is ambiguous, list your assumptions and ask for confirmation before coding.
- **Follow verified reasoning.** Tag claims as OBSERVED (with source), DEDUCED, INFERRED (with confidence), or ASSUMED. Do not build conclusions on ASSUMED claims without verification.
