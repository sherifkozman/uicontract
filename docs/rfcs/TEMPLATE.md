# RFC NNN: <Title>

| Field | Value |
|-------|-------|
| **Status** | Draft / Under Review / Accepted / Rejected / Superseded |
| **Author** | Your Name |
| **Created** | YYYY-MM-DD |
| **Updated** | YYYY-MM-DD |

## Summary

One-paragraph description of what this RFC proposes.

## Motivation

Why is this change needed? What problem does it solve? What use cases does it enable?

Include concrete examples of the problem if possible.

## Detailed Design

Describe the proposed solution in enough detail that someone familiar with the codebase could implement it. Include:

- API changes (new types, modified interfaces, new CLI flags)
- Data format changes (manifest schema modifications)
- Architecture changes (new packages, modified layer boundaries)
- Code examples showing the proposed behavior

### Example

```typescript
// Show what the proposed API looks like in practice
```

## Alternatives Considered

What other approaches were evaluated? Why were they rejected?

| Alternative | Pros | Cons | Reason for Rejection |
|------------|------|------|---------------------|
| Option A | ... | ... | ... |
| Option B | ... | ... | ... |

## Migration Path

How do existing users adopt this change?

- Is this a breaking change?
- Can it be rolled out incrementally?
- What deprecation steps are needed?
- How does `uicontract diff` handle the transition?

## Backward Compatibility

- Does this change the manifest schema version?
- Does this change CLI command signatures?
- Does this change the Parser plugin API?
- What happens when old tools encounter new data (or vice versa)?

## Open Questions

List anything that still needs to be resolved before this RFC can be accepted.

1. ...
2. ...

---

## Process

1. Copy this template to `docs/rfcs/NNN-<title>.md`
2. Fill in all sections
3. Submit as a PR with the `rfc` label
4. Discussion period: 1 week minimum
5. Decision is recorded by updating the Status field

### When an RFC is Required

An RFC is required for changes that affect:
- Manifest schema (additions, modifications, removals)
- CLI command interface (new commands, changed flags, removed commands)
- Parser plugin API (`Parser` interface, `DiscoveryResult`, `RawElement`)
- Architecture boundaries (new packages, layer dependency changes)
- Naming conventions (agent ID format, naming rules)
