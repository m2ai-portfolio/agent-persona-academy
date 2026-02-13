/**
 * Department Manager
 *
 * Runtime management of departments: discovery, persona-to-department resolution,
 * validation config resolution, and shared must_avoid pattern merging.
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  loadDepartmentFromFile,
  clearDepartmentCache,
  getDepartmentsDirectory,
} from './department-loader.js';
import type {
  DepartmentDefinition,
  LoadedDepartment,
  ValidationMarker,
} from '../core/types.js';
import type { ValidationConfig } from '../validation/types.js';
import { DEFAULT_VALIDATION_CONFIG } from '../validation/types.js';

/**
 * Department summary for listing
 */
export interface DepartmentSummary {
  id: string;
  name: string;
  mission: string;
  personaCount: number;
  personas: string[];
}

/**
 * Manager state
 */
interface DepartmentManagerState {
  departments: Map<string, LoadedDepartment>;
  personaToDepartment: Map<string, string>;
}

const state: DepartmentManagerState = {
  departments: new Map(),
  personaToDepartment: new Map(),
};

/**
 * Discover and load all departments from a directory
 */
export function discoverDepartments(departmentsDir?: string): DepartmentSummary[] {
  // Clear existing state
  state.departments.clear();
  state.personaToDepartment.clear();
  clearDepartmentCache();

  let dir: string;
  try {
    dir = departmentsDir ?? getDepartmentsDirectory();
  } catch {
    return [];
  }

  if (!existsSync(dir)) {
    return [];
  }

  const summaries: DepartmentSummary[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const yamlPath = join(dir, entry.name, 'department.yaml');
    if (!existsSync(yamlPath)) continue;

    try {
      const definition = loadDepartmentFromFile(yamlPath);
      const loaded: LoadedDepartment = {
        definition,
        sourcePath: yamlPath,
        loadedAt: new Date(),
      };

      state.departments.set(definition.identity.id, loaded);

      // Build persona-to-department index
      for (const personaId of definition.personas) {
        state.personaToDepartment.set(personaId, definition.identity.id);
      }

      summaries.push({
        id: definition.identity.id,
        name: definition.identity.name,
        mission: definition.identity.mission,
        personaCount: definition.personas.length,
        personas: [...definition.personas],
      });
    } catch {
      // Skip invalid departments
    }
  }

  return summaries;
}

/**
 * Get all loaded departments
 */
export function listDepartments(): DepartmentSummary[] {
  const summaries: DepartmentSummary[] = [];

  for (const [, loaded] of state.departments) {
    const def = loaded.definition;
    summaries.push({
      id: def.identity.id,
      name: def.identity.name,
      mission: def.identity.mission,
      personaCount: def.personas.length,
      personas: [...def.personas],
    });
  }

  return summaries;
}

/**
 * Get department definition by ID
 */
export function getDepartment(departmentId: string): DepartmentDefinition | null {
  return state.departments.get(departmentId)?.definition ?? null;
}

/**
 * Resolve which department a persona belongs to
 */
export function resolveDepartmentForPersona(personaId: string): string | null {
  return state.personaToDepartment.get(personaId) ?? null;
}

/**
 * Get validation config for a persona, merging department overrides with defaults
 */
export function getValidationConfigForPersona(personaId: string): ValidationConfig {
  const departmentId = state.personaToDepartment.get(personaId);
  if (!departmentId) {
    return { ...DEFAULT_VALIDATION_CONFIG };
  }

  const department = state.departments.get(departmentId)?.definition;
  if (!department) {
    return { ...DEFAULT_VALIDATION_CONFIG };
  }

  const overrides = department.quality_criteria.validation_overrides;

  return {
    fidelityThreshold: overrides.fidelity_threshold ?? DEFAULT_VALIDATION_CONFIG.fidelityThreshold,
    voiceThreshold: overrides.voice_threshold ?? DEFAULT_VALIDATION_CONFIG.voiceThreshold,
    frameworkThreshold: overrides.framework_threshold ?? DEFAULT_VALIDATION_CONFIG.frameworkThreshold,
    strictConstraints: DEFAULT_VALIDATION_CONFIG.strictConstraints,
    weights: overrides.weights
      ? {
          fidelity: overrides.weights.fidelity ?? DEFAULT_VALIDATION_CONFIG.weights?.fidelity,
          voice: overrides.weights.voice ?? DEFAULT_VALIDATION_CONFIG.weights?.voice,
          framework: overrides.weights.framework ?? DEFAULT_VALIDATION_CONFIG.weights?.framework,
        }
      : { ...DEFAULT_VALIDATION_CONFIG.weights },
  };
}

/**
 * Get shared must_avoid patterns for a persona's department
 */
export function getSharedMustAvoid(personaId: string): ValidationMarker[] {
  const departmentId = state.personaToDepartment.get(personaId);
  if (!departmentId) return [];

  const department = state.departments.get(departmentId)?.definition;
  if (!department) return [];

  return department.quality_criteria.shared_must_avoid ?? [];
}

/**
 * Get personas filtered by department
 */
export function getPersonasByDepartment(departmentId: string): string[] {
  const department = state.departments.get(departmentId)?.definition;
  if (!department) return [];
  return [...department.personas];
}

/**
 * Check if departments have been loaded
 */
export function hasDepartments(): boolean {
  return state.departments.size > 0;
}

/**
 * Get count of loaded departments
 */
export function getDepartmentCount(): number {
  return state.departments.size;
}
