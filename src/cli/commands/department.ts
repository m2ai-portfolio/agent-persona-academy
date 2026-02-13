/**
 * Department Command
 *
 * List and inspect departments in the Academy.
 *
 * Usage:
 *   persona-academy department list
 *   persona-academy department info <id>
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { resolve } from 'path';
import {
  discoverDepartments,
  getDepartment,
} from '../../departments/index.js';

export const departmentCommand = new Command('department')
  .description('Manage Academy departments');

departmentCommand
  .command('list')
  .description('List all departments')
  .option('-d, --dir <path>', 'Departments directory', './departments')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const departmentsDir = resolve(options.dir);
      const departments = discoverDepartments(departmentsDir);

      if (departments.length === 0) {
        console.log(chalk.yellow('No departments found.'));
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(departments, null, 2));
        return;
      }

      console.log(chalk.cyan('\n🏛️  Academy Departments\n'));

      for (const dept of departments) {
        console.log(chalk.bold(`  ${dept.name} (${chalk.green(dept.id)})`));
        console.log(chalk.dim(`    ${dept.mission}`));
        console.log(chalk.dim(`    Personas: ${dept.personas.join(', ')}`));
        console.log();
      }

      console.log(chalk.dim(`Total: ${departments.length} department(s)`));
      console.log(chalk.dim('\nUse "persona-academy department info <id>" for details'));
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

departmentCommand
  .command('info')
  .description('Show details about a department')
  .argument('<id>', 'Department ID')
  .option('-d, --dir <path>', 'Departments directory', './departments')
  .action(async (id: string, options) => {
    try {
      const departmentsDir = resolve(options.dir);
      discoverDepartments(departmentsDir);

      const dept = getDepartment(id);

      if (!dept) {
        console.error(chalk.red(`Department '${id}' not found.`));
        process.exit(1);
      }

      console.log(chalk.cyan(`\n🏛️  ${dept.identity.name}\n`));
      console.log(`${chalk.bold('ID:')} ${dept.identity.id}`);
      console.log(`${chalk.bold('Mission:')} ${dept.identity.mission}`);

      console.log(`\n${chalk.bold('Quality Criteria:')}`);
      const overrides = dept.quality_criteria.validation_overrides;
      if (overrides.fidelity_threshold != null) {
        console.log(`  Fidelity threshold: ${overrides.fidelity_threshold}`);
      }
      if (overrides.voice_threshold != null) {
        console.log(`  Voice threshold: ${overrides.voice_threshold}`);
      }
      if (overrides.framework_threshold != null) {
        console.log(`  Framework threshold: ${overrides.framework_threshold}`);
      }
      if (overrides.weights) {
        const w = overrides.weights;
        console.log(`  Weights: fidelity=${w.fidelity}, voice=${w.voice}, framework=${w.framework}`);
      }

      const sharedAvoid = dept.quality_criteria.shared_must_avoid ?? [];
      if (sharedAvoid.length > 0) {
        console.log(`\n${chalk.bold('Shared Must-Avoid Patterns:')}`);
        for (const marker of sharedAvoid) {
          console.log(`  - ${chalk.red(marker.pattern)} ${chalk.dim(`(${marker.description ?? ''})`)}`);
        }
      }

      console.log(`\n${chalk.bold('Learning Policy:')}`);
      const policy = dept.learning_policy;
      console.log(`  Auto-apply threshold: ${policy.auto_apply_threshold}`);
      console.log(`  Review threshold: ${policy.review_threshold}`);
      console.log(`  Max changes/cycle: ${policy.max_changes_per_cycle}`);
      if (policy.preferred_change_types?.length) {
        console.log(`  Preferred: ${policy.preferred_change_types.join(', ')}`);
      }
      if (policy.restricted_change_types?.length) {
        console.log(`  Restricted: ${chalk.yellow(policy.restricted_change_types.join(', '))}`);
      }

      console.log(`\n${chalk.bold('Personas:')}`);
      for (const personaId of dept.personas) {
        console.log(`  - ${chalk.green(personaId)}`);
      }
      console.log();
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
