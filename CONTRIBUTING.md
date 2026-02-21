# Contributing to UIC

## Quick Start

```bash
git clone https://github.com/sherifkozman/uicontract.git
cd uicontract
pnpm install
pnpm build
pnpm test
```

## Development

- `pnpm build` — Build all packages
- `pnpm test` — Run tests
- `pnpm lint` — Lint code
- `pnpm typecheck` — Type check all packages
- `pnpm format` — Format code with Prettier

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run `pnpm build && pnpm lint && pnpm test`
4. Add a changeset: `pnpm changeset`
5. Submit a PR

## Code Standards

See [CLAUDE.md](./CLAUDE.md) for the full contributor contract.
