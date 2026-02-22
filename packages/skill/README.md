# @uicontract/skill

Agent skill files for [UI Contracts](https://github.com/sherifkozman/uicontract).

Gives AI coding agents a structured way to discover, target, and interact with UI elements using stable `data-agent-id` selectors instead of fragile CSS classes or text matches.

---

## What's Included

| File | Purpose |
|------|---------|
| [`SKILL.md`](./SKILL.md) | Full skill definition - commands, patterns, rules |
| [`references/manifest-schema.md`](./references/manifest-schema.md) | `manifest.json` structure and field reference |
| [`references/browser-tool-bridge.md`](./references/browser-tool-bridge.md) | Targeting syntax for Playwright, Cypress, agent-browser, Chrome MCP |
| [`references/workflow-patterns.md`](./references/workflow-patterns.md) | Multi-step automation recipes |

---

## Installation by Agent Type

### Claude (claude.ai / Claude Code)

Add to your project's `CLAUDE.md` or global agent instructions:

```markdown
@uicontract/skill
```

Or copy `SKILL.md` into your project root and reference it:

```bash
npx --yes @uicontract/skill install
```

For Claude Code, add to `.claude/skills/`:

```bash
npm install -g @uicontract/skill
# Then in your project:
cp $(npm root -g)/@uicontract/skill/SKILL.md .claude/skills/uic.md
```

### Cursor

Add to `.cursor/rules/uic.mdc`:

```bash
npm install @uicontract/skill
cp node_modules/@uicontract/skill/SKILL.md .cursor/rules/uic.mdc
```

### GitHub Copilot / VS Code

Add to `.github/copilot-instructions.md`:

```bash
npm install @uicontract/skill
cat node_modules/@uicontract/skill/SKILL.md >> .github/copilot-instructions.md
```

### Any AI coding tool

The skill is plain Markdown. Copy `SKILL.md` wherever your tool reads agent instructions:

```bash
npm install @uicontract/skill
cat node_modules/@uicontract/skill/SKILL.md
```

---

## How It Works

Once loaded, the skill teaches the agent to:

1. **Check for an existing `manifest.json`** before scanning
2. **Use `npx uicontract find`** to locate elements by label or purpose
3. **Target elements by `data-agent-id`** instead of CSS selectors or text
4. **Run `npx uicontract diff`** to detect breaking UI changes

```bash
# Agent finds the element:
npx uicontract find "pause subscription" --json
# => { "agentId": "settings.billing.pause-subscription.button", ... }

# Agent targets it:
[data-agent-id="settings.billing.pause-subscription.button"]
```

See [`SKILL.md`](./SKILL.md) for the full command reference and workflow patterns.

---

## License

[MIT](../../LICENSE)
