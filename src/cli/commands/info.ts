/**
 * Info Command
 *
 * Shows detailed information about a specific persona.
 *
 * Usage:
 *   persona-academy info <name>
 *   persona-academy info christensen --frameworks
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import {
  loadPersonaFromFile,
  generateSystemPrompt,
} from '../../core/index.js';

export const infoCommand = new Command('info')
  .description('Show details about a persona')
  .argument('<name>', 'Persona name or path')
  .option('-d, --dir <path>', 'Personas directory', './personas')
  .option('-f, --frameworks', 'Show framework details')
  .option('-c, --cases', 'Show case study details')
  .option('-v, --validation', 'Show validation markers')
  .option('-p, --prompt', 'Show generated system prompt')
  .option('--json', 'Output as JSON')
  .action(async (name: string, options) => {
    try {
      // Resolve persona path
      let yamlPath: string;

      if (name.includes('/') || name.includes('\\')) {
        // Path provided
        yamlPath = resolve(name);
        if (!yamlPath.endsWith('.yaml')) {
          yamlPath = join(yamlPath, 'persona.yaml');
        }
      } else {
        // Name provided
        yamlPath = join(resolve(options.dir), name, 'persona.yaml');
      }

      if (!existsSync(yamlPath)) {
        console.error(chalk.red(`Persona not found: ${name}`));
        console.log(chalk.dim(`Searched: ${yamlPath}`));
        process.exit(1);
      }

      const persona = loadPersonaFromFile(yamlPath);

      // JSON output
      if (options.json) {
        console.log(JSON.stringify(persona, null, 2));
        return;
      }

      // Header
      console.log(chalk.cyan('\n' + '═'.repeat(60)));
      console.log(chalk.bold.cyan(`  ${persona.identity.name}`));
      console.log(chalk.cyan('═'.repeat(60)));

      // Identity
      console.log(chalk.bold('\n📋 Identity\n'));
      console.log(`  ${chalk.bold('Role:')} ${persona.identity.role}`);
      console.log(`  ${chalk.bold('Background:')}`);
      console.log(
        persona.identity.background
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n')
      );

      if (persona.identity.era) {
        console.log(`  ${chalk.bold('Era:')} ${persona.identity.era}`);
      }

      if (persona.identity.notable_works?.length) {
        console.log(`  ${chalk.bold('Notable Works:')}`);
        for (const work of persona.identity.notable_works) {
          console.log(`    • ${work}`);
        }
      }

      // Voice
      console.log(chalk.bold('\n🎤 Voice\n'));
      console.log(`  ${chalk.bold('Tone:')} ${persona.voice.tone.join(', ')}`);
      console.log(`  ${chalk.bold('Phrases:')}`);
      for (const phrase of persona.voice.phrases.slice(0, 5)) {
        console.log(`    "${phrase}"`);
      }
      if (persona.voice.phrases.length > 5) {
        console.log(chalk.dim(`    ... and ${persona.voice.phrases.length - 5} more`));
      }

      // Frameworks summary
      const frameworkNames = Object.keys(persona.frameworks);
      console.log(chalk.bold(`\n🧠 Frameworks (${frameworkNames.length})\n`));

      if (options.frameworks) {
        // Detailed framework view
        for (const [name, fw] of Object.entries(persona.frameworks)) {
          console.log(chalk.cyan(`  ${formatName(name)}`));
          console.log(chalk.dim(`    ${fw.description.split('\n')[0].trim()}`));
          console.log(`    Concepts: ${Object.keys(fw.concepts).length}`);
          console.log(`    Questions: ${(fw.questions ?? []).length}`);
          console.log();
        }
      } else {
        // Summary view
        for (const name of frameworkNames) {
          const fw = persona.frameworks[name];
          console.log(
            `  • ${chalk.green(formatName(name))} - ${Object.keys(fw.concepts).length} concepts, ${(fw.questions ?? []).length} questions`
          );
        }
        console.log(chalk.dim('\n  Use --frameworks for details'));
      }

      // Case studies
      const caseNames = Object.keys(persona.case_studies ?? {});
      if (caseNames.length > 0) {
        console.log(chalk.bold(`\n📚 Case Studies (${caseNames.length})\n`));

        if (options.cases) {
          for (const [name, cs] of Object.entries(persona.case_studies ?? {})) {
            console.log(chalk.cyan(`  ${formatName(name)}`));
            console.log(`    Pattern: ${cs.pattern}`);
            console.log(
              chalk.dim(`    ${cs.story.split('\n')[0].trim().slice(0, 80)}...`)
            );
            console.log();
          }
        } else {
          for (const name of caseNames) {
            const cs = persona.case_studies![name];
            console.log(`  • ${chalk.green(formatName(name))} - ${cs.pattern}`);
          }
          console.log(chalk.dim('\n  Use --cases for details'));
        }
      }

      // Validation
      if (options.validation) {
        console.log(chalk.bold('\n✓ Validation Markers\n'));

        console.log(chalk.green('  Must Include:'));
        for (const marker of persona.validation.must_include) {
          console.log(
            `    • ${marker.description ?? marker.pattern} (weight: ${marker.weight ?? 5})`
          );
        }

        if (persona.validation.should_include?.length) {
          console.log(chalk.blue('\n  Should Include:'));
          for (const marker of persona.validation.should_include) {
            console.log(
              `    • ${marker.description ?? marker.pattern} (weight: ${marker.weight ?? 3})`
            );
          }
        }

        if (persona.validation.must_avoid?.length) {
          console.log(chalk.red('\n  Must Avoid:'));
          for (const marker of persona.validation.must_avoid) {
            console.log(
              `    • ${marker.description ?? marker.pattern} (weight: ${marker.weight ?? 10})`
            );
          }
        }
      } else {
        console.log(chalk.bold('\n✓ Validation\n'));
        console.log(
          `  must_include: ${persona.validation.must_include.length} patterns`
        );
        console.log(
          `  should_include: ${(persona.validation.should_include ?? []).length} patterns`
        );
        console.log(
          `  must_avoid: ${(persona.validation.must_avoid ?? []).length} patterns`
        );
        console.log(chalk.dim('\n  Use --validation for details'));
      }

      // Sample responses
      const sampleCount = Object.keys(persona.sample_responses ?? {}).length;
      if (sampleCount > 0) {
        console.log(chalk.bold(`\n📝 Sample Responses: ${sampleCount}\n`));
      }

      // System prompt
      if (options.prompt) {
        console.log(chalk.bold('\n📜 Generated System Prompt\n'));
        console.log(chalk.dim('─'.repeat(60)));
        console.log(generateSystemPrompt(persona));
        console.log(chalk.dim('─'.repeat(60)));
      }

      // Metadata
      if (persona.metadata) {
        console.log(chalk.bold('\n📎 Metadata\n'));
        if (persona.metadata.version) {
          console.log(`  Version: ${persona.metadata.version}`);
        }
        if (persona.metadata.author) {
          console.log(`  Author: ${persona.metadata.author}`);
        }
        if (persona.metadata.category) {
          console.log(`  Category: ${persona.metadata.category}`);
        }
        if (persona.metadata.tags?.length) {
          console.log(`  Tags: ${persona.metadata.tags.join(', ')}`);
        }
      }

      console.log();
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

function formatName(name: string): string {
  return name
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
