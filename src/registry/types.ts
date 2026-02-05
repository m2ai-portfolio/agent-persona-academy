/**
 * Registry Types
 *
 * Type definitions for the remote persona registry system.
 */

import type { PersonaCategory } from '../core/types.js';

/**
 * Registry configuration
 */
export interface RegistryConfig {
  /** GitHub repository in format "owner/repo" */
  repository: string;
  /** Branch to use (default: main) */
  branch: string;
  /** Base path within repo for personas */
  basePath: string;
  /** Local cache directory */
  cacheDir: string;
}

/**
 * Default registry configuration
 */
export const DEFAULT_REGISTRY_CONFIG: RegistryConfig = {
  repository: 'm2ai-portfolio/persona-registry',
  branch: 'main',
  basePath: 'personas',
  cacheDir: '~/.persona-academy/personas',
};

/**
 * Entry in the registry index
 */
export interface RegistryEntry {
  /** Unique persona identifier (kebab-case) */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  summary: string;
  /** Author name or organization */
  author: string;
  /** Semantic version */
  version: string;
  /** Persona category */
  category: PersonaCategory;
  /** All tags for filtering */
  tags: string[];
  /** Number of frameworks */
  frameworkCount: number;
  /** Number of case studies */
  caseStudyCount: number;
  /** Last updated ISO timestamp */
  updated: string;
  /** SHA of the latest commit for this persona */
  sha?: string;
}

/**
 * Registry index file structure
 */
export interface RegistryIndex {
  /** Schema version for the index format */
  schemaVersion: string;
  /** When the index was last generated */
  generated: string;
  /** Repository information */
  repository: {
    owner: string;
    name: string;
    branch: string;
  };
  /** Total persona count */
  totalPersonas: number;
  /** Available categories with counts */
  categories: Record<PersonaCategory, number>;
  /** List of all personas */
  personas: RegistryEntry[];
}

/**
 * Cached persona metadata
 */
export interface CachedPersona {
  /** Registry entry for the persona */
  entry: RegistryEntry;
  /** Path to local cached files */
  localPath: string;
  /** When it was cached */
  cachedAt: string;
  /** SHA when cached (for update detection) */
  cachedSha?: string;
  /** Whether local changes exist */
  hasLocalChanges: boolean;
}

/**
 * Cache index file structure
 */
export interface CacheIndex {
  /** Cache format version */
  version: string;
  /** When the cache was last updated */
  lastUpdated: string;
  /** Registry this cache is from */
  registry: string;
  /** Cached personas */
  personas: Record<string, CachedPersona>;
}

/**
 * Pull operation result
 */
export interface PullResult {
  success: boolean;
  personaId: string;
  action: 'downloaded' | 'updated' | 'already-current' | 'failed';
  localPath?: string;
  message: string;
  version?: string;
}

/**
 * Push operation result
 */
export interface PushResult {
  success: boolean;
  personaId: string;
  action: 'created' | 'updated' | 'failed';
  message: string;
  pullRequestUrl?: string;
  commitSha?: string;
}

/**
 * Search/filter options for registry
 */
export interface RegistrySearchOptions {
  /** Filter by category */
  category?: PersonaCategory;
  /** Filter by tags (match any) */
  tags?: string[];
  /** Search in name/summary */
  query?: string;
  /** Sort field */
  sortBy?: 'name' | 'updated' | 'downloads';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Limit results */
  limit?: number;
}
