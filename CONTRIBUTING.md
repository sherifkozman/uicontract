# Contributing to UIC

Thank you for your interest in contributing to UIC! This guide covers everything you need to get started.

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9

## Getting Started

```bash
# Clone the repository
git clone https://github.com/sherifkozman/uicontract.git
cd uicontract

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Verify everything works
pnpm lint && pnpm typecheck
```

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint code with ESLint |
| `pnpm typecheck` | Type check all packages with TypeScript |
| `pnpm format` | Format code with Prettier |
| `pnpm --filter @uicontract/core test` | Run tests for a specific package |

## Development Workflow

1. **Find or create an issue.** All work starts with a GitHub issue.
2. **Discuss non-trivial changes.** For features or architectural changes, comment on the issue with your approach before coding.
3. **Fork and branch.** Fork the repo and create a feature branch from `main`.
4. **Write code and tests.** Follow the code standards below.
5. **Verify locally.** Run `pnpm build && pnpm lint && pnpm test` — all must pass with zero errors and zero warnings.
6. **Add a changeset.** Run `pnpm changeset` to describe your change for the changelog.
7. **Submit a PR.** See the PR checklist below.

## Project Structure

```
uic/
  packages/
    core/           -- Types, schema, validation, logger, errors
    cli/            -- CLI entry point and all commands
    parser-react/   -- React/Next.js parser
    parser-vue/     -- Vue/Nuxt parser
    namer/          -- Naming engine (deterministic + AI)
    annotator/      -- Source code modifier (data-agent-id insertion)
    skill/          -- Agent skill files
  fixtures/         -- Test fixture apps
  tests/e2e/        -- End-to-end pipeline tests
  docs/             -- Documentation
```

For detailed architecture, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Code Standards

### TypeScript

- `strict: true` in all tsconfigs
- No `any`. Use `unknown` + type narrowing instead.
- No `@ts-ignore`. Use `@ts-expect-error` only with a comment explaining the workaround.
- Prefer `interface` over `type` for object shapes.

### Naming

- **Files**: `kebab-case.ts`
- **Types/Interfaces**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`

### Error Handling

- Use `UicError` with a machine-readable `code` and human-readable `message`.
- Parsers never throw on unexpected input — return results with a `warnings` array.
- CLI commands print errors to stderr, output to stdout.

### Logging

- No `console.log` in library code. Use the structured logger from `@uicontract/core`.
- Logs go to stderr, never stdout.

For the full contributor contract, see [CLAUDE.md](./CLAUDE.md).

## Testing

### Running Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @uicontract/parser-react test

# Watch mode
pnpm --filter @uicontract/core test -- --watch

# Single test file
cd packages/core && npx vitest run tests/config.test.ts
```

### Coverage Requirements

- Core: 90%+ line coverage
- Parsers: 85%+ line coverage
- CLI commands: 80%+ line coverage

### Test Types

- **Unit tests** — `packages/*/tests/*.test.ts`
- **Integration tests** — `packages/*/tests/integration/*.test.ts`
- **Golden file tests** — snapshot tests in `packages/*/tests/__snapshots__/`
- **E2E tests** — `tests/e2e/*.test.ts`

### Fixture Apps

Fixture apps in `fixtures/` provide realistic test data:

- `fixtures/react-app/` — Full React/Next.js app with 15+ interactive elements
- `fixtures/react-minimal/` — Minimal smoke test (1 component, 3 elements)
- `fixtures/react-edge-cases/` — Edge cases: forwardRef, memo, HOCs, portals
- `fixtures/vue-app/` — Vue 3/Nuxt app
- `fixtures/annotated-app/` — Pre-annotated app for round-trip testing

## Adding a CLI Command

1. Create `packages/cli/src/commands/<command-name>.ts`
2. Export a function: `(args: string[]) => Promise<number>` (returns exit code)
3. Include a `*_HELP` constant with full usage text
4. Add `--help, -h` and `--json` flags
5. Register in `packages/cli/src/bin/uic.ts`
6. Add unit tests in `packages/cli/tests/commands/<command-name>.test.ts`
7. Add entry to [docs/CLI.md](docs/CLI.md)

## Adding a Parser

1. Create `packages/parser-<framework>/` following the package structure
2. Implement the `Parser` interface from `@uicontract/core`
3. Register in the parser registry
4. Create fixture app in `fixtures/<framework>-app/`
5. Add golden file tests
6. Add entry to [docs/PARSERS.md](docs/PARSERS.md)

For a step-by-step tutorial on writing a third-party parser plugin, see [docs/PARSERS.md](docs/PARSERS.md#write-your-own-parser).

## RFC Process

Changes that affect the manifest schema, CLI command interface, Parser plugin API, or architecture boundaries require an RFC.

1. Copy [docs/rfcs/TEMPLATE.md](docs/rfcs/TEMPLATE.md) to `docs/rfcs/NNN-<title>.md`
2. Fill in all sections: Summary, Motivation, Detailed Design, Alternatives, Migration Path
3. Submit as a PR with the `rfc` label
4. Discussion period: 1 week minimum
5. Decision is recorded in the RFC document

## Release Process

UIC uses [Changesets](https://github.com/changesets/changesets) for version management.

### Adding a Changeset

After making your changes, run:

```bash
pnpm changeset
```

Select the affected packages, choose the appropriate version bump (patch/minor/major), and write a summary of the change.

### Version Bumps

- **patch** — bug fixes, documentation, internal refactoring
- **minor** — new features, new CLI flags, new parser capabilities
- **major** — breaking changes to manifest schema, CLI interface, or Parser API

### Publishing

Merging to `main` triggers the release workflow:
1. Changesets action creates/updates a "Version Packages" PR
2. Merging the version PR publishes to npm

## Pull Request Checklist

Before submitting a PR, ensure:

- [ ] `pnpm build` passes with zero warnings
- [ ] `pnpm lint` passes with zero warnings
- [ ] `pnpm test` passes with zero failures
- [ ] Tests added for new or changed behavior
- [ ] Changeset added (`pnpm changeset`)
- [ ] No `any` types introduced
- [ ] `--help` text updated (if CLI changes)
- [ ] Documentation updated (if user-facing changes)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
