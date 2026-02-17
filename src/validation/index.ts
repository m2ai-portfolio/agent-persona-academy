/**
 * Validation Module
 *
 * Comprehensive persona validation, testing, and comparison.
 *
 * Components:
 * - Voice Analyzer: Consistency with persona voice characteristics
 * - Framework Coverage: Usage of persona's conceptual frameworks
 * - Comparison Engine: Cross-persona analysis
 * - Report Generator: Quality reports and recommendations
 * - Test Runner: Automated test suites for CI/CD
 */

// Types
export type {
  VoiceAnalysisResult,
  ToneMatch,
  PhraseMatch,
  StyleMatch,
  FrameworkCoverageResult,
  SingleFrameworkCoverage,
  PersonaComparisonResult,
  CrossPersonaComparison,
  TestCase,
  TestCategory,
  TestExpectation,
  TestResult,
  TestSuiteResult,
  QualityReport,
  Recommendation,
  ValidationConfig,
} from './types.js';

export { DEFAULT_VALIDATION_CONFIG } from './types.js';

// Voice Analysis
export { analyzeVoiceConsistency, quickVoiceCheck, getVoiceSuggestions } from './voice-analyzer.js';

// Framework Coverage
export {
  analyzeFrameworkCoverage,
  quickFrameworkCheck,
  getFrameworkSuggestions,
  getFrameworkReport,
} from './framework-coverage.js';

// Comparison
export {
  compareAcrossPersonas,
  findBestPersonaMatch,
  comparePersonaCharacteristics,
  generateSimilarityMatrix,
  identifyDifferentiators,
  getComparativeAnalysis,
} from './comparison.js';

// Report Generator
export {
  generateQualityReport,
  formatReport,
  generateJSONReport,
  generateSummary,
  passesQualityThresholds,
} from './report-generator.js';

export type { DepartmentContext } from './report-generator.js';

// Test Runner
export {
  runTestSuite,
  runCustomTest,
  formatTestResults,
  generateJUnitReport,
  passesCI,
} from './test-runner.js';
