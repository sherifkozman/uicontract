# UIC Agent Skill — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a proper Claude Code skill (`packages/skill/SKILL.md` + `references/`) that teaches agents the 4-step loop: Discover, Find, Target, Verify.

**Architecture:** Lean SKILL.md (~1500 words) with YAML frontmatter following the agent-browser pattern. Three reference files for progressive disclosure. Replaces existing `claude-code.md` and `universal.md`.

**Tech Stack:** Markdown, YAML frontmatter, Vitest (validation tests), UIC CLI (`npx uic`)

---

## Task 1: Create `references/` directory and `manifest-schema.md`

Start bottom-up — references first so SKILL.md can link to them.

**Files:**
- Create: `packages/skill/references/manifest-schema.md`

**Step 1: Create references directory**

```bash
mkdir -p packages/skill/references
```

**Step 2: Write `manifest-schema.md`**

Create `packages/skill/references/manifest-schema.md` with the following content.

The file should contain:
- Title: "Manifest Schema Reference"
- Intro: explain manifest is JSON produced by `npx uic scan` + `npx uic name`
- Top-Level Structure section with jsonc example showing schemaVersion, generatedAt, generator, metadata, elements
- Top-level fields table: schemaVersion ("1.0"), generatedAt (ISO 8601), generator (object), metadata (object), elements (array)
- Metadata section table: framework (string, "react"/"vue"), projectRoot (string), filesScanned (number), elementsDiscovered (number), warnings (number)
- Element Fields section with table of all fields:
  - agentId (string) — primary selector target, stable hierarchical ID
  - type (string) — button, input, select, a, form, textarea
  - label (string) — human-readable description
  - route (string|null) — URL path where element appears
  - handler (string|null) — event handler function name
  - conditional (boolean) — may not be visible
  - dynamic (boolean) — rendered from dynamic data
  - filePath (string) — source file path relative to project root
  - line (number) — line number, 1-indexed
  - column (number) — column number, 1-indexed
  - componentName (string) — React/Vue component
- Agent ID Format section: pattern `route.component.element-name.type` with 3 examples
- Note about hierarchical structure enabling prefix selectors

**Step 3: Verify the file was created**

Run: `ls -la packages/skill/references/manifest-schema.md`
Expected: file exists with non-zero size

**Step 4: Commit**

```bash
git add packages/skill/references/manifest-schema.md
git commit -m "feat(skill): add manifest-schema.md reference"
```

---

## Task 2: Create `references/browser-tool-bridge.md`

**Files:**
- Create: `packages/skill/references/browser-tool-bridge.md`

**Step 1: Write `browser-tool-bridge.md`**

Create `packages/skill/references/browser-tool-bridge.md` with the following content.

The file should contain:
- Title: "Browser Tool Bridge"
- Intro: how to target UIC-annotated elements with each browser automation tool

**Tool-Specific Targeting sections:**

1. **agent-browser** — no config needed, use `find testid` locator:
   - Click: `agent-browser find testid "<agentId>" click`
   - Fill: `agent-browser find testid "<agentId>" fill "<value>"`
   - Check visibility: `agent-browser find testid "<agentId>" visible`

2. **Playwright MCP** — configure at launch with `--test-id-attribute=data-agent-id`. After that, agent IDs appear in accessibility snapshots. Use refs from snapshot.

3. **Chrome MCP** — use `find` tool or `javascript_tool` with `document.querySelector('[data-agent-id="<agentId>"]')`

4. **Cypress** — `cy.get('[data-agent-id="<agentId>"]').click()`

5. **Any CSS-Based Tool** — universal selector: `[data-agent-id="<agentId>"]`

**Selector Patterns table:**

| Pattern | Syntax | Use Case |
|---------|--------|----------|
| Exact | `[data-agent-id="id"]` | Target one specific element |
| Prefix | `[data-agent-id^="settings.billing."]` | All elements in billing section |
| Substring | `[data-agent-id*="billing"]` | Any element mentioning "billing" |
| Suffix | `[data-agent-id$=".button"]` | All buttons |
| Presence | `[data-agent-id]` | Any UIC-annotated element |

**Additional sections:**
- Handling Conditional Elements — check route, navigate first, use wait/retry
- Handling Dynamic Elements — rendered from data, use prefix selectors to find all instances

**Step 2: Verify the file was created**

Run: `ls -la packages/skill/references/browser-tool-bridge.md`
Expected: file exists with non-zero size

**Step 3: Commit**

```bash
git add packages/skill/references/browser-tool-bridge.md
git commit -m "feat(skill): add browser-tool-bridge.md reference"
```

---

## Task 3: Create `references/workflow-patterns.md`

**Files:**
- Create: `packages/skill/references/workflow-patterns.md`

**Step 1: Write `workflow-patterns.md`**

Create `packages/skill/references/workflow-patterns.md` with the following content.

The file should contain:
- Title: "Workflow Patterns"
- Intro: multi-step automation recipes using UIC CLI + browser tools

**4 Recipes:**

1. **Recipe 1: Form Fill** — scan manifest, filter inputs by route, fill each field, submit
   - `npx uic list --route "/checkout" --type input --json`
   - `npx uic find "submit order" --json`
   - Navigate, fill each field with `agent-browser find testid`, submit

2. **Recipe 2: Navigation Test** — verify every route has expected elements
   - `npx uic list --routes --json` to get all routes
   - Navigate to each route, verify elements with `agent-browser find testid ... visible`

3. **Recipe 3: Regression Check (CI)** — diff baseline vs current
   - `npx uic scan ./src -o current.json && npx uic name current.json -o current.json`
   - `npx uic diff baseline.json current.json --json`
   - Exit code 1 if breaking changes

4. **Recipe 4: Full Annotation Pipeline** — scan, name, annotate, re-scan, verify round-trip
   - scan -> name -> annotate --dry-run -> annotate --write -> re-scan -> diff (should be zero changes)

Each recipe should be concrete bash sequences with expected outputs.

**Step 2: Verify the file was created**

Run: `ls -la packages/skill/references/workflow-patterns.md`
Expected: file exists with non-zero size

**Step 3: Commit**

```bash
git add packages/skill/references/workflow-patterns.md
git commit -m "feat(skill): add workflow-patterns.md reference"
```

---

## Task 4: Create `SKILL.md`

The core skill file. Follows the agent-browser pattern: YAML frontmatter, quick start, core workflow, command reference, selector patterns, integration example, key rules, references table.

**Files:**
- Create: `packages/skill/SKILL.md`

**Step 1: Write `SKILL.md`**

Create `packages/skill/SKILL.md` following this structure exactly:

**YAML Frontmatter:**
```yaml
---
name: uic
description: Use when automating browser interactions with a web app that has a manifest.json or data-agent-id attributes. Use when the agent needs to find, target, or interact with specific UI elements by name, label, or purpose.
---
```

**Body sections in order:**

1. **Title and intro** — "UIC -- UI Contracts for Agent Automation". One sentence: makes web app UIs machine-readable with stable hierarchical IDs.

2. **Quick Start** — 6 commands in a single bash block:
   - `npx uic scan ./src -o manifest.json`
   - `npx uic name manifest.json -o manifest.json`
   - `npx uic find "login" --json`
   - `npx uic describe <agent-id> --json`
   - `npx uic list --type button --json`
   - `npx uic diff old.json new.json --json`

3. **Core Workflow** — 4 numbered steps:
   - Discover: check for manifest.json, if missing run scan + name
   - Find: `npx uic find "<description>" --json`, show fuzzy matching example
   - Target: show agent-browser, CSS selector, Playwright MCP patterns. Link to `references/browser-tool-bridge.md`
   - Verify: `npx uic diff baseline.json current.json`

4. **Commands** — organized by category:
   - **Discovery**: scan (flags: --framework, --json, --verbose), name (flags: --ai, --ai-timeout), annotate (flags: --dry-run, --write, --backup-dir)
   - **Query**: find (flags: --manifest, --type, --exact, --json), describe (flags: --manifest, --json), list (flags: --manifest, --type, --route, --component, --routes, --components, --json)
   - **Governance**: diff (flags: --allow-breaking, --json). Note breaking vs informational change categories.

5. **Selector Patterns** — table with 5 patterns: exact, prefix, substring, suffix, presence

6. **Integration Example** — UIC + agent-browser 3-step sequence:
   - Step 1: `npx uic find "pause subscription" --json`
   - Step 2: `agent-browser open http://localhost:3000/settings/billing`
   - Step 3: `agent-browser find testid "settings.billing.pause-subscription.button" click`

7. **Key Rules** — bullet list:
   - Always use `--json` for machine parsing
   - Never hardcode selectors
   - Check `conditional: true` and `dynamic: true`
   - Run `npx uic diff` before/after
   - Run `npx uic scan` after UI changes
   - Commit baseline manifest to version control

8. **References** — table with 3 rows linking to reference files:
   - `references/browser-tool-bridge.md` — tool-specific targeting
   - `references/workflow-patterns.md` — multi-step automation recipes
   - `references/manifest-schema.md` — full manifest.json structure

**Step 2: Verify the file was created and check approximate word count**

Run: `wc -w packages/skill/SKILL.md`
Expected: approximately 800-1500 words total

**Step 3: Commit**

```bash
git add packages/skill/SKILL.md
git commit -m "feat(skill): add SKILL.md with core agent workflow"
```

---

## Task 5: Delete old skill files

**Files:**
- Delete: `packages/skill/claude-code.md`
- Delete: `packages/skill/universal.md`

**Step 1: Verify the old files still exist**

Run: `ls packages/skill/claude-code.md packages/skill/universal.md`
Expected: both files listed

**Step 2: Delete the old files**

```bash
git rm packages/skill/claude-code.md packages/skill/universal.md
```

**Step 3: Commit**

```bash
git commit -m "refactor(skill): remove old claude-code.md and universal.md

Content absorbed into SKILL.md and references/ directory.
Old files replaced by the proper Claude Code skill structure."
```

---

## Task 6: Write validation tests

Structural tests that verify the skill package is well-formed.

**Files:**
- Create: `packages/skill/tests/skill-validation.test.ts`
- Possibly create: `packages/skill/tsconfig.json` (if needed for test compilation)

**Step 1: Write the validation test file**

Create `packages/skill/tests/skill-validation.test.ts` with these test cases:

**Test suite: "skill package structure"**
- `SKILL.md exists` — fs.stat confirms file
- `SKILL.md has valid YAML frontmatter with required fields` — starts with `---`, has `name:` and `description:`, name is "uic"
- `SKILL.md body is under 2000 words` — strip frontmatter and code blocks, count words
- `references directory exists` — fs.stat confirms directory
- `all reference files linked in SKILL.md exist` — regex extract `references/<name>` patterns from SKILL.md, stat each
- `old skill files do not exist` — fs.stat rejects for claude-code.md and universal.md

**Test suite: "reference file content"**
- For each of browser-tool-bridge.md, workflow-patterns.md, manifest-schema.md:
  - `<name> is non-empty` — content length > 100 chars
- `browser-tool-bridge.md covers all target tools` — content contains: agent-browser, Playwright, Chrome MCP, Cypress, data-agent-id
- `workflow-patterns.md has at least 3 recipes` — count `## Recipe` headings >= 3
- `manifest-schema.md documents all element fields` — check content contains: agentId, type, label, route, handler, conditional, dynamic, filePath, line, column, componentName

Use these imports:
```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
```

Use `path.resolve(__dirname, '..')` for SKILL_DIR and build paths from there.

**Step 2: Add tsconfig if needed**

Check if `packages/skill/tsconfig.json` exists. If not, create a minimal one extending `../../tsconfig.base.json` with rootDir ".", outDir "dist", include `["tests/**/*.ts"]`.

**Step 3: Run the tests**

Run: `npx vitest run packages/skill/tests/`
Expected: all tests pass

**Step 4: Commit**

```bash
git add packages/skill/tests/skill-validation.test.ts
git add packages/skill/tsconfig.json  # if created
git commit -m "test(skill): add structural validation tests for skill package"
```

---

## Task 7: Verify CLI commands work with skill examples

Run the quick-start sequence from SKILL.md against a real fixture to confirm every example is accurate.

**Files:**
- No files modified

**Step 1: Build the project**

Run: `pnpm build`
Expected: clean build, no errors

**Step 2: Run the quick-start sequence**

```bash
npx uic scan fixtures/react-app -o /tmp/uic-skill-test.json
npx uic name /tmp/uic-skill-test.json -o /tmp/uic-skill-named.json
npx uic find "login" --manifest /tmp/uic-skill-named.json --json
npx uic list --manifest /tmp/uic-skill-named.json --type button --json
npx uic diff /tmp/uic-skill-named.json /tmp/uic-skill-named.json --json
```

Expected: all commands exit 0, JSON output is valid

**Step 3: Verify a describe command**

Pick an agentId from the find output and run:

```bash
npx uic describe <agent-id> --manifest /tmp/uic-skill-named.json --json
```

Expected: exits 0, returns full element details

**Step 4: Clean up**

```bash
rm -f /tmp/uic-skill-test.json /tmp/uic-skill-named.json
```

---

## Task 8: Run full test suite and final commit

**Files:**
- No files modified

**Step 1: Run lint**

Run: `pnpm lint`
Expected: zero errors, zero warnings

**Step 2: Run all tests**

Run: `pnpm test`
Expected: all tests pass (including new skill validation tests)

**Step 3: Run build**

Run: `pnpm build`
Expected: clean build

**Step 4: Verify final file structure**

Run: `ls -la packages/skill/`
Expected:
```
SKILL.md
package.json
references/
tests/
```

Run: `ls packages/skill/references/`
Expected:
```
browser-tool-bridge.md
manifest-schema.md
workflow-patterns.md
```

**Step 5: Verify old files are gone**

Run: `ls packages/skill/claude-code.md packages/skill/universal.md 2>&1`
Expected: "No such file or directory" for both

**Step 6: Final commit (if any remaining changes)**

If there are unstaged fixes from earlier steps:

```bash
git add -A packages/skill/
git commit -m "feat(skill): complete UIC agent skill package

- SKILL.md: core skill with 4-step agent loop (Discover, Find, Target, Verify)
- references/browser-tool-bridge.md: tool-specific targeting for 5 browser tools
- references/workflow-patterns.md: 4 multi-step automation recipes
- references/manifest-schema.md: full manifest.json field documentation
- Validation tests for skill structure and content
- Removed old claude-code.md and universal.md"
```
