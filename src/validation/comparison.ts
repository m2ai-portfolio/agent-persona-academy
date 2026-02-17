/**
 * Cross-Persona Comparison Engine
 *
 * Compares text against multiple personas to identify best matches
 * and provide comparative analysis across persona characteristics.
 */

import type { PersonaDefinition } from '../core/types.js';
import { calculateFidelityScore } from '../core/validation-engine.js';
import { analyzeVoiceConsistency } from './voice-analyzer.js';
import { analyzeFrameworkCoverage } from './framework-coverage.js';
import type { PersonaComparisonResult, CrossPersonaComparison, ValidationConfig } from './types.js';
import { DEFAULT_VALIDATION_CONFIG } from './types.js';

/**
 * Compare text against multiple personas
 */
export function compareAcrossPersonas(
  text: string,
  personas: Map<string, PersonaDefinition>,
  config: Partial<ValidationConfig> = {},
): CrossPersonaComparison {
  const mergedConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  const results: PersonaComparisonResult[] = [];

  // Analyze text against each persona
  for (const [personaId, persona] of personas) {
    const result = analyzeForPersona(text, personaId, persona, mergedConfig);
    results.push(result);
  }

  // Sort by quality score descending
  results.sort((a, b) => b.qualityScore - a.qualityScore);

  // Determine best match
  const bestMatch = results.length > 0 ? results[0].personaId : '';

  // Generate comparison summary
  const summary = generateComparisonSummary(results, text);

  return {
    analyzedText: text,
    results,
    bestMatch,
    summary,
  };
}

/**
 * Analyze text for a single persona
 */
function analyzeForPersona(
  text: string,
  personaId: string,
  persona: PersonaDefinition,
  config: ValidationConfig,
): PersonaComparisonResult {
  // Run all analyses
  const fidelityScore = calculateFidelityScore(text, persona);
  const voiceAnalysis = analyzeVoiceConsistency(text, persona);
  const frameworkCoverage = analyzeFrameworkCoverage(text, persona);

  // Calculate combined quality score using weights
  const weights = config.weights ?? {
    fidelity: 0.5,
    voice: 0.3,
    framework: 0.2,
  };

  const qualityScore = Math.round(
    fidelityScore.score * (weights.fidelity ?? 0.5) +
      voiceAnalysis.consistencyScore * (weights.voice ?? 0.3) +
      frameworkCoverage.coverageScore * (weights.framework ?? 0.2),
  );

  return {
    personaId,
    personaName: persona.identity.name,
    fidelityScore,
    voiceAnalysis,
    frameworkCoverage,
    qualityScore,
  };
}

/**
 * Generate comparison summary
 */
function generateComparisonSummary(results: PersonaComparisonResult[], text: string): string {
  if (results.length === 0) {
    return 'No personas to compare against.';
  }

  const lines: string[] = [];
  const textLength = text.length;

  lines.push(`Analyzed ${textLength} characters against ${results.length} persona(s).`);
  lines.push('');

  // Best match
  const best = results[0];
  lines.push(`Best Match: ${best.personaName} (${best.qualityScore}/100)`);
  lines.push(`  - Fidelity: ${best.fidelityScore.score}/100`);
  lines.push(`  - Voice: ${best.voiceAnalysis.consistencyScore}/100`);
  lines.push(`  - Framework: ${best.frameworkCoverage.coverageScore}/100`);

  // Show other matches if competitive
  if (results.length > 1) {
    const secondBest = results[1];
    const scoreDiff = best.qualityScore - secondBest.qualityScore;

    if (scoreDiff < 10) {
      lines.push('');
      lines.push(`Close Alternative: ${secondBest.personaName} (${secondBest.qualityScore}/100)`);
    }

    // Rankings
    lines.push('');
    lines.push('Rankings:');
    for (let i = 0; i < Math.min(results.length, 5); i++) {
      const r = results[i];
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      lines.push(`  ${medal} ${r.personaName}: ${r.qualityScore}/100`);
    }
  }

  return lines.join('\n');
}

/**
 * Find which persona best matches a given text
 */
export function findBestPersonaMatch(
  text: string,
  personas: Map<string, PersonaDefinition>,
): { personaId: string; personaName: string; score: number } | null {
  if (personas.size === 0) return null;

  const comparison = compareAcrossPersonas(text, personas);

  if (comparison.results.length === 0) return null;

  const best = comparison.results[0];
  return {
    personaId: best.personaId,
    personaName: best.personaName,
    score: best.qualityScore,
  };
}

/**
 * Get similarity scores between two personas based on their characteristics
 */
export function comparePersonaCharacteristics(
  persona1: PersonaDefinition,
  persona2: PersonaDefinition,
): {
  voiceSimilarity: number;
  frameworkOverlap: number;
  validationSimilarity: number;
  overall: number;
} {
  // Voice similarity
  const voice1 = new Set([...persona1.voice.tone, ...persona1.voice.style]);
  const voice2 = new Set([...persona2.voice.tone, ...persona2.voice.style]);
  const voiceIntersection = [...voice1].filter((x) => voice2.has(x));
  const voiceUnion = new Set([...voice1, ...voice2]);
  const voiceSimilarity =
    voiceUnion.size > 0 ? Math.round((voiceIntersection.length / voiceUnion.size) * 100) : 0;

  // Framework overlap (by name)
  const frameworks1 = new Set(Object.keys(persona1.frameworks));
  const frameworks2 = new Set(Object.keys(persona2.frameworks));
  const frameworkIntersection = [...frameworks1].filter((x) => frameworks2.has(x));
  const frameworkUnion = new Set([...frameworks1, ...frameworks2]);
  const frameworkOverlap =
    frameworkUnion.size > 0
      ? Math.round((frameworkIntersection.length / frameworkUnion.size) * 100)
      : 0;

  // Validation pattern similarity
  const patterns1 = new Set(persona1.validation.must_include.map((m) => m.pattern));
  const patterns2 = new Set(persona2.validation.must_include.map((m) => m.pattern));
  const patternIntersection = [...patterns1].filter((x) => patterns2.has(x));
  const patternUnion = new Set([...patterns1, ...patterns2]);
  const validationSimilarity =
    patternUnion.size > 0 ? Math.round((patternIntersection.length / patternUnion.size) * 100) : 0;

  // Overall (weighted average)
  const overall = Math.round(
    voiceSimilarity * 0.4 + frameworkOverlap * 0.4 + validationSimilarity * 0.2,
  );

  return {
    voiceSimilarity,
    frameworkOverlap,
    validationSimilarity,
    overall,
  };
}

/**
 * Generate a matrix comparing all personas
 */
export function generateSimilarityMatrix(
  personas: Map<string, PersonaDefinition>,
): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>();
  const personaIds = [...personas.keys()];

  for (const id1 of personaIds) {
    const row = new Map<string, number>();

    for (const id2 of personaIds) {
      if (id1 === id2) {
        row.set(id2, 100);
      } else {
        const persona1 = personas.get(id1)!;
        const persona2 = personas.get(id2)!;
        const comparison = comparePersonaCharacteristics(persona1, persona2);
        row.set(id2, comparison.overall);
      }
    }

    matrix.set(id1, row);
  }

  return matrix;
}

/**
 * Identify which aspects differentiate personas most
 */
export function identifyDifferentiators(personas: Map<string, PersonaDefinition>): {
  uniqueFrameworks: Map<string, string[]>;
  uniqueTones: Map<string, string[]>;
  uniquePhrases: Map<string, string[]>;
} {
  const allFrameworks = new Map<string, Set<string>>();
  const allTones = new Map<string, Set<string>>();
  const allPhrases = new Map<string, Set<string>>();

  // Collect all frameworks, tones, phrases
  for (const [id, persona] of personas) {
    allFrameworks.set(id, new Set(Object.keys(persona.frameworks)));
    allTones.set(id, new Set(persona.voice.tone));
    allPhrases.set(id, new Set(persona.voice.phrases));
  }

  // Find unique items
  const uniqueFrameworks = new Map<string, string[]>();
  const uniqueTones = new Map<string, string[]>();
  const uniquePhrases = new Map<string, string[]>();

  for (const [id, frameworks] of allFrameworks) {
    const otherFrameworks = new Set<string>();
    for (const [otherId, otherFw] of allFrameworks) {
      if (otherId !== id) {
        otherFw.forEach((f) => otherFrameworks.add(f));
      }
    }
    uniqueFrameworks.set(
      id,
      [...frameworks].filter((f) => !otherFrameworks.has(f)),
    );
  }

  for (const [id, tones] of allTones) {
    const otherTones = new Set<string>();
    for (const [otherId, otherT] of allTones) {
      if (otherId !== id) {
        otherT.forEach((t) => otherTones.add(t));
      }
    }
    uniqueTones.set(
      id,
      [...tones].filter((t) => !otherTones.has(t)),
    );
  }

  for (const [id, phrases] of allPhrases) {
    const otherPhrases = new Set<string>();
    for (const [otherId, otherP] of allPhrases) {
      if (otherId !== id) {
        otherP.forEach((p) => otherPhrases.add(p));
      }
    }
    uniquePhrases.set(
      id,
      [...phrases].filter((p) => !otherPhrases.has(p)),
    );
  }

  return { uniqueFrameworks, uniqueTones, uniquePhrases };
}

/**
 * Get a comparative analysis summary for multiple personas
 */
export function getComparativeAnalysis(personas: Map<string, PersonaDefinition>): string {
  const lines: string[] = [];

  lines.push(`Comparative Analysis of ${personas.size} Personas`);
  lines.push('='.repeat(50));
  lines.push('');

  // Basic stats
  for (const [id, persona] of personas) {
    const frameworkCount = Object.keys(persona.frameworks).length;
    const caseStudyCount = Object.keys(persona.case_studies ?? {}).length;
    const toneCount = persona.voice.tone.length;
    const phraseCount = persona.voice.phrases.length;

    lines.push(`${persona.identity.name} (${id})`);
    lines.push(`  Role: ${persona.identity.role}`);
    lines.push(`  Frameworks: ${frameworkCount}`);
    lines.push(`  Case Studies: ${caseStudyCount}`);
    lines.push(`  Voice: ${toneCount} tones, ${phraseCount} phrases`);
    lines.push('');
  }

  // Differentiators
  const { uniqueFrameworks, uniqueTones } = identifyDifferentiators(personas);

  lines.push('Unique Differentiators:');
  for (const [id, persona] of personas) {
    const uFrameworks = uniqueFrameworks.get(id) ?? [];
    const uTones = uniqueTones.get(id) ?? [];

    if (uFrameworks.length > 0 || uTones.length > 0) {
      lines.push(`  ${persona.identity.name}:`);
      if (uFrameworks.length > 0) {
        lines.push(`    Frameworks: ${uFrameworks.join(', ')}`);
      }
      if (uTones.length > 0) {
        lines.push(`    Tones: ${uTones.join(', ')}`);
      }
    }
  }

  // Similarity matrix
  if (personas.size > 1) {
    lines.push('');
    lines.push('Similarity Matrix:');
    const matrix = generateSimilarityMatrix(personas);

    for (const [id1, row] of matrix) {
      const persona1 = personas.get(id1)!;
      const similarities: string[] = [];

      for (const [id2, similarity] of row) {
        if (id1 !== id2) {
          const persona2 = personas.get(id2)!;
          similarities.push(`${persona2.identity.name}: ${similarity}%`);
        }
      }

      lines.push(`  ${persona1.identity.name} → ${similarities.join(', ')}`);
    }
  }

  return lines.join('\n');
}
