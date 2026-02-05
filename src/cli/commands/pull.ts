/**
 * Pull Command
 *
 * Fetches personas from the remote registry to local cache.
 *
 * Usage:
 *   persona-academy pull <persona-id>
 *   persona-academy pull christensen porter drucker
 *   persona-academy pull --all
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  pullPersona,
  pullPersonas,
  listRegistryPersonas,
  checkRegistryAccess,
  getCacheStats,
  DEFAULT_REGISTRY_CONFIG,
} from '../../registry/index.js';
import type { RegistryConfig } from '../../registry/types.js';

export const pullCommand = new Command('pull')
  .description('Pull personas from the remote registry')
  .argument('[personas...]', 'Persona IDs to pull')
  .option('-a, --all', 'Pull all available personas')
  .option('-f, --force', 'Force re-download even if cached')
  .option('-r, --registry <repo>', 'Custom registry (owner/repo)')
  .option('-b, --branch <branch>', 'Registry branch', 'main')
  .action(async (personaIds: string[], options) => {
    const spinner = ora();

    try {
      // Build config
      const config: RegistryConfig = {
        ...DEFAULT_REGISTRY_CONFIG,
        ...(options.registry && { repository: options.registry }),
        ...(options.branch && { branch: options.branch }),
      };

      // Check registry access
      spinner.start('Checking registry access...');
      const access = await checkRegistryAccess(config);

      if (!access.accessible) {
        spinner.fail(chalk.red('Cannot access registry'));
        console.log(chalk.dim(access.message));
        process.exit(1);
      }

      spinner.succeed(access.message);

      // Determine which personas to pull
      let targetPersonas: string[] = personaIds;

      if (options.all) {
        spinner.start('Fetching persona list...');
        const remotePersonas = await listRegistryPersonas(config);

        if (remotePersonas.length === 0) {
          spinner.info('No personas available in registry');
          return;
        }

        targetPersonas = remotePersonas.map((p) => p.id);
        spinner.succeed(`Found ${targetPersonas.length} personas`);
      }

      if (targetPersonas.length === 0) {
        console.log(chalk.yellow('\nNo personas specified.'));
        console.log(chalk.dim('Usage: persona-academy pull <persona-id> [more-ids...]'));
        console.log(chalk.dim('       persona-academy pull --all'));
        return;
      }

      // Pull personas
      console.log(chalk.cyan(`\n📥 Pulling ${targetPersonas.length} persona(s)...\n`));

      const results = await pullPersonas(targetPersonas, options.force, config);

      // Display results
      let successCount = 0;
      let failCount = 0;

      for (const result of results) {
        if (result.success) {
          successCount++;
          const icon = result.action === 'downloaded' ? '⬇️' : result.action === 'updated' ? '🔄' : '✓';
          const actionText = {
            downloaded: chalk.green('Downloaded'),
            updated: chalk.blue('Updated'),
            'already-current': chalk.dim('Up to date'),
            failed: chalk.red('Failed'),
          }[result.action];

          console.log(`  ${icon} ${chalk.bold(result.personaId)}: ${actionText}`);

          if (result.localPath && result.action !== 'already-current') {
            console.log(chalk.dim(`     → ${result.localPath}`));
          }
        } else {
          failCount++;
          console.log(`  ❌ ${chalk.bold(result.personaId)}: ${chalk.red(result.message)}`);
        }
      }

      // Summary
      console.log(chalk.cyan('\n📊 Summary\n'));

      if (failCount === 0) {
        console.log(chalk.green(`  All ${successCount} persona(s) processed successfully`));
      } else {
        console.log(`  ${chalk.green(`Success: ${successCount}`)} | ${chalk.red(`Failed: ${failCount}`)}`);
      }

      // Cache stats
      const stats = getCacheStats(config);
      console.log(chalk.dim(`\n  Cache: ${stats.totalCached} personas in ${stats.cacheDir}`));

      process.exit(failCount > 0 ? 1 : 0);
    } catch (error) {
      spinner.fail(chalk.red('Pull failed'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
