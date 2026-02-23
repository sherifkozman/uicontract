/**
 * Core JSX annotation logic.
 *
 * Takes a source string and a list of annotation targets, and inserts
 * `data-agent-id` attributes into JSX opening tags at the specified locations.
 * Uses string manipulation only -- no AST parser.
 */

/** A single annotation target: where to insert and what value to use. */
export interface AnnotationTarget {
  agentId: string;
  line: number; // 1-based line where the JSX element starts
  column: number; // 1-based column
  type: string; // element type (button, input, etc.)
  sourceTagName: string | null; // original JSX tag name for componentMap elements
}

/** Result of annotating a single source string. */
export interface AnnotationResult {
  originalSource: string;
  annotatedSource: string;
  modified: boolean;
  annotationsApplied: number;
  annotationsSkipped: number; // already had correct data-agent-id
}

const DATA_AGENT_ID_ATTR = 'data-agent-id';

/**
 * Regex to match an existing data-agent-id attribute.
 * Captures the quote character and the value inside.
 */
const EXISTING_ATTR_RE = /data-agent-id=(["'])((?:(?!\1).)*)\1/;

/**
 * Find the insertion point right after the tag name on the target line.
 *
 * Given a line like `  <button className="btn">`, and a target with
 * column pointing at `<`, returns the index right after `<tagName`
 * so we can insert ` data-agent-id="..."` there.
 */
function findTagNameEnd(line: string, column: number, tagType: string): number | null {
  // column is 1-based, convert to 0-based
  const col0 = column - 1;

  // The character at col0 should be '<'
  if (line[col0] !== '<') {
    // Try searching nearby -- parser column might be slightly off
    const nearby = line.indexOf('<', Math.max(0, col0 - 2));
    if (nearby === -1 || nearby > col0 + 2) {
      return null;
    }
    // Verify tag name matches
    const afterBracket = line.substring(nearby + 1);
    if (!tagNameStartsHere(afterBracket, tagType)) {
      return null;
    }
    return nearby + 1 + tagType.length;
  }

  const afterBracket = line.substring(col0 + 1);
  if (!tagNameStartsHere(afterBracket, tagType)) {
    return null;
  }
  return col0 + 1 + tagType.length;
}

/**
 * Check whether the string starts with the tag name followed by
 * a non-identifier character (space, >, /, newline, etc.).
 */
function tagNameStartsHere(str: string, tagType: string): boolean {
  if (!str.startsWith(tagType)) {
    return false;
  }
  const charAfter = str[tagType.length];
  // If undefined (end of line), the tag continues on next line -- still valid
  if (charAfter === undefined) {
    return true;
  }
  // Must be followed by whitespace, '>', '/', or end
  return /[\s/>]/.test(charAfter);
}

/**
 * Gather all lines that belong to the JSX opening tag starting at `startLineIdx`.
 * Returns the index of the line containing the closing `>` or `/>`.
 */
function findTagEndLineIndex(lines: string[], startLineIdx: number): number {
  let depth = 0;
  let inString: string | false = false;
  let inTemplateExpr = 0;

  for (let i = startLineIdx; i < lines.length; i++) {
    const line = lines[i]!;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j]!;

      // Track string literals to avoid matching > inside them
      if (inString) {
        if (ch === inString && line[j - 1] !== '\\') {
          inString = false;
        }
        continue;
      }

      if (ch === '{') {
        inTemplateExpr++;
        continue;
      }
      if (ch === '}' && inTemplateExpr > 0) {
        inTemplateExpr--;
        continue;
      }

      // Inside JSX expression, skip
      if (inTemplateExpr > 0) {
        if (ch === '"' || ch === "'" || ch === '`') {
          inString = ch;
        }
        continue;
      }

      if (ch === '"' || ch === "'" || ch === '`') {
        inString = ch;
        continue;
      }

      if (ch === '<') {
        depth++;
        continue;
      }

      if (ch === '>') {
        depth--;
        if (depth <= 0) {
          return i;
        }
      }
    }
  }

  // Fallback: return start line if we can't find the end
  return startLineIdx;
}

/**
 * Annotate a source string by inserting `data-agent-id` attributes at each target.
 *
 * Targets are processed in reverse line order so that insertions on later lines
 * don't shift the line numbers of earlier targets.
 */
export function annotateSource(
  source: string,
  targets: AnnotationTarget[],
): AnnotationResult {
  if (targets.length === 0) {
    return {
      originalSource: source,
      annotatedSource: source,
      modified: false,
      annotationsApplied: 0,
      annotationsSkipped: 0,
    };
  }

  const lines = source.split('\n');
  let annotationsApplied = 0;
  let annotationsSkipped = 0;

  // Sort targets by line descending so insertions don't shift earlier targets
  const sorted = [...targets].sort((a, b) => b.line - a.line);

  for (const target of sorted) {
    const lineIdx = target.line - 1; // convert to 0-based

    if (lineIdx < 0 || lineIdx >= lines.length) {
      continue;
    }

    // Find which lines make up this opening tag
    const tagEndLineIdx = findTagEndLineIndex(lines, lineIdx);

    // Combine the tag lines to check for existing attribute
    const tagLines = lines.slice(lineIdx, tagEndLineIdx + 1);
    const tagText = tagLines.join('\n');

    const existingMatch = EXISTING_ATTR_RE.exec(tagText);

    if (existingMatch) {
      const existingValue = existingMatch[2];
      if (existingValue === target.agentId) {
        // Already correct -- skip
        annotationsSkipped++;
        continue;
      }

      // Replace existing value with correct one
      const oldAttr = existingMatch[0];
      const newAttr = `${DATA_AGENT_ID_ATTR}="${target.agentId}"`;

      // Find which tag line contains the existing attribute and replace there
      for (let i = lineIdx; i <= tagEndLineIdx; i++) {
        const line = lines[i]!;
        if (line.includes(oldAttr)) {
          lines[i] = line.replace(oldAttr, newAttr);
          annotationsApplied++;
          break;
        }
      }
      continue;
    }

    // No existing attribute -- insert after the tag name
    const targetLine = lines[lineIdx]!;
    const tagNameToMatch = target.sourceTagName ?? target.type;
    const insertIdx = findTagNameEnd(targetLine, target.column, tagNameToMatch);

    if (insertIdx === null) {
      continue;
    }

    const attrStr = ` ${DATA_AGENT_ID_ATTR}="${target.agentId}"`;
    lines[lineIdx] =
      targetLine.substring(0, insertIdx) +
      attrStr +
      targetLine.substring(insertIdx);

    annotationsApplied++;
  }

  const annotatedSource = lines.join('\n');

  return {
    originalSource: source,
    annotatedSource,
    modified: annotationsApplied > 0,
    annotationsApplied,
    annotationsSkipped,
  };
}
