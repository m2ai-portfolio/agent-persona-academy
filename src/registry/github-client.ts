/**
 * GitHub Client
 *
 * Handles GitHub API operations for the persona registry.
 * Supports both authenticated and unauthenticated requests.
 */

import type { RegistryConfig, RegistryIndex, RegistryEntry, PullResult } from './types.js';
import { DEFAULT_REGISTRY_CONFIG } from './types.js';
import {
  cachePersona,
  getCachedPersona,
  needsUpdate,
  getCachedPersonaPath,
} from './cache-manager.js';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

/**
 * Parse repository string into owner and name
 */
function parseRepository(repo: string): { owner: string; name: string } {
  const [owner, name] = repo.split('/');
  if (!owner || !name) {
    throw new Error(`Invalid repository format: ${repo}. Expected "owner/repo"`);
  }
  return { owner, name };
}

/**
 * Get GitHub token from environment
 */
function getGitHubToken(): string | undefined {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
}

/**
 * Make a GitHub API request
 */
async function githubRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getGitHubToken();

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'persona-academy-cli',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Fetch raw file content from GitHub
 */
async function fetchRawContent(repo: string, branch: string, path: string): Promise<string> {
  const { owner, name } = parseRepository(repo);
  const url = `${GITHUB_RAW_BASE}/${owner}/${name}/${branch}/${path}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'persona-academy-cli',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }

  return response.text();
}

/**
 * Fetch the registry index
 */
export async function fetchRegistryIndex(
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG,
): Promise<RegistryIndex> {
  const indexPath = `${config.basePath}/index.json`;

  try {
    const content = await fetchRawContent(config.repository, config.branch, indexPath);
    return JSON.parse(content) as RegistryIndex;
  } catch (error) {
    // If index doesn't exist, return empty registry
    if (error instanceof Error && error.message.includes('404')) {
      const { owner, name } = parseRepository(config.repository);
      return {
        schemaVersion: '1.0.0',
        generated: new Date().toISOString(),
        repository: { owner, name, branch: config.branch },
        totalPersonas: 0,
        categories: {
          'business-strategist': 0,
          'technical-architect': 0,
          'domain-expert': 0,
          creative: 0,
          custom: 0,
        },
        personas: [],
      };
    }
    throw error;
  }
}

/**
 * Fetch a specific persona from the registry
 */
export async function fetchPersona(
  personaId: string,
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG,
): Promise<{ content: string; sha?: string }> {
  const personaPath = `${config.basePath}/${personaId}/persona.yaml`;

  // Try to get SHA via API for version tracking
  let sha: string | undefined;
  try {
    const { owner, name } = parseRepository(config.repository);
    const response = await githubRequest<{ sha: string }>(
      `/repos/${owner}/${name}/contents/${personaPath}?ref=${config.branch}`,
    );
    sha = response.sha;
  } catch {
    // SHA fetch is optional, continue without it
  }

  const content = await fetchRawContent(config.repository, config.branch, personaPath);

  return { content, sha };
}

/**
 * List all personas in the registry
 */
export async function listRegistryPersonas(
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG,
): Promise<RegistryEntry[]> {
  const index = await fetchRegistryIndex(config);
  return index.personas;
}

/**
 * Search personas in the registry
 */
export async function searchRegistryPersonas(
  query: string,
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG,
): Promise<RegistryEntry[]> {
  const index = await fetchRegistryIndex(config);
  const lowerQuery = query.toLowerCase();

  return index.personas.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.summary.toLowerCase().includes(lowerQuery) ||
      p.tags.some((t) => t.toLowerCase().includes(lowerQuery)),
  );
}

/**
 * Pull a persona from the registry to local cache
 */
export async function pullPersona(
  personaId: string,
  force: boolean = false,
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG,
): Promise<PullResult> {
  try {
    // Fetch the persona content and SHA
    const { content, sha } = await fetchPersona(personaId, config);

    // Check if update is needed
    if (!force && sha && !needsUpdate(personaId, sha, config)) {
      const cached = getCachedPersona(personaId, config);
      return {
        success: true,
        personaId,
        action: 'already-current',
        localPath: cached?.localPath,
        message: `Persona "${personaId}" is already up to date`,
        version: cached?.entry.version,
      };
    }

    // Parse the persona to get metadata
    const { parse: parseYaml } = await import('yaml');
    const persona = parseYaml(content);

    // Create registry entry from persona
    const entry: RegistryEntry = {
      id: personaId,
      name: persona.identity?.name ?? personaId,
      summary: persona.identity?.role ?? '',
      author: persona.metadata?.author ?? 'Unknown',
      version: persona.metadata?.version ?? '1.0.0',
      category: persona.metadata?.category ?? 'custom',
      tags: persona.metadata?.tags ?? [],
      frameworkCount: Object.keys(persona.frameworks ?? {}).length,
      caseStudyCount: Object.keys(persona.case_studies ?? {}).length,
      updated: persona.metadata?.updated ?? new Date().toISOString(),
      sha,
    };

    // Cache the persona
    const cached = cachePersona(entry, content, sha, config);

    const action = getCachedPersona(personaId, config) ? 'updated' : 'downloaded';

    return {
      success: true,
      personaId,
      action,
      localPath: cached.localPath,
      message: `Successfully ${action} "${entry.name}" (${entry.version})`,
      version: entry.version,
    };
  } catch (error) {
    return {
      success: false,
      personaId,
      action: 'failed',
      message: error instanceof Error ? error.message : `Failed to pull persona "${personaId}"`,
    };
  }
}

/**
 * Pull multiple personas
 */
export async function pullPersonas(
  personaIds: string[],
  force: boolean = false,
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG,
): Promise<PullResult[]> {
  const results: PullResult[] = [];

  for (const personaId of personaIds) {
    const result = await pullPersona(personaId, force, config);
    results.push(result);
  }

  return results;
}

/**
 * Check if registry is accessible
 */
export async function checkRegistryAccess(
  config: RegistryConfig = DEFAULT_REGISTRY_CONFIG,
): Promise<{ accessible: boolean; authenticated: boolean; message: string }> {
  try {
    const { owner, name } = parseRepository(config.repository);

    // Try to access the repository
    await githubRequest(`/repos/${owner}/${name}`);

    const token = getGitHubToken();

    return {
      accessible: true,
      authenticated: !!token,
      message: token
        ? 'Registry accessible with authentication'
        : 'Registry accessible (unauthenticated - rate limits apply)',
    };
  } catch (error) {
    return {
      accessible: false,
      authenticated: false,
      message: error instanceof Error ? error.message : 'Failed to access registry',
    };
  }
}

/**
 * Get rate limit status
 */
export async function getRateLimitStatus(): Promise<{
  limit: number;
  remaining: number;
  reset: Date;
}> {
  const response = await githubRequest<{
    resources: {
      core: { limit: number; remaining: number; reset: number };
    };
  }>('/rate_limit');

  return {
    limit: response.resources.core.limit,
    remaining: response.resources.core.remaining,
    reset: new Date(response.resources.core.reset * 1000),
  };
}
