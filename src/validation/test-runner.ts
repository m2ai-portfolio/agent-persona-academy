/**
 * Test Runner Module
 *
 * Runs comprehensive test suites against personas using sample responses
 * and custom test cases. Supports automated CI/CD testing.
 */

import type { PersonaDefinition } from '../core/types.js';
import { calculateFidelityScore } from '../core/validation-engine.js';
import { analyzeVoiceConsistency } from './voice-analyzer.js';
import { analyzeFrameworkCoverage } from './framework-coverage.js';
import type {
  TestCase,
  TestResult,
  TestSuiteResult,
  TestExpectation,
  TestCategory,
  ValidationConfig,
} from './types.js';
import { DEFAULT_VALIDATION_CONFIG } from './types.js';

/**
 * Run all tests for a persona
 */
export function runTestSuite(
  persona: PersonaDefinition,
  config: Partial<ValidationConfig> = {}
): TestSuiteResult {
  const mergedConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  const startTime = Date.now();

  // Generate test cases from persona
  const testCases = generateTestCases(persona, mergedConfig);

  // Run each test
  const results: TestResult[] = [];
  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of testCases) {
    const result = runSingleTest(testCase, persona);
    results.push(result);

    if (result.passed) {
      passedTests++;
    } else {
      failedTests++;
    }
  }

  const totalExecutionTime = Date.now() - startTime;
  const passRate = testCases.length > 0
    ? Math.round((passedTests / testCases.length) * 100)
    : 100;

  return {
    personaId: persona.identity.name.toLowerCase().replace(/\s+/g, '-'),
    totalTests: testCases.length,
    passedTests,
    failedTests,
    passRate,
    results,
    totalExecutionTime,
    timestamp: new Date(),
  };
}

/**
 * Generate test cases from persona definition
 */
function generateTestCases(
  persona: PersonaDefinition,
  config: ValidationConfig
): TestCase[] {
  const testCases: TestCase[] = [];

  // Test cases from sample_responses
  const samples = persona.sample_responses ?? {};
  for (const [id, sample] of Object.entries(samples)) {
    // Good response should pass
    testCases.push({
      id: `sample_good_${id}`,
      description: `Good response for "${sample.prompt.slice(0, 30)}..."`,
      category: 'fidelity',
      input: sample.good_response,
      expected: {
        shouldPass: true,
        minScore: config.fidelityThreshold,
      },
    });

    // Bad response should fail (if provided)
    if (sample.bad_response) {
      testCases.push({
        id: `sample_bad_${id}`,
        description: `Bad response should score low for "${sample.prompt.slice(0, 30)}..."`,
        category: 'negative',
        input: sample.bad_response,
        expected: {
          shouldPass: false,
          maxScore: config.fidelityThreshold - 1,
        },
      });
    }
  }

  // Voice consistency tests from good samples
  for (const [id, sample] of Object.entries(samples)) {
    testCases.push({
      id: `voice_${id}`,
      description: `Voice check for "${sample.prompt.slice(0, 30)}..."`,
      category: 'voice',
      input: sample.good_response,
      expected: {
        shouldPass: true,
        minScore: config.voiceThreshold,
      },
    });
  }

  // Framework coverage tests
  for (const [id, sample] of Object.entries(samples)) {
    testCases.push({
      id: `framework_${id}`,
      description: `Framework coverage for "${sample.prompt.slice(0, 30)}..."`,
      category: 'framework',
      input: sample.good_response,
      expected: {
        shouldPass: true,
        minScore: config.frameworkThreshold,
      },
    });
  }

  // Generate edge case tests
  testCases.push(...generateEdgeCaseTests(persona));

  return testCases;
}

/**
 * Generate edge case tests
 */
function generateEdgeCaseTests(persona: PersonaDefinition): TestCase[] {
  const tests: TestCase[] = [];

  // Empty input test
  tests.push({
    id: 'edge_empty',
    description: 'Empty input should fail',
    category: 'edge_case',
    input: '',
    expected: {
      shouldPass: false,
      maxScore: 30,
    },
  });

  // Very short input test
  tests.push({
    id: 'edge_short',
    description: 'Very short input should score low',
    category: 'edge_case',
    input: 'Yes.',
    expected: {
      shouldPass: false,
      maxScore: 40,
    },
  });

  // Generic corporate speak (antipattern test)
  tests.push({
    id: 'edge_corporate',
    description: 'Generic corporate speak should score low',
    category: 'negative',
    input: 'We need to leverage our synergies and pivot to a more scalable solution that disrupts the market paradigm.',
    expected: {
      shouldPass: false,
      maxScore: 50,
    },
  });

  // Random unrelated text
  tests.push({
    id: 'edge_unrelated',
    description: 'Unrelated text should score low',
    category: 'edge_case',
    input: 'The weather today is sunny with a high of 72 degrees. I had pancakes for breakfast.',
    expected: {
      shouldPass: false,
      maxScore: 40,
    },
  });

  return tests;
}

/**
 * Run a single test case
 */
function runSingleTest(
  testCase: TestCase,
  persona: PersonaDefinition
): TestResult {
  const startTime = Date.now();

  try {
    let actualScore: number;
    let matchedPatterns: string[] = [];

    // Run appropriate analysis based on category
    switch (testCase.category) {
      case 'voice': {
        const voiceResult = analyzeVoiceConsistency(testCase.input, persona);
        actualScore = voiceResult.consistencyScore;
        break;
      }
      case 'framework': {
        const frameworkResult = analyzeFrameworkCoverage(testCase.input, persona);
        actualScore = frameworkResult.coverageScore;
        matchedPatterns = frameworkResult.conceptsMentioned;
        break;
      }
      case 'fidelity':
      case 'negative':
      case 'edge_case':
      default: {
        const fidelityResult = calculateFidelityScore(testCase.input, persona);
        actualScore = fidelityResult.score;
        matchedPatterns = fidelityResult.breakdown.must_include.patterns;
        break;
      }
    }

    // Evaluate against expectations
    const passed = evaluateExpectation(actualScore, testCase.expected, matchedPatterns);

    return {
      testCase,
      passed,
      actualScore,
      matchedPatterns,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      testCase,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Evaluate if actual results meet expectations
 */
function evaluateExpectation(
  actualScore: number,
  expected: TestExpectation,
  matchedPatterns: string[]
): boolean {
  // Check shouldPass
  if (expected.shouldPass) {
    // Test should pass
    if (expected.minScore !== undefined && actualScore < expected.minScore) {
      return false;
    }
    if (expected.requiredPatterns) {
      for (const pattern of expected.requiredPatterns) {
        if (!matchedPatterns.includes(pattern)) {
          return false;
        }
      }
    }
    return true;
  } else {
    // Test should fail
    if (expected.maxScore !== undefined && actualScore > expected.maxScore) {
      return false;
    }
    if (expected.forbiddenPatterns) {
      for (const pattern of expected.forbiddenPatterns) {
        if (matchedPatterns.includes(pattern)) {
          return false;
        }
      }
    }
    return true;
  }
}

/**
 * Run a custom test case
 */
export function runCustomTest(
  text: string,
  persona: PersonaDefinition,
  expected: Partial<TestExpectation> = {}
): TestResult {
  const testCase: TestCase = {
    id: 'custom',
    description: 'Custom test',
    category: 'fidelity',
    input: text,
    expected: {
      shouldPass: expected.shouldPass ?? true,
      minScore: expected.minScore,
      maxScore: expected.maxScore,
      requiredPatterns: expected.requiredPatterns,
      forbiddenPatterns: expected.forbiddenPatterns,
    },
  };

  return runSingleTest(testCase, persona);
}

/**
 * Format test suite results as a string
 */
export function formatTestResults(results: TestSuiteResult): string {
  const lines: string[] = [];

  lines.push('═'.repeat(60));
  lines.push(`TEST SUITE RESULTS: ${results.personaId}`);
  lines.push(`Run: ${results.timestamp.toISOString()}`);
  lines.push('═'.repeat(60));
  lines.push('');

  // Summary
  const passEmoji = results.failedTests === 0 ? '✓' : '✗';
  lines.push(`${passEmoji} ${results.passedTests}/${results.totalTests} tests passed (${results.passRate}%)`);
  lines.push(`   Execution time: ${results.totalExecutionTime}ms`);
  lines.push('');

  // Group results by category
  const categories: TestCategory[] = ['fidelity', 'voice', 'framework', 'negative', 'edge_case'];

  for (const category of categories) {
    const categoryResults = results.results.filter((r) => r.testCase.category === category);
    if (categoryResults.length === 0) continue;

    const categoryPassed = categoryResults.filter((r) => r.passed).length;
    lines.push(`${category.toUpperCase()} TESTS (${categoryPassed}/${categoryResults.length})`);
    lines.push('─'.repeat(40));

    for (const result of categoryResults) {
      const status = result.passed ? '✓' : '✗';
      const scoreInfo = result.actualScore !== undefined ? ` [${result.actualScore}]` : '';
      lines.push(`  ${status} ${result.testCase.description}${scoreInfo}`);

      if (!result.passed && result.error) {
        lines.push(`      Error: ${result.error}`);
      }

      if (!result.passed && result.actualScore !== undefined) {
        const expected = result.testCase.expected;
        if (expected.minScore !== undefined) {
          lines.push(`      Expected: ≥${expected.minScore}, Got: ${result.actualScore}`);
        }
        if (expected.maxScore !== undefined) {
          lines.push(`      Expected: ≤${expected.maxScore}, Got: ${result.actualScore}`);
        }
      }
    }

    lines.push('');
  }

  // Footer
  lines.push('═'.repeat(60));

  if (results.failedTests > 0) {
    lines.push(`FAILED: ${results.failedTests} test(s) need attention`);
  } else {
    lines.push('ALL TESTS PASSED');
  }

  return lines.join('\n');
}

/**
 * Generate JUnit-style XML report for CI/CD integration
 */
export function generateJUnitReport(results: TestSuiteResult): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(`<testsuite name="${escapeXml(results.personaId)}" tests="${results.totalTests}" failures="${results.failedTests}" time="${results.totalExecutionTime / 1000}">`);

  for (const result of results.results) {
    const time = result.executionTime / 1000;
    lines.push(`  <testcase name="${escapeXml(result.testCase.id)}" classname="${escapeXml(result.testCase.category)}" time="${time}">`);

    if (!result.passed) {
      const message = result.error ?? `Score ${result.actualScore} did not meet expectation`;
      lines.push(`    <failure message="${escapeXml(message)}">`);
      lines.push(`      Test: ${escapeXml(result.testCase.description)}`);
      if (result.actualScore !== undefined) {
        lines.push(`      Actual score: ${result.actualScore}`);
      }
      lines.push('    </failure>');
    }

    lines.push('  </testcase>');
  }

  lines.push('</testsuite>');

  return lines.join('\n');
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Check if test suite passed CI thresholds
 */
export function passesCI(
  results: TestSuiteResult,
  minPassRate = 80
): { passed: boolean; message: string } {
  if (results.passRate < minPassRate) {
    return {
      passed: false,
      message: `Pass rate ${results.passRate}% below threshold ${minPassRate}%`,
    };
  }

  // Check for critical failures (edge cases should all pass)
  const edgeCases = results.results.filter((r) => r.testCase.category === 'edge_case');
  const edgeCasePassed = edgeCases.filter((r) => r.passed).length;
  if (edgeCases.length > 0 && edgeCasePassed < edgeCases.length) {
    return {
      passed: false,
      message: `Edge case tests failed: ${edgeCases.length - edgeCasePassed} of ${edgeCases.length}`,
    };
  }

  return {
    passed: true,
    message: `All CI checks passed (${results.passRate}% pass rate)`,
  };
}
