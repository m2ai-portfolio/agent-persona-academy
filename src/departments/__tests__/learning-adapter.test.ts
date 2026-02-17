import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DepartmentDefinition } from '../../core/types.js';

// Mock dependencies before importing the module under test
vi.mock('../department-manager.js', () => ({
  getDepartment: vi.fn(),
  resolveDepartmentForPersona: vi.fn(),
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

import {
  evaluateRecommendation,
  processBatch,
  appendLearnedRule,
} from '../learning-adapter.js';
import type { PendingRecommendation, PolicyDecision } from '../learning-adapter.js';
import { getDepartment, resolveDepartmentForPersona } from '../department-manager.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeRecommendation(overrides?: Partial<PendingRecommendation>): PendingRecommendation {
  return {
    recommendation_id: 'rec-001',
    recommendation_type: 'framework_refinement',
    title: 'Improve disruption framework',
    description: 'Add clarity to disruption signals section.',
    suggested_change: 'Add new signal pattern for market entrants.',
    scope: 'persona',
    target_persona_ids: ['christensen'],
    target_department: 'business-strategy',
    priority: 'medium',
    evidence: {
      signal_strength: 0.85,
      description: 'Multiple sessions showed confusion on this topic.',
    },
    ...overrides,
  };
}

function makeDepartment(overrides?: Partial<DepartmentDefinition>): DepartmentDefinition {
  return {
    identity: {
      name: 'Business Strategy',
      id: 'business-strategy',
      mission: 'Strategic analysis and competitive positioning.',
    },
    quality_criteria: {
      validation_overrides: {},
      shared_must_avoid: [],
    },
    learning_policy: {
      auto_apply_threshold: 0.9,
      review_threshold: 0.6,
      max_changes_per_cycle: 3,
    },
    personas: ['christensen', 'porter', 'drucker'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockedGetDepartment = getDepartment as ReturnType<typeof vi.fn>;
const mockedResolveDepartmentForPersona = resolveDepartmentForPersona as ReturnType<typeof vi.fn>;
const mockedExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockedReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockedWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();
});

describe('evaluateRecommendation', () => {
  it('returns auto_apply when confidence >= auto_apply_threshold', () => {
    const dept = makeDepartment({ learning_policy: { auto_apply_threshold: 0.9, review_threshold: 0.6, max_changes_per_cycle: 3 } });
    mockedGetDepartment.mockReturnValue(dept);

    const rec = makeRecommendation({ evidence: { signal_strength: 0.95, description: 'high confidence' } });
    const decision = evaluateRecommendation(rec);

    expect(decision.action).toBe('auto_apply');
    expect(decision.recommendation_id).toBe('rec-001');
    expect(decision.department_id).toBe('business-strategy');
    expect(decision.reason).toContain('0.95');
    expect(decision.reason).toContain('auto-apply');
  });

  it('returns needs_review when confidence is between review and auto_apply thresholds', () => {
    const dept = makeDepartment();
    mockedGetDepartment.mockReturnValue(dept);

    const rec = makeRecommendation({ evidence: { signal_strength: 0.75, description: 'medium confidence' } });
    const decision = evaluateRecommendation(rec);

    expect(decision.action).toBe('needs_review');
    expect(decision.department_id).toBe('business-strategy');
    expect(decision.reason).toContain('0.75');
  });

  it('returns rejected when confidence is below review_threshold', () => {
    const dept = makeDepartment();
    mockedGetDepartment.mockReturnValue(dept);

    const rec = makeRecommendation({ evidence: { signal_strength: 0.3, description: 'low confidence' } });
    const decision = evaluateRecommendation(rec);

    expect(decision.action).toBe('rejected');
    expect(decision.department_id).toBe('business-strategy');
    expect(decision.reason).toContain('0.3');
    expect(decision.reason).toContain('below review threshold');
  });

  it('returns needs_review when change type is restricted regardless of confidence', () => {
    const dept = makeDepartment({
      learning_policy: {
        auto_apply_threshold: 0.9,
        review_threshold: 0.6,
        max_changes_per_cycle: 3,
        restricted_change_types: ['voice_adjustment'],
      },
    });
    mockedGetDepartment.mockReturnValue(dept);

    const rec = makeRecommendation({
      recommendation_type: 'voice_adjustment',
      evidence: { signal_strength: 0.99, description: 'very high confidence' },
    });
    const decision = evaluateRecommendation(rec);

    expect(decision.action).toBe('needs_review');
    expect(decision.reason).toContain('restricted');
    expect(decision.reason).toContain('voice_adjustment');
  });

  it('returns needs_review when target_department is null and target_persona_ids is empty', () => {
    const rec = makeRecommendation({
      target_department: null,
      target_persona_ids: [],
    });
    const decision = evaluateRecommendation(rec);

    expect(decision.action).toBe('needs_review');
    expect(decision.department_id).toBeNull();
    expect(decision.reason).toContain('No department context');
    // Should never attempt persona resolution with an empty list
    expect(mockedResolveDepartmentForPersona).not.toHaveBeenCalled();
  });

  it('returns needs_review with null department_id when persona department lookup returns null', () => {
    // No target_department and resolveDepartmentForPersona returns null
    mockedResolveDepartmentForPersona.mockReturnValue(null);

    const rec = makeRecommendation({
      target_department: null,
      target_persona_ids: ['unknown-persona'],
    });
    const decision = evaluateRecommendation(rec);

    expect(decision.action).toBe('needs_review');
    expect(decision.department_id).toBeNull();
    expect(decision.reason).toContain('No department context');
  });

  it('returns needs_review when department is not found', () => {
    mockedGetDepartment.mockReturnValue(null);

    const rec = makeRecommendation({ target_department: 'nonexistent-dept' });
    const decision = evaluateRecommendation(rec);

    expect(decision.action).toBe('needs_review');
    expect(decision.department_id).toBe('nonexistent-dept');
    expect(decision.reason).toContain("'nonexistent-dept' not found");
  });

  it('uses target_department directly when provided', () => {
    const dept = makeDepartment();
    mockedGetDepartment.mockReturnValue(dept);

    const rec = makeRecommendation({
      target_department: 'business-strategy',
      evidence: { signal_strength: 0.95, description: 'high' },
    });
    evaluateRecommendation(rec);

    // getDepartment should be called with the target_department value
    expect(mockedGetDepartment).toHaveBeenCalledWith('business-strategy');
    // resolveDepartmentForPersona should NOT be called when target_department is provided
    expect(mockedResolveDepartmentForPersona).not.toHaveBeenCalled();
  });

  it('falls back to persona department when target_department is null', () => {
    mockedResolveDepartmentForPersona.mockReturnValue('engineering');
    const dept = makeDepartment({
      identity: { name: 'Engineering', id: 'engineering', mission: 'Build reliable systems.' },
    });
    mockedGetDepartment.mockReturnValue(dept);

    const rec = makeRecommendation({
      target_department: null,
      target_persona_ids: ['carmack'],
      evidence: { signal_strength: 0.95, description: 'high' },
    });
    const decision = evaluateRecommendation(rec);

    expect(mockedResolveDepartmentForPersona).toHaveBeenCalledWith('carmack');
    expect(mockedGetDepartment).toHaveBeenCalledWith('engineering');
    expect(decision.department_id).toBe('engineering');
  });
});

describe('processBatch', () => {
  it('enforces max_changes_per_cycle per department', () => {
    const dept = makeDepartment({
      learning_policy: {
        auto_apply_threshold: 0.9,
        review_threshold: 0.6,
        max_changes_per_cycle: 2,
      },
    });
    mockedGetDepartment.mockReturnValue(dept);

    const recs = [
      makeRecommendation({ recommendation_id: 'rec-1', evidence: { signal_strength: 0.95, description: 'high' } }),
      makeRecommendation({ recommendation_id: 'rec-2', evidence: { signal_strength: 0.92, description: 'high' } }),
      makeRecommendation({ recommendation_id: 'rec-3', evidence: { signal_strength: 0.91, description: 'high' } }),
    ];

    const decisions = processBatch(recs);

    // First two should be auto_apply, third should be downgraded
    expect(decisions[0].action).toBe('auto_apply');
    expect(decisions[1].action).toBe('auto_apply');
    expect(decisions[2].action).toBe('needs_review');
    expect(decisions[2].reason).toContain('Max changes per cycle');
    expect(decisions[2].reason).toContain('downgraded to review');
  });

  it('tracks max_changes_per_cycle independently per department', () => {
    const bizDept = makeDepartment({
      identity: { name: 'Business Strategy', id: 'business-strategy', mission: 'Strategy.' },
      learning_policy: { auto_apply_threshold: 0.9, review_threshold: 0.6, max_changes_per_cycle: 1 },
    });
    const engDept = makeDepartment({
      identity: { name: 'Engineering', id: 'engineering', mission: 'Engineering.' },
      learning_policy: { auto_apply_threshold: 0.9, review_threshold: 0.6, max_changes_per_cycle: 1 },
    });

    mockedGetDepartment.mockImplementation((id: string) => {
      if (id === 'business-strategy') return bizDept;
      if (id === 'engineering') return engDept;
      return null;
    });

    const recs = [
      makeRecommendation({
        recommendation_id: 'biz-1',
        target_department: 'business-strategy',
        evidence: { signal_strength: 0.95, description: 'high' },
      }),
      makeRecommendation({
        recommendation_id: 'eng-1',
        target_department: 'engineering',
        evidence: { signal_strength: 0.95, description: 'high' },
      }),
      makeRecommendation({
        recommendation_id: 'biz-2',
        target_department: 'business-strategy',
        evidence: { signal_strength: 0.93, description: 'high' },
      }),
      makeRecommendation({
        recommendation_id: 'eng-2',
        target_department: 'engineering',
        evidence: { signal_strength: 0.93, description: 'high' },
      }),
    ];

    const decisions = processBatch(recs);

    // Each department allows 1 auto_apply, so second of each should be downgraded
    expect(decisions[0].action).toBe('auto_apply');   // biz-1: first for business-strategy
    expect(decisions[1].action).toBe('auto_apply');   // eng-1: first for engineering
    expect(decisions[2].action).toBe('needs_review'); // biz-2: second for business-strategy (downgraded)
    expect(decisions[3].action).toBe('needs_review'); // eng-2: second for engineering (downgraded)
  });

  it('includes informative reason when downgrading auto_apply to needs_review', () => {
    const dept = makeDepartment({
      learning_policy: { auto_apply_threshold: 0.9, review_threshold: 0.6, max_changes_per_cycle: 1 },
    });
    mockedGetDepartment.mockReturnValue(dept);

    const recs = [
      makeRecommendation({ recommendation_id: 'rec-1', evidence: { signal_strength: 0.95, description: 'high' } }),
      makeRecommendation({ recommendation_id: 'rec-2', evidence: { signal_strength: 0.92, description: 'high' } }),
    ];

    const decisions = processBatch(recs);

    const downgraded = decisions[1];
    expect(downgraded.action).toBe('needs_review');
    expect(downgraded.reason).toContain('Max changes per cycle (1)');
    expect(downgraded.reason).toContain('business-strategy');
    expect(downgraded.reason).toContain('downgraded to review');
  });
});

describe('appendLearnedRule', () => {
  it('appends to existing file when it exists', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue('# Existing content\n\nSome rules here.\n');

    const rec = makeRecommendation();
    const decision: PolicyDecision = {
      recommendation_id: 'rec-001',
      action: 'auto_apply',
      reason: 'High confidence',
      department_id: 'business-strategy',
    };

    appendLearnedRule('/departments', 'business-strategy', rec, decision);

    expect(mockedExistsSync).toHaveBeenCalledWith('/departments/business-strategy/LEARNED_RULES.md');
    expect(mockedReadFileSync).toHaveBeenCalledWith(
      '/departments/business-strategy/LEARNED_RULES.md',
      'utf-8',
    );
    expect(mockedWriteFileSync).toHaveBeenCalledTimes(1);

    const writtenContent = mockedWriteFileSync.mock.calls[0][1] as string;
    // Should start with existing content
    expect(writtenContent).toMatch(/^# Existing content/);
    // Should contain the new entry
    expect(writtenContent).toContain('## Improve disruption framework');
  });

  it('creates new file with header when file does not exist', () => {
    mockedExistsSync.mockReturnValue(false);

    const rec = makeRecommendation();
    const decision: PolicyDecision = {
      recommendation_id: 'rec-001',
      action: 'auto_apply',
      reason: 'High confidence',
      department_id: 'business-strategy',
    };

    appendLearnedRule('/departments', 'business-strategy', rec, decision);

    expect(mockedReadFileSync).not.toHaveBeenCalled();
    expect(mockedWriteFileSync).toHaveBeenCalledTimes(1);

    const writtenContent = mockedWriteFileSync.mock.calls[0][1] as string;
    // Should have the header
    expect(writtenContent).toContain('# business-strategy Department - Learned Rules');
    expect(writtenContent).toContain('Sky-Lynx continuous improvement system');
    // Should also have the entry
    expect(writtenContent).toContain('## Improve disruption framework');
  });

  it('entry contains correct fields from the recommendation and decision', () => {
    mockedExistsSync.mockReturnValue(false);

    const rec = makeRecommendation({
      recommendation_id: 'rec-xyz',
      recommendation_type: 'case_study_addition',
      title: 'Add new case study',
      description: 'A detailed description of the change.',
      suggested_change: 'Insert case study about Netflix.',
      priority: 'high',
      evidence: { signal_strength: 0.88, description: 'strong evidence' },
    });
    const decision: PolicyDecision = {
      recommendation_id: 'rec-xyz',
      action: 'auto_apply',
      reason: 'High confidence',
      department_id: 'business-strategy',
    };

    appendLearnedRule('/departments', 'business-strategy', rec, decision);

    const writtenContent = mockedWriteFileSync.mock.calls[0][1] as string;

    expect(writtenContent).toContain('## Add new case study');
    expect(writtenContent).toContain('**ID**: rec-xyz');
    expect(writtenContent).toContain('**Type**: case_study_addition');
    expect(writtenContent).toContain('**Priority**: high');
    expect(writtenContent).toContain('**Action**: auto_apply');
    expect(writtenContent).toContain('**Confidence**: 0.88');
    expect(writtenContent).toContain('A detailed description of the change.');
    expect(writtenContent).toContain('**Change**: Insert case study about Netflix.');
    // Should contain an Applied date in YYYY-MM-DD format
    expect(writtenContent).toMatch(/\*\*Applied\*\*: \d{4}-\d{2}-\d{2}/);
    // Should contain a horizontal rule separator
    expect(writtenContent).toContain('---');
  });
});
