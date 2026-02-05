/**
 * Cache Manager
 *
 * Manages local caching of personas fetched from the registry.
 * Handles storage, retrieval, and cache invalidation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type {
  CacheIndex,
  CachedPersona,
  RegistryEntry,
  RegistryConfig,
} from './types.js';
import { DEFAULT_REGISTRY_CONFIG } from './types.js';

const CACHE_VERSION = '1.0.0';
const CACHE_INDEX_FILE = 'cache-index.json';

/**
 * Resolve the cache directory path
 */
export function resolveCacheDir(config: RegistryConfig = DEFAULT_REGISTRY_CONFIG): string {
  const cacheDir = config.cacheDir.replace('~', homedir());
  return cacheDir;
}

/**
 * Ensure the cache directory exists
 */
export function ensureCacheDir(config: RegistryConfig = DEFAULT_REGISTRY_CONFIG): string {
  const cacheDir = resolveCacheDir(config);

  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  return cacheDir;
}

/**
 * Get the path to a specific cached persona
 */
export function getCachedPersonaPath(
  personaId: string,
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG
): string {
  const cacheDir = resolveCacheDir(config);
  return join(cacheDir, personaId);
}

/**
 * Load the cache index
 */
export function loadCacheIndex(
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG
): CacheIndex {
  const cacheDir = resolveCacheDir(config);
  const indexPath = join(cacheDir, CACHE_INDEX_FILE);

  if (!existsSync(indexPath)) {
    return createEmptyCacheIndex(config);
  }

  try {
    const content = readFileSync(indexPath, 'utf-8');
    return JSON.parse(content) as CacheIndex;
  } catch {
    return createEmptyCacheIndex(config);
  }
}

/**
 * Save the cache index
 */
export function saveCacheIndex(
  index: CacheIndex,
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG
): void {
  const cacheDir = ensureCacheDir(config);
  const indexPath = join(cacheDir, CACHE_INDEX_FILE);

  index.lastUpdated = new Date().toISOString();
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Create an empty cache index
 */
function createEmptyCacheIndex(config: RegistryConfig): CacheIndex {
  return {
    version: CACHE_VERSION,
    lastUpdated: new Date().toISOString(),
    registry: config.repository,
    personas: {},
  };
}

/**
 * Check if a persona is cached
 */
export function isPersonaCached(
  personaId: string,
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG
): boolean {
  const index = loadCacheIndex(config);
  const cached = index.personas[personaId];

  if (!cached) return false;

  // Verify the files still exist
  const personaPath = getCachedPersonaPath(personaId, config);
  const yamlPath = join(personaPath, 'persona.yaml');

  return existsSync(yamlPath);
}

/**
 * Get cached persona metadata
 */
export function getCachedPersona(
  personaId: string,
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG
): CachedPersona | null {
  const index = loadCacheIndex(config);
  return index.personas[personaId] ?? null;
}

/**
 * Add or update a persona in the cache
 */
export function cachePersona(
  entry: RegistryEntry,
  content: string,
  sha?: string,
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG
): CachedPersona {
  const cacheDir = ensureCacheDir(config);
  const personaPath = join(cacheDir, entry.id);

  // Create persona directory
  if (!existsSync(personaPath)) {
    mkdirSync(personaPath, { recursive: true });
  }

  // Write persona.yaml
  const yamlPath = join(personaPath, 'persona.yaml');
  writeFileSync(yamlPath, content);

  // Update cache index
  const index = loadCacheIndex(config);
  const cachedPersona: CachedPersona = {
    entry,
    localPath: personaPath,
    cachedAt: new Date().toISOString(),
    cachedSha: sha,
    hasLocalChanges: false,
  };

  index.personas[entry.id] = cachedPersona;
  saveCacheIndex(index, config);

  return cachedPersona;
}

/**
 * Remove a persona from the cache
 */
export function removeCachedPersona(
  personaId: string,
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG
): boolean {
  const personaPath = getCachedPersonaPath(personaId, config);

  if (existsSync(personaPath)) {
    rmSync(personaPath, { recursive: true, force: true });
  }

  // Update cache index
  const index = loadCacheIndex(config);
  if (index.personas[personaId]) {
    delete index.personas[personaId];
    saveCacheIndex(index, config);
    return true;
  }

  return false;
}

/**
 * List all cached personas
 */
export function listCachedPersonas(
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG
): CachedPersona[] {
  const index = loadCacheIndex(config);
  return Object.values(index.personas).filter((cached) => {
    // Verify files still exist
    const yamlPath = join(cached.localPath, 'persona.yaml');
    return existsSync(yamlPath);
  });
}

/**
 * Check if a cached persona needs updating
 */
export function needsUpdate(
  personaId: string,
  remoteSha: string,
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG
): boolean {
  const cached = getCachedPersona(personaId, config);

  if (!cached) return true;
  if (!cached.cachedSha) return true;

  return cached.cachedSha !== remoteSha;
}

/**
 * Mark a cached persona as having local changes
 */
export function markLocalChanges(
  personaId: string,
  hasChanges: boolean,
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG
): void {
  const index = loadCacheIndex(config);

  if (index.personas[personaId]) {
    index.personas[personaId].hasLocalChanges = hasChanges;
    saveCacheIndex(index, config);
  }
}

/**
 * Clear the entire cache
 */
export function clearCache(
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG
): number {
  const index = loadCacheIndex(config);
  const count = Object.keys(index.personas).length;

  // Remove all cached persona directories
  for (const personaId of Object.keys(index.personas)) {
    const personaPath = getCachedPersonaPath(personaId, config);
    if (existsSync(personaPath)) {
      rmSync(personaPath, { recursive: true, force: true });
    }
  }

  // Reset cache index
  const emptyIndex = createEmptyCacheIndex(config);
  saveCacheIndex(emptyIndex, config);

  return count;
}

/**
 * Get cache statistics
 */
export function getCacheStats(
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG
): {
  totalCached: number;
  withLocalChanges: number;
  cacheDir: string;
  lastUpdated: string;
} {
  const index = loadCacheIndex(config);
  const cached = listCachedPersonas(config);

  return {
    totalCached: cached.length,
    withLocalChanges: cached.filter((c) => c.hasLocalChanges).length,
    cacheDir: resolveCacheDir(config),
    lastUpdated: index.lastUpdated,
  };
}
