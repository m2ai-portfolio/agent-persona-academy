/**
 * Persona Manager
 *
 * Manages loading, switching, and accessing personas at runtime.
 * Provides the core functionality for the multi-persona MCP server.
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  loadPersona,
  loadPersonaFromFile,
  generateSystemPrompt,
  clearPersonaCache,
} from '../core/persona-loader.js';
import type { PersonaDefinition, LoadedPersona } from '../core/types.js';
import {
  listCachedPersonas,
  getCachedPersonaPath,
  resolveCacheDir,
} from '../registry/cache-manager.js';
import { discoverDepartments } from '../departments/index.js';

/**
 * Persona summary for listing
 */
export interface PersonaSummary {
  id: string;
  name: string;
  role: string;
  category: string;
  department?: string;
  frameworkCount: number;
  caseStudyCount: number;
  source: 'local' | 'cache';
}

/**
 * Manager state
 */
interface ManagerState {
  activePersonaId: string | null;
  loadedPersonas: Map<string, LoadedPersona>;
  personaSources: Map<string, string>; // id -> path
}

// Global state
const state: ManagerState = {
  activePersonaId: null,
  loadedPersonas: new Map(),
  personaSources: new Map(),
};

/**
 * Initialize the persona manager with available personas
 */
export function initializeManager(options: {
  localDir?: string;
  includeCache?: boolean;
  defaultPersona?: string;
  departmentsDir?: string;
}): PersonaSummary[] {
  const {
    localDir = './personas',
    includeCache = true,
    defaultPersona,
    departmentsDir = './departments',
  } = options;

  // Clear any existing state
  state.loadedPersonas.clear();
  state.personaSources.clear();
  state.activePersonaId = null;
  clearPersonaCache();

  // Discover departments
  discoverDepartments(departmentsDir);

  const discovered: PersonaSummary[] = [];

  // Discover local personas
  if (existsSync(localDir)) {
    const entries = readdirSync(localDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const yamlPath = join(localDir, entry.name, 'persona.yaml');
        if (existsSync(yamlPath)) {
          try {
            const persona = loadPersonaFromFile(yamlPath);
            const summary = createSummary(entry.name, persona, 'local');
            discovered.push(summary);
            state.personaSources.set(entry.name, yamlPath);
          } catch {
            // Skip invalid personas
          }
        }
      }
    }
  }

  // Discover cached personas
  if (includeCache) {
    const cached = listCachedPersonas();

    for (const cachedPersona of cached) {
      // Skip if already found in local
      if (state.personaSources.has(cachedPersona.entry.id)) {
        continue;
      }

      const yamlPath = join(cachedPersona.localPath, 'persona.yaml');
      if (existsSync(yamlPath)) {
        try {
          const persona = loadPersonaFromFile(yamlPath);
          const summary = createSummary(cachedPersona.entry.id, persona, 'cache');
          discovered.push(summary);
          state.personaSources.set(cachedPersona.entry.id, yamlPath);
        } catch {
          // Skip invalid personas
        }
      }
    }
  }

  // Set default persona if specified and available
  if (defaultPersona && state.personaSources.has(defaultPersona)) {
    switchPersona(defaultPersona);
  } else if (discovered.length > 0) {
    // Auto-select first persona
    switchPersona(discovered[0].id);
  }

  return discovered;
}

/**
 * Create a persona summary from definition
 */
function createSummary(
  id: string,
  persona: PersonaDefinition,
  source: 'local' | 'cache',
): PersonaSummary {
  return {
    id,
    name: persona.identity.name,
    role: persona.identity.role,
    category: persona.metadata?.category ?? 'custom',
    department: persona.metadata?.department,
    frameworkCount: Object.keys(persona.frameworks).length,
    caseStudyCount: Object.keys(persona.case_studies ?? {}).length,
    source,
  };
}

/**
 * List all available personas
 */
export function listPersonas(): PersonaSummary[] {
  const summaries: PersonaSummary[] = [];

  for (const [id, path] of state.personaSources.entries()) {
    try {
      const persona = loadPersonaFromFile(path);
      const source = path.includes('.persona-academy') ? 'cache' : 'local';
      summaries.push(createSummary(id, persona, source));
    } catch {
      // Skip invalid
    }
  }

  return summaries;
}

/**
 * Get the currently active persona
 */
export function getActivePersona(): LoadedPersona | null {
  if (!state.activePersonaId) {
    return null;
  }

  return state.loadedPersonas.get(state.activePersonaId) ?? null;
}

/**
 * Get the active persona ID
 */
export function getActivePersonaId(): string | null {
  return state.activePersonaId;
}

/**
 * Switch to a different persona
 */
export function switchPersona(personaId: string): {
  success: boolean;
  persona?: LoadedPersona;
  message: string;
} {
  // Check if persona is available
  const path = state.personaSources.get(personaId);
  if (!path) {
    return {
      success: false,
      message: `Persona "${personaId}" not found. Available: ${Array.from(state.personaSources.keys()).join(', ')}`,
    };
  }

  // Load if not already loaded
  if (!state.loadedPersonas.has(personaId)) {
    try {
      const definition = loadPersonaFromFile(path);
      const systemPrompt = generateSystemPrompt(definition);

      const loaded: LoadedPersona = {
        definition,
        sourcePath: path,
        systemPrompt,
        loadedAt: new Date(),
      };

      state.loadedPersonas.set(personaId, loaded);
    } catch (error) {
      return {
        success: false,
        message: `Failed to load persona "${personaId}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Switch active persona
  state.activePersonaId = personaId;
  const persona = state.loadedPersonas.get(personaId)!;

  return {
    success: true,
    persona,
    message: `Switched to ${persona.definition.identity.name}`,
  };
}

/**
 * Get persona by ID (without switching)
 */
export function getPersona(personaId: string): LoadedPersona | null {
  // Return from cache if loaded
  if (state.loadedPersonas.has(personaId)) {
    return state.loadedPersonas.get(personaId)!;
  }

  // Try to load
  const path = state.personaSources.get(personaId);
  if (!path) {
    return null;
  }

  try {
    const definition = loadPersonaFromFile(path);
    const systemPrompt = generateSystemPrompt(definition);

    const loaded: LoadedPersona = {
      definition,
      sourcePath: path,
      systemPrompt,
      loadedAt: new Date(),
    };

    state.loadedPersonas.set(personaId, loaded);
    return loaded;
  } catch {
    return null;
  }
}

/**
 * Get the system prompt for the active persona
 */
export function getActiveSystemPrompt(): string | null {
  const persona = getActivePersona();
  return persona?.systemPrompt ?? null;
}

/**
 * Get frameworks from the active persona
 */
export function getActiveFrameworks(): string[] {
  const persona = getActivePersona();
  if (!persona) return [];
  return Object.keys(persona.definition.frameworks);
}

/**
 * Get diagnostic questions from a framework
 */
export function getFrameworkQuestions(frameworkName: string): string[] {
  const persona = getActivePersona();
  if (!persona) return [];

  const framework = persona.definition.frameworks[frameworkName];
  return framework?.questions ?? [];
}

/**
 * Get case studies from the active persona
 */
export function getActiveCaseStudies(): string[] {
  const persona = getActivePersona();
  if (!persona) return [];
  return Object.keys(persona.definition.case_studies ?? {});
}

/**
 * Get a random characteristic phrase from the active persona
 */
export function getRandomPhrase(): string | null {
  const persona = getActivePersona();
  if (!persona) return null;

  const phrases = persona.definition.voice.phrases;
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Check if a persona is available
 */
export function hasPersona(personaId: string): boolean {
  return state.personaSources.has(personaId);
}

/**
 * Get the count of available personas
 */
export function getPersonaCount(): number {
  return state.personaSources.size;
}

/**
 * Reload a specific persona (clear cache and reload)
 */
export function reloadPersona(personaId: string): boolean {
  if (!state.personaSources.has(personaId)) {
    return false;
  }

  // Remove from loaded cache
  state.loadedPersonas.delete(personaId);

  // If this was active, re-switch to trigger reload
  if (state.activePersonaId === personaId) {
    switchPersona(personaId);
  }

  return true;
}
