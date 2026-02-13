/**
 * Validation Module Types
 *
 * Types for comprehensive persona validation, testing, and comparison.
 */

import type { PersonaDefinition, FidelityScore } from '../core/types.js';

// ============================================================================
// Voice Analysis Types
// ============================================================================

export interface VoiceAnalysisResult {
  /** Overall voice consistency score (0-100) */
  consistencyScore: number;
  /** Tone markers found in text */
  toneMarkers: ToneMatch[];
  /** Characteristic phrases detected */
  phraseMatches: PhraseMatch[];
  /** Style patterns identified */
  stylePatterns: StyleMatch[];
  /** Constraint violations found */
  constraintViolations: string[];
  /** Assessment summary */
  assessment: string;
}

export interface ToneMatch {
  /** Expected tone characteristic */
  expected: string;
  /** Whether it was detected */
  detected: boolean;
  /** Evidence supporting detection */
  evidence?: string;
}

export interface PhraseMatch {
  /** The characteristic phrase */
  phrase: string;
  /** Whether exact or variant match */
  matchType: 'exact' | 'variant' | 'absent';
  /** Matched text if found */
  matchedText?: string;
}

export interface StyleMatch {
  /** Style pattern description */
  pattern: string;
  /** Whether the pattern was followed */
  followed: boolean;
  /** Confidence in detection (0-1) */
  confidence: number;
}

// ============================================================================
// Framework Coverage Types
// ============================================================================

export interface FrameworkCoverageResult {
  /** Overall coverage score (0-100) */
  coverageScore: number;
  /** Coverage by framework */
  frameworkCoverage: Record<string, SingleFrameworkCoverage>;
  /** Frameworks explicitly referenced */
  referencedFrameworks: string[];
  /** Concepts mentioned */
  conceptsMentioned: string[];
  /** Questions used or echoed */
  questionsUsed: string[];
  /** Assessment summary */
  assessment: string;
}

export interface SingleFrameworkCoverage {
  /** Framework name */
  name: string;
  /** Whether framework was referenced */
  referenced: boolean;
  /** Concepts from this framework found in text */
  conceptsFound: string[];
  /** Total concepts in framework */
  totalConcepts: number;
  /** Coverage percentage */
  coverage: number;
}

// ============================================================================
// Comparison Types
// ============================================================================

export interface PersonaComparisonResult {
  /** Persona being compared */
  personaId: string;
  /** Persona name */
  personaName: string;
  /** Fidelity score for this persona */
  fidelityScore: FidelityScore;
  /** Voice analysis result */
  voiceAnalysis: VoiceAnalysisResult;
  /** Framework coverage result */
  frameworkCoverage: FrameworkCoverageResult;
  /** Combined quality score */
  qualityScore: number;
}

export interface CrossPersonaComparison {
  /** Text that was analyzed */
  analyzedText: string;
  /** Results for each persona */
  results: PersonaComparisonResult[];
  /** Best matching persona */
  bestMatch: string;
  /** Summary of comparison */
  summary: string;
}

// ============================================================================
// Test Suite Types
// ============================================================================

export interface TestCase {
  /** Test case identifier */
  id: string;
  /** Test description */
  description: string;
  /** Test category */
  category: TestCategory;
  /** Input text or prompt */
  input: string;
  /** Expected outcome */
  expected: TestExpectation;
}

export type TestCategory =
  | 'fidelity'
  | 'voice'
  | 'framework'
  | 'negative'
  | 'edge_case';

export interface TestExpectation {
  /** Should the test pass? */
  shouldPass: boolean;
  /** Minimum score (if applicable) */
  minScore?: number;
  /** Maximum score (if applicable) */
  maxScore?: number;
  /** Required patterns to match */
  requiredPatterns?: string[];
  /** Patterns that should not match */
  forbiddenPatterns?: string[];
}

export interface TestResult {
  /** Test case that was run */
  testCase: TestCase;
  /** Whether test passed */
  passed: boolean;
  /** Actual score (if applicable) */
  actualScore?: number;
  /** Actual patterns matched */
  matchedPatterns?: string[];
  /** Error message if failed */
  error?: string;
  /** Execution time in ms */
  executionTime: number;
}

export interface TestSuiteResult {
  /** Persona tested */
  personaId: string;
  /** Total tests run */
  totalTests: number;
  /** Tests passed */
  passedTests: number;
  /** Tests failed */
  failedTests: number;
  /** Pass rate percentage */
  passRate: number;
  /** Individual test results */
  results: TestResult[];
  /** Execution time in ms */
  totalExecutionTime: number;
  /** Timestamp of test run */
  timestamp: Date;
}

// ============================================================================
// Report Types
// ============================================================================

export interface QualityReport {
  /** Report timestamp */
  generatedAt: Date;
  /** Persona analyzed */
  persona: {
    id: string;
    name: string;
    version?: string;
  };
  /** Department context (if persona belongs to a department) */
  department?: {
    id: string;
    name: string;
  };
  /** Summary scores */
  scores: {
    fidelity: number;
    voiceConsistency: number;
    frameworkCoverage: number;
    overall: number;
  };
  /** Detailed analysis */
  analysis: {
    fidelity: FidelityScore;
    voice: VoiceAnalysisResult;
    framework: FrameworkCoverageResult;
  };
  /** Test suite results (if tests were run) */
  testResults?: TestSuiteResult;
  /** Recommendations for improvement */
  recommendations: Recommendation[];
}

export interface Recommendation {
  /** Recommendation category */
  category: 'voice' | 'framework' | 'validation' | 'sample';
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** What to improve */
  issue: string;
  /** How to fix it */
  suggestion: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ValidationConfig {
  /** Minimum fidelity score to pass */
  fidelityThreshold: number;
  /** Minimum voice consistency score */
  voiceThreshold: number;
  /** Minimum framework coverage score */
  frameworkThreshold: number;
  /** Whether to fail on any constraint violation */
  strictConstraints: boolean;
  /** Custom weights for scoring */
  weights?: {
    fidelity?: number;
    voice?: number;
    framework?: number;
  };
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  fidelityThreshold: 70,
  voiceThreshold: 60,
  frameworkThreshold: 50,
  strictConstraints: false,
  weights: {
    fidelity: 0.5,
    voice: 0.3,
    framework: 0.2,
  },
};
