/**
 * Test Command
 *
 * Runs fidelity tests against a persona using sample responses.
 * Tests both the good and bad examples from the persona definition.
 *
 * Usage:
 *   persona-academy test <path>
 *   persona-academy test ./personas/christensen --verbose
 *   persona-academy test ./personas/christensen --text "sample response"
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import {
  loadPersonaFromFile,
  calculateFidelityScore,
  validateAgainstSamples,
  getSuggestions,
} from '../../core/index.js';

export const testCommand = new Command('test')
  .description('Run fidelity tests on a persona')
  .argument('<path>', 'Path to persona directory or YAML file')
  .option('-v, --verbose', 'Show detailed test output')
  .option('-t, --text <text>', 'Test a specific text against the persona')
  .option('--threshold <score>', 'Minimum score to pass', '70')
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

      const threshold = parseInt(options.threshold, 10);

      // If testing specific text
      if (options.text) {
        console.log(chalk.cyan('\n📝 Testing provided text...\n'));

        const score = calculateFidelityScore(options.text, persona);
        displayScore(score, threshold, options.verbose);

        if (!score.passed) {
          console.log(chalk.yellow('\n💡 Suggestions:'));
          const suggestions = getSuggestions(options.text, persona);
          for (const suggestion of suggestions.slice(0, 5)) {
            console.log(`   ${suggestion}`);
          }
        }

        process.exit(score.passed ? 0 : 1);
      }

      // Run full test suite using sample responses
      console.log(chalk.cyan('\n🧪 Running fidelity tests...\n'));

      const samples = persona.sample_responses ?? {};
      const sampleIds = Object.keys(samples);

      if (sampleIds.length === 0) {
        console.log(chalk.yellow('No sample responses defined in persona.'));
        console.log(chalk.dim('Add sample_responses to persona.yaml for testing.'));
        process.exit(0);
      }

      let passCount = 0;
      let failCount = 0;

      for (const id of sampleIds) {
        const sample = samples[id];
        console.log(chalk.bold(`Test: ${id}`));
        console.log(chalk.dim(`  Prompt: "${sample.prompt.slice(0, 60)}..."`));

        // Test good response
        const goodScore = calculateFidelityScore(sample.good_response, persona);
        const goodPassed = goodScore.score >= threshold;

        if (goodPassed) {
          console.log(chalk.green(`  ✓ Good response: ${goodScore.score}/100`));
          passCount++;
        } else {
          console.log(
            chalk.red(`  ✗ Good response: ${goodScore.score}/100 (expected ≥${threshold})`),
          );
          failCount++;
        }

        // Test bad response if available
        if (sample.bad_response) {
          const badScore = calculateFidelityScore(sample.bad_response, persona);
          const badShouldFail = badScore.score < threshold;

          if (badShouldFail) {
            console.log(
              chalk.green(`  ✓ Bad response correctly scored low: ${badScore.score}/100`),
            );
            passCount++;
          } else {
            console.log(
              chalk.yellow(`  ⚠ Bad response scored unexpectedly high: ${badScore.score}/100`),
            );
            // Not a failure, but a warning
          }
        }

        if (options.verbose) {
          console.log(chalk.dim(`  Breakdown:`));
          console.log(
            chalk.dim(
              `    must_include: ${goodScore.breakdown.must_include.matched}/${goodScore.breakdown.must_include.total}`,
            ),
          );
          console.log(
            chalk.dim(
              `    should_include: ${goodScore.breakdown.should_include.matched}/${goodScore.breakdown.should_include.total}`,
            ),
          );
          if (goodScore.breakdown.must_avoid.triggered > 0) {
            console.log(
              chalk.dim(`    violations: ${goodScore.breakdown.must_avoid.patterns.join(', ')}`),
            );
          }
        }

        console.log();
      }

      // Summary
      console.log(chalk.bold('─'.repeat(50)));
      console.log(chalk.bold('\n📊 Summary\n'));

      const total = passCount + failCount;
      const passRate = Math.round((passCount / total) * 100);

      if (failCount === 0) {
        console.log(chalk.green(`  All tests passed! (${passCount}/${total})`));
      } else {
        console.log(chalk.yellow(`  Passed: ${passCount}/${total} (${passRate}%)`));
        console.log(chalk.red(`  Failed: ${failCount}/${total}`));
      }

      // Validation markers summary
      const markers = persona.validation;
      console.log(chalk.cyan('\n📋 Validation Markers:'));
      console.log(`   must_include: ${markers.must_include.length} patterns`);
      console.log(`   should_include: ${(markers.should_include ?? []).length} patterns`);
      console.log(`   must_avoid: ${(markers.must_avoid ?? []).length} patterns`);

      process.exit(failCount === 0 ? 0 : 1);
    } catch (error) {
      spinner.fail(chalk.red('Test error'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

/**
 * Display a fidelity score with formatting
 */
function displayScore(
  score: ReturnType<typeof calculateFidelityScore>,
  threshold: number,
  verbose: boolean,
): void {
  const emoji = score.passed ? '✓' : '✗';
  const color = score.passed ? chalk.green : chalk.red;

  console.log(color(`${emoji} Fidelity Score: ${score.score}/100`));
  console.log(chalk.dim(`  Threshold: ${threshold}`));
  console.log();

  // Breakdown
  console.log(chalk.cyan('Breakdown:'));
  console.log(
    `  Required patterns: ${score.breakdown.must_include.matched}/${score.breakdown.must_include.total}`,
  );

  if (score.breakdown.should_include.total > 0) {
    console.log(
      `  Bonus patterns: ${score.breakdown.should_include.matched}/${score.breakdown.should_include.total}`,
    );
  }

  if (score.breakdown.must_avoid.triggered > 0) {
    console.log(chalk.red(`  Violations: ${score.breakdown.must_avoid.triggered}`));
  }

  if (verbose) {
    console.log(chalk.cyan('\nMatched patterns:'));
    for (const pattern of score.breakdown.must_include.patterns) {
      console.log(chalk.green(`  ✓ ${pattern}`));
    }
    for (const pattern of score.breakdown.should_include.patterns) {
      console.log(chalk.blue(`  + ${pattern}`));
    }

    if (score.breakdown.must_avoid.patterns.length > 0) {
      console.log(chalk.cyan('\nViolations:'));
      for (const pattern of score.breakdown.must_avoid.patterns) {
        console.log(chalk.red(`  ✗ ${pattern}`));
      }
    }
  }

  console.log();
  console.log(chalk.dim(score.assessment));
}
