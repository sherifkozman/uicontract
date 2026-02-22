# UI Contracts Impact Measurement & Benchmarking

## Purpose

UI Contracts claims to make agent-driven UI testing faster, more accurate, and more token-efficient. This document defines how we measure those claims with reproducible benchmarks. Every claim must have a number behind it.

---

## 1. What We Measure

### 1.1 Token Efficiency

**Question**: How many tokens does an AI agent consume to write a UI test with UI Contracts vs without?

**Why it matters**: Tokens = cost + latency. If UI Contracts reduces token consumption, it directly reduces the cost and time of agent-driven testing. This is the primary value metric for agent consumers.

**Metrics**:

| Metric | Definition |
|--------|-----------|
| `tokens_total` | Total input + output tokens for the complete task |
| `tokens_discovery` | Tokens spent finding/identifying UI elements (the part UI Contracts replaces) |
| `tokens_assertion` | Tokens spent writing assertions and test logic |
| `tool_calls` | Number of tool invocations (CLI commands, page snapshots, DOM reads) |
| `retries` | Number of times the agent re-attempted a failed selector/interaction |
| `context_window_peak` | Maximum context window usage during the task |

### 1.2 Speed

**Question**: How long does it take to go from task description to passing test?

**Metrics**:

| Metric | Definition |
|--------|-----------|
| `time_to_first_pass` | Wall clock time from task start to first green test run |
| `time_discovery` | Time spent on element discovery (finding the right selector) |
| `time_writing` | Time spent writing test code |
| `time_debugging` | Time spent fixing broken selectors or flaky interactions |
| `iterations` | Number of edit-run cycles before the test passes |

### 1.3 Accuracy

**Question**: How reliable are the tests produced with UI Contracts vs without?

**Metrics**:

| Metric | Definition |
|--------|-----------|
| `flake_rate` | % of test runs that fail non-deterministically (same code, different results) over 50 runs |
| `selector_stability` | % of tests that survive a UI refactor without selector changes |
| `first_attempt_pass_rate` | % of tests that pass on the agent's first attempt (no retries) |
| `false_selectors` | Number of times the agent targeted the wrong element |

### 1.4 Maintenance Cost

**Question**: When the UI changes, how much work is needed to update tests?

**Metrics**:

| Metric | Definition |
|--------|-----------|
| `lines_changed_per_refactor` | Lines of test code changed after a UI refactor |
| `tests_broken_per_refactor` | Number of tests that fail after a UI refactor |
| `time_to_repair` | Time for an agent to fix broken tests after a UI change |
| `tokens_to_repair` | Tokens consumed by the agent to repair broken tests |

---

## 2. Benchmark Scenarios

### Scenario A: Write Tests for a Known UI

**Setup**: Fixture app with 15+ interactive elements across 5 routes. The agent has never seen this app.

**Tasks** (ordered by complexity):

| Task | Description | Complexity |
|------|------------|------------|
| A1 | Write a test that clicks the "Pause Subscription" button and verifies a confirmation dialog appears | Simple - single element, single assertion |
| A2 | Write a test that fills the login form (email + password) and submits it | Medium - form with multiple inputs |
| A3 | Write a test that navigates to billing settings, changes the plan from monthly to annual, and verifies the price updates | Complex - multi-step flow across elements |
| A4 | Write a test that verifies all navigation links on the settings page go to the correct routes | Comprehensive - multiple elements, multiple assertions |
| A5 | Write a test for the search bar: type a query, verify results appear, click a result, verify navigation | End-to-end - interaction chain with dynamic content |

**Conditions**:

| Condition | Description |
|-----------|------------|
| **Baseline (no UI Contracts)** | Agent has: Playwright docs, page URL, no manifest, no agent IDs. Must discover elements via DOM snapshots, page.getByRole(), or CSS selectors. |
| **With UI Contracts** | Agent has: Playwright docs, page URL, UI Contracts manifest, agent skill instructions. Can use `npx uicontract find/describe` before writing tests. Elements have `data-agent-id` attributes. |

### Scenario B: Repair Tests After UI Refactor

**Setup**: Same fixture app, but with a UI refactor applied (component renamed, layout restructured, elements moved between files). Tests from Scenario A are now broken.

**Tasks**:

| Task | Description |
|------|------------|
| B1 | Fix the pause subscription test (button moved to a different component) |
| B2 | Fix the login form test (inputs reordered, labels changed) |
| B3 | Fix the billing settings test (plan selector changed from dropdown to radio buttons) |

**Conditions**:

| Condition | Description |
|-----------|------------|
| **Baseline** | Agent must re-discover elements by inspecting the changed DOM |
| **With UI Contracts** | Agent runs `npx uicontract diff` to see what changed, then `npx uicontract find` to locate new elements |

### Scenario C: Agent-Browser (Snapshot/Ref) Workflow

**Setup**: Same fixture app, but using Vercel's agent-browser approach (accessibility snapshots + ref-based interaction) instead of Playwright test files.

**Tasks**:

| Task | Description |
|------|------------|
| C1 | Navigate to billing page and click pause subscription using snapshot/ref |
| C2 | Fill the login form using snapshot/ref interaction |
| C3 | Complete a multi-step billing flow using snapshot/ref |

**Conditions**:

| Condition | Description |
|-----------|------------|
| **Baseline** | Agent reads full accessibility snapshot, searches for elements by text/role |
| **With UI Contracts** | Agent calls `npx uicontract find` first, then searches snapshot for the known `data-agent-id` value |

**Key measurement**: Snapshot size vs. UI Contracts query response size. If the full snapshot is 50KB and the UI Contracts find response is 200 bytes, that's a 250x reduction in context consumed for element discovery.

---

## 3. Benchmark Harness

### 3.1 Architecture

```
benchmark/
├── harness/
│   ├── runner.ts            -- Orchestrates benchmark runs
│   ├── token-counter.ts     -- Counts tokens from API responses
│   ├── timer.ts             -- Wall clock timing with checkpoints
│   ├── reporter.ts          -- Generates comparison tables
│   └── agent-wrapper.ts     -- Wraps agent API calls to intercept metrics
├── scenarios/
│   ├── a-write-tests/
│   │   ├── tasks.json       -- Task definitions (A1-A5)
│   │   ├── baseline/        -- Agent prompts without UI Contracts
│   │   └── with-uic/        -- Agent prompts with UI Contracts
│   ├── b-repair-tests/
│   │   ├── tasks.json
│   │   ├── refactored-app/  -- The refactored fixture
│   │   ├── broken-tests/    -- Tests that need repair
│   │   ├── baseline/
│   │   └── with-uic/
│   └── c-agent-browser/
│       ├── tasks.json
│       ├── baseline/
│       └── with-uic/
├── results/
│   ├── YYYY-MM-DD-run-id/
│   │   ├── raw.json         -- Raw metric data
│   │   ├── summary.md       -- Human-readable comparison
│   │   └── charts/          -- Generated comparison charts
│   └── latest -> ...        -- Symlink to most recent run
└── README.md                -- How to run benchmarks
```

### 3.2 Token Counting

Token counting must be precise, not estimated. Two approaches:

**Approach A - API-level counting (preferred)**:

If using a model API with usage tracking, every response typically includes `usage.input_tokens` and `usage.output_tokens`. The harness wraps API calls and accumulates:

```typescript
interface TokenAccumulator {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  toolCalls: number;
  apiCalls: number;
}

function wrapApiCall(client: AnthropicClient): AnthropicClient {
  return new Proxy(client, {
    // Intercept message creation, accumulate usage from response
  });
}
```

**Approach B - Tiktoken estimation (fallback)**:

If API-level counting isn't available (e.g., using a CLI agent), estimate tokens using `tiktoken` or `@anthropic-ai/tokenizer`:

```typescript
import { countTokens } from "@your-tokenizer-package";

function estimateTokens(text: string): number {
  return countTokens(text);
}
```

### 3.3 Running Benchmarks

```bash
# Run all scenarios (requires API key)
pnpm benchmark

# Run a specific scenario
pnpm benchmark --scenario a-write-tests

# Run a specific task
pnpm benchmark --scenario a-write-tests --task A1

# Run with specific condition
pnpm benchmark --scenario a-write-tests --condition baseline
pnpm benchmark --scenario a-write-tests --condition with-uic

# Compare results
pnpm benchmark:compare --baseline results/latest-baseline --uic results/latest-uic

# Generate report
pnpm benchmark:report --run results/YYYY-MM-DD-run-id
```

### 3.4 Controlling Variables

For benchmarks to be meaningful, we must control:

| Variable | How We Control It |
|----------|-------------------|
| **Model** | Same model version for both conditions (e.g., GPT-4o, Sonnet 4) |
| **Temperature** | Set to 0 for deterministic output |
| **System prompt** | Identical base prompt; only UI Contracts instructions differ |
| **App state** | Fixture app starts from identical state per run (reset between runs) |
| **Playwright version** | Pinned in fixture app's package.json |
| **Network** | App served locally; no external dependencies |
| **Repetitions** | Each task run N times (minimum 3, ideally 5) to account for variance |

---

## 4. Reporting

### 4.1 Comparison Table Format

Each benchmark run produces a comparison table:

```
Task A1: Click "Pause Subscription" button
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                        Baseline    With UI Contracts    Δ         Δ%
Tokens (total)          4,200       1,800       -2,400    -57%
Tokens (discovery)      3,100       600         -2,500    -81%
Tool calls              8           3           -5        -63%
Retries                 2           0           -2        -100%
Time to pass (s)        45          18          -27       -60%
First-attempt pass      No          Yes         --        --
Selector stability*     2/5         5/5         +3        +60%

* Survived 5 UI refactor variants without breaking
```

### 4.2 Aggregate Summary

Across all tasks in a scenario:

```
Scenario A: Write Tests (5 tasks, 3 runs each)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                        Baseline    With UI Contracts    Improvement
Avg tokens/task         5,800       2,100       64% reduction
Avg tool calls/task     11          4           64% reduction
Avg time/task (s)       62          24          61% reduction
First-attempt pass %    40%         87%         +47pp
Flake rate (50 runs)    12%         2%          -10pp
```

### 4.3 What "Good" Looks Like

UI Contracts should demonstrate these minimum improvements to justify adoption:

| Metric | Target | Rationale |
|--------|--------|-----------|
| Token reduction | ≥40% | Must be significant enough to matter for cost |
| Time reduction | ≥30% | Must save meaningful development time |
| First-attempt pass rate | ≥80% (vs ≤50% baseline) | Primary accuracy indicator |
| Selector stability | ≥90% survive refactor | Primary maintenance indicator |
| Flake rate | ≤3% (vs ≥10% baseline) | Tests must be reliable |

If UI Contracts doesn't hit these targets, either the tool needs improvement or the value proposition needs re-evaluation.

---

## 5. Flakiness Measurement Protocol

### 5.1 Methodology

Flakiness is measured by running the same test suite N times against the same app state:

```bash
# Run flakiness check (50 repetitions)
pnpm benchmark:flakiness --runs 50 --suite tests/generated/scenario-a/

# Output:
# Total runs: 50
# Passes: 47
# Failures: 3
# Flake rate: 6%
# Flaky tests:
#   - test-a3-billing-flow.spec.ts (failed 2/50 - timeout on plan selector)
#   - test-a5-search-flow.spec.ts (failed 1/50 - stale element reference)
```

### 5.2 Categorizing Flakiness

When a test flakes, categorize the root cause:

| Category | Description | UI Contracts' impact |
|----------|------------|-------------|
| **Selector instability** | Element not found, wrong element selected | UI Contracts directly addresses this with stable agent IDs |
| **Timing** | Race condition, animation, network delay | UI Contracts doesn't directly address (Playwright's auto-waiting handles this) |
| **State** | Test depends on prior state not properly reset | Not UI Contracts' domain |
| **DOM mutation** | Element changes between locate and interact | Partially addressed by stable IDs (less likely to hit wrong element) |

UI Contracts should eliminate **selector instability** flakes almost entirely. Other categories are out of scope.

---

## 6. Selector Stability Stress Test

### 6.1 Refactor Variants

Create N variants of the fixture app, each with a specific UI refactor:

| Variant | Refactor | What changes | What shouldn't break |
|---------|---------|-------------|---------------------|
| R1 | CSS class rename | All className values changed | Any test using agent IDs or role selectors |
| R2 | Component rename | `BillingSettings` → `SubscriptionManager` | Any test using agent IDs (IDs stay stable) |
| R3 | Layout restructure | Elements move between parent components | Any test using agent IDs (IDs are element-level) |
| R4 | Element order change | Buttons reordered within a form | Any test using agent IDs or getByRole with name |
| R5 | Wrapper addition | New `<div>` wrappers around interactive elements | Any test using agent IDs (attributes propagate) |
| R6 | Component split | One component split into two | Tests using agent IDs if IDs are preserved |
| R7 | Library swap | MUI Button → Radix Button | Tests using agent IDs (framework-agnostic) |

### 6.2 Protocol

For each refactor variant:

1. Run the original test suite (should pass - sanity check)
2. Apply the refactor
3. Run the original test suite again (no test modifications)
4. Record: how many tests pass, how many fail, which selectors broke

**Scoring**: `stability_score = tests_passing_after_refactor / total_tests`

**Comparison**:

```
Refactor R1 (CSS class rename)
  Baseline tests:   3/10 pass  (stability: 30%)
  UI Contracts tests:       10/10 pass  (stability: 100%)

Refactor R3 (layout restructure)
  Baseline tests:   5/10 pass  (stability: 50%)
  UI Contracts tests:        9/10 pass  (stability: 90%)
```

---

## 7. Context Window Efficiency (Agent-Browser Specific)

### 7.1 Snapshot Size vs. UI Contracts Query Size

When agents use the agent-browser pattern (accessibility snapshots), the primary cost is context window consumption. Measure:

| Metric | Definition |
|--------|-----------|
| `snapshot_size_tokens` | Token count of a full interactive-only accessibility snapshot |
| `uic_find_response_tokens` | Token count of `npx uicontract find` response for the same element |
| `context_reduction_ratio` | `snapshot_size_tokens / uic_find_response_tokens` |

**Example measurement**:

```
Page: /settings/billing (18 interactive elements)

Full snapshot:     ~2,400 tokens (all elements with roles, names, refs)
UI Contracts find response:    ~30 tokens (one element: agentId, selector, label)

Context reduction: 80x for single element lookup
```

### 7.2 Cumulative Context Savings

For a multi-step test flow (navigate → find element → interact → verify → repeat):

```
5-step flow, baseline:
  Step 1: snapshot (2,400 tok) + reasoning (500 tok)
  Step 2: snapshot (2,400 tok) + reasoning (500 tok)
  Step 3: snapshot (2,400 tok) + reasoning (500 tok)
  Step 4: snapshot (2,400 tok) + reasoning (500 tok)
  Step 5: snapshot (2,400 tok) + reasoning (500 tok)
  Total: 14,500 tokens

5-step flow, with UI Contracts:
  Pre-step: uicontract find ×5 (150 tok) + skill instructions (200 tok)
  Step 1: targeted ref lookup (100 tok) + reasoning (200 tok)
  Step 2: targeted ref lookup (100 tok) + reasoning (200 tok)
  Step 3: targeted ref lookup (100 tok) + reasoning (200 tok)
  Step 4: targeted ref lookup (100 tok) + reasoning (200 tok)
  Step 5: targeted ref lookup (100 tok) + reasoning (200 tok)
  Total: 1,850 tokens

Savings: 87%
```

---

## 8. When to Benchmark

### Pre-release Benchmarks (Required)

Run benchmarks before every minor/major release:

```yaml
# .github/workflows/benchmark.yml
on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm build
      - run: pnpm benchmark --scenario a-write-tests
      - run: pnpm benchmark:report
      - uses: actions/upload-artifact@v4
        with:
          name: benchmark-results
          path: benchmark/results/latest/
```

### Continuous Tracking

Track benchmark results over time to detect regressions:

- Store results in `benchmark/results/YYYY-MM-DD-<commit>/`
- Generate trend charts showing token efficiency, speed, and accuracy over releases
- Alert if any metric regresses by >10% from the previous release

### Ad-hoc Benchmarks

Run benchmarks whenever:
- The parser changes (element discovery affects what agents find)
- The manifest schema changes (agent consumption patterns change)
- The agent skill instructions change (agent behavior changes)
- A new Playwright or model version is released (baseline may shift)

---

## 9. Benchmark Fixtures vs. Real-World Validation

### Fixture Benchmarks (Controlled)

All benchmarks above use fixture apps. These give controlled, reproducible results but may not represent real-world complexity.

**Limitations**:
- Fixture apps are small (15-50 elements)
- Real apps have hundreds of elements
- Fixture apps have clean code; real apps have legacy patterns
- Fixture apps don't have third-party component diversity

### Real-World Validation (Uncontrolled)

Once UI Contracts reaches Phase 3+, validate with real projects:

1. **Open-source apps**: Find 3-5 open-source React/Next.js apps of varying size. Run `uicontract scan`, write tests with and without UI Contracts, compare metrics.
2. **Dogfooding**: Use UI Contracts on UI Contracts' own fixture apps in CI. Track metrics over time.
3. **Community reports**: Provide a `pnpm benchmark` command so users can run benchmarks on their own codebases and share (anonymized) results.

### Reporting Real-World Results

```
Real-world validation: [open-source-app-name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
App size: 340 components, 890 interactive elements
Framework: Next.js 15 + Radix UI + Tailwind

Scan results:
  Elements discovered: 756/890 (85%)
  Elements missed: 134 (dynamic components, complex HOCs)
  Scan time: 3.2s

Test writing (5 representative flows):
  Token reduction: 52% avg
  Time reduction: 38% avg
  First-attempt pass: 4/5 (80%) vs 2/5 (40%) baseline
```

---

## 10. Success Criteria

UI Contracts is validated when:

| Criterion | Target | How Measured |
|-----------|--------|-------------|
| Token efficiency | ≥40% reduction vs baseline | Scenario A aggregate |
| Speed | ≥30% faster test writing | Scenario A aggregate |
| Accuracy | ≥80% first-attempt pass rate | Scenario A aggregate |
| Selector stability | ≥90% survive refactors | Stability stress test |
| Flake reduction | ≤3% flake rate | Flakiness protocol |
| Repair efficiency | ≥50% fewer tokens to repair | Scenario B aggregate |
| Context efficiency | ≥10x reduction for agent-browser | Context window measurement |
| Real-world coverage | ≥80% element discovery rate | Real-world validation on 3+ apps |

If these targets aren't met, the tool needs improvement before promoting adoption. The benchmarks are the accountability mechanism - they prevent shipping something that sounds good but doesn't deliver.
