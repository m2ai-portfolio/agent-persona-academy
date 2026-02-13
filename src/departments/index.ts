/**
 * Departments Module
 *
 * Department-based isolation for persona quality criteria and learning policies.
 */

// Loader
export {
  loadDepartmentFromFile,
  loadDepartment,
  clearDepartmentCache,
  getDepartmentsDirectory,
} from './department-loader.js';

// Manager
export {
  discoverDepartments,
  listDepartments,
  getDepartment,
  resolveDepartmentForPersona,
  getValidationConfigForPersona,
  getSharedMustAvoid,
  getPersonasByDepartment,
  hasDepartments,
  getDepartmentCount,
} from './department-manager.js';

export type { DepartmentSummary } from './department-manager.js';

// Learning Adapter
export {
  evaluateRecommendation,
  processBatch,
  appendLearnedRule,
} from './learning-adapter.js';

export type { PendingRecommendation, PolicyDecision } from './learning-adapter.js';
