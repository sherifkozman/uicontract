# Workflow Patterns

Multi-step automation recipes that chain UI Contracts CLI commands with browser tools. Each recipe is a concrete bash sequence you can adapt to your application.

## Recipe 1: Form Fill

Scan the manifest for input fields on a specific route, fill each one, then submit.

### Step 1 -- Discover inputs on the target route

```bash
npx uicontract list --route "/checkout" --type input --json
```

Expected output:

```json
[
  { "agentId": "checkout.shipping-form.first-name.input", "type": "input", "label": "First name" },
  { "agentId": "checkout.shipping-form.last-name.input", "type": "input", "label": "Last name" },
  { "agentId": "checkout.shipping-form.address.input", "type": "input", "label": "Address" },
  { "agentId": "checkout.shipping-form.city.input", "type": "input", "label": "City" },
  { "agentId": "checkout.shipping-form.zip.input", "type": "input", "label": "Zip code" }
]
```

### Step 2 -- Find the submit button

```bash
npx uicontract find "submit order" --json
```

Expected output:

```json
[
  { "agentId": "checkout.shipping-form.submit-order.button", "type": "button", "label": "Submit order" }
]
```

### Step 3 -- Navigate and fill

```bash
# Navigate to the checkout page
agent-browser navigate "https://localhost:3000/checkout"

# Fill each field using the agent IDs from Step 1
agent-browser find testid "checkout.shipping-form.first-name.input" fill "Jane"
agent-browser find testid "checkout.shipping-form.last-name.input" fill "Doe"
agent-browser find testid "checkout.shipping-form.address.input" fill "123 Main St"
agent-browser find testid "checkout.shipping-form.city.input" fill "Springfield"
agent-browser find testid "checkout.shipping-form.zip.input" fill "62704"

# Submit
agent-browser find testid "checkout.shipping-form.submit-order.button" click
```

---

## Recipe 2: Navigation Test

Verify that every route in the application has the expected interactive elements present and visible.

### Step 1 -- Get all routes

```bash
npx uicontract list --routes --json
```

Expected output:

```json
[
  "/",
  "/login",
  "/dashboard",
  "/settings/billing",
  "/checkout"
]
```

### Step 2 -- Get elements per route

For each route, list the elements expected on that page:

```bash
npx uicontract list --route "/login" --json
```

Expected output:

```json
[
  { "agentId": "login.login-form.email.input", "type": "input", "label": "Email" },
  { "agentId": "login.login-form.password.input", "type": "input", "label": "Password" },
  { "agentId": "login.login-form.sign-in.button", "type": "button", "label": "Sign in" }
]
```

### Step 3 -- Navigate and verify each route

```bash
# For each route, navigate and confirm every non-conditional element is visible
agent-browser navigate "https://localhost:3000/login"

agent-browser find testid "login.login-form.email.input" visible
agent-browser find testid "login.login-form.password.input" visible
agent-browser find testid "login.login-form.sign-in.button" visible
```

Repeat for every route. Skip elements with `"conditional": true` unless you set up the required application state first (see Browser Tool Bridge for conditional element handling).

---

## Recipe 3: Regression Check (CI)

Compare a baseline manifest against the current source to detect breaking changes. Intended for CI pipelines.

### Step 1 -- Generate the current manifest

```bash
npx uicontract scan ./src -o current.json && npx uicontract name current.json -o current.json
```

### Step 2 -- Diff against baseline

```bash
npx uicontract diff baseline.json current.json --json
```

Expected output when there are no breaking changes:

```json
{
  "breaking": [],
  "nonBreaking": [
    { "type": "added", "agentId": "settings.profile.avatar-upload.input" }
  ],
  "summary": { "breaking": 0, "nonBreaking": 1 }
}
```

Expected output when there are breaking changes:

```json
{
  "breaking": [
    { "type": "removed", "agentId": "checkout.shipping-form.submit-order.button" },
    { "type": "renamed", "oldAgentId": "login.login-form.sign-in.button", "newAgentId": "login.auth-form.log-in.button" }
  ],
  "nonBreaking": [],
  "summary": { "breaking": 2, "nonBreaking": 0 }
}
```

### Step 3 -- Fail CI on breaking changes

```bash
npx uicontract diff baseline.json current.json --json
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "Breaking manifest changes detected. Review the diff output above."
  echo "If intentional, update baseline.json: cp current.json baseline.json"
  exit 1
fi
```

`uicontract diff` exits with code 1 when breaking changes are found, making it a direct CI gate.

---

## Recipe 4: Full Annotation Pipeline

Scan the source, generate stable names, annotate source files with `data-agent-id` attributes, then verify the round-trip produces a stable manifest.

### Step 1 -- Scan

```bash
npx uicontract scan ./src -o manifest.json
```

### Step 2 -- Name

```bash
npx uicontract name manifest.json -o manifest.json
```

### Step 3 -- Preview annotations (dry run)

```bash
npx uicontract annotate manifest.json --dry-run
```

Expected output shows the patches that would be applied:

```
src/components/LoginForm.tsx:12:8
  - <input type="email" />
  + <input type="email" data-agent-id="login.login-form.email.input" />

src/components/LoginForm.tsx:18:8
  - <button onClick={handleSubmit}>Sign in</button>
  + <button onClick={handleSubmit} data-agent-id="login.login-form.sign-in.button">Sign in</button>

2 files, 5 elements to annotate.
```

### Step 4 -- Write annotations

```bash
npx uicontract annotate manifest.json --write
```

This modifies source files in place. A backup is created in `.uic-backup/` before any changes are written.

### Step 5 -- Re-scan and verify round-trip

```bash
npx uicontract scan ./src -o manifest-after.json && npx uicontract name manifest-after.json -o manifest-after.json
npx uicontract diff manifest.json manifest-after.json --json
```

Expected output for a successful round-trip (zero changes):

```json
{
  "breaking": [],
  "nonBreaking": [],
  "summary": { "breaking": 0, "nonBreaking": 0 }
}
```

A zero-change diff confirms that annotations were inserted correctly and the re-scan produces the same manifest. If the diff reports changes, the annotator may have altered element positions or the parser may be interpreting annotated source differently than unannotated source -- both are bugs worth investigating.
