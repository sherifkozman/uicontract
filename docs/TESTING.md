# UIC Testing Strategy

## Testing Pyramid

```
         /  E2E  \           -- 5-10 tests: full pipeline (scan -> name -> annotate -> diff)
        /----------\
       / Integration \       -- 20-30 tests: package combinations, fixture apps
      /----------------\
     /    Unit Tests     \   -- 100+ tests: every public function, every error path
    /----------------------\
```

## Unit Tests

### What Gets Unit Tested

Every public function in every package. Each test file mirrors the source file it tests.

### packages/core

| Test File | What It Tests |
|-----------|---------------|
| `schema.test.ts` | Manifest validation: valid manifest passes, missing fields fail, extra fields ignored, version mismatch detected |
| `errors.test.ts` | UicError construction, error codes, serialization to human-readable message |
| `logger.test.ts` | Log levels filter correctly, output goes to stderr, structured format |
| `parser-registry.test.ts` | Register parser, detect framework, fail on duplicate registration |

**Example test cases for `schema.test.ts`:**

```typescript
describe('manifest validation', () => {
  it('accepts a valid v1 manifest', () => {
    const manifest = createValidManifest();
    expect(validateManifest(manifest)).toEqual({ valid: true, errors: [] });
  });

  it('rejects manifest missing schemaVersion', () => {
    const manifest = createValidManifest();
    delete manifest.schemaVersion;
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors[0].path).toBe('schemaVersion');
  });

  it('rejects manifest with future major version', () => {
    const manifest = createValidManifest({ schemaVersion: '2.0' });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('UNSUPPORTED_SCHEMA_VERSION');
  });

  it('accepts manifest with unknown minor version (forward compatible)', () => {
    const manifest = createValidManifest({ schemaVersion: '1.5' });
    expect(validateManifest(manifest).valid).toBe(true);
  });

  it('rejects element with empty agentId', () => {
    const manifest = createValidManifest({
      elements: [{ ...validElement, agentId: '' }],
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
  });

  it('rejects duplicate agentIds', () => {
    const manifest = createValidManifest({
      elements: [validElement, { ...validElement }], // same agentId
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('DUPLICATE_AGENT_ID');
  });
});
```

### packages/parser-react

| Test File | What It Tests |
|-----------|---------------|
| `element-discovery.test.ts` | Finds buttons, inputs, links, selects, textareas, forms, onClick elements |
| `context-extraction.test.ts` | Extracts component name, file path, line number from AST node |
| `route-inference.test.ts` | Next.js app/ routing, pages/ routing, React Router (from imports) |
| `label-extraction.test.ts` | aria-label, text children, htmlFor, placeholder, title attribute |

**Example test cases for `element-discovery.test.ts`:**

```typescript
describe('element discovery', () => {
  it('discovers a <button> element', () => {
    const source = `
      function App() {
        return <button onClick={handleClick}>Save</button>;
      }
    `;
    const elements = discoverElements(source, 'App.tsx');
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe('button');
    expect(elements[0].line).toBe(3);
  });

  it('discovers an <input> element', () => {
    const source = `
      function Form() {
        return <input type="email" onChange={setEmail} />;
      }
    `;
    const elements = discoverElements(source, 'Form.tsx');
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe('input');
  });

  it('discovers elements with onClick on non-interactive tags', () => {
    const source = `
      function Card() {
        return <div onClick={handleExpand} role="button">Expand</div>;
      }
    `;
    const elements = discoverElements(source, 'Card.tsx');
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe('div'); // preserves actual tag
  });

  it('skips elements inside type-only contexts', () => {
    const source = `
      type Props = { renderButton: () => JSX.Element };
    `;
    const elements = discoverElements(source, 'Types.tsx');
    expect(elements).toHaveLength(0);
  });

  it('handles arrow function components', () => {
    const source = `
      const App = () => <button>Click</button>;
    `;
    const elements = discoverElements(source, 'App.tsx');
    expect(elements).toHaveLength(1);
    expect(elements[0].componentName).toBe('App');
  });

  it('handles forwardRef components', () => {
    const source = `
      const Input = forwardRef<HTMLInputElement, Props>((props, ref) => {
        return <input ref={ref} {...props} />;
      });
    `;
    const elements = discoverElements(source, 'Input.tsx');
    expect(elements).toHaveLength(1);
    expect(elements[0].componentName).toBe('Input');
  });

  it('handles React.memo components', () => {
    const source = `
      const Button = React.memo(function Button({ label }) {
        return <button>{label}</button>;
      });
    `;
    const elements = discoverElements(source, 'Button.tsx');
    expect(elements).toHaveLength(1);
    expect(elements[0].componentName).toBe('Button');
  });

  it('warns on JSX spread props with potential onClick', () => {
    const source = `
      function App({ ...props }) {
        return <div {...props}>Content</div>;
      }
    `;
    const result = discoverElementsWithWarnings(source, 'App.tsx');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe('SPREAD_PROPS_MAY_CONTAIN_HANDLERS');
  });
});
```

**Example test cases for `label-extraction.test.ts`:**

```typescript
describe('label extraction', () => {
  it('extracts aria-label', () => {
    const source = `<button aria-label="Close dialog">X</button>`;
    expect(extractLabel(parse(source))).toBe('Close dialog');
  });

  it('extracts text children', () => {
    const source = `<button>Save changes</button>`;
    expect(extractLabel(parse(source))).toBe('Save changes');
  });

  it('extracts htmlFor-associated label', () => {
    const source = `
      <>
        <label htmlFor="email">Email address</label>
        <input id="email" />
      </>
    `;
    expect(extractLabel(parse(source), 'email')).toBe('Email address');
  });

  it('falls back to placeholder', () => {
    const source = `<input placeholder="Enter email" />`;
    expect(extractLabel(parse(source))).toBe('Enter email');
  });

  it('returns null when no label found', () => {
    const source = `<button>{icon}</button>`;
    expect(extractLabel(parse(source))).toBeNull();
  });

  it('ignores dynamic text children', () => {
    const source = `<button>{dynamicLabel}</button>`;
    // Dynamic labels are not extracted (we can't resolve them statically)
    expect(extractLabel(parse(source))).toBeNull();
  });

  it('concatenates multiple text children', () => {
    const source = `<button>Save {'&'} continue</button>`;
    expect(extractLabel(parse(source))).toBe('Save & continue');
  });
});
```

**Example test cases for `route-inference.test.ts`:**

```typescript
describe('route inference', () => {
  it('infers route from Next.js app/ directory', () => {
    expect(inferRoute('src/app/settings/billing/page.tsx')).toBe('/settings/billing');
  });

  it('infers root route from app/page.tsx', () => {
    expect(inferRoute('src/app/page.tsx')).toBe('/');
  });

  it('handles Next.js dynamic segments', () => {
    expect(inferRoute('src/app/users/[id]/page.tsx')).toBe('/users/[id]');
  });

  it('handles Next.js catch-all segments', () => {
    expect(inferRoute('src/app/docs/[...slug]/page.tsx')).toBe('/docs/[...slug]');
  });

  it('infers route from pages/ directory', () => {
    expect(inferRoute('pages/about.tsx')).toBe('/about');
  });

  it('returns null for non-route files', () => {
    expect(inferRoute('src/components/Button.tsx')).toBeNull();
  });

  it('handles route groups (parentheses)', () => {
    expect(inferRoute('src/app/(marketing)/about/page.tsx')).toBe('/about');
  });
});
```

### packages/namer

| Test File | What It Tests |
|-----------|---------------|
| `deterministic-namer.test.ts` | Naming from route + component + label + type; stability (same input -> same output) |
| `deduplicator.test.ts` | Collision detection, suffix generation, stable dedup ordering |
| `naming-rules.test.ts` | Abbreviation rules, reserved word handling, character sanitization |

**Example test cases for `deterministic-namer.test.ts`:**

```typescript
describe('deterministic namer', () => {
  it('produces name from route + label + type', () => {
    const element: RawElement = {
      type: 'button',
      filePath: 'src/app/settings/billing/page.tsx',
      componentName: 'BillingSettings',
      route: '/settings/billing',
      label: 'Pause subscription',
      handler: 'handlePauseSubscription',
    };
    expect(nameElement(element)).toBe('settings.billing.pause-subscription.button');
  });

  it('uses component name when no route', () => {
    const element: RawElement = {
      type: 'input',
      filePath: 'src/components/SearchBar.tsx',
      componentName: 'SearchBar',
      route: null,
      label: 'Search',
      handler: 'handleSearch',
    };
    expect(nameElement(element)).toBe('search-bar.search.input');
  });

  it('uses handler name when no label', () => {
    const element: RawElement = {
      type: 'button',
      filePath: 'src/app/page.tsx',
      componentName: 'Home',
      route: '/',
      label: null,
      handler: 'handleDismissBanner',
    };
    expect(nameElement(element)).toBe('home.dismiss-banner.button');
  });

  it('is stable across repeated calls', () => {
    const element = createTestElement();
    const name1 = nameElement(element);
    const name2 = nameElement(element);
    expect(name1).toBe(name2);
  });

  it('sanitizes special characters', () => {
    const element = createTestElement({ label: "What's new?" });
    const name = nameElement(element);
    expect(name).not.toContain("'");
    expect(name).not.toContain('?');
  });
});
```

### packages/annotator

| Test File | What It Tests |
|-----------|---------------|
| `jsx-annotator.test.ts` | Attribute insertion on open/self-closing tags, formatting preservation |
| `patch-generator.test.ts` | Unified diff generation, multi-file patches |
| `backup.test.ts` | Backup directory creation, restore on failure |

**Example test cases for `jsx-annotator.test.ts`:**

```typescript
describe('JSX annotator', () => {
  it('inserts data-agent-id on a button', () => {
    const source = `<button onClick={handleClick}>Save</button>`;
    const annotated = annotateElement(source, {
      line: 1,
      column: 1,
      agentId: 'form.save.button',
    });
    expect(annotated).toBe(
      `<button data-agent-id="form.save.button" onClick={handleClick}>Save</button>`
    );
  });

  it('inserts data-agent-id on a self-closing tag', () => {
    const source = `<input type="email" />`;
    const annotated = annotateElement(source, {
      line: 1,
      column: 1,
      agentId: 'form.email.input',
    });
    expect(annotated).toBe(`<input data-agent-id="form.email.input" type="email" />`);
  });

  it('preserves existing indentation', () => {
    const source = `    <button onClick={save}>Save</button>`;
    const annotated = annotateElement(source, {
      line: 1,
      column: 5,
      agentId: 'form.save.button',
    });
    expect(annotated).toMatch(/^    <button data-agent-id=/);
  });

  it('does not modify if data-agent-id already matches', () => {
    const source = `<button data-agent-id="form.save.button" onClick={save}>Save</button>`;
    const annotated = annotateElement(source, {
      line: 1,
      column: 1,
      agentId: 'form.save.button',
    });
    expect(annotated).toBe(source); // unchanged
  });

  it('updates data-agent-id if it exists but differs', () => {
    const source = `<button data-agent-id="old.id" onClick={save}>Save</button>`;
    const annotated = annotateElement(source, {
      line: 1,
      column: 1,
      agentId: 'form.save.button',
    });
    expect(annotated).toContain('data-agent-id="form.save.button"');
    expect(annotated).not.toContain('old.id');
  });

  it('handles multiline JSX elements', () => {
    const source = [
      '<button',
      '  className="btn-primary"',
      '  onClick={handleSave}',
      '>',
      '  Save',
      '</button>',
    ].join('\n');
    const annotated = annotateElement(source, {
      line: 1,
      column: 1,
      agentId: 'form.save.button',
    });
    expect(annotated).toContain('data-agent-id="form.save.button"');
    // Verify other attributes are preserved
    expect(annotated).toContain('className="btn-primary"');
    expect(annotated).toContain('onClick={handleSave}');
  });
});
```

### packages/cli

| Test File | What It Tests |
|-----------|---------------|
| `commands/scan.test.ts` | Argument parsing, output format, error on missing dir |
| `commands/find.test.ts` | Fuzzy matching, --json flag, --type filter |
| `commands/diff.test.ts` | Breaking change detection, exit codes, --allow-breaking |
| `commands/list.test.ts` | Filtering by route/component/type |
| `commands/describe.test.ts` | Full element details output |

**Example test cases for `commands/diff.test.ts`:**

```typescript
describe('uicontract diff', () => {
  it('exits 0 when no breaking changes', () => {
    const oldManifest = createManifest([
      { agentId: 'home.login.button', type: 'button' },
    ]);
    const newManifest = createManifest([
      { agentId: 'home.login.button', type: 'button' },
      { agentId: 'home.signup.button', type: 'button' }, // addition
    ]);
    const result = diff(oldManifest, newManifest);
    expect(result.exitCode).toBe(0);
    expect(result.added).toHaveLength(1);
    expect(result.removed).toHaveLength(0);
  });

  it('exits 1 when element removed', () => {
    const oldManifest = createManifest([
      { agentId: 'home.login.button', type: 'button' },
      { agentId: 'home.signup.button', type: 'button' },
    ]);
    const newManifest = createManifest([
      { agentId: 'home.login.button', type: 'button' },
    ]);
    const result = diff(oldManifest, newManifest);
    expect(result.exitCode).toBe(1);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].agentId).toBe('home.signup.button');
  });

  it('exits 1 when element type changed', () => {
    const oldManifest = createManifest([
      { agentId: 'nav.home.link', type: 'a' },
    ]);
    const newManifest = createManifest([
      { agentId: 'nav.home.link', type: 'button' },
    ]);
    const result = diff(oldManifest, newManifest);
    expect(result.exitCode).toBe(1);
    expect(result.typeChanged).toHaveLength(1);
  });

  it('reports label change as informational (not breaking)', () => {
    const oldManifest = createManifest([
      { agentId: 'nav.home.link', type: 'a', label: 'Home' },
    ]);
    const newManifest = createManifest([
      { agentId: 'nav.home.link', type: 'a', label: 'Homepage' },
    ]);
    const result = diff(oldManifest, newManifest);
    expect(result.exitCode).toBe(0); // not breaking
    expect(result.labelChanged).toHaveLength(1);
  });

  it('enforces protected scopes', () => {
    const config = { protectedScopes: ['checkout'] };
    const oldManifest = createManifest([
      { agentId: 'checkout.submit.button', type: 'button' },
    ]);
    const newManifest = createManifest([]); // removed
    const result = diff(oldManifest, newManifest, { config });
    expect(result.exitCode).toBe(1);
    expect(result.protectedScopeViolations).toHaveLength(1);
  });

  it('--allow-breaking does not override protected scope violations', () => {
    const config = { protectedScopes: ['checkout'] };
    const oldManifest = createManifest([
      { agentId: 'checkout.submit.button', type: 'button' },
    ]);
    const newManifest = createManifest([]);
    const result = diff(oldManifest, newManifest, {
      config,
      allowBreaking: true,
      reason: 'redesign',
    });
    expect(result.exitCode).toBe(1); // still fails
  });
});
```

---

## Integration Tests

### What Gets Integration Tested

Tests that exercise two or more packages together, using real fixture apps.

| Test | Packages Involved | What It Verifies |
|------|------------------|------------------|
| `fixture-scan.test.ts` | parser-react + core | Scans `fixtures/react-app`, validates manifest against schema |
| `naming-pipeline.test.ts` | parser-react + namer | Scans fixture, names all elements, verifies no duplicates |
| `annotate-fixture.test.ts` | parser-react + namer + annotator | Annotates fixture, verifies data-agent-id in output |
| `scan.integration.test.ts` | cli + parser-react + core | Runs `uicontract scan` as subprocess, verifies stdout JSON |
| `find.integration.test.ts` | cli + core | Runs `uicontract find` against committed manifest, verifies results |
| `full-pipeline.integration.test.ts` | all | scan -> name -> annotate -> re-scan -> diff against original |

**Example: `fixture-scan.test.ts`:**

```typescript
describe('fixture scan integration', () => {
  it('scans react-app fixture and produces valid manifest', async () => {
    const parser = new ReactParser();
    const result = await parser.discover('fixtures/react-app');

    // Structure checks
    expect(result.elements.length).toBeGreaterThanOrEqual(15);
    expect(result.warnings).toBeDefined();
    expect(result.metadata.filesScanned).toBeGreaterThan(0);

    // Every element has required fields
    for (const el of result.elements) {
      expect(el.type).toBeTruthy();
      expect(el.filePath).toBeTruthy();
      expect(el.line).toBeGreaterThan(0);
      expect(el.componentName).toBeTruthy();
    }

    // Validate as manifest
    const manifest = buildManifest(result);
    expect(validateManifest(manifest).valid).toBe(true);
  });

  it('discovers expected elements in BillingSettings', async () => {
    const parser = new ReactParser();
    const result = await parser.discover('fixtures/react-app');

    const billingElements = result.elements.filter(
      (el) => el.componentName === 'BillingSettings'
    );
    expect(billingElements.length).toBeGreaterThanOrEqual(3);

    const pauseButton = billingElements.find(
      (el) => el.handler === 'handlePauseSubscription'
    );
    expect(pauseButton).toBeDefined();
    expect(pauseButton!.type).toBe('button');
    expect(pauseButton!.route).toBe('/settings/billing');
  });
});
```

---

## Golden File / Snapshot Tests

### Purpose

Catch unintentional changes to parser output. If the parser changes how it discovers or describes elements, the snapshot fails and the change must be reviewed.

### What Gets Snapshotted

| Snapshot | Input | What It Captures |
|----------|-------|------------------|
| `react-app.manifest.snap` | `fixtures/react-app` | Full manifest output (element count, all agentIds, all types) |
| `react-minimal.manifest.snap` | `fixtures/react-minimal` | Minimal manifest (smoke test for basic elements) |
| `react-edge-cases.manifest.snap` | `fixtures/react-edge-cases` | Edge case handling (forwardRef, memo, HOCs) |
| `annotated-app.source.snap` | `fixtures/annotated-app` | Source code after annotation (verify attribute placement) |

### How Snapshots Are Updated

```bash
# Run snapshot tests
pnpm test -- --update-snapshot  # ONLY when the change is intentional

# Review what changed
git diff packages/*/tests/__snapshots__/
```

**Rule**: Every snapshot update must be in its own commit with a message explaining why the output changed. Snapshots never change as a side effect of an unrelated PR.

---

## End-to-End Tests

### Location: `tests/e2e/`

These tests run the CLI as a subprocess, simulating real user workflows.

**`scan-to-query.test.ts`:**

```typescript
describe('E2E: scan to query', () => {
  let manifestPath: string;

  beforeAll(async () => {
    // Scan fixture app
    const scanResult = await execCli(['scan', 'fixtures/react-app', '-o', tmpManifest]);
    expect(scanResult.exitCode).toBe(0);
    manifestPath = tmpManifest;
  });

  it('finds element by label text', async () => {
    const result = await execCli(['find', 'pause subscription', '-m', manifestPath, '--json']);
    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.results.length).toBeGreaterThan(0);
    expect(output.results[0].agentId).toContain('pause');
  });

  it('describes element by agent-id', async () => {
    const result = await execCli(['find', 'pause', '-m', manifestPath, '--json']);
    const agentId = JSON.parse(result.stdout).results[0].agentId;

    const descResult = await execCli(['describe', agentId, '-m', manifestPath, '--json']);
    expect(descResult.exitCode).toBe(0);
    const detail = JSON.parse(descResult.stdout);
    expect(detail.filePath).toBeTruthy();
    expect(detail.line).toBeGreaterThan(0);
  });

  it('lists all elements', async () => {
    const result = await execCli(['list', '-m', manifestPath, '--json']);
    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.elements.length).toBeGreaterThanOrEqual(15);
  });
});
```

**`scan-to-annotate.test.ts`:**

```typescript
describe('E2E: scan to annotate', () => {
  it('annotate -> re-scan produces consistent manifest', async () => {
    const workDir = await copyFixture('react-app');

    // Scan before annotation
    await execCli(['scan', workDir, '-o', path.join(workDir, 'before.json')]);

    // Annotate (with auto-naming)
    const annotateResult = await execCli(['annotate', workDir, '--write']);
    expect(annotateResult.exitCode).toBe(0);

    // Re-scan after annotation
    await execCli(['scan', workDir, '-o', path.join(workDir, 'after.json')]);

    // The re-scanned manifest should have data-agent-id populated
    const after = readManifest(path.join(workDir, 'after.json'));
    for (const el of after.elements) {
      expect(el.attributes?.['data-agent-id']).toBeTruthy();
    }
  });
});
```

**`diff-pipeline.test.ts`:**

```typescript
describe('E2E: diff pipeline', () => {
  it('detects removal as breaking change', async () => {
    const workDir = await copyFixture('react-app');

    // Generate baseline manifest
    await execCli(['scan', workDir, '-o', path.join(workDir, 'baseline.json')]);

    // Remove a component
    await fs.unlink(path.join(workDir, 'src/components/SearchBar.tsx'));

    // Generate new manifest
    await execCli(['scan', workDir, '-o', path.join(workDir, 'current.json')]);

    // Diff
    const diffResult = await execCli([
      'diff',
      path.join(workDir, 'baseline.json'),
      path.join(workDir, 'current.json'),
    ]);
    expect(diffResult.exitCode).toBe(1);
    expect(diffResult.stderr).toContain('BREAKING');
    expect(diffResult.stderr).toContain('removed');
  });
});
```

---

## Testing AI Naming

AI naming is non-deterministic. Testing strategy:

### What We CAN Test (Deterministic)

1. **Structure**: AI namer returns a string matching the naming pattern (`[a-z][a-z0-9.-]*`).
2. **No duplicates**: Given a list of elements, AI namer produces unique IDs.
3. **Fallback**: When AI is unavailable (timeout, error), deterministic namer is used.
4. **Stability contract**: AI namer is called with the correct context (element properties).

### What We CANNOT Test Deterministically

1. The specific name chosen by the AI.
2. Whether the name is "good" or "meaningful."

### Test Approach

```typescript
describe('AI namer', () => {
  it('returns a valid agent ID format', async () => {
    const element = createTestElement({ label: 'Pause subscription' });
    const name = await aiNamer.name(element);
    expect(name).toMatch(/^[a-z][a-z0-9.-]*$/);
  });

  it('returns no duplicates for distinct elements', async () => {
    const elements = [
      createTestElement({ label: 'Login', handler: 'handleLogin' }),
      createTestElement({ label: 'Signup', handler: 'handleSignup' }),
      createTestElement({ label: 'Logout', handler: 'handleLogout' }),
    ];
    const names = await Promise.all(elements.map((el) => aiNamer.name(el)));
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('falls back to deterministic namer on AI failure', async () => {
    // Mock AI to fail
    mockAiProvider.mockRejectedValue(new Error('timeout'));

    const element = createTestElement({ label: 'Save' });
    const name = await aiNamer.name(element);

    // Should still return a valid name (from deterministic fallback)
    expect(name).toMatch(/^[a-z][a-z0-9.-]*$/);
    expect(name).toContain('save');
  });

  // This test is skipped in CI -- run manually to verify AI integration
  it.skip('produces a contextually meaningful name', async () => {
    const element = createTestElement({
      route: '/settings/billing',
      componentName: 'BillingSettings',
      label: 'Pause subscription',
      type: 'button',
    });
    const name = await aiNamer.name(element);
    // Human review: is this name reasonable?
    console.log(`AI named element: ${name}`);
    expect(name).toBeTruthy();
  });
});
```

### Manual AI Testing Protocol

When changing the AI naming prompt or context:
1. Run `pnpm test:ai` (runs skipped AI tests with real AI backend).
2. Review output names manually.
3. If names are consistently poor, update the prompt and re-test.
4. Document the prompt change and sample output in the PR.

---

## Fixture App Requirements

### `fixtures/react-app/` (Primary Fixture)

Must contain:
- At least 5 components across different routes
- At least 15 interactive elements total
- Next.js file-based routing (`app/` directory)
- At least one `<form>` with multiple inputs
- At least one navigation component with links
- At least one modal/dialog with buttons
- At least one element with `aria-label` (no visible text)
- At least one element with `data-testid` (pre-existing)
- At least one conditional render (`{showX && <button>...`)
- At least one list render (`.map(item => <button>...`)

Components:
| Component | Route | Elements |
|-----------|-------|----------|
| `LoginForm` | `/` | email input, password input, submit button, forgot password link |
| `SearchBar` | (shared) | search input, search button, clear button |
| `BillingSettings` | `/settings/billing` | plan select, pause button, cancel link, update payment button |
| `UserProfile` | `/settings/profile` | name input, email input, save button, avatar upload |
| `NavigationMenu` | (layout) | home link, settings link, logout button |

### `fixtures/react-minimal/` (Smoke Test)

```tsx
// src/App.tsx
export default function App() {
  return (
    <div>
      <button onClick={() => alert('clicked')}>Click me</button>
      <input type="text" placeholder="Type here" onChange={() => {}} />
      <a href="/about">About</a>
    </div>
  );
}
```

3 elements. Used to verify the parser works at all.

### `fixtures/react-edge-cases/` (Edge Cases)

One file per edge case:
- `WithAuth.tsx`: HOC wrapping a component with a button
- `ForwardedInput.tsx`: `forwardRef` input component
- `MemoizedButton.tsx`: `React.memo` button
- `RenderPropList.tsx`: render prop pattern with interactive children
- `PortalModal.tsx`: `createPortal` with buttons inside portal
- `ConditionalActions.tsx`: ternary and `&&` conditional buttons
- `DynamicList.tsx`: `.map()` generating buttons from data
- `SpreadComponent.tsx`: `<Component {...props} />` with potential handlers

---

## CI Test Configuration

```yaml
# .github/workflows/ci.yml (relevant test sections)
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test -- --coverage
      - run: pnpm test:e2e
      # Dogfooding: scan our own fixtures and diff against baseline
      - run: npx uicontract scan fixtures/react-app -o /tmp/current-manifest.json
      - run: npx uicontract diff fixtures/react-app/baseline-manifest.json /tmp/current-manifest.json
```

## Coverage Reporting

- Vitest with `@vitest/coverage-v8`
- Coverage thresholds enforced in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      exclude: [
        'fixtures/**',
        'tests/e2e/**',
        '**/*.test.ts',
      ],
    },
  },
});
```

Per-package thresholds override global:
- `packages/core`: 90% lines
- `packages/parser-react`: 85% lines
- `packages/namer`: 85% lines
- `packages/annotator`: 85% lines
- `packages/cli`: 80% lines
