/**
 * Structured logger for the UIC system.
 * All output goes to stderr (never stdout).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/** Numeric ordering of log levels for filtering */
export const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface CreateLoggerOptions {
  level?: LogLevel;
  prefix?: string;
}

/**
 * Creates a structured logger that writes to stderr.
 *
 * Default level: 'warn'. Use --verbose for 'debug', --quiet for 'error'.
 */
export function createLogger(options?: CreateLoggerOptions): Logger {
  const level = options?.level ?? 'warn';
  const prefix = options?.prefix ?? 'UIC';
  const threshold = LOG_LEVELS[level];

  function shouldLog(msgLevel: LogLevel): boolean {
    return LOG_LEVELS[msgLevel] >= threshold;
  }

  function formatContext(context?: Record<string, unknown>): string {
    if (!context || Object.keys(context).length === 0) {
      return '';
    }
    return ' ' + JSON.stringify(context);
  }

  function write(msgLevel: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!shouldLog(msgLevel)) {
      return;
    }

    const tag = msgLevel.toUpperCase();
    const contextStr = formatContext(context);

    if (level === 'debug') {
      const timestamp = new Date().toISOString();
      process.stderr.write(`[${prefix}] [${tag}] ${timestamp} ${message}${contextStr}\n`);
    } else {
      process.stderr.write(`[${prefix}] [${tag}] ${message}${contextStr}\n`);
    }
  }

  return {
    debug(message: string, context?: Record<string, unknown>): void {
      write('debug', message, context);
    },
    info(message: string, context?: Record<string, unknown>): void {
      write('info', message, context);
    },
    warn(message: string, context?: Record<string, unknown>): void {
      write('warn', message, context);
    },
    error(message: string, context?: Record<string, unknown>): void {
      write('error', message, context);
    },
  };
}
