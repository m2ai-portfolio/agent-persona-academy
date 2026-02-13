/**
 * List Command
 *
 * Lists available personas in the personas directory.
 *
 * Usage:
 *   persona-academy list
 *   persona-academy list --category business-strategist
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { loadPersonaFromFile } from '../../core/index.js';
import type { PersonaCategory } from '../../core/types.js';

export const listCommand = new Command('list')
  .description('List available personas')
  .option('-d, --dir <path>', 'Personas directory', './personas')
  .option('-c, --category <category>', 'Filter by category')
  .option('--department <department>', 'Filter by department')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const personasDir = resolve(options.dir);

      if (!existsSync(personasDir)) {
        console.log(chalk.yellow(`No personas directory found at: ${personasDir}`));
        console.log(chalk.dim('Create your first persona with: persona-academy create <name>'));
        return;
      }

      // Find all persona directories
      const entries = readdirSync(personasDir, { withFileTypes: true });
      const personaDirs = entries.filter(
        (e) => e.isDirectory() && existsSync(join(personasDir, e.name, 'persona.yaml'))
      );

      if (personaDirs.length === 0) {
        console.log(chalk.yellow('No personas found.'));
        console.log(chalk.dim('Create your first persona with: persona-academy create <name>'));
        return;
      }

      // Load persona metadata
      const personas: PersonaSummary[] = [];

      for (const dir of personaDirs) {
        const yamlPath = join(personasDir, dir.name, 'persona.yaml');

        try {
          const persona = loadPersonaFromFile(yamlPath);

          const summary: PersonaSummary = {
            id: dir.name,
            name: persona.identity.name,
            role: persona.identity.role,
            category: persona.metadata?.category ?? 'custom',
            department: persona.metadata?.department,
            frameworks: Object.keys(persona.frameworks).length,
            caseStudies: Object.keys(persona.case_studies ?? {}).length,
            tags: persona.metadata?.tags ?? [],
          };

          // Apply category filter
          if (options.category && summary.category !== options.category) {
            continue;
          }

          // Apply department filter
          if (options.department && summary.department !== options.department) {
            continue;
          }

          personas.push(summary);
        } catch (error) {
          // Skip invalid personas
          if (!options.json) {
            console.log(chalk.dim(`Skipping invalid persona: ${dir.name}`));
          }
        }
      }

      // Output
      if (options.json) {
        console.log(JSON.stringify(personas, null, 2));
        return;
      }

      console.log(chalk.cyan('\n🎭 Available Personas\n'));

      if (personas.length === 0) {
        console.log(chalk.yellow('No personas match the filter.'));
        return;
      }

      // Group by category
      const byCategory = groupByCategory(personas);

      for (const [category, categoryPersonas] of Object.entries(byCategory)) {
        console.log(chalk.bold(`${formatCategory(category)}`));

        for (const persona of categoryPersonas) {
          console.log(
            `  ${chalk.green(persona.id)} - ${persona.name}`
          );
          console.log(
            chalk.dim(
              `    ${persona.role} | ${persona.frameworks} frameworks | ${persona.caseStudies} cases`
            )
          );
        }

        console.log();
      }

      console.log(chalk.dim(`Total: ${personas.length} persona(s)`));
      console.log(chalk.dim('\nUse "persona-academy info <name>" for details'));
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

interface PersonaSummary {
  id: string;
  name: string;
  role: string;
  category: PersonaCategory;
  department?: string;
  frameworks: number;
  caseStudies: number;
  tags: string[];
}

function groupByCategory(
  personas: PersonaSummary[]
): Record<string, PersonaSummary[]> {
  const grouped: Record<string, PersonaSummary[]> = {};

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
