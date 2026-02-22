import { describe, it, expect } from 'vitest';
import { runUic } from './helpers.js';

describe('uic config & error handling (e2e)', () => {
  it('scan with invalid --framework exits 1 with helpful error', async () => {
    const result = await runUic(['scan', 'fixtures/react-app', '--framework', 'nonexistent']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toLowerCase()).toMatch(/no parser|unsupported|unknown framework/);
  }, 10_000);

  it('scan --help exits 0 and prints usage', async () => {
    const result = await runUic(['scan', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('uicontract scan');
    expect(result.stderr).toContain('--framework');
  }, 10_000);
});
