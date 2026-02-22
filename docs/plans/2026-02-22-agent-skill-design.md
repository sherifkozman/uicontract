# UIC Agent Skill - Design Document

## Goal

Build a proper Claude Code skill that teaches agents how to use UIC manifests to target and interact with UI elements via any browser automation tool (agent-browser, Playwright MCP, Chrome MCP).

## Decision

**Approach B: SKILL.md + Progressive References**

Lean SKILL.md (~1500 words) with the core agent loop. Detailed content in `references/` loaded on demand. Follows the same pattern as `agent-browser` - quick start, core workflow, command reference, examples, deep-dive references.

**Target consumer:** Claude Code agents (not MCP server).

**Scope:** Browser tool bridge + workflow automation patterns.

---

## Architecture

### File Structure

```
packages/skill/
  SKILL.md                          # Core skill (~1500 words)
  references/
    browser-tool-bridge.md          # Selector patterns per browser tool
    workflow-patterns.md            # Multi-step automation recipes
    manifest-schema.md              # Full manifest.json schema reference
  package.json                      # Existing, unchanged
```

### What Gets Replaced

- `packages/skill/claude-code.md` → content absorbed into SKILL.md
- `packages/skill/universal.md` → content absorbed into SKILL.md + references

---

## SKILL.md Design

### Frontmatter

```yaml
---
name: uic
description: Use when automating browser interactions with a web app that has a manifest.json or data-agent-id attributes. Use when the agent needs to find, target, or interact with specific UI elements by name, label, or purpose.
---
```

### Body Structure (following agent-browser pattern)

**1. Quick start** (5 commands)

```bash
npx uicontract scan ./src -o manifest.json    # Discover all UI elements
npx uicontract find "login" --json            # Find elements by description
npx uicontract describe <agent-id> --json     # Full details of one element
npx uicontract list --type button --json      # List all buttons
npx uicontract diff old.json new.json --json  # Detect breaking changes
```

**2. Core workflow** (4 steps)

1. **Discover** - Check if project has `manifest.json`. If not, run `npx uicontract scan <dir> -o manifest.json && npx uicontract name manifest.json -o manifest.json`.
2. **Find** - Use `npx uicontract find "<description>" --json` to locate the element matching the user's intent. Returns agentId, type, label, route.
3. **Target** - Use whatever browser tool is available:
   - agent-browser: `agent-browser find testid "<agentId>" click`
   - CSS selector: `[data-agent-id="<agentId>"]`
   - Playwright MCP: configure `--test-id-attribute=data-agent-id`
4. **Verify** - Run `npx uicontract diff baseline.json current.json` to check for regressions.

**3. Command reference** - organized by category:

- **Discovery**: `scan`, `name`, `annotate`
- **Query**: `find` (fuzzy + exact), `describe`, `list` (with `--type`, `--route`, `--component`, `--routes`, `--components`)
- **Governance**: `diff` (with `--json`, `--allow-breaking`)

Each command with flags, examples, and expected output shape.

**4. Selector patterns**

| Pattern | Syntax | Example |
|---------|--------|---------|
| Exact | `[data-agent-id="id"]` | One specific element |
| Prefix | `[data-agent-id^="settings.billing."]` | All billing elements |
| Substring | `[data-agent-id*="billing"]` | Any element with "billing" |
| Suffix | `[data-agent-id$=".button"]` | All buttons |
| Presence | `[data-agent-id]` | Any annotated element |

**5. Integration example** (UIC + agent-browser)

```bash
# Step 1: Find the element
npx uicontract find "pause subscription" --json
# → [{"agentId": "settings.billing.pause-subscription.button", "type": "button", ...}]

# Step 2: Navigate to the page
agent-browser open http://localhost:3000/settings/billing

# Step 3: Interact using the agentId
agent-browser find testid "settings.billing.pause-subscription.button" click
```

**6. Key rules**

- Always use `--json` output for machine parsing
- Never hardcode selectors - always look up from manifest
- Check `conditional: true` elements may not be visible
- Check `dynamic: true` elements may have variable content
- Run `uicontract diff` before/after to verify no breaking changes

**7. References table**

| Reference | Description |
|-----------|-------------|
| `references/browser-tool-bridge.md` | Tool-specific targeting for agent-browser, Playwright MCP, Chrome MCP |
| `references/workflow-patterns.md` | Multi-step automation recipes: form fill, navigation test, regression check |
| `references/manifest-schema.md` | Full manifest.json structure and field semantics |

---

## Reference Files

### `references/browser-tool-bridge.md`

Tool-specific selector syntax and configuration:

| Tool | How to target | Configuration |
|------|--------------|---------------|
| agent-browser | `find testid "<agentId>" click` | None needed |
| Playwright MCP | Use refs from snapshot | `--test-id-attribute=data-agent-id` |
| Chrome MCP | `find` tool or `javascript_tool` | `document.querySelector('[data-agent-id="..."]')` |
| Cypress | `cy.get('[data-agent-id="..."]')` | None needed |
| Any CSS | `[data-agent-id="<agentId>"]` | Universal |

Includes: hierarchical selector patterns (prefix, substring, suffix), tips for conditional elements, handling dynamic content.

### `references/workflow-patterns.md`

Concrete multi-step automation recipes using UIC CLI + agent-browser:

1. **Form fill** - scan manifest → filter by route → iterate inputs → fill each → submit
2. **Navigation test** - list routes from manifest → navigate each → verify elements exist on page
3. **Regression check** - diff baseline vs current manifest → report breaking changes → fail CI if breaking
4. **Full annotation pipeline** - scan → name → annotate --write → re-scan → verify round-trip

Each recipe is a concrete bash sequence with expected outputs.

### `references/manifest-schema.md`

Full manifest.json structure with field-by-field documentation:

- `agentId` - stable hierarchical identifier, use as selector target
- `type` - element type (button, input, select, a, form, textarea)
- `label` - human-readable description of the element
- `route` - URL path where element appears (null if unknown)
- `handler` - event handler function name (useful for understanding what clicking does)
- `conditional` - if true, element may not be visible (behind auth, feature flag, etc.)
- `dynamic` - if true, element is rendered from dynamic data (list items, etc.)
- `filePath`, `line`, `column` - source location (for debugging)
- `componentName` - React/Vue component containing this element

---

## Testing

1. **Frontmatter validation** - verify SKILL.md has valid YAML frontmatter with required `name` and `description` fields
2. **Reference link verification** - all links in SKILL.md resolve to existing files
3. **Command accuracy** - every CLI command in examples runs successfully against `fixtures/react-dashboard`
4. **Integration test** - E2E test that runs the quick-start sequence (scan → find → describe → list → diff) and verifies outputs

---

## What This Does NOT Include

- **No MCP server** - agents use subprocess CLI, not MCP tools
- **No TypeScript SDK** - the skill is markdown instructions, not a JS library
- **No runtime dependency** - UIC is a dev-time tool; the skill teaches agents to use CLI output
- **No Stagehand/natural-language integration** - UIC provides deterministic selectors, which are more reliable than NL targeting
