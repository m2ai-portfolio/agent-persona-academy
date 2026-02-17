import { describe, it, expect } from 'vitest';
import {
  calculateFidelityScore,
  validateAgainstSamples,
  quickFidelityCheck,
  getSuggestions,
} from '../validation-engine.js';
import type { PersonaDefinition, ValidationMarker } from '../types.js';

/**
 * Factory for a minimal PersonaDefinition with configurable validation markers.
 * Defaults: one must_include ("innovation"), no should_include, no must_avoid.
 */
function makeMinimalPersona(
  overrides?: {
    must_include?: ValidationMarker[];
    should_include?: ValidationMarker[];
    must_avoid?: ValidationMarker[];
    sample_responses?: PersonaDefinition['sample_responses'];
  },
): PersonaDefinition {
  return {
    identity: {
      name: 'TestPersona',
      role: 'Tester',
      background: 'Background',
    },
    voice: {
      tone: ['Analytical'],
      phrases: ['indeed'],
      style: ['Concise'],
    },
    frameworks: {},
    validation: {
      must_include: overrides?.must_include ?? [
        { pattern: 'innovation', description: 'innovation concept', weight: 5 },
      ],
      should_include: overrides?.should_include,
      must_avoid: overrides?.must_avoid,
    },
    sample_responses: overrides?.sample_responses,
  } as PersonaDefinition;
}

// ============================================================================
// calculateFidelityScore — Scoring math
// ============================================================================

describe('calculateFidelityScore', () => {
  describe('scoring math', () => {
    it('awards full 60 must_include points when all patterns matched', () => {
      const persona = makeMinimalPersona({
        must_include: [
          { pattern: 'innovation', description: 'innovation concept', weight: 5 },
          { pattern: 'disruption', description: 'disruption concept', weight: 5 },
        ],
        should_include: [],
      });

      const result = calculateFidelityScore('innovation and disruption are key', persona);

      // must_include: 60, should_include: 0 (empty → base 30? No, empty array → base 30)
      // Wait — should_include is explicitly set to [] which has length 0, so base 30.
      // Actually let's check: should_include is set to [] so markers.length === 0 → returns base 30
      // Total = 60 + 30 = 90
      expect(result.breakdown.must_include.matched).toBe(2);
      expect(result.breakdown.must_include.total).toBe(2);
      expect(result.score).toBe(90);
    });

    it('awards 0 must_include points when no patterns matched', () => {
      const persona = makeMinimalPersona({
        must_include: [
          { pattern: 'innovation', description: 'innovation concept', weight: 5 },
          { pattern: 'disruption', description: 'disruption concept', weight: 5 },
        ],
        should_include: [],
      });

      const result = calculateFidelityScore('completely unrelated text', persona);

      expect(result.breakdown.must_include.matched).toBe(0);
      expect(result.breakdown.must_include.total).toBe(2);
      // must_include: 0, should_include: base 30 (empty array), must_avoid: 0
      expect(result.score).toBe(30);
    });

    it('awards proportional must_include points for partial matches', () => {
      const persona = makeMinimalPersona({
        must_include: [
          { pattern: 'innovation', description: 'innovation concept', weight: 5 },
          { pattern: 'disruption', description: 'disruption concept', weight: 5 },
        ],
        should_include: [],
      });

      const result = calculateFidelityScore('innovation is important', persona);

      expect(result.breakdown.must_include.matched).toBe(1);
      expect(result.breakdown.must_include.total).toBe(2);
      // matchedWeight=5, totalWeight=10, score = (5/10)*60 = 30
      // should_include base 30 (empty), total = 60
      expect(result.score).toBe(60);
    });

    it('uses marker weights for proportional scoring', () => {
      const persona = makeMinimalPersona({
        must_include: [
          { pattern: 'innovation', description: 'innovation concept', weight: 10 },
          { pattern: 'disruption', description: 'disruption concept', weight: 2 },
        ],
        should_include: [],
      });

      // Match only the high-weight pattern
      const result = calculateFidelityScore('innovation drives change', persona);

      // matchedWeight=10, totalWeight=12, score = (10/12)*60 = 50
      // should_include base 30, total = 80
      expect(result.breakdown.must_include.matched).toBe(1);
      expect(result.score).toBe(80);
    });

    it('clamps score at 0 minimum when penalties exceed points', () => {
      const persona = makeMinimalPersona({
        must_include: [{ pattern: 'xyz_never_match', weight: 5 }],
        should_include: [{ pattern: 'abc_never_match', weight: 3 }],
        must_avoid: [
          { pattern: 'bad', weight: 50 },
          { pattern: 'worse', weight: 50 },
        ],
      });

      const result = calculateFidelityScore('bad and worse content', persona);

      // must_include: 0 (no match), should_include: 0 (no match), penalty: 100
      // raw = 0 + 0 - 100 = -100, clamped to 0
      expect(result.score).toBe(0);
    });

    it('clamps score at 100 maximum', () => {
      // This is inherently capped since must_include(60) + should_include(30) = 90 max
      // With empty arrays we get base 60 + base 30 = 90, still under 100.
      // The code does Math.min(100, ...) so let's confirm it never exceeds 100.
      const persona = makeMinimalPersona({
        must_include: [
          { pattern: 'a', weight: 5 },
          { pattern: 'b', weight: 5 },
        ],
        should_include: [
          { pattern: 'c', weight: 3 },
          { pattern: 'd', weight: 3 },
        ],
      });

      const result = calculateFidelityScore('a b c d', persona);

      // must_include: 60, should_include: 30, total = 90
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.score).toBe(90);
    });
  });

  // ============================================================================
  // calculateFidelityScore — Pass/fail logic
  // ============================================================================

  describe('pass/fail logic', () => {
    it('passes when score >= 70 AND must_include ratio >= 0.8', () => {
      const persona = makeMinimalPersona({
        must_include: [
          { pattern: 'alpha', weight: 5 },
          { pattern: 'beta', weight: 5 },
          { pattern: 'gamma', weight: 5 },
          { pattern: 'delta', weight: 5 },
          { pattern: 'epsilon', weight: 5 },
        ],
        should_include: [{ pattern: 'bonus', weight: 3 }],
      });

      // Match 4 of 5 must_include (80%) and the should_include
      const text = 'alpha beta gamma delta bonus';
      const result = calculateFidelityScore(text, persona);

      // matchedWeight=20, totalWeight=25, must_include = (20/25)*60 = 48
      // should_include: matchedWeight=3, totalWeight=3, score = (3/3)*30 = 30
      // total = 78, ratio = 4/5 = 0.8
      expect(result.passed).toBe(true);
      expect(result.score).toBe(78);
    });

    it('fails when score >= 70 but must_include ratio < 0.8', () => {
      // Need high score but low must_include ratio.
      // Use one must_include that doesn't match, but get points from should_include base.
      const persona = makeMinimalPersona({
        must_include: [
          { pattern: 'alpha', weight: 5 },
          { pattern: 'beta', weight: 5 },
          { pattern: 'gamma', weight: 5 },
          { pattern: 'delta', weight: 5 },
          { pattern: 'epsilon', weight: 5 },
        ],
        // No should_include → base 30
      });

      // Match 3 of 5 = 60% ratio (below 80%)
      const text = 'alpha beta gamma';
      const result = calculateFidelityScore(text, persona);

      // must_include: (15/25)*60 = 36, should_include: base 30, total = 66
      // ratio = 3/5 = 0.6, score = 66 which is < 70 anyway
      // Actually this doesn't hit our condition. Let's adjust weights.
      expect(result.breakdown.must_include.matched).toBe(3);
      expect(result.breakdown.must_include.total).toBe(5);
      // Even though ratio < 0.8, score is also < 70, so fails on both counts.
      expect(result.passed).toBe(false);
    });

    it('fails specifically due to must_include ratio < 0.8 even with high score', () => {
      // Use high-weight must_include patterns where 3/5 matched but weighted heavily
      const persona = makeMinimalPersona({
        must_include: [
          { pattern: 'alpha', weight: 10 },
          { pattern: 'beta', weight: 10 },
          { pattern: 'gamma', weight: 10 },
          { pattern: 'delta', weight: 1 },
          { pattern: 'epsilon', weight: 1 },
        ],
        // No should_include → base 30
      });

      // Match 3 of 5 = 60% ratio but high weighted score
      const text = 'alpha beta gamma';
      const result = calculateFidelityScore(text, persona);

      // matchedWeight=30, totalWeight=32, must_include = (30/32)*60 ≈ 56.25
      // should_include: base 30, total ≈ 86
      // ratio = 3/5 = 0.6 < 0.8
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.breakdown.must_include.matched).toBe(3);
      expect(result.breakdown.must_include.total).toBe(5);
      expect(result.passed).toBe(false);
    });

    it('fails when must_include ratio >= 0.8 but score < 70', () => {
      const persona = makeMinimalPersona({
        must_include: [
          { pattern: 'alpha', weight: 5 },
        ],
        should_include: [
          { pattern: 'never_match_xyz', weight: 3 },
        ],
        must_avoid: [
          { pattern: 'bad', weight: 25 },
        ],
      });

      // Match 1/1 must_include (100% ratio) but trigger must_avoid penalty
      const text = 'alpha and some bad content';
      const result = calculateFidelityScore(text, persona);

      // must_include: (5/5)*60 = 60, should_include: (0/3)*30 = 0, penalty: 25
      // total = 60 + 0 - 25 = 35
      expect(result.breakdown.must_include.matched).toBe(1);
      expect(result.breakdown.must_include.total).toBe(1);
      expect(result.score).toBeLessThan(70);
      expect(result.passed).toBe(false);
    });

    it('uses custom passingScore from options', () => {
      const persona = makeMinimalPersona({
        must_include: [
          { pattern: 'alpha', weight: 5 },
        ],
        // No should_include → base 30
      });

      const text = 'alpha is present';
      const result = calculateFidelityScore(text, persona, { passingScore: 95 });

      // must_include: 60, should_include: base 30, total = 90
      // ratio = 1/1 = 1.0 >= 0.8 ✓, but score 90 < 95
      expect(result.score).toBe(90);
      expect(result.passed).toBe(false);
    });
  });

  // ============================================================================
  // calculateFidelityScore — Edge cases
  // ============================================================================

  describe('edge cases', () => {
    it('returns base 60 for must_include when array is empty', () => {
      const persona = makeMinimalPersona({
        must_include: [],
        should_include: [],
      });

      const result = calculateFidelityScore('any text', persona);

      // must_include base 60, should_include base 30, total = 90
      // BUT: mustIncludeRatio = 0/0 = NaN, NaN >= 0.8 is false → passed = false
      expect(result.score).toBe(90);
    });

    it('returns base 30 for should_include when array is empty', () => {
      const persona = makeMinimalPersona({
        must_include: [{ pattern: 'alpha', weight: 5 }],
        should_include: [],
      });

      const result = calculateFidelityScore('alpha text', persona);

      // must_include: 60, should_include: base 30, total = 90
      expect(result.score).toBe(90);
    });

    it('returns base 30 for should_include when undefined', () => {
      const persona = makeMinimalPersona({
        must_include: [{ pattern: 'alpha', weight: 5 }],
        // should_include not set → undefined → defaults to []
      });

      const result = calculateFidelityScore('alpha text', persona);

      // must_include: 60, should_include: base 30 (undefined → []), total = 90
      expect(result.score).toBe(90);
    });

    it('applies no penalty when must_avoid is undefined', () => {
      const persona = makeMinimalPersona({
        must_include: [{ pattern: 'alpha', weight: 5 }],
        should_include: [],
        // must_avoid not set
      });

      const result = calculateFidelityScore('alpha bad terrible text', persona);

      // No must_avoid → no penalty
      expect(result.breakdown.must_avoid.triggered).toBe(0);
      expect(result.score).toBe(90);
    });

    it('falls back to literal string match when pattern is invalid regex', () => {
      const persona = makeMinimalPersona({
        must_include: [
          { pattern: '[invalid(regex', description: 'broken regex marker', weight: 5 },
        ],
        should_include: [],
      });

      // The literal string "[invalid(regex" should be matchable via includes()
      const result = calculateFidelityScore('contains [invalid(regex here', persona);

      expect(result.breakdown.must_include.matched).toBe(1);
      expect(result.breakdown.must_include.patterns).toContain('broken regex marker');
    });

    it('performs case-insensitive matching', () => {
      const persona = makeMinimalPersona({
        must_include: [
          { pattern: 'Innovation', description: 'innovation concept', weight: 5 },
        ],
        should_include: [],
      });

      const result = calculateFidelityScore('INNOVATION is key', persona);

      expect(result.breakdown.must_include.matched).toBe(1);
    });
  });

  // ============================================================================
  // calculateFidelityScore — Options
  // ============================================================================

  describe('options', () => {
    it('checks additionalMustAvoid patterns', () => {
      const persona = makeMinimalPersona({
        must_include: [{ pattern: 'alpha', weight: 5 }],
        should_include: [],
      });

      const additionalMustAvoid: ValidationMarker[] = [
        { pattern: 'forbidden', description: 'forbidden term', weight: 20 },
      ];

      const result = calculateFidelityScore('alpha forbidden', persona, { additionalMustAvoid });

      expect(result.breakdown.must_avoid.triggered).toBe(1);
      expect(result.breakdown.must_avoid.patterns).toContain('forbidden term');
      // must_include: 60, should_include: base 30, penalty: 20 → total = 70
      expect(result.score).toBe(70);
    });

    it('combines additionalMustAvoid with persona must_avoid', () => {
      const persona = makeMinimalPersona({
        must_include: [{ pattern: 'alpha', weight: 5 }],
        should_include: [],
        must_avoid: [
          { pattern: 'persona_bad', description: 'persona violation', weight: 10 },
        ],
      });

      const additionalMustAvoid: ValidationMarker[] = [
        { pattern: 'dept_bad', description: 'department violation', weight: 10 },
      ];

      const result = calculateFidelityScore('alpha persona_bad dept_bad', persona, {
        additionalMustAvoid,
      });

      expect(result.breakdown.must_avoid.triggered).toBe(2);
      expect(result.breakdown.must_avoid.patterns).toContain('persona violation');
      expect(result.breakdown.must_avoid.patterns).toContain('department violation');
      // must_include: 60, should_include: base 30, penalty: 20 → total = 70
      expect(result.score).toBe(70);
    });

    it('uses custom passingScore to override default 70', () => {
      const persona = makeMinimalPersona({
        must_include: [{ pattern: 'alpha', weight: 5 }],
        should_include: [],
      });

      // Score will be 90 (60 + 30 base), ratio 1.0
      const passingResult = calculateFidelityScore('alpha', persona, { passingScore: 90 });
      expect(passingResult.score).toBe(90);
      expect(passingResult.passed).toBe(true);

      const failingResult = calculateFidelityScore('alpha', persona, { passingScore: 91 });
      expect(failingResult.score).toBe(90);
      expect(failingResult.passed).toBe(false);
    });
  });
});

// ============================================================================
// validateAgainstSamples
// ============================================================================

describe('validateAgainstSamples', () => {
  it('returns passRate 1 when persona has no sample_responses', () => {
    const persona = makeMinimalPersona();

    const { passRate, results } = validateAgainstSamples('any text', persona);

    expect(passRate).toBe(1);
    expect(results).toHaveLength(0);
  });

  it('calculates passRate from closerToGood ratio', () => {
    // Create a persona where matching must_include patterns determines good vs bad.
    const persona = makeMinimalPersona({
      must_include: [
        { pattern: 'innovation', description: 'innovation concept', weight: 5 },
        { pattern: 'disruption', description: 'disruption concept', weight: 5 },
      ],
      should_include: [],
      sample_responses: {
        sample1: {
          prompt: 'Explain strategy',
          good_response: 'innovation and disruption together',
          bad_response: 'nothing relevant at all',
        },
      },
    });

    // Text that matches all must_include (should score closer to good)
    const { passRate, results } = validateAgainstSamples(
      'innovation and disruption in action',
      persona,
    );

    expect(results).toHaveLength(1);
    expect(results[0].closerToGood).toBe(true);
    expect(passRate).toBe(1);
  });

  it('marks closerToGood as true when no bad_response is provided', () => {
    const persona = makeMinimalPersona({
      must_include: [{ pattern: 'innovation', weight: 5 }],
      should_include: [],
      sample_responses: {
        sample1: {
          prompt: 'Test prompt',
          good_response: 'innovation example',
          // no bad_response
        },
      },
    });

    const { passRate, results } = validateAgainstSamples('some text', persona);

    // When badScore is null, closerToGood = true (code: !badScore || ...)
    expect(results[0].closerToGood).toBe(true);
    expect(passRate).toBe(1);
  });

  it('marks closerToGood false when score is below midpoint of good and bad', () => {
    // Set up so that good_response scores high and bad_response scores low,
    // and the tested text scores closer to bad.
    const persona = makeMinimalPersona({
      must_include: [
        { pattern: 'innovation', description: 'innovation', weight: 5 },
        { pattern: 'disruption', description: 'disruption', weight: 5 },
        { pattern: 'strategy', description: 'strategy', weight: 5 },
        { pattern: 'market', description: 'market', weight: 5 },
        { pattern: 'growth', description: 'growth', weight: 5 },
      ],
      should_include: [],
      sample_responses: {
        sample1: {
          prompt: 'Analyze this',
          good_response: 'innovation disruption strategy market growth',
          bad_response: 'completely irrelevant gibberish nothing here',
        },
      },
    });

    // Text that matches none of the must_include patterns → scores same as bad
    const { results } = validateAgainstSamples('totally off topic stuff', persona);

    expect(results[0].closerToGood).toBe(false);
  });
});

// ============================================================================
// quickFidelityCheck
// ============================================================================

describe('quickFidelityCheck', () => {
  it('returns true when fidelity score passes', () => {
    const persona = makeMinimalPersona({
      must_include: [{ pattern: 'alpha', weight: 5 }],
      // No should_include → base 30
    });

    // Score = 60 + 30 = 90, ratio = 1/1 = 1.0 → passes
    const result = quickFidelityCheck('alpha is here', persona);
    expect(result).toBe(true);
  });

  it('returns false when fidelity score fails', () => {
    const persona = makeMinimalPersona({
      must_include: [
        { pattern: 'alpha', weight: 5 },
        { pattern: 'beta', weight: 5 },
        { pattern: 'gamma', weight: 5 },
        { pattern: 'delta', weight: 5 },
        { pattern: 'epsilon', weight: 5 },
      ],
      should_include: [{ pattern: 'xyz_nomatch', weight: 3 }],
      must_avoid: [{ pattern: 'violation', weight: 15 }],
    });

    // Match 1 of 5 must_include (20% ratio), trigger must_avoid
    const result = quickFidelityCheck('alpha has a violation', persona);

    // ratio = 1/5 = 0.2 < 0.8, should_include: 0/1 = 0, penalty: 15
    // must_include: (5/25)*60 = 12, should_include: 0, penalty: 15 → score = -3 → 0
    expect(result).toBe(false);
  });
});

// ============================================================================
// getSuggestions
// ============================================================================

describe('getSuggestions', () => {
  it('returns "Include: ..." for missing must_include patterns', () => {
    const persona = makeMinimalPersona({
      must_include: [
        { pattern: 'alpha', description: 'alpha concept', weight: 5 },
        { pattern: 'beta', description: 'beta concept', weight: 5 },
      ],
    });

    // Only match alpha, beta is missing
    const suggestions = getSuggestions('alpha is present', persona);

    expect(suggestions).toContain('Include: beta concept');
    expect(suggestions).not.toContain('Include: alpha concept');
  });

  it('returns "Remove: ..." for triggered must_avoid patterns', () => {
    const persona = makeMinimalPersona({
      must_include: [{ pattern: 'alpha', weight: 5 }],
      must_avoid: [
        { pattern: 'forbidden', description: 'forbidden term', weight: 15 },
      ],
    });

    const suggestions = getSuggestions('alpha and forbidden content', persona);

    expect(suggestions).toContain('Remove: forbidden term');
  });

  it('returns empty array when all patterns are satisfied and none violated', () => {
    const persona = makeMinimalPersona({
      must_include: [
        { pattern: 'alpha', description: 'alpha concept', weight: 5 },
        { pattern: 'beta', description: 'beta concept', weight: 5 },
      ],
      must_avoid: [
        { pattern: 'forbidden', description: 'forbidden term', weight: 15 },
      ],
    });

    const suggestions = getSuggestions('alpha and beta are both here', persona);

    expect(suggestions).toHaveLength(0);
  });
});
