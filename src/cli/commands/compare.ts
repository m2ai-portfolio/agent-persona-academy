/**
 * Compare Command
 *
 * Compares text against multiple personas to find the best match.
 * Generates comparative analysis and similarity metrics.
 *
 * Usage:
 *   persona-academy compare <personas-dir> --text "sample"
 *   persona-academy compare ./personas --text "Let me tell you a story..."
 *   persona-academy compare ./personas --file response.txt
 *   persona-academy compare ./personas --matrix
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { loadPersonaFromFile } from '../../core/index.js';
import type { PersonaDefinition } from '../../core/types.js';
import {
  compareAcrossPersonas,
  getComparativeAnalysis,
  generateSimilarityMatrix,
} from '../../validation/index.js';

export const compareCommand = new Command('compare')
  .description('Compare text against multiple personas')
  .argument('<personas-dir>', 'Directory containing personas')
  .option('-t, --text <text>', 'Text to analyze')
  .option('-f, --file <file>', 'File containing text to analyze')
  .option('--matrix', 'Show persona similarity matrix only')
  .option('--json', 'Output as JSON')
  .option('--top <n>', 'Show top N matches', '3')
  .action(async (personasDir: string, options) => {
    const spinner = ora();

    try {
      const resolvedDir = resolve(personasDir);

      if (!existsSync(resolvedDir)) {
        console.error(chalk.red(`Directory not found: ${resolvedDir}`));
        process.exit(1);
      }

      // Load all personas from directory
      spinner.start('Loading personas...');
      const personas = new Map<string, PersonaDefinition>();

      const entries = readdirSync(resolvedDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const yamlPath = join(resolvedDir, entry.name, 'persona.yaml');
          if (existsSync(yamlPath)) {
            try {
              const persona = loadPersonaFromFile(yamlPath);
              personas.set(entry.name, persona);
            } catch {
              // Skip invalid personas
            }
          }
        }
      }

      if (personas.size === 0) {
        spinner.fail('No valid personas found');
        console.error(chalk.red(`No persona.yaml files found in ${resolvedDir}`));
        process.exit(1);
      }

      spinner.succeed(`Loaded ${personas.size} persona(s)`);

      // Show similarity matrix if requested
      if (options.matrix) {
        console.log();
        console.log(chalk.cyan('Persona Similarity Matrix'));
        console.log('═'.repeat(60));

        const matrix = generateSimilarityMatrix(personas);
        const personaIds = [...personas.keys()];

        // Header row
        const header = ''.padEnd(15) + personaIds.map((id) => id.slice(0, 10).padEnd(12)).join('');
        console.log(header);
        console.log('─'.repeat(15 + personaIds.length * 12));

        // Data rows
        for (const [id, row] of matrix) {
          const rowData = personaIds.map((otherId) => {
            const value = row.get(otherId) ?? 0;
            const color = value >= 80 ? chalk.green : value >= 50 ? chalk.yellow : chalk.dim;
            return color(`${value}%`.padEnd(12));
          }).join('');
          console.log(id.slice(0, 14).padEnd(15) + rowData);
        }

        console.log();
        console.log(chalk.cyan('Comparative Analysis'));
        console.log('═'.repeat(60));
        console.log(getComparativeAnalysis(personas));

        return;
      }

      // Get text to analyze
      let textToAnalyze: string | undefined;

      if (options.text) {
        textToAnalyze = options.text;
      } else if (options.file) {
        if (!existsSync(options.file)) {
          console.error(chalk.red(`Text file not found: ${options.file}`));
          process.exit(1);
        }
        textToAnalyze = readFileSync(options.file, 'utf-8');
      }

      if (!textToAnalyze) {
        console.error(chalk.red('No text to analyze. Provide --text or --file.'));
        console.log(chalk.dim('Use --matrix to see persona similarity without text.'));
        process.exit(1);
      }

      // Compare across personas
      spinner.start('Comparing across personas...');
      const comparison = compareAcrossPersonas(textToAnalyze, personas);
      spinner.succeed('Comparison complete');

      if (options.json) {
        console.log(JSON.stringify({
          bestMatch: comparison.bestMatch,
          results: comparison.results.map((r) => ({
            personaId: r.personaId,
            personaName: r.personaName,
            qualityScore: r.qualityScore,
            fidelityScore: r.fidelityScore.score,
            voiceScore: r.voiceAnalysis.consistencyScore,
            frameworkScore: r.frameworkCoverage.coverageScore,
          })),
        }, null, 2));
        return;
      }

      // Display results
      console.log();
      console.log(chalk.cyan('Cross-Persona Comparison Results'));
      console.log('═'.repeat(60));
      console.log();

      // Text preview
      const preview = textToAnalyze.slice(0, 100).replace(/\n/g, ' ');
      console.log(chalk.dim(`Analyzed: "${preview}..."`));
      console.log();

      // Best match
      const topN = parseInt(options.top, 10);
      const topResults = comparison.results.slice(0, topN);

      console.log(chalk.bold('Rankings:'));
      console.log();

      for (let i = 0; i < topResults.length; i++) {
        const result = topResults[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const scoreBar = '█'.repeat(Math.floor(result.qualityScore / 10)) +
                        '░'.repeat(10 - Math.floor(result.qualityScore / 10));

        console.log(`${medal} ${chalk.bold(result.personaName)}`);
        console.log(`   Overall: ${result.qualityScore}/100 ${scoreBar}`);
        console.log(chalk.dim(`   Fidelity: ${result.fidelityScore.score}/100 | Voice: ${result.voiceAnalysis.consistencyScore}/100 | Framework: ${result.frameworkCoverage.coverageScore}/100`));

        if (i === 0) {
          // Show more details for best match
          console.log();
          console.log(chalk.cyan('   Best Match Analysis:'));

          // Fidelity
          const { must_include, should_include } = result.fidelityScore.breakdown;
          console.log(`   - Required patterns: ${must_include.matched}/${must_include.total}`);
          console.log(`   - Bonus patterns: ${should_include.matched}/${should_include.total}`);

          // Voice
          const tonesDetected = result.voiceAnalysis.toneMarkers.filter((t) => t.detected);
          if (tonesDetected.length > 0) {
            console.log(`   - Detected tones: ${tonesDetected.map((t) => t.expected).join(', ')}`);
          }

          // Frameworks
          const { referencedFrameworks } = result.frameworkCoverage;
          if (referencedFrameworks.length > 0) {
            console.log(`   - Frameworks used: ${referencedFrameworks.join(', ')}`);
          }
        }

        console.log();
      }

      // Summary
      console.log('─'.repeat(60));
      console.log(comparison.summary);

      // Confidence indicator
      if (topResults.length >= 2) {
        const scoreDiff = topResults[0].qualityScore - topResults[1].qualityScore;
        if (scoreDiff < 5) {
          console.log();
          console.log(chalk.yellow('⚠ Close match - consider reviewing both personas for this text.'));
        } else if (scoreDiff > 20) {
          console.log();
          console.log(chalk.green('✓ Strong match confidence'));
        }
      }

    } catch (error) {
      spinner.fail(chalk.red('Comparison error'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
