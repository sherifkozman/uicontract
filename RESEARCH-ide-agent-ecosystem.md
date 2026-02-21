# IDE & Agent Ecosystem Compatibility Research for UIC CLI Tool

**Date**: 2026-02-21
**Researcher**: Claude Opus 4.6
**Knowledge Cutoff**: May 2025 (items beyond this marked [VERIFY])
**Methodology**: Primary knowledge base research. Web verification tools were unavailable during this session. All [VERIFY] items should be independently confirmed.

---

## Executive Summary

UIC's architecture -- a CLI tool callable via `npx uic find "..."` plus a markdown instructions file -- aligns remarkably well with the emerging universal integration pattern across AI coding agents. Every major IDE/agent environment supports (a) executing shell commands and (b) reading project-level instruction files. The CLI-plus-instructions approach is the lowest common denominator that works everywhere without requiring MCP servers, custom plugins, or IDE-specific integrations.

**Key finding**: Your hypothesis is correct. A CLI tool + a markdown instructions file in the repo is the universal minimum integration surface. No IDE requires more than this. Several IDEs offer deeper integration (MCP, custom tool schemas) that UIC could optionally support for enhanced experiences.

---

## 1. Claude Code Agent Skills

### Integration Feasibility: **HIGH**

### Current Skill Format (as of late 2025)

Claude Code skills live in the `.claude/skills/` directory at either the project or user level:

```
.claude/
  skills/
    skill-name/
      SKILL.md          # The skill instructions (required)
      # Additional files referenced by SKILL.md
```

**Discovery mechanism**: Claude Code discovers skills in two ways:
1. **Project-level**: `.claude/skills/` in the project root -- available to anyone who clones the repo
2. **User-level**: `~/.claude/skills/` -- personal skills available across all projects
3. **Invocation**: Skills are invoked via slash commands (`/skill-name`) or the `Skill` tool in the Claude Code SDK. [VERIFY: exact discovery may have evolved]

**Skill file format**: `SKILL.md` is a markdown file containing:
- Instructions for the agent (natural language)
- Tool usage patterns and commands
- Context about when and how to use the skill
- The skill inherits whatever model the IDE session is using

**Key capabilities**:
- Skills CAN call CLI commands -- they instruct the agent to use the Bash tool
- Skills CAN define workflows with multiple steps
- Skills CANNOT define new structured tools (they work through instructions, not tool schemas)
- Skills CAN reference other files in the skill directory
- Skills CAN be invoked by name from other skills or from CLAUDE.md

**CLAUDE.md**: The project-level `CLAUDE.md` (in repo root or `.claude/` directory) serves as persistent instructions loaded into every conversation. This is the primary mechanism for project-level agent configuration.

### How UIC Would Integrate

**Option A: Skill file (recommended)**
```
project-root/
  .claude/
    skills/
      uic/
        SKILL.md    # UIC agent skill instructions
```

**Option B: CLAUDE.md section**
Append UIC instructions directly to the project's CLAUDE.md. Simpler but less modular.

**Example SKILL.md for UIC**:
```markdown
# UIC - UI Contract Skill

## When to Use
Use this skill when working with UI tests, selectors, or interactive elements.
Use it when you need to find a UI element's selector, understand the UI surface,
or write/fix tests involving user interactions.

## Available Commands

### Find an element
\`\`\`bash
npx uic find "description of UI element"
\`\`\`
Returns the selector(s) matching the description from the UI manifest.

### List all interactive elements
\`\`\`bash
npx uic list
\`\`\`

### Show manifest for a page/route
\`\`\`bash
npx uic show --route "/settings"
\`\`\`

## How to Use Results
- The `find` command returns a JSON object with `selector`, `role`, `name`, and `context`
- Use the `selector` value directly in test code (Playwright, Cypress, etc.)
- Prefer `data-testid` selectors when available
- The manifest is the source of truth for UI element identification

## When NOT to Use
- Don't guess selectors -- always use `npx uic find` first
- Don't hardcode selectors that aren't in the manifest
```

### Known Limitations
- No hot-reload of skills mid-conversation
- Skill discovery requires the `.claude/` directory to exist
- No structured tool definition (all guidance is via natural language instructions)
- [VERIFY] Whether skills can declare dependencies or required CLI tools

---

## 2. OpenAI Codex CLI

### Integration Feasibility: **HIGH**

### Current Integration Model

OpenAI Codex (the CLI agent, released ~April 2025) operates as a terminal-based coding agent similar to Claude Code.

**Tool execution**: Codex has full shell access and can execute any CLI command the user has available. There is no special registration needed -- if `npx uic find` works in the user's terminal, Codex can call it.

**Instruction files**: Codex reads project-level instruction files:
- `AGENTS.md` in project root [VERIFY: may have been renamed or additional formats added]
- `codex.md` or `CODEX.md` [VERIFY: exact naming conventions]
- Codex also reads `README.md` and other documentation files for context

**Custom tools**: As of mid-2025, Codex does not have a formal "tool registration" system like MCP. It discovers capabilities through:
1. Instructions in project files
2. `package.json` scripts
3. Explicit user prompts
4. README documentation

**Key characteristics**:
- Sandboxed execution environment (network-restricted by default)
- Can execute arbitrary CLI commands
- Reads markdown instruction files for project context
- No MCP support [VERIFY: may have been added post-May 2025]

### How UIC Would Integrate

```
project-root/
  AGENTS.md           # or codex-compatible instruction file
  # Contains section on UIC usage, same as skill content
```

The instructions would be essentially identical to the Claude Code skill but placed in the Codex-expected location. Since Codex can run shell commands, `npx uic find "..."` works directly.

**Example AGENTS.md section**:
```markdown
## UI Element Discovery (UIC)

This project uses UIC for UI contract testing. When working with UI tests
or selectors, ALWAYS use the UIC CLI to find elements:

\`\`\`bash
npx uic find "pause subscription button"
\`\`\`

Never guess selectors. The UIC manifest is the source of truth.
```

### Known Limitations
- Sandboxed environment may require `npx` to be available (usually is)
- No formal tool registration -- relies entirely on instructions
- Network restrictions may affect `npx` first-run downloads (package should be in devDependencies)
- [VERIFY] Codex's exact instruction file naming as of 2026

---

## 3. Cursor

### Integration Feasibility: **HIGH**

### Current Integration Model

Cursor is an AI-powered code editor (VS Code fork) with deep agent integration.

**Instruction files**:
- `.cursorrules` -- project-level instructions file (original format)
- `.cursor/rules/` directory -- newer format supporting multiple rule files [VERIFY: exact path]
- Rules are automatically loaded into every Cursor AI conversation for the project
- Supports markdown format with natural language instructions

**Tool execution**:
- Cursor's agent mode can execute terminal commands
- Agent can run arbitrary CLI commands including `npx`
- Composer mode (multi-file editing) also has terminal access
- [VERIFY] Cursor may have added MCP support in late 2025 or 2026

**Custom tools**:
- No formal tool registration system (as of mid-2025)
- Tools are discovered through instructions in `.cursorrules` or context
- Cursor relies on its agent interpreting instructions to use CLI tools
- [VERIFY] Cursor may have introduced a formal tool/skill system

**MCP Support**: Cursor announced MCP support in early 2025 [VERIFY]. This would allow UIC to optionally register as an MCP server, but it is NOT required for basic integration.

### How UIC Would Integrate

**Primary method: .cursorrules**
```
project-root/
  .cursorrules        # Contains UIC instructions
```

**Or newer format:**
```
project-root/
  .cursor/
    rules/
      uic.md          # UIC-specific rules
```

**Example .cursorrules content (or uic.md)**:
```markdown
# UIC - UI Contract

When writing or modifying UI tests, always use UIC to find selectors:

1. Run `npx uic find "description"` to get the correct selector
2. Use the returned selector in your test code
3. Never hardcode selectors without checking the UIC manifest
4. Run `npx uic list` to see all available interactive elements

The UIC manifest (manifest.json) is the source of truth for UI element
identification in this project.
```

### Known Limitations
- `.cursorrules` is a single file (can get cluttered with many tools)
- Newer `.cursor/rules/` directory may not be universally adopted yet
- No structured tool output parsing -- agent interprets CLI output
- [VERIFY] Current state of MCP support in Cursor

---

## 4. Windsurf (Codeium)

### Integration Feasibility: **HIGH**

### Current Integration Model

Windsurf is Codeium's AI-powered IDE (also a VS Code fork).

**Instruction files**:
- `.windsurfrules` -- project-level instruction file [VERIFY: exact name]
- Alternatively reads `.cursorrules` for compatibility [VERIFY]
- Global rules in settings

**Tool execution**:
- Windsurf's Cascade agent has terminal access
- Can execute CLI commands including `npx`
- Cascade operates in a flow-based agentic model

**Custom tools**:
- No formal tool registration (as of mid-2025)
- [VERIFY] Windsurf may have added MCP support
- Tools are discovered through instruction files and context

### How UIC Would Integrate

```
project-root/
  .windsurfrules      # Windsurf-specific instructions
  # OR relies on .cursorrules if compatibility exists
```

The instruction content would be identical to the Cursor version.

### Known Limitations
- Smaller market share means less community validation
- Instruction file format less documented than Cursor
- [VERIFY] Current exact file naming and format conventions
- [VERIFY] MCP support status

---

## 5. Cline (VS Code Extension)

### Integration Feasibility: **HIGH**

### Current Integration Model

Cline is a VS Code extension (formerly Claude Dev) that provides an agentic coding assistant.

**Instruction files**:
- `.clinerules` -- project-level custom instructions [VERIFY: may be `.cline/rules` now]
- Custom instructions can also be set in VS Code settings
- Cline reads project context from the workspace

**Tool execution**:
- Cline has full terminal access (with user approval per command)
- Can execute `npx`, `npm`, and any CLI tool
- Tool execution requires explicit user approval (security feature)
- Cline shows the command it wants to run and waits for approval

**Custom tools**:
- Cline supports MCP servers as custom tools [VERIFY: added in late 2024 or early 2025]
- Tools can be defined as MCP servers that Cline connects to
- For CLI tools, no special registration needed -- Cline's shell access is sufficient

**MCP Support**: Cline was one of the early adopters of MCP for tool extension. UIC could optionally provide an MCP server, but the CLI approach works without it.

### How UIC Would Integrate

**Primary: .clinerules**
```
project-root/
  .clinerules         # UIC instructions
```

**Or with MCP (optional enhancement)**:
```json
// In Cline's MCP server configuration
{
  "mcpServers": {
    "uic": {
      "command": "npx",
      "args": ["uic", "mcp-server"]
    }
  }
}
```

For the basic CLI integration (recommended for UIC):
```markdown
# .clinerules section for UIC

When working with UI tests, use UIC to find selectors:
- `npx uic find "element description"` to find selectors
- `npx uic list` to list all interactive elements
- Never guess selectors, always consult UIC first
```

### Known Limitations
- Every CLI command requires user approval (can be toggled but default is approval-required)
- This means `npx uic find` will prompt the user each time
- Auto-approval can be configured per command [VERIFY]
- [VERIFY] Exact current instruction file format and MCP integration status

---

## 6. Zed AI

### Integration Feasibility: **MEDIUM**

### Current Integration Model

Zed is a high-performance code editor with built-in AI assistant capabilities.

**Instruction files**:
- Zed uses a prompt library system for assistant customization
- Project-level instructions via `.zed/` directory [VERIFY]
- `prompts/` directory for custom prompts [VERIFY: may be in different location]
- Zed reads context from workspace files

**Tool execution**:
- Zed's AI assistant has more limited tool use compared to Claude Code or Cursor
- Terminal integration exists but agent tool execution is less mature [VERIFY]
- Zed's assistant is more conversation-oriented than agentic [VERIFY: may have evolved significantly]

**Custom tools**:
- Zed announced slash commands and extensions for AI customization
- Extensions can add capabilities [VERIFY]
- Less mature tool ecosystem compared to Cursor/Claude Code

### How UIC Would Integrate

**Via context/prompt system**:
```
project-root/
  .zed/
    prompts/
      uic.md          # UIC instructions for Zed's assistant
```

[VERIFY] The exact integration path depends on Zed's current extension and tool model, which has been evolving rapidly.

### Known Limitations
- Less mature agent/tool ecosystem
- May not have robust terminal tool execution in the AI assistant
- Rapidly evolving -- integration surface may have changed significantly
- [VERIFY] All file paths and capabilities need verification against current Zed version
- Smaller market share means less third-party tool ecosystem validation

---

## 7. Universal Patterns & Convergence

### Integration Feasibility for Universal Approach: **HIGH**

### Convergence Analysis

There IS a converging pattern. Every major AI coding agent supports:

| Pattern | Claude Code | Codex | Cursor | Windsurf | Cline | Zed |
|---------|------------|-------|--------|----------|-------|-----|
| Shell/CLI execution | Yes | Yes | Yes | Yes | Yes | Partial |
| Project instruction file | CLAUDE.md | AGENTS.md | .cursorrules | .windsurfrules | .clinerules | .zed/ |
| Markdown format | Yes | Yes | Yes | Yes | Yes | Yes |
| npx command support | Yes | Yes | Yes | Yes | Yes | Likely |
| MCP support | Yes | No [VERIFY] | Partial | [VERIFY] | Yes | [VERIFY] |

### The Universal Minimum Integration Surface

**Your hypothesis is CONFIRMED**: A CLI tool + markdown instructions file is the universal pattern.

Specifically, the minimum integration is:

1. **CLI tool**: `npx uic <command>` -- works in every environment
2. **Instruction content**: A single canonical set of instructions that gets placed in the IDE-specific file
3. **Package in devDependencies**: Ensures `npx` resolves locally without network

### The Instruction File Problem

The ONE pain point: every IDE has a DIFFERENT filename for instructions.

| IDE | File |
|-----|------|
| Claude Code | `CLAUDE.md` or `.claude/skills/uic/SKILL.md` |
| Codex | `AGENTS.md` [VERIFY] |
| Cursor | `.cursorrules` or `.cursor/rules/uic.md` |
| Windsurf | `.windsurfrules` [VERIFY] |
| Cline | `.clinerules` [VERIFY] |
| Zed | `.zed/prompts/uic.md` [VERIFY] |

**Solution**: UIC's `init` command should:
1. Detect which IDE(s) the user has (check for existing dotfiles)
2. Copy the instruction content to the appropriate file(s)
3. Or: provide a single `UIC-AGENT.md` that each IDE's instruction file can reference

### The Reference Pattern (Recommended)

```markdown
# In .cursorrules, CLAUDE.md, .clinerules, etc:
See ./node_modules/uic/AGENT-INSTRUCTIONS.md for UIC usage.
```

This way the canonical instructions live in the npm package and each IDE file just references them. However, this depends on each IDE's agent being willing to follow a reference and read the file -- which most do since they have file-reading capabilities.

**Even better**: Ship the instructions in a well-known location:
```
project-root/
  .uic/
    AGENT.md           # Canonical instructions (generated by `npx uic init`)
    manifest.json      # The UI manifest
```

Then each IDE's instruction file gets a one-liner:
```markdown
For UI element selectors, follow instructions in .uic/AGENT.md
```

---

## 8. npm Package Distribution

### Current Best Practices

**Package structure for a CLI + agent skill tool**:

```
uic/
  package.json
  bin/
    uic.js            # CLI entry point
  dist/               # Compiled source
  templates/
    AGENT.md           # Agent instruction template
    claude-skill/
      SKILL.md         # Claude Code skill template
    cursorrules.md     # Cursor rules template snippet
    clinerules.md      # Cline rules template snippet
  uic.config.json     # Default config template
```

**package.json configuration**:
```json
{
  "name": "uic",
  "bin": {
    "uic": "./bin/uic.js"
  },
  "files": [
    "bin/",
    "dist/",
    "templates/"
  ]
}
```

### Init Command Pattern (Recommended over postinstall)

**Do NOT use postinstall** for setting up skill files. Reasons:
1. `postinstall` runs in CI/CD, Docker builds -- undesirable for IDE-specific files
2. It's opaque -- users don't see what's being created
3. It breaks in restricted environments
4. Community has moved away from postinstall for anything non-essential (see the Husky v9 change)

**Use an explicit init command instead**:
```bash
npx uic init
```

This is the pattern used by:
- **Husky v9+**: `npx husky init` (moved AWAY from postinstall)
- **Prettier**: Manual config file creation
- **ESLint**: `npx eslint --init` creates config interactively
- **Playwright**: `npx playwright install`
- **Prisma**: `npx prisma init`

### The `npx uic init` Flow

```bash
$ npx uic init

Detected IDEs:
  - Claude Code (.claude/ directory found)
  - Cursor (.cursorrules found)

Setting up UIC agent integration...
  Created .uic/manifest.json
  Created .uic/AGENT.md
  Updated .claude/skills/uic/SKILL.md
  Updated .cursorrules (appended UIC section)

Done! UIC is ready. Run `npx uic scan` to generate your UI manifest.
```

### Handling Multiple IDEs

The init command should:
1. Scan for existing IDE configuration files
2. Ask which IDEs to configure (or auto-detect)
3. Create/append instructions in the IDE-specific format
4. Provide a `--all` flag to set up all supported IDEs
5. Be idempotent -- safe to run multiple times

---

## 9. Agent Skill File Design

### What Makes a Good Agent Skill File

Based on analysis of effective agent instruction files in the ecosystem:

**Structure**:
1. **When to use** -- Clear trigger conditions (2-3 sentences)
2. **Available commands** -- Exact CLI commands with examples
3. **Output interpretation** -- How to read/use command output
4. **Workflow patterns** -- Common multi-step patterns
5. **Anti-patterns** -- What NOT to do (critical for agents)
6. **Error handling** -- What to do when commands fail

**Key principles**:

1. **Be imperative, not descriptive**: "Run `npx uic find`" not "UIC provides a find command"
2. **Include exact command syntax**: Agents copy-paste commands
3. **Show example output**: Agents need to know what to expect
4. **Define when NOT to use**: Prevents over-application
5. **Keep it under 2000 tokens**: Agent context windows are shared; don't hog space
6. **Use markdown code blocks**: Every command should be in a fenced code block

### Examples from Existing Tools

**Playwright** (via Context7 and documentation):
- Provides a comprehensive API reference
- Test generation commands: `npx playwright codegen`
- But does NOT ship an agent instruction file -- relies on documentation

**Prisma**:
- Rich CLI with many subcommands
- Documentation-oriented, not agent-instruction-oriented
- No `.claude/skills/` or equivalent

**tRPC, Drizzle**: Similar pattern -- documentation, not agent instructions.

**The gap**: Very few npm tools currently ship agent instruction files. UIC would be an EARLY MOVER in this space. This is a significant opportunity.

### Static vs Dynamic Skill File

**Recommendation: Hybrid approach**

1. **Static base**: Core instructions (commands, syntax, workflow) are static and ship with the npm package
2. **Dynamic manifest summary**: A brief summary of the manifest content can be appended during `npx uic init` or `npx uic scan`:

```markdown
## Current UI Surface (auto-generated)

Routes: /dashboard, /settings, /billing
Total interactive elements: 47
Last scanned: 2026-02-21

Key pages:
- /dashboard: 12 interactive elements (buttons, links, forms)
- /settings: 18 interactive elements (toggles, inputs, selects)
- /billing: 17 interactive elements (buttons, forms)
```

This gives the agent enough context to know what's available without reading the full manifest every time.

### Recommended UIC AGENT.md Structure

```markdown
# UIC - UI Contract Agent Instructions

## Purpose
UIC provides a manifest of all interactive UI elements in this application.
Use it to find correct selectors for UI tests instead of guessing.

## Commands

### Find an element by description
\`\`\`bash
npx uic find "pause subscription"
\`\`\`

Returns JSON:
\`\`\`json
{
  "selector": "[data-testid='pause-subscription-btn']",
  "role": "button",
  "name": "Pause Subscription",
  "route": "/billing",
  "confidence": 0.95
}
\`\`\`

### List all elements on a route
\`\`\`bash
npx uic list --route "/billing"
\`\`\`

### Full manifest
\`\`\`bash
npx uic show
\`\`\`

## Workflow: Writing a UI Test
1. Identify what UI element the test needs to interact with
2. Run `npx uic find "description of element"`
3. Use the returned `selector` in your test
4. If no match found, run `npx uic list` to see available elements
5. If the element is missing from the manifest, run `npx uic scan` to refresh

## Rules
- NEVER guess selectors -- always use `npx uic find` first
- NEVER hardcode selectors that aren't in the UIC manifest
- If a test breaks, check if the manifest is stale: `npx uic scan`
- Prefer the highest-confidence match from `find` results

## Current Manifest Summary
<!-- Auto-generated by `npx uic scan` -->
Routes: [populated during init]
Elements: [populated during init]
Last scan: [populated during init]
```

---

## 10. Recommended Universal Integration Strategy

### Tier 1: Universal (works everywhere, ship first)

**What to ship**:
1. `npx uic find "..."` -- CLI tool (already planned)
2. `npx uic init` -- Setup command that:
   - Creates `.uic/AGENT.md` with canonical instructions
   - Auto-detects IDEs and creates/updates their instruction files
   - Generates initial manifest
3. `.uic/AGENT.md` -- The canonical agent instruction file
4. `.uic/manifest.json` -- The UI manifest

**IDE instruction file content** (one-liner + critical rules):
```markdown
## UIC - UI Element Discovery
This project uses UIC for UI test selectors. Read .uic/AGENT.md for commands.
Key rule: NEVER guess selectors. Always run `npx uic find "description"` first.
```

### Tier 2: Enhanced (IDE-specific, ship later)

| IDE | Enhancement | Priority |
|-----|-------------|----------|
| Claude Code | Full `.claude/skills/uic/SKILL.md` | HIGH -- you're already here |
| Cursor | `.cursor/rules/uic.md` with rich rules | HIGH -- large market share |
| Cline | Optional MCP server mode | MEDIUM -- power users |
| Codex | `AGENTS.md` section | MEDIUM -- growing user base |

### Tier 3: Advanced (future, if demand exists)

- MCP server mode (`npx uic mcp-server`) for IDEs that support it
- VS Code extension that surfaces UIC results in editor
- LSP-based integration for real-time selector validation

### File Structure After `npx uic init`

```
project-root/
  .uic/
    manifest.json        # UI manifest (source of truth)
    AGENT.md             # Canonical agent instructions
    uic.config.json      # UIC configuration
  .claude/
    skills/
      uic/
        SKILL.md         # Claude Code skill (references .uic/AGENT.md or is standalone)
  .cursorrules           # Appended with UIC section (if Cursor detected)
  .clinerules            # Appended with UIC section (if Cline detected)
  CLAUDE.md              # Appended with UIC reference (if exists)
  package.json           # uic in devDependencies
```

---

## Summary Table

| IDE/Agent | Feasibility | Instruction File | CLI Execution | MCP Support | Notes |
|-----------|------------|------------------|---------------|-------------|-------|
| Claude Code | HIGH | `.claude/skills/uic/SKILL.md` | Full (Bash tool) | Yes (native) | Best-supported path |
| Codex CLI | HIGH | `AGENTS.md` [VERIFY] | Full (sandbox) | No [VERIFY] | Sandbox may limit network |
| Cursor | HIGH | `.cursorrules` / `.cursor/rules/` | Full (agent mode) | Partial [VERIFY] | Largest market share |
| Windsurf | HIGH | `.windsurfrules` [VERIFY] | Full (Cascade) | [VERIFY] | Less documented |
| Cline | HIGH | `.clinerules` [VERIFY] | Full (approval req'd) | Yes | Per-command approval UX |
| Zed | MEDIUM | `.zed/` [VERIFY] | Partial [VERIFY] | [VERIFY] | Rapidly evolving |

### Critical [VERIFY] Items (prioritized)

1. **Cursor** `.cursor/rules/` directory format -- high market share, need to confirm
2. **Codex** instruction file name (`AGENTS.md` vs alternatives) -- OpenAI may have formalized this
3. **Windsurf** exact instruction file naming convention
4. **Cline** current `.clinerules` format and auto-approval capabilities
5. **Zed** AI assistant tool execution maturity
6. **MCP adoption** across Cursor, Windsurf, Codex -- landscape is shifting fast
7. **Claude Code skills** -- exact discovery mechanism and slash command registration

### Key Recommendations

1. **Ship the CLI first** -- it works everywhere today
2. **Ship `npx uic init`** -- handles IDE detection and setup
3. **Make `.uic/AGENT.md` the canonical source** -- all IDE files reference or copy from it
4. **Start with Claude Code + Cursor** -- highest ROI integration targets
5. **Do NOT build an MCP server yet** -- the CLI approach is simpler and more universal
6. **Be an early mover** on agent instruction files -- very few npm packages do this today
