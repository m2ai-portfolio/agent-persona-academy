/**
 * Validate Command
 *
 * Validates persona YAML files against the JSON schema.
 * Provides detailed error messages for fixing issues.
 *
 * Usage:
 *   persona-academy validate <path>
 *   persona-academy validate ./personas/christensen
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import AjvModule, { type ErrorObject } from 'ajv';

// ESM compatibility - handle both default and named export
const Ajv = AjvModule.default || AjvModule;
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { resolveExternalFiles } from '../../core/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const validateCommand = new Command('validate')
  .description('Validate persona YAML against schema')
  .argument('<path>', 'Path to persona directory or YAML file')
  .option('-v, --verbose', 'Show detailed validation output')
  .option('-s, --schema <path>', 'Custom schema file path')
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

      spinner.start('Validating persona...');

      // Load and parse YAML
      const yamlContent = readFileSync(yamlPath, 'utf-8');
      let persona: unknown;

      try {
        persona = parseYaml(yamlContent);
      } catch (parseError) {
        spinner.fail(chalk.red('YAML parse error'));
        if (parseError instanceof Error) {
          console.error(chalk.red(`  ${parseError.message}`));
        }
        process.exit(1);
      }

      // Resolve convention-based external files before schema validation
      if (persona && typeof persona === 'object') {
        resolveExternalFiles(persona as unknown as import('../../core/types.js').PersonaDefinition, dirname(yamlPath));
      }

      // Load schema
      const schemaPath =
        options.schema ||
        join(__dirname, '../../../schema/persona-schema.json');

      if (!existsSync(schemaPath)) {
        // Try alternative paths
        const altPaths = [
          join(__dirname, '../../schema/persona-schema.json'),
          join(__dirname, '../../../../schema/persona-schema.json'),
        ];

        let foundSchema = false;
        for (const altPath of altPaths) {
          if (existsSync(altPath)) {
            options.schema = altPath;
            foundSchema = true;
            break;
          }
        }

        if (!foundSchema) {
          spinner.fail(chalk.red('Schema file not found'));
          console.error(chalk.dim(`Searched: ${schemaPath}`));
          process.exit(1);
        }
      }

      const schema = JSON.parse(
        readFileSync(options.schema || schemaPath, 'utf-8')
      );

      // Validate with AJV
      const ajv = new Ajv({ allErrors: true, verbose: true });
      const validate = ajv.compile(schema);
      const valid = validate(persona);

      if (valid) {
        spinner.succeed(chalk.green('Persona is valid!'));

        // Show summary if verbose
        if (options.verbose && typeof persona === 'object' && persona !== null) {
          const p = persona as Record<string, unknown>;
          console.log(chalk.cyan('\n📋 Summary:'));

          if (p.identity && typeof p.identity === 'object') {
            const identity = p.identity as Record<string, unknown>;
            console.log(`   Name: ${identity.name}`);
            console.log(`   Role: ${identity.role}`);
          }

          if (p.frameworks && typeof p.frameworks === 'object') {
            console.log(`   Frameworks: ${Object.keys(p.frameworks).length}`);
          }

          if (p.case_studies && typeof p.case_studies === 'object') {
            console.log(`   Case Studies: ${Object.keys(p.case_studies).length}`);
          }

          if (p.validation && typeof p.validation === 'object') {
            const validation = p.validation as Record<string, unknown[]>;
            console.log(`   Validation Markers:`);
            console.log(`     - must_include: ${validation.must_include?.length || 0}`);
            console.log(`     - should_include: ${validation.should_include?.length || 0}`);
            console.log(`     - must_avoid: ${validation.must_avoid?.length || 0}`);
          }
        }

        process.exit(0);
      } else {
        spinner.fail(chalk.red('Validation failed'));

        // Format errors nicely
        console.log(chalk.yellow('\n⚠️  Issues found:\n'));

        const errors = validate.errors || [];
        const groupedErrors = groupErrorsByPath(errors);

        for (const [path, pathErrors] of Object.entries(groupedErrors)) {
          console.log(chalk.cyan(`  ${path || 'root'}:`));

          for (const error of pathErrors) {
            const message = formatErrorMessage(error);
            console.log(chalk.red(`    ✗ ${message}`));

            if (options.verbose && error.params) {
              console.log(chalk.dim(`      ${JSON.stringify(error.params)}`));
            }
          }
          console.log();
        }

        // Provide hints
        console.log(chalk.cyan('💡 Hints:'));
        const hints = generateHints(errors);
        for (const hint of hints) {
          console.log(`   ${hint}`);
        }

        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Validation error'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

// Use ErrorObject from ajv
type AjvError = ErrorObject;

/**
 * Group errors by their instance path
 */
function groupErrorsByPath(
  errors: AjvError[]
): Record<string, AjvError[]> {
  const grouped: Record<string, AjvError[]> = {};

  for (const error of errors) {
    const path = error.instancePath || '/';
    if (!grouped[path]) {
      grouped[path] = [];
    }
    grouped[path].push(error);
  }

  return grouped;
}

/**
 * Format error message for display
 */
function formatErrorMessage(error: AjvError): string {
  switch (error.keyword) {
    case 'required':
      return `Missing required property: ${error.params.missingProperty}`;

    case 'type':
      return `Expected ${error.params.type}, got ${typeof error.params.type}`;

    case 'minLength':
      return `Value too short (minimum: ${error.params.limit} characters)`;

    case 'minItems':
      return `Array too short (minimum: ${error.params.limit} items)`;

    case 'minProperties':
      return `Object needs at least ${error.params.limit} properties`;

    case 'enum':
      return `Value must be one of: ${(error.params.allowedValues as string[]).join(', ')}`;

    case 'pattern':
      return `Value doesn't match required pattern`;

    case 'additionalProperties':
      return `Unknown property: ${error.params.additionalProperty}`;

    default:
      return error.message || `Validation error: ${error.keyword}`;
  }
}

/**
 * Generate helpful hints based on errors
 */
function generateHints(errors: AjvError[]): string[] {
  const hints: string[] = [];
  const seenHints = new Set<string>();

  for (const error of errors) {
    let hint = '';

    if (error.keyword === 'required') {
      const prop = error.params.missingProperty as string;

      if (prop === 'identity' || prop === 'voice' || prop === 'validation') {
        hint = `Add the "${prop}" section - it's required for all personas`;
      } else if (prop === 'frameworks') {
        hint = 'Add at least one framework to define how the persona thinks';
      } else if (prop === 'must_include') {
        hint = 'Add must_include patterns to validation for fidelity checking';
      }
    }

    if (error.instancePath.includes('/voice/tone') && error.keyword === 'minItems') {
      hint = 'Add at least 3 tone characteristics (e.g., "warm, professional, curious")';
    }

    if (error.instancePath.includes('/voice/phrases') && error.keyword === 'minItems') {
      hint = 'Add at least 5 characteristic phrases this persona would say';
    }

    if (error.instancePath.includes('/frameworks') && error.keyword === 'minProperties') {
      hint = 'Define at least one framework with concepts and questions';
    }

    if (hint && !seenHints.has(hint)) {
      hints.push(hint);
      seenHints.add(hint);
    }
  }

  // Add general hints if no specific ones
  if (hints.length === 0) {
    hints.push('Check the persona.yaml.template for the expected structure');
    hints.push('Run with --verbose for more details');
  }

  return hints;
}
