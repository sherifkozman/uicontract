#!/usr/bin/env node
/**
 * uic CLI entry point.
 *
 * stdout: command output (manifests, query results)
 * stderr: logs, errors, help
 */

import { VERSION } from '@uicontract/core';
import {
  scanCommand,
  findCommand,
  describeCommand,
  listCommand,
  diffCommand,
  nameCommand,
  annotateCommand,
} from '../commands/index.js';

const MAIN_HELP = `\
uic — makes web app UIs machine-readable

USAGE
  uic <command> [options]

COMMANDS
  scan <directory>    Scan a project and emit a UI manifest
  name <manifest>     Assign stable agent IDs to elements in a manifest
  annotate            Insert data-agent-id attributes into source files
  find <query>        Search for elements by name, label, route, or handler
  describe <id>       Show full details of an element by agent ID
  list                List all elements with optional filtering
  diff <old> <new>    Compare two manifests and report changes

GLOBAL OPTIONS
  --version, -V       Print the uic version and exit
  --help, -h          Show this help message

Run "uicontract <command> --help" for command-specific help.
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

  if (command === 'find') {
    const code = await findCommand(rest);
    process.exit(code);
  }

  if (command === 'describe') {
    const code = await describeCommand(rest);
    process.exit(code);
  }

  if (command === 'list') {
    const code = await listCommand(rest);
    process.exit(code);
  }

  if (command === 'diff') {
    const code = await diffCommand(rest);
    process.exit(code);
  }

  if (command === 'name') {
    const code = await nameCommand(rest);
    process.exit(code);
  }

  if (command === 'annotate') {
    const code = await annotateCommand(rest);
    process.exit(code);
  }

  // Unknown command
  process.stderr.write(
    `Error: Unknown command "${command}". Run "uicontract --help" for the list of commands.\n`,
  );

  // Provide a hint if the user forgot to specify a subcommand and passed a path
  if (command.startsWith('.') || command.startsWith('/')) {
    process.stderr.write(`Hint: Did you mean "uicontract scan ${command}"?\n`);
  }

  process.exit(1);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal: ${message}\n`);
  process.exit(1);
});
