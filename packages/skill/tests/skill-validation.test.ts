import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILL_DIR = path.resolve(__dirname, '..');
const SKILL_MD_PATH = path.join(SKILL_DIR, 'SKILL.md');
const REFERENCES_DIR = path.join(SKILL_DIR, 'references');

describe('skill package structure', () => {
  it('SKILL.md exists', async () => {
    const stat = await fs.stat(SKILL_MD_PATH);
    expect(stat.isFile()).toBe(true);
  });

  it('SKILL.md has valid YAML frontmatter with required fields', async () => {
    const content = await fs.readFile(SKILL_MD_PATH, 'utf-8');

    // Must start with YAML frontmatter delimiter
    expect(content.startsWith('---\n')).toBe(true);

    // Extract frontmatter block between the two --- delimiters
    const endIndex = content.indexOf('\n---', 4);
    expect(endIndex).toBeGreaterThan(0);

    const frontmatter = content.slice(4, endIndex);

    // Must have name field set to "uic"
    const nameMatch = /^name:\s*(.+)$/m.exec(frontmatter);
    expect(nameMatch).not.toBeNull();
    expect(nameMatch![1]!.trim()).toBe('uic');

    // Must have description field (non-empty)
    const descriptionMatch = /^description:\s*(.+)$/m.exec(frontmatter);
    expect(descriptionMatch).not.toBeNull();
    expect(descriptionMatch![1]!.trim().length).toBeGreaterThan(0);
  });

  it('SKILL.md body is under 2000 words', async () => {
    const content = await fs.readFile(SKILL_MD_PATH, 'utf-8');

    // Strip frontmatter
    const endIndex = content.indexOf('\n---', 4);
    const body = content.slice(endIndex + 4);

    // Strip code blocks (fenced with ```)
    const withoutCodeBlocks = body.replace(/```[\s\S]*?```/g, '');

    // Count words: split on whitespace, filter out empty strings
    const words = withoutCodeBlocks.split(/\s+/).filter((w) => w.length > 0);

    expect(words.length).toBeLessThan(2000);
  });

  it('references directory exists', async () => {
    const stat = await fs.stat(REFERENCES_DIR);
    expect(stat.isDirectory()).toBe(true);
  });

  it('all reference files linked in SKILL.md exist', async () => {
    const content = await fs.readFile(SKILL_MD_PATH, 'utf-8');

    // Extract all references/<name>.md patterns from SKILL.md
    // Intentionally matches only .md files — update if non-markdown refs are added
    const refPattern = /references\/[\w.-]+\.md/g;
    const matches = content.match(refPattern);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThan(0);

    // Deduplicate
    const uniqueRefs = [...new Set(matches!)];

    for (const ref of uniqueRefs) {
      const refPath = path.join(SKILL_DIR, ref);
      const stat = await fs.stat(refPath);
      expect(stat.isFile(), `Expected ${ref} to exist`).toBe(true);
    }
  });

  it('old skill files do not exist', async () => {
    const oldFiles = ['claude-code.md', 'universal.md'];

    for (const file of oldFiles) {
      const filePath = path.join(SKILL_DIR, file);
      await expect(
        fs.stat(filePath),
      ).rejects.toThrow(/ENOENT/);
    }
  });
});

describe('reference file content', () => {
  const referenceFiles = [
    'browser-tool-bridge.md',
    'workflow-patterns.md',
    'manifest-schema.md',
  ] as const;

  for (const file of referenceFiles) {
    it(`${file} is non-empty`, async () => {
      const content = await fs.readFile(
        path.join(REFERENCES_DIR, file),
        'utf-8',
      );
      expect(content.length).toBeGreaterThan(100);
    });
  }

  it('browser-tool-bridge.md covers all target tools', async () => {
    const content = await fs.readFile(
      path.join(REFERENCES_DIR, 'browser-tool-bridge.md'),
      'utf-8',
    );

    const requiredTerms = [
      'agent-browser',
      'Playwright',
      'Chrome MCP',
      'Cypress',
      'data-agent-id',
    ];

    for (const term of requiredTerms) {
      expect(
        content.includes(term),
        `Expected browser-tool-bridge.md to mention "${term}"`,
      ).toBe(true);
    }
  });

  it('workflow-patterns.md has at least 3 recipes', async () => {
    const content = await fs.readFile(
      path.join(REFERENCES_DIR, 'workflow-patterns.md'),
      'utf-8',
    );

    const recipeHeadings = content.match(/^## Recipe/gm);
    expect(recipeHeadings).not.toBeNull();
    expect(recipeHeadings!.length).toBeGreaterThanOrEqual(3);
  });

  it('manifest-schema.md documents all element fields', async () => {
    const content = await fs.readFile(
      path.join(REFERENCES_DIR, 'manifest-schema.md'),
      'utf-8',
    );

    const requiredFields = [
      'agentId',
      'type',
      'label',
      'route',
      'handler',
      'conditional',
      'dynamic',
      'filePath',
      'line',
      'column',
      'componentName',
    ];

    for (const field of requiredFields) {
      expect(
        content.includes(field),
        `Expected manifest-schema.md to document "${field}"`,
      ).toBe(true);
    }
  });
});
