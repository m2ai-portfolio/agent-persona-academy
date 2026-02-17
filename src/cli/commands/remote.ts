/**
 * Remote Command
 *
 * Lists and searches personas in the remote registry.
 *
 * Usage:
 *   persona-academy remote
 *   persona-academy remote --category business-strategist
 *   persona-academy remote --search "disruption"
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  fetchRegistryIndex,
  listRegistryPersonas,
  searchRegistryPersonas,
  checkRegistryAccess,
  isPersonaCached,
  DEFAULT_REGISTRY_CONFIG,
} from '../../registry/index.js';
import type { RegistryConfig, RegistryEntry } from '../../registry/types.js';
import type { PersonaCategory } from '../../core/types.js';

export const remoteCommand = new Command('remote')
  .description('List personas available in the remote registry')
  .option('-c, --category <category>', 'Filter by category')
  .option('-s, --search <query>', 'Search by name, summary, or tags')
  .option('-r, --registry <repo>', 'Custom registry (owner/repo)')
  .option('-b, --branch <branch>', 'Registry branch', 'main')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora();

    try {
      // Build config
      const config: RegistryConfig = {
        ...DEFAULT_REGISTRY_CONFIG,
        ...(options.registry && { repository: options.registry }),
        ...(options.branch && { branch: options.branch }),
      };

      // Check registry access
      spinner.start('Connecting to registry...');
      const access = await checkRegistryAccess(config);

      if (!access.accessible) {
        spinner.fail(chalk.red('Cannot access registry'));
        console.log(chalk.dim(access.message));
        process.exit(1);
      }

      spinner.text = 'Fetching personas...';

      // Fetch personas
      let personas: RegistryEntry[];

      if (options.search) {
        personas = await searchRegistryPersonas(options.search, config);
      } else {
        personas = await listRegistryPersonas(config);
      }

      // Apply category filter
      if (options.category) {
        personas = personas.filter((p) => p.category === options.category);
      }

      spinner.stop();

      // JSON output
      if (options.json) {
        console.log(JSON.stringify(personas, null, 2));
        return;
      }

      // No results
      if (personas.length === 0) {
        console.log(chalk.yellow('\nNo personas found in registry.'));

        if (options.search) {
          console.log(chalk.dim(`Search: "${options.search}"`));
        }
        if (options.category) {
          console.log(chalk.dim(`Category: ${options.category}`));
        }

        return;
      }

      // Header
      console.log(chalk.cyan('\n🌐 Remote Persona Registry\n'));
      console.log(chalk.dim(`  Repository: ${config.repository}`));

      if (options.search) {
        console.log(chalk.dim(`  Search: "${options.search}"`));
      }

      console.log();

      // Group by category
      const byCategory = groupByCategory(personas);

      for (const [category, categoryPersonas] of Object.entries(byCategory)) {
        console.log(chalk.bold(`${formatCategory(category)}`));

        for (const persona of categoryPersonas) {
          const cached = isPersonaCached(persona.id, config);
          const cacheIndicator = cached ? chalk.green(' [cached]') : '';

          console.log(`  ${chalk.cyan(persona.id)}${cacheIndicator} - ${persona.name}`);
          console.log(chalk.dim(`    ${persona.summary}`));
          console.log(
            chalk.dim(
              `    v${persona.version} | ${persona.frameworkCount} frameworks | ${persona.caseStudyCount} cases | by ${persona.author}`,
            ),
          );

          if (persona.tags.length > 0) {
            console.log(chalk.dim(`    Tags: ${persona.tags.join(', ')}`));
          }
        }

        console.log();
      }

      // Summary
      console.log(chalk.dim(`Total: ${personas.length} persona(s)`));
      console.log(chalk.dim('\nUse "persona-academy pull <id>" to download'));

      if (!access.authenticated) {
        console.log(chalk.yellow('\n⚠️  Unauthenticated - rate limits apply.'));
        console.log(chalk.dim('   Set GITHUB_TOKEN for higher limits.'));
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch registry'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

function groupByCategory(personas: RegistryEntry[]): Record<string, RegistryEntry[]> {
  const grouped: Record<string, RegistryEntry[]> = {};

  for (const persona of personas) {
    const cat = persona.category || 'custom';
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(persona);
  }

  return grouped;
}

function formatCategory(category: string): string {
  const icons: Record<string, string> = {
    'business-strategist': '📊',
    'technical-architect': '🔧',
    'domain-expert': '🏥',
    creative: '🎨',
    custom: '⚡',
  };

  const names: Record<string, string> = {
    'business-strategist': 'Business Strategists',
    'technical-architect': 'Technical Architects',
    'domain-expert': 'Domain Experts',
    creative: 'Creative',
    custom: 'Custom',
  };

  const icon = icons[category] || '📦';
  const name = names[category] || category;

  return `${icon} ${name}`;
}
