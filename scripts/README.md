# Scripts

## validate-oss.sh

Validates UIC against any public OSS repository by shallow-cloning it, running
`uicontract scan` and `uicontract name`, and printing a summary report with element counts,
scan duration, warning counts, and duplicate ID detection.

### Prerequisites

Build UIC before running the script:

```bash
pnpm install
pnpm build
```

### Usage

```bash
./scripts/validate-oss.sh <repo-url> <framework>
```

### Recommended Repositories

#### cal.com (React / Next.js)

```bash
./scripts/validate-oss.sh https://github.com/calcom/cal.com react
```

#### nuxt/ui (Vue 3 / Nuxt)

```bash
./scripts/validate-oss.sh https://github.com/nuxt/ui vue
```

#### shadcn-ui/ui (React)

```bash
./scripts/validate-oss.sh https://github.com/shadcn-ui/ui react
```

### What the Script Does

1. Validates arguments (repo URL and framework name are required).
2. Locates the built UIC binary at `packages/cli/dist/bin/uic.js`.
3. Creates a temporary directory and shallow-clones the repository (`--depth 1`).
4. Runs `uicontract scan` with the specified framework and records scan duration.
5. Counts warnings emitted during the scan.
6. Extracts element count and files-scanned from the generated manifest.
7. Runs `uicontract name` on the manifest and checks for duplicate agent IDs.
8. Prints a summary report to stdout.
9. Cleans up the temporary directory on exit.

### Output

The script prints a report like:

```
============================================
  UIC OSS Validation Report
============================================

  Repository:       https://github.com/calcom/cal.com
  Framework:        react
  Scan duration:    12s
  Files scanned:    847
  Elements found:   2134
  Warnings:         5

  Naming exit code: 0
  Duplicate IDs:    0

  Status: PASS

  Manifest:         /tmp/tmp.XXXXX/manifest.json
  Named manifest:   /tmp/tmp.XXXXX/named-manifest.json
============================================
```
