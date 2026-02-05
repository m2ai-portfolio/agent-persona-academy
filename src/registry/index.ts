/**
 * Registry Module
 *
 * Exports all registry functionality for persona sharing.
 */

// Types
export type {
  RegistryConfig,
  RegistryEntry,
  RegistryIndex,
  CachedPersona,
  CacheIndex,
  PullResult,
  PushResult,
  RegistrySearchOptions,
} from './types.js';

export { DEFAULT_REGISTRY_CONFIG } from './types.js';

// Cache Manager
export {
  resolveCacheDir,
  ensureCacheDir,
  getCachedPersonaPath,
  loadCacheIndex,
  saveCacheIndex,
  isPersonaCached,
  getCachedPersona,
  cachePersona,
  removeCachedPersona,
  listCachedPersonas,
  needsUpdate,
  markLocalChanges,
  clearCache,
  getCacheStats,
} from './cache-manager.js';

// GitHub Client
export {
  fetchRegistryIndex,
  fetchPersona,
  listRegistryPersonas,
  searchRegistryPersonas,
  pullPersona,
  pullPersonas,
  checkRegistryAccess,
  getRateLimitStatus,
} from './github-client.js';
