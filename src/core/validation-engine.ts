/**
 * Validation Engine
 *
 * Validates outputs against persona fidelity markers.
 * Calculates scores based on must_include, should_include, and must_avoid patterns.
 */

import type {
  PersonaDefinition,
  FidelityScore,
  ValidationMarker,
} from './types.js';

/**
 * Default weights for scoring
 */
const DEFAULT_WEIGHTS = {
  must_include: {
    base: 60,        // Must-include patterns are worth 60 points total
    threshold: 0.8,  // Need 80% of must_include patterns to pass
  },
  should_include: {
    base: 30,        // Should-include patterns are worth 30 points total
  },
  must_avoid: {
    penalty: 15,     // Each must_avoid violation costs up to 15 points
  },
  passing_score: 70, // Score needed to pass fidelity check
};

/**
 * Calculate fidelity score for a text against persona validation markers
 */
export function calculateFidelityScore(
  text: string,
  persona: PersonaDefinition
): FidelityScore {
  const { validation } = persona;
  const normalizedText = text.toLowerCase();

  // Check must_include patterns
  const mustIncludeResults = checkPatterns(
    normalizedText,
    validation.must_include,
    text
  );

  // Check should_include patterns
  const shouldIncludeResults = checkPatterns(
    normalizedText,
    validation.should_include ?? [],
    text
  );

  // Check must_avoid patterns
  const mustAvoidResults = checkPatterns(
    normalizedText,
    validation.must_avoid ?? [],
    text
  );

  // Calculate scores
  const mustIncludeScore = calculateMustIncludeScore(
    mustIncludeResults,
    validation.must_include
  );

  const shouldIncludeScore = calculateShouldIncludeScore(
    shouldIncludeResults,
    validation.should_include ?? []
  );

  const mustAvoidPenalty = calculateMustAvoidPenalty(
    mustAvoidResults,
    validation.must_avoid ?? []
  );

  // Total score (capped at 0-100)
  const rawScore = mustIncludeScore + shouldIncludeScore - mustAvoidPenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Determine pass/fail
  const mustIncludeRatio =
    mustIncludeResults.matched.length / validation.must_include.length;
  const passed =
    score >= DEFAULT_WEIGHTS.passing_score &&
    mustIncludeRatio >= DEFAULT_WEIGHTS.must_include.threshold;

  // Generate assessment
  const assessment = generateAssessment(
    score,
    passed,
    mustIncludeResults,
    shouldIncludeResults,
    mustAvoidResults,
    persona.identity.name
  );

  return {
    score,
    breakdown: {
      must_include: {
        matched: mustIncludeResults.matched.length,
        total: validation.must_include.length,
        patterns: mustIncludeResults.matched,
      },
      should_include: {
        matched: shouldIncludeResults.matched.length,
        total: (validation.should_include ?? []).length,
        patterns: shouldIncludeResults.matched,
      },
      must_avoid: {
        triggered: mustAvoidResults.matched.length,
        patterns: mustAvoidResults.matched,
      },
    },
    passed,
    assessment,
  };
}

/**
 * Check which patterns match in the text
 */
function checkPatterns(
  normalizedText: string,
  markers: ValidationMarker[],
  originalText: string
): { matched: string[]; unmatched: string[] } {
  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const marker of markers) {
    try {
      const regex = new RegExp(marker.pattern, 'i');
      if (regex.test(originalText) || regex.test(normalizedText)) {
        matched.push(marker.description ?? marker.pattern);
      } else {
        unmatched.push(marker.description ?? marker.pattern);
      }
    } catch {
      // If pattern is not valid regex, treat as literal string
      if (
        normalizedText.includes(marker.pattern.toLowerCase()) ||
        originalText.includes(marker.pattern)
      ) {
        matched.push(marker.description ?? marker.pattern);
      } else {
        unmatched.push(marker.description ?? marker.pattern);
      }
    }
  }

  return { matched, unmatched };
}

/**
 * Calculate score for must_include patterns
 */
function calculateMustIncludeScore(
  results: { matched: string[]; unmatched: string[] },
  markers: ValidationMarker[]
): number {
  if (markers.length === 0) return DEFAULT_WEIGHTS.must_include.base;

  // Calculate weighted score based on marker weights
  let totalWeight = 0;
  let matchedWeight = 0;

  for (let i = 0; i < markers.length; i++) {
    const weight = markers[i].weight ?? 5;
    totalWeight += weight;

    // Check if this marker was matched (by index since we process in order)
    if (i < results.matched.length + results.unmatched.length) {
      const description = markers[i].description ?? markers[i].pattern;
      if (results.matched.includes(description)) {
        matchedWeight += weight;
      }
    }
  }

  if (totalWeight === 0) return DEFAULT_WEIGHTS.must_include.base;

  return (matchedWeight / totalWeight) * DEFAULT_WEIGHTS.must_include.base;
}

/**
 * Calculate score for should_include patterns
 */
function calculateShouldIncludeScore(
  results: { matched: string[]; unmatched: string[] },
  markers: ValidationMarker[]
): number {
  if (markers.length === 0) return DEFAULT_WEIGHTS.should_include.base;

  // Calculate weighted score
  let totalWeight = 0;
  let matchedWeight = 0;

  for (let i = 0; i < markers.length; i++) {
    const weight = markers[i].weight ?? 3;
    totalWeight += weight;

    const description = markers[i].description ?? markers[i].pattern;
    if (results.matched.includes(description)) {
      matchedWeight += weight;
    }
  }

  if (totalWeight === 0) return DEFAULT_WEIGHTS.should_include.base;

  return (matchedWeight / totalWeight) * DEFAULT_WEIGHTS.should_include.base;
}

/**
 * Calculate penalty for must_avoid patterns
 */
function calculateMustAvoidPenalty(
  results: { matched: string[]; unmatched: string[] },
  markers: ValidationMarker[]
): number {
  if (results.matched.length === 0) return 0;

  let penalty = 0;

  for (const marker of markers) {
    const description = marker.description ?? marker.pattern;
    if (results.matched.includes(description)) {
      penalty += marker.weight ?? DEFAULT_WEIGHTS.must_avoid.penalty;
    }
  }

  return penalty;
}

/**
 * Generate human-readable assessment
 */
function generateAssessment(
  score: number,
  passed: boolean,
  mustInclude: { matched: string[]; unmatched: string[] },
  shouldInclude: { matched: string[]; unmatched: string[] },
  mustAvoid: { matched: string[]; unmatched: string[] },
  personaName: string
): string {
  const lines: string[] = [];

  // Overall assessment
  if (passed) {
    if (score >= 90) {
      lines.push(`Excellent ${personaName} fidelity (${score}/100).`);
    } else if (score >= 80) {
      lines.push(`Good ${personaName} fidelity (${score}/100).`);
    } else {
      lines.push(`Acceptable ${personaName} fidelity (${score}/100).`);
    }
  } else {
    lines.push(`Low ${personaName} fidelity (${score}/100). Does not pass threshold.`);
  }

  // Must-include feedback
  const mustRatio = mustInclude.matched.length / (mustInclude.matched.length + mustInclude.unmatched.length);
  lines.push(
    `Required patterns: ${mustInclude.matched.length}/${mustInclude.matched.length + mustInclude.unmatched.length} (${Math.round(mustRatio * 100)}%)`
  );

  if (mustInclude.unmatched.length > 0 && mustInclude.unmatched.length <= 3) {
    lines.push(`Missing: ${mustInclude.unmatched.join(', ')}`);
  }

  // Should-include feedback
  if (shouldInclude.matched.length + shouldInclude.unmatched.length > 0) {
    lines.push(
      `Bonus patterns: ${shouldInclude.matched.length}/${shouldInclude.matched.length + shouldInclude.unmatched.length}`
    );
  }

  // Must-avoid feedback
  if (mustAvoid.matched.length > 0) {
    lines.push(`Violations: ${mustAvoid.matched.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Validate a response against sample responses (if available)
 */
export function validateAgainstSamples(
  text: string,
  persona: PersonaDefinition
): { passRate: number; results: SampleValidationResult[] } {
  const samples = persona.sample_responses ?? {};
  const results: SampleValidationResult[] = [];

  for (const [id, sample] of Object.entries(samples)) {
    // Score the actual text
    const score = calculateFidelityScore(text, persona);

    // Score the good response (as baseline)
    const goodScore = calculateFidelityScore(sample.good_response, persona);

    // Score the bad response (if available)
    const badScore = sample.bad_response
      ? calculateFidelityScore(sample.bad_response, persona)
      : null;

    // Determine if the text is closer to good or bad
    const closerToGood =
      !badScore || score.score >= (goodScore.score + badScore.score) / 2;

    results.push({
      sampleId: id,
      prompt: sample.prompt,
      score: score.score,
      goodScore: goodScore.score,
      badScore: badScore?.score,
      closerToGood,
    });
  }

  const passRate =
    results.length > 0
      ? results.filter((r) => r.closerToGood).length / results.length
      : 1;

  return { passRate, results };
}

export interface SampleValidationResult {
  sampleId: string;
  prompt: string;
  score: number;
  goodScore: number;
  badScore?: number;
  closerToGood: boolean;
}

/**
 * Quick check if a text passes basic fidelity
 */
export function quickFidelityCheck(
  text: string,
  persona: PersonaDefinition
): boolean {
  const score = calculateFidelityScore(text, persona);
  return score.passed;
}

/**
 * Get a summary of what patterns to include for better fidelity
 */
export function getSuggestions(
  text: string,
  persona: PersonaDefinition
): string[] {
  const score = calculateFidelityScore(text, persona);
  const suggestions: string[] = [];

  // Add missing must_include patterns
  const mustIncludeMarkers = persona.validation.must_include;
  for (const marker of mustIncludeMarkers) {
    const description = marker.description ?? marker.pattern;
    if (!score.breakdown.must_include.patterns.includes(description)) {
      suggestions.push(`Include: ${description}`);
    }
  }

  // Add must_avoid violations
  for (const pattern of score.breakdown.must_avoid.patterns) {
    suggestions.push(`Remove: ${pattern}`);
  }

  return suggestions;
}
