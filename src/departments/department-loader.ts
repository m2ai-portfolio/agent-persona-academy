/**
 * Department Loader
 *
 * Loads department definitions from YAML files and provides typed access.
 * Mirrors the pattern from persona-loader.ts.
 */

import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { DepartmentDefinition, LoadedDepartment } from '../core/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache for loaded departments
const departmentCache = new Map<string, LoadedDepartment>();

/**
 * Load a department from a YAML file
 */
export function loadDepartmentFromFile(filePath: string): DepartmentDefinition {
  if (!existsSync(filePath)) {
    throw new Error(`Department file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  const definition = parseYaml(content) as DepartmentDefinition;

  validateDepartmentStructure(definition);

  return definition;
}

/**
 * Load a department by ID from the departments directory
 */
export function loadDepartment(departmentId: string, baseDir?: string): LoadedDepartment {
  if (departmentCache.has(departmentId)) {
    return departmentCache.get(departmentId)!;
  }

  const possiblePaths = baseDir
    ? [join(baseDir, departmentId, 'department.yaml')]
    : [
        join(__dirname, '../../departments', departmentId, 'department.yaml'),
        join(__dirname, '../../../departments', departmentId, 'department.yaml'),
      ];

  let definition: DepartmentDefinition | null = null;
  let sourcePath = '';

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      definition = loadDepartmentFromFile(path);
      sourcePath = path;
      break;
    }
  }

  if (!definition) {
    throw new Error(
      `Department '${departmentId}' not found. Searched:\n${possiblePaths.join('\n')}`,
    );
  }

  const loaded: LoadedDepartment = {
    definition,
    sourcePath,
    loadedAt: new Date(),
  };

  departmentCache.set(departmentId, loaded);
  return loaded;
}

/**
 * Clear the department cache
 */
export function clearDepartmentCache(): void {
  departmentCache.clear();
}

/**
 * Get the departments directory
 */
export function getDepartmentsDirectory(): string {
  const possibleDirs = [
    join(__dirname, '../../departments'),
    join(__dirname, '../../../departments'),
  ];

  for (const dir of possibleDirs) {
    if (existsSync(dir)) {
      return dir;
    }
  }

  throw new Error('Departments directory not found');
}

/**
 * Validate basic department structure
 */
function validateDepartmentStructure(definition: DepartmentDefinition): void {
  const errors: string[] = [];

  if (!definition.identity) {
    errors.push('Missing required section: identity');
  } else {
    if (!definition.identity.name) errors.push('Missing identity.name');
    if (!definition.identity.id) errors.push('Missing identity.id');
    if (!definition.identity.mission) errors.push('Missing identity.mission');
  }

  if (!definition.quality_criteria) {
    errors.push('Missing required section: quality_criteria');
  } else {
    if (!definition.quality_criteria.validation_overrides) {
      errors.push('Missing quality_criteria.validation_overrides');
    }
  }

  if (!definition.learning_policy) {
    errors.push('Missing required section: learning_policy');
  } else {
    if (definition.learning_policy.auto_apply_threshold == null) {
      errors.push('Missing learning_policy.auto_apply_threshold');
    }
    if (definition.learning_policy.review_threshold == null) {
      errors.push('Missing learning_policy.review_threshold');
    }
    if (definition.learning_policy.max_changes_per_cycle == null) {
      errors.push('Missing learning_policy.max_changes_per_cycle');
    }
  }

  if (!definition.personas || definition.personas.length === 0) {
    errors.push('Missing or empty personas list');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid department definition:\n${errors.join('\n')}`);
  }
}
