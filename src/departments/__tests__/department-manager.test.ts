import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DepartmentDefinition } from '../../core/types.js';

vi.mock('../department-loader.js', () => ({
  loadDepartmentFromFile: vi.fn(),
  clearDepartmentCache: vi.fn(),
  getDepartmentsDirectory: vi.fn(),
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
  };
});

import { existsSync, readdirSync } from 'fs';
import {
  loadDepartmentFromFile,
  clearDepartmentCache,
  getDepartmentsDirectory,
} from '../department-loader.js';
import { DEFAULT_VALIDATION_CONFIG } from '../../validation/types.js';
import {
  discoverDepartments,
  listDepartments,
  getDepartment,
  resolveDepartmentForPersona,
  getValidationConfigForPersona,
  getSharedMustAvoid,
  getPersonasByDepartment,
  hasDepartments,
  getDepartmentCount,
} from '../department-manager.js';

const mockExistsSync = vi.mocked(existsSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockLoadDepartmentFromFile = vi.mocked(loadDepartmentFromFile);
const mockGetDepartmentsDirectory = vi.mocked(getDepartmentsDirectory);

function makeDepartmentDefinition(
  overrides?: Partial<DepartmentDefinition>,
): DepartmentDefinition {
  return {
    identity: {
      name: 'Test Department',
      id: 'test-dept',
      mission: 'Testing mission',
    },
    quality_criteria: {
      validation_overrides: {},
    },
    learning_policy: {
      auto_apply_threshold: 0.9,
      review_threshold: 0.5,
      max_changes_per_cycle: 3,
    },
    personas: ['persona-a', 'persona-b'],
    ...overrides,
  };
}

/**
 * Helper to create a mock Dirent-like object for readdirSync withFileTypes results.
 */
function makeDirent(name: string, isDir: boolean) {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    path: '',
    parentPath: '',
  } as unknown as import('fs').Dirent;
}

/**
 * Clear module-level state by calling discoverDepartments with a non-existent dir.
 * This relies on the fact that discoverDepartments clears state at the start.
 */
function clearState() {
  mockExistsSync.mockReturnValue(false);
  mockReaddirSync.mockReturnValue([]);
  discoverDepartments('/non-existent');
}

beforeEach(() => {
  vi.clearAllMocks();
  clearState();
});

describe('discoverDepartments', () => {
  it('returns summaries and builds persona index for valid directory', () => {
    const engDef = makeDepartmentDefinition({
      identity: { name: 'Engineering', id: 'engineering', mission: 'Build things' },
      personas: ['carmack', 'hopper'],
    });
    const bizDef = makeDepartmentDefinition({
      identity: { name: 'Business', id: 'business', mission: 'Strategize' },
      personas: ['porter'],
    });

    mockExistsSync.mockImplementation((p: unknown) => {
      const path = String(p);
      if (path === '/depts') return true;
      if (path.endsWith('engineering/department.yaml')) return true;
      if (path.endsWith('business/department.yaml')) return true;
      return false;
    });
    mockReaddirSync.mockReturnValue([
      makeDirent('engineering', true),
      makeDirent('business', true),
    ] as any);
    mockLoadDepartmentFromFile.mockImplementation((filePath: string) => {
      if (filePath.includes('engineering')) return engDef;
      if (filePath.includes('business')) return bizDef;
      throw new Error('Unknown file');
    });

    const summaries = discoverDepartments('/depts');

    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toEqual({
      id: 'engineering',
      name: 'Engineering',
      mission: 'Build things',
      personaCount: 2,
      personas: ['carmack', 'hopper'],
    });
    expect(summaries[1]).toEqual({
      id: 'business',
      name: 'Business',
      mission: 'Strategize',
      personaCount: 1,
      personas: ['porter'],
    });

    // Verify persona index was built
    expect(resolveDepartmentForPersona('carmack')).toBe('engineering');
    expect(resolveDepartmentForPersona('hopper')).toBe('engineering');
    expect(resolveDepartmentForPersona('porter')).toBe('business');
  });

  it('returns empty array when directory does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    const summaries = discoverDepartments('/missing');

    expect(summaries).toEqual([]);
  });

  it('skips non-directory entries', () => {
    const def = makeDepartmentDefinition();

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      makeDirent('readme.md', false),
      makeDirent('valid-dept', true),
    ] as any);
    mockLoadDepartmentFromFile.mockReturnValue(def);

    const summaries = discoverDepartments('/depts');

    expect(summaries).toHaveLength(1);
    expect(summaries[0].id).toBe('test-dept');
    expect(mockLoadDepartmentFromFile).toHaveBeenCalledTimes(1);
  });

  it('skips departments where loadDepartmentFromFile throws', () => {
    const validDef = makeDepartmentDefinition({
      identity: { name: 'Valid', id: 'valid', mission: 'Works' },
      personas: ['alpha'],
    });

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      makeDirent('broken', true),
      makeDirent('valid', true),
    ] as any);
    mockLoadDepartmentFromFile.mockImplementation((filePath: string) => {
      if (filePath.includes('broken')) throw new Error('Invalid YAML');
      return validDef;
    });

    const summaries = discoverDepartments('/depts');

    expect(summaries).toHaveLength(1);
    expect(summaries[0].id).toBe('valid');
  });

  it('clears previous state on re-discovery', () => {
    // First discovery
    const firstDef = makeDepartmentDefinition({
      identity: { name: 'First', id: 'first', mission: 'First dept' },
      personas: ['alpha'],
    });

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent('first', true)] as any);
    mockLoadDepartmentFromFile.mockReturnValue(firstDef);

    discoverDepartments('/depts');
    expect(resolveDepartmentForPersona('alpha')).toBe('first');

    // Second discovery with different data
    const secondDef = makeDepartmentDefinition({
      identity: { name: 'Second', id: 'second', mission: 'Second dept' },
      personas: ['beta'],
    });

    mockLoadDepartmentFromFile.mockReturnValue(secondDef);
    mockReaddirSync.mockReturnValue([makeDirent('second', true)] as any);

    const summaries = discoverDepartments('/depts');

    expect(summaries).toHaveLength(1);
    expect(summaries[0].id).toBe('second');
    // Old persona index should be gone
    expect(resolveDepartmentForPersona('alpha')).toBeNull();
    expect(resolveDepartmentForPersona('beta')).toBe('second');
    expect(clearDepartmentCache).toHaveBeenCalledTimes(3); // clearState + 2 discoveries
  });

  it('falls back to getDepartmentsDirectory when no arg given', () => {
    const def = makeDepartmentDefinition();
    mockGetDepartmentsDirectory.mockReturnValue('/default/departments');
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent('test-dept', true)] as any);
    mockLoadDepartmentFromFile.mockReturnValue(def);

    const summaries = discoverDepartments();

    expect(mockGetDepartmentsDirectory).toHaveBeenCalled();
    expect(summaries).toHaveLength(1);
  });

  it('returns empty array when getDepartmentsDirectory throws', () => {
    mockGetDepartmentsDirectory.mockImplementation(() => {
      throw new Error('Departments directory not found');
    });

    const summaries = discoverDepartments();

    expect(summaries).toEqual([]);
  });
});

describe('resolveDepartmentForPersona', () => {
  it('returns department ID for known persona', () => {
    const def = makeDepartmentDefinition({
      identity: { name: 'Eng', id: 'eng', mission: 'Build' },
      personas: ['carmack'],
    });

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent('eng', true)] as any);
    mockLoadDepartmentFromFile.mockReturnValue(def);
    discoverDepartments('/depts');

    expect(resolveDepartmentForPersona('carmack')).toBe('eng');
  });

  it('returns null for unknown persona', () => {
    expect(resolveDepartmentForPersona('unknown-persona')).toBeNull();
  });
});

describe('getValidationConfigForPersona', () => {
  it('merges department overrides with defaults', () => {
    const def = makeDepartmentDefinition({
      identity: { name: 'Eng', id: 'eng', mission: 'Build' },
      personas: ['carmack'],
      quality_criteria: {
        validation_overrides: {
          fidelity_threshold: 85,
          voice_threshold: 75,
          framework_threshold: 60,
          weights: { fidelity: 0.6, voice: 0.25, framework: 0.15 },
        },
      },
    });

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent('eng', true)] as any);
    mockLoadDepartmentFromFile.mockReturnValue(def);
    discoverDepartments('/depts');

    const config = getValidationConfigForPersona('carmack');

    expect(config.fidelityThreshold).toBe(85);
    expect(config.voiceThreshold).toBe(75);
    expect(config.frameworkThreshold).toBe(60);
    expect(config.strictConstraints).toBe(false);
    expect(config.weights).toEqual({ fidelity: 0.6, voice: 0.25, framework: 0.15 });
  });

  it('fills gaps from DEFAULT_VALIDATION_CONFIG for partial overrides', () => {
    const def = makeDepartmentDefinition({
      identity: { name: 'Eng', id: 'eng', mission: 'Build' },
      personas: ['carmack'],
      quality_criteria: {
        validation_overrides: {
          fidelity_threshold: 80,
          // voice_threshold and framework_threshold not set
        },
      },
    });

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent('eng', true)] as any);
    mockLoadDepartmentFromFile.mockReturnValue(def);
    discoverDepartments('/depts');

    const config = getValidationConfigForPersona('carmack');

    expect(config.fidelityThreshold).toBe(80);
    expect(config.voiceThreshold).toBe(DEFAULT_VALIDATION_CONFIG.voiceThreshold);
    expect(config.frameworkThreshold).toBe(DEFAULT_VALIDATION_CONFIG.frameworkThreshold);
    expect(config.strictConstraints).toBe(DEFAULT_VALIDATION_CONFIG.strictConstraints);
    expect(config.weights).toEqual(DEFAULT_VALIDATION_CONFIG.weights);
  });

  it('returns copy of DEFAULT_VALIDATION_CONFIG for unknown persona', () => {
    const config = getValidationConfigForPersona('nobody');

    expect(config).toEqual(DEFAULT_VALIDATION_CONFIG);
    // Verify it is a copy, not the same reference
    expect(config).not.toBe(DEFAULT_VALIDATION_CONFIG);
  });
});

describe('getSharedMustAvoid', () => {
  it('returns shared_must_avoid patterns when department has them', () => {
    const mustAvoid = [
      { pattern: 'forbidden-word', description: 'Not allowed', weight: 8 },
      { pattern: 'bad-phrase', description: 'Avoid this', weight: 5 },
    ];
    const def = makeDepartmentDefinition({
      identity: { name: 'Creative', id: 'creative', mission: 'Create' },
      personas: ['artist'],
      quality_criteria: {
        validation_overrides: {},
        shared_must_avoid: mustAvoid,
      },
    });

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent('creative', true)] as any);
    mockLoadDepartmentFromFile.mockReturnValue(def);
    discoverDepartments('/depts');

    const result = getSharedMustAvoid('artist');

    expect(result).toEqual(mustAvoid);
  });

  it('returns empty array when persona has no department', () => {
    const result = getSharedMustAvoid('orphan-persona');

    expect(result).toEqual([]);
  });

  it('returns empty array when department has no shared_must_avoid', () => {
    const def = makeDepartmentDefinition({
      identity: { name: 'Plain', id: 'plain', mission: 'Plain dept' },
      personas: ['member'],
      quality_criteria: {
        validation_overrides: {},
        // shared_must_avoid not set
      },
    });

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent('plain', true)] as any);
    mockLoadDepartmentFromFile.mockReturnValue(def);
    discoverDepartments('/depts');

    const result = getSharedMustAvoid('member');

    expect(result).toEqual([]);
  });
});

describe('Utility functions', () => {
  it('hasDepartments returns false when empty', () => {
    expect(hasDepartments()).toBe(false);
  });

  it('hasDepartments returns true when populated', () => {
    const def = makeDepartmentDefinition();

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent('test-dept', true)] as any);
    mockLoadDepartmentFromFile.mockReturnValue(def);
    discoverDepartments('/depts');

    expect(hasDepartments()).toBe(true);
  });

  it('getDepartmentCount returns correct count', () => {
    expect(getDepartmentCount()).toBe(0);

    const def1 = makeDepartmentDefinition({
      identity: { name: 'A', id: 'dept-a', mission: 'A' },
      personas: ['p1'],
    });
    const def2 = makeDepartmentDefinition({
      identity: { name: 'B', id: 'dept-b', mission: 'B' },
      personas: ['p2'],
    });

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      makeDirent('dept-a', true),
      makeDirent('dept-b', true),
    ] as any);
    mockLoadDepartmentFromFile.mockImplementation((filePath: string) => {
      if (filePath.includes('dept-a')) return def1;
      return def2;
    });
    discoverDepartments('/depts');

    expect(getDepartmentCount()).toBe(2);
  });

  it('getPersonasByDepartment returns personas for known department', () => {
    const def = makeDepartmentDefinition({
      identity: { name: 'Eng', id: 'eng', mission: 'Build' },
      personas: ['carmack', 'hopper', 'lamport'],
    });

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent('eng', true)] as any);
    mockLoadDepartmentFromFile.mockReturnValue(def);
    discoverDepartments('/depts');

    const personas = getPersonasByDepartment('eng');

    expect(personas).toEqual(['carmack', 'hopper', 'lamport']);
    // Verify it returns a copy (not a reference to internal state)
    personas.push('mutated');
    expect(getPersonasByDepartment('eng')).toEqual(['carmack', 'hopper', 'lamport']);
  });

  it('getPersonasByDepartment returns empty array for unknown department', () => {
    expect(getPersonasByDepartment('nonexistent')).toEqual([]);
  });

  it('listDepartments returns summaries of all loaded departments', () => {
    const engDef = makeDepartmentDefinition({
      identity: { name: 'Engineering', id: 'eng', mission: 'Build' },
      personas: ['carmack', 'hopper'],
    });
    const bizDef = makeDepartmentDefinition({
      identity: { name: 'Business', id: 'biz', mission: 'Strategize' },
      personas: ['porter'],
    });

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      makeDirent('eng', true),
      makeDirent('biz', true),
    ] as any);
    mockLoadDepartmentFromFile.mockImplementation((filePath: string) => {
      if (filePath.includes('eng')) return engDef;
      return bizDef;
    });
    discoverDepartments('/depts');

    const summaries = listDepartments();

    expect(summaries).toHaveLength(2);
    expect(summaries.map((s) => s.id)).toContain('eng');
    expect(summaries.map((s) => s.id)).toContain('biz');

    const engSummary = summaries.find((s) => s.id === 'eng')!;
    expect(engSummary.name).toBe('Engineering');
    expect(engSummary.mission).toBe('Build');
    expect(engSummary.personaCount).toBe(2);
    expect(engSummary.personas).toEqual(['carmack', 'hopper']);
  });

  it('getDepartment returns definition for known department', () => {
    const def = makeDepartmentDefinition({
      identity: { name: 'Eng', id: 'eng', mission: 'Build' },
      personas: ['carmack'],
    });

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([makeDirent('eng', true)] as any);
    mockLoadDepartmentFromFile.mockReturnValue(def);
    discoverDepartments('/depts');

    const result = getDepartment('eng');

    expect(result).not.toBeNull();
    expect(result!.identity.id).toBe('eng');
    expect(result!.personas).toEqual(['carmack']);
  });

  it('getDepartment returns null for unknown department', () => {
    expect(getDepartment('nonexistent')).toBeNull();
  });
});
