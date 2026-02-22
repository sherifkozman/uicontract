# Real-World Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 15-20 e2e subprocess tests, two richer fixture apps, and an OSS validation script to verify UIC works against real-world code.

**Architecture:** Three parallel tracks — (1) e2e test suite in `tests/e2e/` using Vitest + `execFile` subprocess calls against the real CLI binary, (2) two new fixture apps (`fixtures/react-dashboard/` and `fixtures/vue-storefront/`) that exercise patterns not covered by existing fixtures, (3) a validation script `scripts/validate-oss.sh` for running UIC against cloned OSS repos.

**Tech Stack:** Vitest, Node.js `node:child_process` (execFile only — never exec), existing UIC CLI binary at `packages/cli/dist/bin/uic.js`, React/Next.js (fixtures), Vue/Nuxt (fixtures), Bash (validation script).

---

### Task 1: E2E Test Helpers

**Files:**
- Create: `tests/e2e/helpers.ts`

**Step 1: Write the helper module**

Uses `execFile` from `node:child_process` (never `exec`) to avoid shell injection. Each helper wraps the UIC CLI binary as a subprocess.

```typescript
import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

const UIC_BIN = path.resolve(__dirname, '../../packages/cli/dist/bin/uic.js');

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function runUic(
  args: string[],
  options?: { cwd?: string; timeout?: number },
): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      [UIC_BIN, ...args],
      {
        cwd: options?.cwd ?? path.resolve(__dirname, '../..'),
        timeout: options?.timeout ?? 30_000,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        resolve({
          stdout: stdout ?? '',
          stderr: stderr ?? '',
          exitCode: error?.code !== undefined
            ? (typeof error.code === 'number' ? error.code : 1)
            : child.exitCode ?? 0,
        });
      },
    );
  });
}

export async function loadManifest(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as unknown;
}

export async function tempDir(prefix = 'uic-e2e-'): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}
```

**Step 2: Verify by running the first test in the next task**

**Step 3: Commit**

```bash
git add tests/e2e/helpers.ts
git commit -m "test: add e2e subprocess helpers (runUic, loadManifest, tempDir)"
```

---

### Task 2: E2E — Scan Command Tests (3 tests)

**Files:**
- Create: `tests/e2e/scan.test.ts`

**Step 1: Write the scan e2e tests**

Three tests: valid JSON manifest output, --framework flag, non-existent directory error.

```typescript
import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { runUic, tempDir } from './helpers.js';

describe('uic scan (e2e)', () => {
  it('produces valid JSON manifest for react fixture', async () => {
    const tmp = await tempDir();
    const outFile = path.join(tmp, 'manifest.json');
    const result = await runUic(['scan', 'fixtures/react-app', '-o', outFile]);
    expect(result.exitCode).toBe(0);

    const raw = await fs.readFile(outFile, 'utf-8');
    const manifest = JSON.parse(raw) as Record<string, unknown>;
    expect(manifest['schemaVersion']).toBe('1.0');
    expect(manifest['generator']).toBeDefined();
    expect(manifest['metadata']).toBeDefined();
    expect(Array.isArray(manifest['elements'])).toBe(true);

    const elements = manifest['elements'] as Array<Record<string, unknown>>;
    expect(elements.length).toBeGreaterThanOrEqual(15);
    for (const el of elements) {
      expect(el['agentId']).toEqual(expect.any(String));
      expect(el['type']).toEqual(expect.any(String));
      expect(el['filePath']).toEqual(expect.any(String));
      expect(el['line']).toEqual(expect.any(Number));
    }
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);

  it('respects --framework react flag', async () => {
    const result = await runUic(['scan', 'fixtures/react-app', '--framework', 'react', '--json']);
    expect(result.exitCode).toBe(0);
    const manifest = JSON.parse(result.stdout) as Record<string, unknown>;
    const metadata = manifest['metadata'] as Record<string, unknown>;
    expect(metadata['framework']).toBe('react');
  }, 30_000);

  it('exits 1 with helpful error for non-existent directory', async () => {
    const result = await runUic(['scan', '/tmp/nonexistent-uic-dir-12345']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('not found');
  }, 10_000);
});
```

**Step 2: Build CLI and run tests**

Run: `pnpm build && pnpm exec vitest run tests/e2e/scan.test.ts`
Expected: 3 tests PASS

**Step 3: Commit**

```bash
git add tests/e2e/scan.test.ts
git commit -m "test: add e2e scan command tests (valid JSON, --framework, error handling)"
```

---

### Task 3: E2E — Name Command Tests (2 tests)

**Files:**
- Create: `tests/e2e/name.test.ts`

**Step 1: Write the name e2e tests**

Two tests: deterministic output across runs, zero duplicate agentIds.

```typescript
import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { runUic, tempDir } from './helpers.js';

describe('uic name (e2e)', () => {
  it('produces stable deterministic output across two runs', async () => {
    const tmp = await tempDir();
    const scanOut = path.join(tmp, 'scan.json');
    const name1 = path.join(tmp, 'named1.json');
    const name2 = path.join(tmp, 'named2.json');

    await runUic(['scan', 'fixtures/react-app', '-o', scanOut]);
    await runUic(['name', scanOut, '-o', name1]);
    await runUic(['name', scanOut, '-o', name2]);

    const m1 = JSON.parse(await fs.readFile(name1, 'utf-8')) as Record<string, unknown>;
    const m2 = JSON.parse(await fs.readFile(name2, 'utf-8')) as Record<string, unknown>;
    expect(m1['elements']).toEqual(m2['elements']);
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);

  it('produces zero duplicate agentIds', async () => {
    const tmp = await tempDir();
    const scanOut = path.join(tmp, 'scan.json');
    const namedOut = path.join(tmp, 'named.json');

    await runUic(['scan', 'fixtures/react-app', '-o', scanOut]);
    await runUic(['name', scanOut, '-o', namedOut]);

    const manifest = JSON.parse(await fs.readFile(namedOut, 'utf-8')) as Record<string, unknown>;
    const elements = manifest['elements'] as Array<Record<string, unknown>>;
    const ids = elements.map((el) => el['agentId'] as string);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);
});
```

**Step 2: Run tests**

Run: `pnpm exec vitest run tests/e2e/name.test.ts`
Expected: 2 tests PASS

**Step 3: Commit**

```bash
git add tests/e2e/name.test.ts
git commit -m "test: add e2e name command tests (deterministic, no duplicates)"
```

---

### Task 4: E2E — Annotate Command Tests (2 tests)

**Files:**
- Create: `tests/e2e/annotate.test.ts`

**Step 1: Write annotate e2e tests**

Two tests: dry-run produces unified diff, diff contains data-agent-id.

```typescript
import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { runUic, tempDir } from './helpers.js';

describe('uic annotate (e2e)', () => {
  it('--dry-run produces unified diff output', async () => {
    const tmp = await tempDir();
    const scanOut = path.join(tmp, 'scan.json');
    const namedOut = path.join(tmp, 'named.json');

    await runUic(['scan', 'fixtures/react-app', '-o', scanOut]);
    await runUic(['name', scanOut, '-o', namedOut]);

    const result = await runUic(['annotate', '--manifest', namedOut, '--dry-run']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('---');
    expect(result.stdout).toContain('+++');
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);

  it('--dry-run output contains data-agent-id attributes', async () => {
    const tmp = await tempDir();
    const scanOut = path.join(tmp, 'scan.json');
    const namedOut = path.join(tmp, 'named.json');

    await runUic(['scan', 'fixtures/react-app', '-o', scanOut]);
    await runUic(['name', scanOut, '-o', namedOut]);

    const result = await runUic(['annotate', '--manifest', namedOut, '--dry-run']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('data-agent-id=');
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);
});
```

**Step 2: Run tests**

Run: `pnpm exec vitest run tests/e2e/annotate.test.ts`
Expected: 2 tests PASS

**Step 3: Commit**

```bash
git add tests/e2e/annotate.test.ts
git commit -m "test: add e2e annotate command tests (dry-run diff, data-agent-id)"
```

---

### Task 5: E2E — Query Command Tests (3 tests)

**Files:**
- Create: `tests/e2e/query.test.ts`

**Step 1: Write query command e2e tests**

Three tests: find "pause" returns results, describe returns full detail, list --type button filters.

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { runUic, tempDir } from './helpers.js';

describe('uic query commands (e2e)', () => {
  let manifestPath: string;
  let tmp: string;

  beforeAll(async () => {
    tmp = await tempDir();
    manifestPath = path.join(tmp, 'manifest.json');
    await runUic(['scan', 'fixtures/react-app', '-o', manifestPath]);
  }, 30_000);

  afterAll(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('find "pause" returns matching elements', async () => {
    const result = await runUic(['find', 'pause', '--manifest', manifestPath, '--json']);
    expect(result.exitCode).toBe(0);
    const elements = JSON.parse(result.stdout) as Array<Record<string, unknown>>;
    expect(elements.length).toBeGreaterThanOrEqual(1);
    const labels = elements.map((el) => String(el['label'] ?? '').toLowerCase());
    const ids = elements.map((el) => String(el['agentId'] ?? '').toLowerCase());
    expect([...labels, ...ids].some((s) => s.includes('pause'))).toBe(true);
  }, 15_000);

  it('describe returns full element detail for a known agentId', async () => {
    const raw = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as Record<string, unknown>;
    const elements = manifest['elements'] as Array<Record<string, unknown>>;
    const firstId = elements[0]?.['agentId'] as string;

    const result = await runUic(['describe', firstId, '--manifest', manifestPath, '--json']);
    expect(result.exitCode).toBe(0);
    const detail = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(detail['agentId']).toBe(firstId);
    expect(detail['type']).toBeDefined();
    expect(detail['filePath']).toBeDefined();
  }, 15_000);

  it('list --type button --json returns only buttons', async () => {
    const result = await runUic(['list', '--type', 'button', '--manifest', manifestPath, '--json']);
    expect(result.exitCode).toBe(0);
    const elements = JSON.parse(result.stdout) as Array<Record<string, unknown>>;
    expect(elements.length).toBeGreaterThanOrEqual(1);
    for (const el of elements) {
      expect(el['type']).toBe('button');
    }
  }, 15_000);
});
```

**Step 2: Run tests**

Run: `pnpm exec vitest run tests/e2e/query.test.ts`
Expected: 3 tests PASS

**Step 3: Commit**

```bash
git add tests/e2e/query.test.ts
git commit -m "test: add e2e query command tests (find, describe, list --type)"
```

---

### Task 6: E2E — Diff Command Tests (2 tests)

**Files:**
- Create: `tests/e2e/diff.test.ts`

**Step 1: Write diff e2e tests**

Two tests: identical manifests exit 0, removed element exits 1.

```typescript
import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { runUic, tempDir } from './helpers.js';

describe('uic diff (e2e)', () => {
  it('exits 0 when comparing identical manifests', async () => {
    const tmp = await tempDir();
    const manifest = path.join(tmp, 'manifest.json');
    await runUic(['scan', 'fixtures/react-app', '-o', manifest]);
    const result = await runUic(['diff', manifest, manifest]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No changes');
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);

  it('exits 1 and reports breaking change when element is removed', async () => {
    const tmp = await tempDir();
    const original = path.join(tmp, 'original.json');
    const modified = path.join(tmp, 'modified.json');

    await runUic(['scan', 'fixtures/react-app', '-o', original]);
    const raw = await fs.readFile(original, 'utf-8');
    const manifest = JSON.parse(raw) as Record<string, unknown>;
    const elements = manifest['elements'] as Array<unknown>;
    elements.shift(); // remove first element
    await fs.writeFile(modified, JSON.stringify(manifest, null, 2), 'utf-8');

    const result = await runUic(['diff', original, modified]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('REMOVED');
    expect(result.stdout).toContain('BREAKING');

    const jsonResult = await runUic(['diff', original, modified, '--json']);
    expect(jsonResult.exitCode).toBe(1);
    const parsed = JSON.parse(jsonResult.stdout) as Record<string, unknown>;
    expect(parsed['breaking']).toBe(true);
    await fs.rm(tmp, { recursive: true, force: true });
  }, 30_000);
});
```

**Step 2: Run tests**

Run: `pnpm exec vitest run tests/e2e/diff.test.ts`
Expected: 2 tests PASS

**Step 3: Commit**

```bash
git add tests/e2e/diff.test.ts
git commit -m "test: add e2e diff command tests (identical exits 0, removed exits 1)"
```

---

### Task 7: E2E — Full Pipeline Tests (3 tests)

**Files:**
- Create: `tests/e2e/pipeline.test.ts`

**Step 1: Write full pipeline e2e tests**

Three tests: React full pipeline, Vue full pipeline, cross-framework schema parity.

```typescript
import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { runUic, tempDir } from './helpers.js';

describe('uic full pipeline (e2e)', () => {
  it('scan -> name -> annotate -> diff pipeline (React)', async () => {
    const tmp = await tempDir();
    const scanOut = path.join(tmp, 'scan.json');
    const namedOut = path.join(tmp, 'named.json');

    expect((await runUic(['scan', 'fixtures/react-app', '-o', scanOut])).exitCode).toBe(0);
    expect((await runUic(['name', scanOut, '-o', namedOut])).exitCode).toBe(0);

    const annotateResult = await runUic(['annotate', '--manifest', namedOut, '--dry-run']);
    expect(annotateResult.exitCode).toBe(0);
    expect(annotateResult.stdout).toContain('data-agent-id=');

    expect((await runUic(['diff', namedOut, namedOut])).exitCode).toBe(0);
    await fs.rm(tmp, { recursive: true, force: true });
  }, 60_000);

  it('scan -> name -> annotate -> diff pipeline (Vue)', async () => {
    const tmp = await tempDir();
    const scanOut = path.join(tmp, 'scan.json');
    const namedOut = path.join(tmp, 'named.json');

    expect((await runUic(['scan', 'fixtures/vue-app', '-o', scanOut])).exitCode).toBe(0);
    expect((await runUic(['name', scanOut, '-o', namedOut])).exitCode).toBe(0);

    const annotateResult = await runUic(['annotate', '--manifest', namedOut, '--dry-run']);
    expect(annotateResult.exitCode).toBe(0);

    expect((await runUic(['diff', namedOut, namedOut])).exitCode).toBe(0);
    await fs.rm(tmp, { recursive: true, force: true });
  }, 60_000);

  it('cross-framework: React and Vue produce same schema structure', async () => {
    const tmp = await tempDir();
    const reactOut = path.join(tmp, 'react.json');
    const vueOut = path.join(tmp, 'vue.json');

    await runUic(['scan', 'fixtures/react-app', '-o', reactOut]);
    await runUic(['scan', 'fixtures/vue-app', '-o', vueOut]);

    const react = JSON.parse(await fs.readFile(reactOut, 'utf-8')) as Record<string, unknown>;
    const vue = JSON.parse(await fs.readFile(vueOut, 'utf-8')) as Record<string, unknown>;

    expect(react['schemaVersion']).toBe(vue['schemaVersion']);

    const reactEls = react['elements'] as Array<Record<string, unknown>>;
    const vueEls = vue['elements'] as Array<Record<string, unknown>>;
    expect(reactEls.length).toBeGreaterThan(0);
    expect(vueEls.length).toBeGreaterThan(0);

    const reactKeys = Object.keys(reactEls[0]!).sort();
    const vueKeys = Object.keys(vueEls[0]!).sort();
    expect(reactKeys).toEqual(vueKeys);
    await fs.rm(tmp, { recursive: true, force: true });
  }, 60_000);
});
```

**Step 2: Run tests**

Run: `pnpm exec vitest run tests/e2e/pipeline.test.ts`
Expected: 3 tests PASS

**Step 3: Commit**

```bash
git add tests/e2e/pipeline.test.ts
git commit -m "test: add e2e full pipeline tests (React, Vue, cross-framework)"
```

---

### Task 8: E2E — Config & Error Tests (2 tests)

**Files:**
- Create: `tests/e2e/config.test.ts`

**Step 1: Write config/error e2e tests**

Two tests: invalid --framework warns gracefully, scan --help exits 0.

```typescript
import { describe, it, expect } from 'vitest';
import { runUic } from './helpers.js';

describe('uic config & error handling (e2e)', () => {
  it('scan with invalid --framework exits 1 with helpful error', async () => {
    const result = await runUic(['scan', 'fixtures/react-app', '--framework', 'nonexistent']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('No parser registered');
    expect(result.stderr).toContain('nonexistent');
  }, 10_000);

  it('scan --help exits 0 and prints usage', async () => {
    const result = await runUic(['scan', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('uic scan');
    expect(result.stderr).toContain('--framework');
    expect(result.stderr).toContain('--output');
  }, 10_000);
});
```

**Step 2: Run tests**

Run: `pnpm exec vitest run tests/e2e/config.test.ts`
Expected: 2 tests PASS

**Step 3: Commit**

```bash
git add tests/e2e/config.test.ts
git commit -m "test: add e2e config and error handling tests"
```

---

### Task 9: Run Full E2E Suite & Verify

**Step 1: Run all e2e tests together**

Run: `pnpm exec vitest run tests/e2e/`
Expected: 17 tests PASS

**Step 2: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 3: Commit any fixes**

```bash
git add -A tests/e2e/
git commit -m "test: fix e2e test adjustments after full suite run"
```

---

### Task 10: React Dashboard Fixture — Project Setup

**Files:**
- Create: `fixtures/react-dashboard/package.json`

**Step 1: Create package.json**

```json
{
  "name": "uic-fixture-react-dashboard",
  "private": true,
  "dependencies": {
    "react": "*",
    "react-dom": "*"
  }
}
```

**Step 2: Create directory structure**

```bash
mkdir -p fixtures/react-dashboard/src/components
mkdir -p fixtures/react-dashboard/app/dashboard/\[id\]/edit
```

**Step 3: Commit**

```bash
git add fixtures/react-dashboard/
git commit -m "fixture: scaffold react-dashboard project structure"
```

---

### Task 11: React Dashboard — Navigation & Layout (~8 elements)

**Files:**
- Create: `fixtures/react-dashboard/src/components/Sidebar.tsx`
- Create: `fixtures/react-dashboard/src/components/Breadcrumbs.tsx`

**Step 1: Write Sidebar** — nav with toggle button, 4 nav links.

**Step 2: Write Breadcrumbs** — dynamic breadcrumb links.

Target: ~8 interactive elements (1 toggle button + 4 nav links + breadcrumb links).

**Step 3: Commit**

```bash
git add fixtures/react-dashboard/src/components/
git commit -m "fixture: add react-dashboard Sidebar and Breadcrumbs (~8 elements)"
```

---

### Task 12: React Dashboard — Data Table (~10 elements)

**Files:**
- Create: `fixtures/react-dashboard/src/components/DataTable.tsx`

**Step 1: Write DataTable** — filter input, sort select, 3 sort header buttons, per-row edit/delete buttons (dynamic), pagination prev/next buttons, conditional delete confirmation modal with confirm/cancel buttons.

Target: ~10 interactive elements (filter input, sort select, 3 column headers, edit button, delete button, prev/next pagination, confirm/cancel modal buttons).

**Step 2: Commit**

```bash
git add fixtures/react-dashboard/src/components/DataTable.tsx
git commit -m "fixture: add react-dashboard DataTable (~10 elements)"
```

---

### Task 13: React Dashboard — Multi-Step Form (~10 elements)

**Files:**
- Create: `fixtures/react-dashboard/src/components/WizardForm.tsx`

**Step 1: Write WizardForm** — 3-step form wizard. Step 1: name input, email input, Next button. Step 2: role select, checkbox, Back/Next buttons. Step 3: Back button, Submit button. All steps are conditional.

Target: ~10 interactive elements across 3 conditional fieldsets.

**Step 2: Commit**

```bash
git add fixtures/react-dashboard/src/components/WizardForm.tsx
git commit -m "fixture: add react-dashboard WizardForm (~10 elements)"
```

---

### Task 14: React Dashboard — Role-Based UI & Dynamic Route (~12 elements)

**Files:**
- Create: `fixtures/react-dashboard/src/components/AdminPanel.tsx`
- Create: `fixtures/react-dashboard/app/dashboard/[id]/edit/page.tsx`

**Step 1: Write AdminPanel** — conditional admin section (export, reset cache, bulk actions with nested conditional), conditional moderator section (export report, moderation queue link), always-visible links.

**Step 2: Write dynamic route edit page** — form with title input, description textarea, save/cancel buttons.

Target: ~12 interactive elements with role-based conditional rendering and dynamic route.

**Step 3: Commit**

```bash
git add fixtures/react-dashboard/
git commit -m "fixture: add react-dashboard AdminPanel and dynamic edit page (~12 elements)"
```

---

### Task 15: Vue Storefront Fixture — Project Setup

**Files:**
- Create: `fixtures/vue-storefront/package.json`

**Step 1: Create package.json**

```json
{
  "name": "uic-fixture-vue-storefront",
  "private": true,
  "dependencies": {
    "vue": "*",
    "nuxt": "*"
  }
}
```

**Step 2: Create directory structure**

```bash
mkdir -p fixtures/vue-storefront/src/components
mkdir -p fixtures/vue-storefront/pages/products
```

**Step 3: Commit**

```bash
git add fixtures/vue-storefront/
git commit -m "fixture: scaffold vue-storefront project structure"
```

---

### Task 16: Vue Storefront — Product Listing & Filter (~12 elements)

**Files:**
- Create: `fixtures/vue-storefront/src/components/ProductCard.vue`
- Create: `fixtures/vue-storefront/src/components/FilterSidebar.vue`
- Create: `fixtures/vue-storefront/pages/products/index.vue`

**Step 1: Write ProductCard.vue** (`<script setup>`) — product link, add-to-cart button, conditional quick-buy button.

**Step 2: Write FilterSidebar.vue** (`<script setup>`) — checkbox filters in v-for, range input, sort select, apply/reset buttons.

**Step 3: Write products index page** — search input, view cart link.

Target: ~12 interactive elements.

**Step 4: Commit**

```bash
git add fixtures/vue-storefront/
git commit -m "fixture: add vue-storefront product listing and filter sidebar (~12 elements)"
```

---

### Task 17: Vue Storefront — Cart & Checkout (~15 elements)

**Files:**
- Create: `fixtures/vue-storefront/src/components/ShoppingCart.vue`
- Create: `fixtures/vue-storefront/src/components/CheckoutForm.vue`

**Step 1: Write ShoppingCart.vue** (Options API — intentional mix) — per-item quantity buttons (decrease/increase) in v-for, quantity input, remove button, clear cart button, checkout link.

**Step 2: Write CheckoutForm.vue** (`<script setup>`) — name, address, city inputs, country select, payment method select, terms checkbox, submit/cancel buttons.

Target: ~15 interactive elements with mixed Options API and script setup.

**Step 3: Commit**

```bash
git add fixtures/vue-storefront/src/components/
git commit -m "fixture: add vue-storefront ShoppingCart and CheckoutForm (~15 elements)"
```

---

### Task 18: Vue Storefront — Product Detail (~5 elements)

**Files:**
- Create: `fixtures/vue-storefront/pages/products/[slug].vue`

**Step 1: Write product detail page** — size select, add-to-cart button, conditional wishlist button (v-if), back link.

Target: ~5 interactive elements with Nuxt dynamic route.

**Step 2: Commit**

```bash
git add fixtures/vue-storefront/pages/
git commit -m "fixture: add vue-storefront product detail page (~5 elements)"
```

---

### Task 19: Verify New Fixtures Scan Successfully

**Step 1: Build and scan react-dashboard**

Run: `pnpm build && node packages/cli/dist/bin/uic.js scan fixtures/react-dashboard -o /tmp/react-dashboard-manifest.json --framework react 2>&1`
Expected: Exit 0, 30-50 elements

**Step 2: Scan vue-storefront**

Run: `node packages/cli/dist/bin/uic.js scan fixtures/vue-storefront -o /tmp/vue-storefront-manifest.json --framework vue 2>&1`
Expected: Exit 0, 25-40 elements

**Step 3: Name both and check for duplicate IDs**

Run: `node packages/cli/dist/bin/uic.js name /tmp/react-dashboard-manifest.json -o /tmp/rd-named.json && node -e "const m=require('/tmp/rd-named.json');const ids=m.elements.map(e=>e.agentId);const d=ids.filter((id,i)=>ids.indexOf(id)!==i);console.log('Dupes:',d.length)"`
Expected: `Dupes: 0`

**Step 4: Fix issues and commit**

```bash
git add -A fixtures/
git commit -m "fixture: verify react-dashboard and vue-storefront scan successfully"
```

---

### Task 20: OSS Validation Script

**Files:**
- Create: `scripts/validate-oss.sh`

**Step 1: Write the validation script**

Bash script that: accepts repo URL + framework args, shallow-clones the repo, runs `uic scan`, checks exit code, counts elements and warnings, runs `uic name`, checks for duplicate IDs, prints summary.

Uses `node` directly (not `exec` with interpolated strings) for JSON processing.

**Step 2: Make executable and commit**

```bash
chmod +x scripts/validate-oss.sh
git add scripts/validate-oss.sh
git commit -m "feat: add OSS validation script (scripts/validate-oss.sh)"
```

---

### Task 21: Final Verification & Cleanup

**Step 1: Run full test suite**

Run: `pnpm build && pnpm test`
Expected: All tests pass

**Step 2: Run linter and typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: Zero warnings, zero errors

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup after real-world testing implementation"
```

---

## Summary

| Task | What | Tests Added |
|------|------|-------------|
| 1 | E2E helpers module | — |
| 2 | Scan e2e tests | 3 |
| 3 | Name e2e tests | 2 |
| 4 | Annotate e2e tests | 2 |
| 5 | Query e2e tests | 3 |
| 6 | Diff e2e tests | 2 |
| 7 | Pipeline e2e tests | 3 |
| 8 | Config e2e tests | 2 |
| 9 | Full e2e verification | — |
| 10-14 | React dashboard fixture | — |
| 15-18 | Vue storefront fixture | — |
| 19 | Verify fixtures scan | — |
| 20 | OSS validation script | — |
| 21 | Final verification | — |

**Total new tests: ~17 e2e tests**
**Total new fixture elements: ~70-90 across two apps**
