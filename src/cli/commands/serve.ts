/**
 * Serve Command
 *
 * Starts the unified multi-persona MCP server.
 *
 * Usage:
 *   persona-academy serve
 *   persona-academy serve --personas ./my-personas --default porter
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { resolve, join, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const serveCommand = new Command('serve')
  .description('Start the unified multi-persona MCP server')
  .option('-p, --personas <dir>', 'Personas directory', './personas')
  .option('-d, --default <id>', 'Default persona to activate')
  .option('--no-cache', 'Exclude cached personas')
  .option('--foreground', 'Run in foreground (default for MCP)')
  .action(async (options) => {
    const personasDir = resolve(options.personas);

    // Verify personas directory exists
    if (!existsSync(personasDir)) {
      console.error(chalk.red(`Personas directory not found: ${personasDir}`));
      console.error(chalk.dim('Create personas with: persona-academy create <name>'));
      console.error(chalk.dim('Or pull from registry: persona-academy pull <id>'));
      process.exit(1);
    }

    // Find the server script
    const serverPaths = [
      join(__dirname, '../../unified-server/index.js'),
      join(__dirname, '../../../dist/unified-server/index.js'),
    ];

    let serverPath: string | undefined;
    for (const path of serverPaths) {
      if (existsSync(path)) {
        serverPath = path;
        break;
      }
    }

    if (!serverPath) {
      console.error(chalk.red('Server script not found. Run npm run build first.'));
      process.exit(1);
    }

    // Build args
    const args = ['--personas', personasDir];

    if (options.default) {
      args.push('--default', options.default);
    }

    if (!options.cache) {
      args.push('--no-cache');
    }

    console.log(chalk.cyan('🎭 Starting Persona Academy MCP Server\n'));
    console.log(`  Personas: ${chalk.bold(personasDir)}`);
    if (options.default) {
      console.log(`  Default: ${chalk.bold(options.default)}`);
    }
    console.log();

    // For MCP, we need to pass through stdio
    // This command is mainly for documentation/testing
    // Actual usage is via claude_desktop_config.json

    console.log(chalk.yellow('Note: For Claude Desktop, add to your config:\n'));
    console.log(
      chalk.dim(
        JSON.stringify(
          {
            mcpServers: {
              'persona-academy': {
                command: 'node',
                args: [
                  serverPath,
                  '--personas',
                  personasDir,
                  ...(options.default ? ['--default', options.default] : []),
                ],
              },
            },
          },
          null,
          2,
        ),
      ),
    );

    console.log(chalk.yellow('\nTo test directly, the server will start now...'));
    console.log(chalk.dim('Press Ctrl+C to stop\n'));

    // Spawn the server process
    const child = spawn('node', [serverPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    child.on('error', (error) => {
      console.error(chalk.red(`Failed to start server: ${error.message}`));
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });
  });
