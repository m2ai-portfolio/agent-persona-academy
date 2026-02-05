/**
 * Report Command
 *
 * Generates comprehensive quality reports for personas.
 * Analyzes fidelity, voice consistency, and framework coverage.
 *
 * Usage:
 *   persona-academy report <path> [--text "sample"]
 *   persona-academy report ./personas/christensen --text "my response"
 *   persona-academy report ./personas/christensen --json
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { loadPersonaFromFile } from '../../core/index.js';
import {
  generateQualityReport,
  formatReport,
  generateJSONReport,
  generateSummary,
  passesQualityThresholds,
  runTestSuite,
  formatTestResults,
  generateJUnitReport,
} from '../../validation/index.js';

export const reportCommand = new Command('report')
  .description('Generate quality report for a persona')
  .argument('<path>', 'Path to persona directory or YAML file')
  .option('-t, --text <text>', 'Text to analyze for quality')
  .option('-f, --file <file>', 'File containing text to analyze')
  .option('--json', 'Output report as JSON')
  .option('--junit', 'Output test results as JUnit XML')
  .option('--run-tests', 'Include full test suite in report')
  .option('--fidelity-threshold <score>', 'Fidelity threshold', '70')
  .option('--voice-threshold <score>', 'Voice consistency threshold', '60')
  .option('--framework-threshold <score>', 'Framework coverage threshold', '50')
  .action(async (inputPath: string, options) => {
    const spinner = ora();

    try {
      // Resolve the persona file path
      const resolvedPath = resolve(inputPath);
      let yamlPath: string;

      if (resolvedPath.endsWith('.yaml') || resolvedPath.endsWith('.yml')) {
        yamlPath = resolvedPath;
      } else {
        yamlPath = join(resolvedPath, 'persona.yaml');
      }

      if (!existsSync(yamlPath)) {
        console.error(chalk.red(`File not found: ${yamlPath}`));
        process.exit(1);
      }

      spinner.start('Loading persona...');
      const persona = loadPersonaFromFile(yamlPath);
      spinner.succeed(`Loaded: ${persona.identity.name}`);

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
      } else {
        // Use first good sample response if available
        const samples = persona.sample_responses ?? {};
        const firstSample = Object.values(samples)[0];
        if (firstSample) {
          textToAnalyze = firstSample.good_response;
          console.log(chalk.dim('Using first sample response for analysis...'));
        }
      }

      if (!textToAnalyze) {
        console.error(chalk.yellow('No text to analyze. Provide --text or --file, or add sample_responses to persona.'));
        console.log(chalk.dim('Running test suite only...'));
      }

      const config = {
        fidelityThreshold: parseInt(options.fidelityThreshold, 10),
        voiceThreshold: parseInt(options.voiceThreshold, 10),
        frameworkThreshold: parseInt(options.frameworkThreshold, 10),
      };

      // Generate quality report if we have text
      if (textToAnalyze) {
        spinner.start('Analyzing text quality...');
        const report = generateQualityReport(textToAnalyze, persona, config);
        spinner.succeed('Analysis complete');

        if (options.json) {
          console.log(generateJSONReport(report));
        } else {
          console.log();
          console.log(formatReport(report));
        }

        // Check thresholds
        const { passed, failures } = passesQualityThresholds(report, config);
        if (!passed) {
          console.log();
          console.log(chalk.yellow('Quality thresholds not met:'));
          for (const failure of failures) {
            console.log(chalk.red(`  ✗ ${failure}`));
          }
        }
      }

      // Run test suite if requested
      if (options.runTests || options.junit) {
        spinner.start('Running test suite...');
        const testResults = runTestSuite(persona, config);
        spinner.succeed(`Tests complete: ${testResults.passedTests}/${testResults.totalTests} passed`);

        if (options.junit) {
          console.log(generateJUnitReport(testResults));
        } else if (!options.json) {
          console.log();
          console.log(formatTestResults(testResults));
        }

        // Set exit code based on test results
        if (testResults.failedTests > 0) {
          process.exit(1);
        }
      }

      // Summary
      if (textToAnalyze && !options.json) {
        const report = generateQualityReport(textToAnalyze, persona, config);
        console.log();
        console.log(chalk.cyan('Summary: ') + generateSummary(report));
      }

    } catch (error) {
      spinner.fail(chalk.red('Report error'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
