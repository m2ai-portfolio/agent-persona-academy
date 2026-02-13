/**
 * Learning Adapter
 *
 * Bridges Sky-Lynx recommendations with department learning policies.
 * Reads pending recommendations from Snow-Town, resolves department context,
 * applies learning policy filters, and appends applied lessons to
 * department LEARNED_RULES.md files.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getDepartment, resolveDepartmentForPersona } from './department-manager.js';
import type {
  DepartmentDefinition,
  DepartmentChangeType,
  DepartmentLearningPolicy,
} from '../core/types.js';

/**
 * A recommendation from Sky-Lynx (mirrors Snow-Town contract shape)
 */
export interface PendingRecommendation {
  recommendation_id: string;
  recommendation_type: string;
  title: string;
  description: string;
  suggested_change: string;
  scope: string;
  target_persona_ids: string[];
  target_department: string | null;
  priority: string;
  evidence: {
    signal_strength: number;
    description: string;
  };
}

/**
 * Result of processing a recommendation against department policy
 */
export interface PolicyDecision {
  recommendation_id: string;
  action: 'auto_apply' | 'needs_review' | 'rejected';
  reason: string;
  department_id: string | null;
}

/**
 * Evaluate a recommendation against department learning policy
 */
export function evaluateRecommendation(
  rec: PendingRecommendation
): PolicyDecision {
  // Resolve department
  const departmentId = rec.target_department
    ?? (rec.target_persona_ids.length > 0
      ? resolveDepartmentForPersona(rec.target_persona_ids[0])
      : null);

  if (!departmentId) {
    return {
      recommendation_id: rec.recommendation_id,
      action: 'needs_review',
      reason: 'No department context — requires manual review',
      department_id: null,
    };
  }

  const department = getDepartment(departmentId);
  if (!department) {
    return {
      recommendation_id: rec.recommendation_id,
      action: 'needs_review',
      reason: `Department '${departmentId}' not found — requires manual review`,
      department_id: departmentId,
    };
  }

  const policy = department.learning_policy;
  const changeType = rec.recommendation_type as DepartmentChangeType;
  const confidence = rec.evidence.signal_strength;

  // Check if change type is restricted
  if (policy.restricted_change_types?.includes(changeType)) {
    return {
      recommendation_id: rec.recommendation_id,
      action: 'needs_review',
      reason: `Change type '${changeType}' is restricted in ${departmentId} department`,
      department_id: departmentId,
    };
  }

  // Check confidence thresholds
  if (confidence >= policy.auto_apply_threshold) {
    return {
      recommendation_id: rec.recommendation_id,
      action: 'auto_apply',
      reason: `Confidence ${confidence} >= auto-apply threshold ${policy.auto_apply_threshold}`,
      department_id: departmentId,
    };
  }

  if (confidence >= policy.review_threshold) {
    return {
      recommendation_id: rec.recommendation_id,
      action: 'needs_review',
      reason: `Confidence ${confidence} between review (${policy.review_threshold}) and auto-apply (${policy.auto_apply_threshold})`,
      department_id: departmentId,
    };
  }

  return {
    recommendation_id: rec.recommendation_id,
    action: 'rejected',
    reason: `Confidence ${confidence} below review threshold ${policy.review_threshold}`,
    department_id: departmentId,
  };
}

/**
 * Process a batch of recommendations respecting max_changes_per_cycle
 */
export function processBatch(
  recommendations: PendingRecommendation[]
): PolicyDecision[] {
  const decisions: PolicyDecision[] = [];
  const autoApplyCountByDept = new Map<string, number>();

  for (const rec of recommendations) {
    const decision = evaluateRecommendation(rec);

    // Enforce max_changes_per_cycle for auto-apply
    if (decision.action === 'auto_apply' && decision.department_id) {
      const dept = getDepartment(decision.department_id);
      const maxChanges = dept?.learning_policy.max_changes_per_cycle ?? 3;
      const currentCount = autoApplyCountByDept.get(decision.department_id) ?? 0;

      if (currentCount >= maxChanges) {
        decision.action = 'needs_review';
        decision.reason = `Max changes per cycle (${maxChanges}) reached for ${decision.department_id} — downgraded to review`;
      } else {
        autoApplyCountByDept.set(decision.department_id, currentCount + 1);
      }
    }

    decisions.push(decision);
  }

  return decisions;
}

/**
 * Append an applied lesson to a department's LEARNED_RULES.md
 */
export function appendLearnedRule(
  departmentsDir: string,
  departmentId: string,
  rec: PendingRecommendation,
  decision: PolicyDecision
): void {
  const rulesPath = join(departmentsDir, departmentId, 'LEARNED_RULES.md');

  const entry = [
    '',
    `## ${rec.title}`,
    `- **ID**: ${rec.recommendation_id}`,
    `- **Type**: ${rec.recommendation_type}`,
    `- **Priority**: ${rec.priority}`,
    `- **Action**: ${decision.action}`,
    `- **Confidence**: ${rec.evidence.signal_strength}`,
    `- **Applied**: ${new Date().toISOString().split('T')[0]}`,
    '',
    rec.description,
    '',
    `**Change**: ${rec.suggested_change}`,
    '',
    '---',
  ].join('\n');

  if (existsSync(rulesPath)) {
    const existing = readFileSync(rulesPath, 'utf-8');
    writeFileSync(rulesPath, existing + entry, 'utf-8');
  } else {
    const header = `# ${departmentId} Department - Learned Rules\n\nRules applied by Sky-Lynx continuous improvement system.\n\n---\n`;
    writeFileSync(rulesPath, header + entry, 'utf-8');
  }
}
