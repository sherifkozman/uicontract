#!/usr/bin/env node
/**
 * uic CLI entry point.
 *
 * stdout: command output (manifests, query results)
 * stderr: logs, errors, help
 */

import { VERSION } from '@uic/core';
import { scanCommand } from '../commands/index.js';

const MAIN_HELP = `\
uic — makes web app UIs machine-readable

USAGE
  uic <command> [options]

COMMANDS
  scan <directory>    Scan a project and emit a UI manifest

GLOBAL OPTIONS
  --version, -V       Print the uic version and exit
  --help, -h          Show this help message

Run "uic <command> --help" for command-specific help.
  e.g. uic scan --help
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [command, ...rest] = args;

  // Global --version / -V
  if (command === '--version' || command === '-V') {
    process.stdout.write(`uic v${VERSION}\n`);
    process.exit(0);
  }

  // Global --help / -h (or no args)
  if (command === '--help' || command === '-h' || command === undefined) {
    process.stderr.write(MAIN_HELP);
    process.exit(0);
  }

  // Route to subcommands
  if (command === 'scan') {
    const code = await scanCommand(rest);
    process.exit(code);
  }

  // Unknown command
  process.stderr.write(
    `Error: Unknown command "${command}". Run "uic --help" for the list of commands.\n`,
  );

  // Provide a hint if the user forgot to specify a subcommand and passed a path
  if (command.startsWith('.') || command.startsWith('/')) {
    process.stderr.write(`Hint: Did you mean "uic scan ${command}"?\n`);
  }

  process.exit(1);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal: ${message}\n`);
  process.exit(1);
});
