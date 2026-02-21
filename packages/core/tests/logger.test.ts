import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, LOG_LEVELS } from '../src/index.js';

describe('createLogger', () => {
  let stderrWrite: ReturnType<typeof vi.fn>;
  let originalStderrWrite: typeof process.stderr.write;

  beforeEach(() => {
    stderrWrite = vi.fn().mockReturnValue(true);
    originalStderrWrite = process.stderr.write;
    process.stderr.write = stderrWrite as unknown as typeof process.stderr.write;
  });

  afterEach(() => {
    process.stderr.write = originalStderrWrite;
  });

  it('LOG_LEVELS has correct ordering', () => {
    expect(LOG_LEVELS.debug).toBeLessThan(LOG_LEVELS.info);
    expect(LOG_LEVELS.info).toBeLessThan(LOG_LEVELS.warn);
    expect(LOG_LEVELS.warn).toBeLessThan(LOG_LEVELS.error);
  });

  it('defaults to warn level', () => {
    const logger = createLogger();

    logger.debug('debug msg');
    logger.info('info msg');
    expect(stderrWrite).not.toHaveBeenCalled();

    logger.warn('warn msg');
    expect(stderrWrite).toHaveBeenCalledTimes(1);

    logger.error('error msg');
    expect(stderrWrite).toHaveBeenCalledTimes(2);
  });

  it('respects debug level (logs everything)', () => {
    const logger = createLogger({ level: 'debug' });

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(stderrWrite).toHaveBeenCalledTimes(4);
  });

  it('respects error level (only errors)', () => {
    const logger = createLogger({ level: 'error' });

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    expect(stderrWrite).not.toHaveBeenCalled();

    logger.error('e');
    expect(stderrWrite).toHaveBeenCalledTimes(1);
  });

  it('respects info level', () => {
    const logger = createLogger({ level: 'info' });

    logger.debug('d');
    expect(stderrWrite).not.toHaveBeenCalled();

    logger.info('i');
    logger.warn('w');
    logger.error('e');
    expect(stderrWrite).toHaveBeenCalledTimes(3);
  });

  it('writes to stderr, never stdout', () => {
    const stdoutWrite = vi.fn().mockReturnValue(true);
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = stdoutWrite as unknown as typeof process.stdout.write;

    const logger = createLogger({ level: 'debug' });

    logger.debug('test');
    logger.info('test');
    logger.warn('test');
    logger.error('test');

    expect(stdoutWrite).not.toHaveBeenCalled();
    expect(stderrWrite).toHaveBeenCalledTimes(4);

    process.stdout.write = originalStdoutWrite;
  });

  it('formats output with prefix and level', () => {
    const logger = createLogger({ level: 'warn' });
    logger.warn('something happened');

    expect(stderrWrite).toHaveBeenCalledTimes(1);
    const output = stderrWrite.mock.calls[0]?.[0] as string;
    expect(output).toContain('[UIC]');
    expect(output).toContain('[WARN]');
    expect(output).toContain('something happened');
  });

  it('uses custom prefix', () => {
    const logger = createLogger({ level: 'warn', prefix: 'MYAPP' });
    logger.warn('test');

    const output = stderrWrite.mock.calls[0]?.[0] as string;
    expect(output).toContain('[MYAPP]');
  });

  it('includes context in output', () => {
    const logger = createLogger({ level: 'warn' });
    logger.warn('file error', { filePath: 'src/App.tsx', line: 42 });

    const output = stderrWrite.mock.calls[0]?.[0] as string;
    expect(output).toContain('file error');
    expect(output).toContain('src/App.tsx');
    expect(output).toContain('42');
  });

  it('omits context when empty', () => {
    const logger = createLogger({ level: 'warn' });
    logger.warn('simple message');

    const output = stderrWrite.mock.calls[0]?.[0] as string;
    expect(output).not.toContain('{}');
    expect(output).toMatch(/simple message\n$/);
  });

  it('includes timestamp in debug mode', () => {
    const logger = createLogger({ level: 'debug' });
    logger.debug('test');

    const output = stderrWrite.mock.calls[0]?.[0] as string;
    // ISO timestamp pattern
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('does not include timestamp in non-debug mode', () => {
    const logger = createLogger({ level: 'warn' });
    logger.warn('test');

    const output = stderrWrite.mock.calls[0]?.[0] as string;
    expect(output).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
