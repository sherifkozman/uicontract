# Browser Tool Bridge

UI Contracts annotates source code with `data-agent-id` attributes. This reference documents how to target those attributes from each browser automation tool, bridging the gap between UI Contracts' manifest output and actual browser interactions.

## Tool-Specific Targeting

### agent-browser

Use a scoped snapshot to locate the element ref, then interact using that ref.

```bash
# Click an element
agent-browser snapshot -s '[data-agent-id="settings.billing.pause-subscription.button"]'
# Returns: - button "Pause subscription" [ref=e1]
agent-browser click @e1

# Fill a form field
agent-browser snapshot -s '[data-agent-id="login.login-form.email.input"]'
# Returns: - textbox "Email" [ref=e1]
agent-browser fill @e1 "user@example.com"
```

### Playwright MCP

Configure the `--test-id-attribute` flag at launch so Playwright recognizes `data-agent-id` as the test ID attribute:

```bash
npx playwright --test-id-attribute=data-agent-id
```

After this configuration, agent IDs appear in accessibility snapshots. Use the `ref` values from the snapshot to interact with elements.

### Chrome MCP

Use the `find` tool with a natural-language description, or use `javascript_tool` with a CSS selector for precise targeting:

```javascript
document.querySelector('[data-agent-id="settings.billing.pause-subscription.button"]')
```

### Cypress

Target elements with the standard attribute selector:

```javascript
cy.get('[data-agent-id="settings.billing.pause-subscription.button"]').click()
cy.get('[data-agent-id="login.login-form.email.input"]').type('user@example.com')
```

### Any CSS-Based Tool

The universal selector pattern works with any tool that supports CSS selectors:

```css
[data-agent-id="settings.billing.pause-subscription.button"]
```

## Selector Patterns

| Pattern   | Syntax                                    | Use Case                              |
|-----------|-------------------------------------------|---------------------------------------|
| Exact     | `[data-agent-id="id"]`                    | Target one specific element           |
| Prefix    | `[data-agent-id^="settings.billing."]`    | All elements in billing section       |
| Substring | `[data-agent-id*="billing"]`              | Any element mentioning "billing"      |
| Suffix    | `[data-agent-id$=".button"]`              | All buttons                           |
| Presence  | `[data-agent-id]`                         | Any UI Contracts-annotated element             |

## Handling Conditional Elements

Elements with `"conditional": true` in the manifest may not be present in the DOM at all times. Before targeting a conditional element:

1. **Check the route.** The manifest's `route` field tells you which page the element lives on. Navigate there first.
2. **Wait for render.** After navigation, use the tool's wait or retry mechanism to allow the element to appear.
3. **Verify visibility.** Confirm the element is present before interacting. If it is not, the required application state (e.g., a modal being open, a feature flag being enabled) may not be met.

## Handling Dynamic Elements

Elements with `"dynamic": true` in the manifest are rendered from data (e.g., a list of items from an API response). The exact set of elements depends on runtime data. To work with dynamic elements:

1. **Use prefix selectors** to discover all instances. For example, `[data-agent-id^="dashboard.task-list.task-"]` matches every task item regardless of how many exist.
2. **Enumerate first.** Query all matching elements, then filter or iterate over the results.
3. **Expect variability.** The count of dynamic elements will differ between environments and over time as data changes.
