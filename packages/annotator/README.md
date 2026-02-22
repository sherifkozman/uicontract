# @uicontract/annotator

Source code annotator that inserts `data-agent-id` attributes into UI components.

## Install

```bash
npm install @uicontract/annotator
```

## Usage

```typescript
import { annotate } from '@uicontract/annotator';

const result = await annotate({
  projectRoot: '/path/to/my-app',
  elements: namedElements,   // NamedElement[] from @uicontract/namer
  dryRun: true,              // preview patches without writing files
});

console.log(result.patches);  // files that would be modified
console.log(result.warnings); // elements that could not be annotated
```

Most users interact with the annotator through the CLI:

```bash
# Always preview before writing
npx uic annotate --dry-run

# Write data-agent-id attributes to source files
npx uic annotate
```

## API

- **`annotate(options)`**: Reads source files, computes patches inserting `data-agent-id` at element locations reported by the parser, and optionally writes them. Returns `{ patches, warnings }`.

**Safety guarantees:**

- Creates a `.uic-backup/` directory before modifying any file.
- Refuses to run on a project with uncommitted git changes.
- `dryRun: true` returns patches without touching the filesystem.

## Part of UIC

This package is part of [UIC (UI Contracts)](https://github.com/sherifkozman/uicontract) — making web app UIs machine-readable.

## License

[MIT](../../LICENSE)
