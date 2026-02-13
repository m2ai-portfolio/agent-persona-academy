/**
 * Quality Report Generator
 *
 * Generates comprehensive quality reports for persona validation.
 * Combines fidelity, voice, and framework analyses into actionable reports.
 */

import type { PersonaDefinition, FidelityScore, ValidationMarker } from '../core/types.js';
import { calculateFidelityScore, getSuggestions } from '../core/validation-engine.js';
import { analyzeVoiceConsistency, getVoiceSuggestions } from './voice-analyzer.js';
import { analyzeFrameworkCoverage, getFrameworkSuggestions } from './framework-coverage.js';
import type {
  QualityReport,
  Recommendation,
  ValidationConfig,
  VoiceAnalysisResult,
  FrameworkCoverageResult,
} from './types.js';
import { DEFAULT_VALIDATION_CONFIG } from './types.js';

/**
 * Department context for quality reports
 */
export interface DepartmentContext {
  id: string;
  name: string;
  additionalMustAvoid?: ValidationMarker[];
}

/**
 * Generate a comprehensive quality report for a text
 */
export function generateQualityReport(
  text: string,
  persona: PersonaDefinition,
  config: Partial<ValidationConfig> = {},
  departmentContext?: DepartmentContext
): QualityReport {
  const mergedConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };

  // Run all analyses, passing department must_avoid patterns
  const fidelity = calculateFidelityScore(text, persona, {
    additionalMustAvoid: departmentContext?.additionalMustAvoid,
    passingScore: mergedConfig.fidelityThreshold,
  });
  const voice = analyzeVoiceConsistency(text, persona);
  const framework = analyzeFrameworkCoverage(text, persona);

  // Calculate overall score
  const weights = mergedConfig.weights ?? {
    fidelity: 0.5,
    voice: 0.3,
    framework: 0.2,
  };

  const overall = Math.round(
    fidelity.score * (weights.fidelity ?? 0.5) +
    voice.consistencyScore * (weights.voice ?? 0.3) +
    framework.coverageScore * (weights.framework ?? 0.2)
  );

  // Generate recommendations
  const recommendations = generateRecommendations(
    text,
    persona,
    fidelity,
    voice,
    framework,
    mergedConfig
  );

  return {
    generatedAt: new Date(),
    persona: {
      id: persona.metadata?.version ? `${persona.identity.name.toLowerCase().replace(/\s+/g, '-')}` : 'unknown',
      name: persona.identity.name,
      version: persona.metadata?.version,
    },
    department: departmentContext
      ? { id: departmentContext.id, name: departmentContext.name }
      : undefined,
    scores: {
      fidelity: fidelity.score,
      voiceConsistency: voice.consistencyScore,
      frameworkCoverage: framework.coverageScore,
      overall,
    },
    analysis: {
      fidelity,
      voice,
      framework,
    },
    recommendations,
  };
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(
  text: string,
  persona: PersonaDefinition,
  fidelity: FidelityScore,
  voice: VoiceAnalysisResult,
  framework: FrameworkCoverageResult,
  config: ValidationConfig
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // High priority: Fidelity issues
  if (fidelity.score < config.fidelityThreshold) {
    const fidelitySuggestions = getSuggestions(text, persona);
    for (const suggestion of fidelitySuggestions.slice(0, 3)) {
      const isRemove = suggestion.startsWith('Remove:');
      recommendations.push({
        category: 'validation',
        priority: 'high',
        issue: isRemove ? 'Validation pattern violation' : 'Missing required pattern',
        suggestion,
      });
    }
  }

  // High priority: Voice constraint violations
  if (voice.constraintViolations.length > 0) {
    for (const violation of voice.constraintViolations) {
      recommendations.push({
        category: 'voice',
        priority: 'high',
        issue: 'Voice constraint violated',
        suggestion: `Address constraint: ${violation}`,
      });
    }
  }

  // Medium priority: Voice consistency
  if (voice.consistencyScore < config.voiceThreshold) {
    const voiceSuggestions = getVoiceSuggestions(text, persona);
    for (const suggestion of voiceSuggestions.slice(0, 2)) {
      recommendations.push({
        category: 'voice',
        priority: 'medium',
        issue: 'Voice consistency needs improvement',
        suggestion,
      });
    }
  }

  // Medium priority: Framework coverage
  if (framework.coverageScore < config.frameworkThreshold) {
    const frameworkSuggestions = getFrameworkSuggestions(text, persona);
    for (const suggestion of frameworkSuggestions.slice(0, 2)) {
      recommendations.push({
        category: 'framework',
        priority: 'medium',
        issue: 'Framework coverage insufficient',
        suggestion,
      });
    }
  }

  // Low priority: Missing sample responses
  const sampleCount = Object.keys(persona.sample_responses ?? {}).length;
  if (sampleCount < 3) {
    recommendations.push({
      category: 'sample',
      priority: 'low',
      issue: 'Few sample responses defined',
      suggestion: `Add more sample_responses to persona (currently ${sampleCount}, recommend 3+)`,
    });
  }

  // Low priority: Could be better
  if (fidelity.score >= config.fidelityThreshold && fidelity.score < 90) {
    const missedPatterns = fidelity.breakdown.must_include.total -
      fidelity.breakdown.must_include.matched;
    if (missedPatterns > 0) {
      recommendations.push({
        category: 'validation',
        priority: 'low',
        issue: `${missedPatterns} optional patterns could be added`,
        suggestion: 'Review must_include patterns for additional coverage opportunities',
      });
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

/**
 * Format a quality report as a string
 */
export function formatReport(report: QualityReport): string {
  const lines: string[] = [];

  // Header
  lines.push('═'.repeat(60));
  lines.push(`QUALITY REPORT: ${report.persona.name}`);
  if (report.department) {
    lines.push(`Department: ${report.department.name} (${report.department.id})`);
  }
  lines.push(`Generated: ${report.generatedAt.toISOString()}`);
  if (report.persona.version) {
    lines.push(`Version: ${report.persona.version}`);
  }
  lines.push('═'.repeat(60));
  lines.push('');

  // Scores Summary
  lines.push('SCORES');
  lines.push('─'.repeat(40));
  lines.push(`  Overall:           ${formatScore(report.scores.overall)}`);
  lines.push(`  Fidelity:          ${formatScore(report.scores.fidelity)}`);
  lines.push(`  Voice Consistency: ${formatScore(report.scores.voiceConsistency)}`);
  lines.push(`  Framework Coverage:${formatScore(report.scores.frameworkCoverage)}`);
  lines.push('');

  // Fidelity Details
  lines.push('FIDELITY ANALYSIS');
  lines.push('─'.repeat(40));
  const fidelity = report.analysis.fidelity;
  lines.push(`  Required patterns: ${fidelity.breakdown.must_include.matched}/${fidelity.breakdown.must_include.total}`);
  lines.push(`  Bonus patterns:    ${fidelity.breakdown.should_include.matched}/${fidelity.breakdown.should_include.total}`);
  if (fidelity.breakdown.must_avoid.triggered > 0) {
    lines.push(`  Violations:        ${fidelity.breakdown.must_avoid.triggered}`);
  }
  lines.push(`  Status:            ${fidelity.passed ? 'PASSED' : 'FAILED'}`);
  lines.push('');

  // Voice Details
  lines.push('VOICE ANALYSIS');
  lines.push('─'.repeat(40));
  const voice = report.analysis.voice;
  const tonesDetected = voice.toneMarkers.filter((t) => t.detected).length;
  const phraseMatches = voice.phraseMatches.filter((p) => p.matchType !== 'absent').length;
  const stylesFollowed = voice.stylePatterns.filter((s) => s.followed).length;
  lines.push(`  Tones detected:    ${tonesDetected}/${voice.toneMarkers.length}`);
  lines.push(`  Phrases matched:   ${phraseMatches}/${voice.phraseMatches.length}`);
  lines.push(`  Styles followed:   ${stylesFollowed}/${voice.stylePatterns.length}`);
  if (voice.constraintViolations.length > 0) {
    lines.push(`  Violations:        ${voice.constraintViolations.join(', ')}`);
  }
  lines.push('');

  // Framework Details
  lines.push('FRAMEWORK COVERAGE');
  lines.push('─'.repeat(40));
  const framework = report.analysis.framework;
  lines.push(`  Frameworks used:   ${framework.referencedFrameworks.length}/${Object.keys(framework.frameworkCoverage).length}`);
  lines.push(`  Concepts applied:  ${framework.conceptsMentioned.length}`);
  lines.push(`  Questions used:    ${framework.questionsUsed.length}`);
  lines.push('');

  for (const [name, coverage] of Object.entries(framework.frameworkCoverage)) {
    const status = coverage.referenced ? '✓' : '○';
    lines.push(`    ${status} ${name}: ${coverage.coverage}% (${coverage.conceptsFound.length}/${coverage.totalConcepts} concepts)`);
  }
  lines.push('');

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push('RECOMMENDATIONS');
    lines.push('─'.repeat(40));

    const highPriority = report.recommendations.filter((r) => r.priority === 'high');
    const mediumPriority = report.recommendations.filter((r) => r.priority === 'medium');
    const lowPriority = report.recommendations.filter((r) => r.priority === 'low');

    if (highPriority.length > 0) {
      lines.push('  HIGH PRIORITY:');
      for (const rec of highPriority) {
        lines.push(`    [!] ${rec.suggestion}`);
      }
    }

    if (mediumPriority.length > 0) {
      lines.push('  MEDIUM PRIORITY:');
      for (const rec of mediumPriority) {
        lines.push(`    [*] ${rec.suggestion}`);
      }
    }

    if (lowPriority.length > 0) {
      lines.push('  LOW PRIORITY:');
      for (const rec of lowPriority) {
        lines.push(`    [-] ${rec.suggestion}`);
      }
    }
    lines.push('');
  }

  // Footer
  lines.push('═'.repeat(60));

  return lines.join('\n');
}

/**
 * Format a score with color indicators
 */
function formatScore(score: number): string {
  const bar = '█'.repeat(Math.floor(score / 10)) + '░'.repeat(10 - Math.floor(score / 10));
  const status = score >= 80 ? '✓' : score >= 60 ? '~' : '✗';
  return `${score.toString().padStart(3)}/100 ${bar} ${status}`;
}

/**
 * Generate JSON report for programmatic use
 */
export function generateJSONReport(report: QualityReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Generate a brief summary (one paragraph)
 */
export function generateSummary(report: QualityReport): string {
  const { persona, scores, recommendations } = report;

  let status: string;
  if (scores.overall >= 80) {
    status = 'excellent';
  } else if (scores.overall >= 70) {
    status = 'good';
  } else if (scores.overall >= 60) {
    status = 'acceptable';
  } else {
    status = 'needs improvement';
  }

  const highPriorityCount = recommendations.filter((r) => r.priority === 'high').length;
  const issueNote = highPriorityCount > 0
    ? ` ${highPriorityCount} high-priority issue(s) require attention.`
    : '';

  return `${persona.name} persona quality is ${status} (${scores.overall}/100). ` +
    `Fidelity: ${scores.fidelity}, Voice: ${scores.voiceConsistency}, Framework: ${scores.frameworkCoverage}.` +
    issueNote;
}

/**
 * Check if a report passes quality thresholds
 */
export function passesQualityThresholds(
  report: QualityReport,
  config: Partial<ValidationConfig> = {}
): { passed: boolean; failures: string[] } {
  const mergedConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  const failures: string[] = [];

  if (report.scores.fidelity < mergedConfig.fidelityThreshold) {
    failures.push(`Fidelity ${report.scores.fidelity} < threshold ${mergedConfig.fidelityThreshold}`);
  }

  if (report.scores.voiceConsistency < mergedConfig.voiceThreshold) {
    failures.push(`Voice ${report.scores.voiceConsistency} < threshold ${mergedConfig.voiceThreshold}`);
  }

  if (report.scores.frameworkCoverage < mergedConfig.frameworkThreshold) {
    failures.push(`Framework ${report.scores.frameworkCoverage} < threshold ${mergedConfig.frameworkThreshold}`);
  }

  if (mergedConfig.strictConstraints) {
    const violations = report.analysis.voice.constraintViolations;
    if (violations.length > 0) {
      failures.push(`Constraint violations: ${violations.join(', ')}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}
