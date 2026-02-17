/**
 * Cache Command
 *
 * Manages the local persona cache.
 *
 * Usage:
 *   persona-academy cache              # Show cache status
 *   persona-academy cache list         # List cached personas
 *   persona-academy cache clear        # Clear entire cache
 *   persona-academy cache remove <id>  # Remove specific persona
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import {
  getCacheStats,
  listCachedPersonas,
  removeCachedPersona,
  clearCache,
  DEFAULT_REGISTRY_CONFIG,
} from '../../registry/index.js';

export const cacheCommand = new Command('cache')
  .description('Manage local persona cache')
  .action(async () => {
    // Default action: show cache status
    const stats = getCacheStats();

    console.log(chalk.cyan('\n📦 Persona Cache Status\n'));
    console.log(`  Location: ${chalk.bold(stats.cacheDir)}`);
    console.log(`  Total cached: ${chalk.bold(stats.totalCached)}`);
    console.log(`  With local changes: ${stats.withLocalChanges}`);
    console.log(`  Last updated: ${stats.lastUpdated}`);

    if (stats.totalCached > 0) {
      console.log(chalk.dim('\nCommands:'));
      console.log(chalk.dim('  persona-academy cache list    - List cached personas'));
      console.log(chalk.dim('  persona-academy cache clear   - Clear entire cache'));
    }
  });

// Subcommand: list
cacheCommand
  .command('list')
  .description('List all cached personas')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const cached = listCachedPersonas();

    if (options.json) {
      console.log(JSON.stringify(cached, null, 2));
      return;
    }

    if (cached.length === 0) {
      console.log(chalk.yellow('\nNo personas cached.'));
      console.log(chalk.dim('Use "persona-academy pull <id>" to download personas.'));
      return;
    }

    console.log(chalk.cyan('\n📦 Cached Personas\n'));

    for (const persona of cached) {
      const changesIndicator = persona.hasLocalChanges ? chalk.yellow(' [modified]') : '';

      console.log(`  ${chalk.green(persona.entry.id)}${changesIndicator}`);
      console.log(chalk.dim(`    ${persona.entry.name} v${persona.entry.version}`));
      console.log(chalk.dim(`    Cached: ${new Date(persona.cachedAt).toLocaleString()}`));
      console.log(chalk.dim(`    Path: ${persona.localPath}`));
      console.log();
    }

    console.log(chalk.dim(`Total: ${cached.length} persona(s)`));
  });

// Subcommand: clear
cacheCommand
  .command('clear')
  .description('Clear the entire persona cache')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (options) => {
    const stats = getCacheStats();

    if (stats.totalCached === 0) {
      console.log(chalk.yellow('\nCache is already empty.'));
      return;
    }

    // Confirm unless -y flag
    if (!options.yes) {
      const shouldClear = await confirm({
        message: `Clear ${stats.totalCached} cached persona(s)?`,
        default: false,
      });

      if (!shouldClear) {
        console.log(chalk.yellow('Aborted.'));
        return;
      }
    }

    const count = clearCache();
    console.log(chalk.green(`\n✓ Cleared ${count} persona(s) from cache.`));
  });

// Subcommand: remove
cacheCommand
  .command('remove <persona-id>')
  .description('Remove a specific persona from cache')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (personaId: string, options) => {
    // Check if persona is cached
    const cached = listCachedPersonas();
    const persona = cached.find((p) => p.entry.id === personaId);

    if (!persona) {
      console.log(chalk.yellow(`\nPersona "${personaId}" is not cached.`));
      return;
    }

    // Confirm unless -y flag
    if (!options.yes) {
      const shouldRemove = await confirm({
        message: `Remove "${persona.entry.name}" from cache?`,
        default: false,
      });

      if (!shouldRemove) {
        console.log(chalk.yellow('Aborted.'));
        return;
      }
    }

    const removed = removeCachedPersona(personaId);

    if (removed) {
      console.log(chalk.green(`\n✓ Removed "${personaId}" from cache.`));
    } else {
      console.log(chalk.red(`\nFailed to remove "${personaId}".`));
    }
  });
