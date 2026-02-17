/**
 * Framework Coverage Analyzer
 *
 * Analyzes text for coverage of a persona's conceptual frameworks.
 * Checks for framework references, concept usage, and question application.
 */

import type { PersonaDefinition, Framework } from '../core/types.js';
import type { FrameworkCoverageResult, SingleFrameworkCoverage } from './types.js';

/**
 * Analyze text for framework coverage
 */
export function analyzeFrameworkCoverage(
  text: string,
  persona: PersonaDefinition,
): FrameworkCoverageResult {
  const { frameworks } = persona;
  const normalizedText = text.toLowerCase();

  // Analyze each framework
  const frameworkCoverage: Record<string, SingleFrameworkCoverage> = {};
  const referencedFrameworks: string[] = [];
  const conceptsMentioned: string[] = [];
  const questionsUsed: string[] = [];

  for (const [frameworkName, framework] of Object.entries(frameworks)) {
    const coverage = analyzeFramework(normalizedText, text, frameworkName, framework);

    frameworkCoverage[frameworkName] = coverage;

    if (coverage.referenced) {
      referencedFrameworks.push(frameworkName);
    }

    conceptsMentioned.push(...coverage.conceptsFound);

    // Check for questions used
    if (framework.questions) {
      for (const question of framework.questions) {
        if (isQuestionUsed(normalizedText, question)) {
          questionsUsed.push(question);
        }
      }
    }
  }

  // Calculate overall coverage score
  const coverageScore = calculateCoverageScore(
    frameworkCoverage,
    conceptsMentioned,
    questionsUsed,
    persona,
  );

  // Generate assessment
  const assessment = generateCoverageAssessment(
    coverageScore,
    frameworkCoverage,
    conceptsMentioned,
    questionsUsed,
    persona.identity.name,
  );

  return {
    coverageScore,
    frameworkCoverage,
    referencedFrameworks,
    conceptsMentioned: [...new Set(conceptsMentioned)],
    questionsUsed: [...new Set(questionsUsed)],
    assessment,
  };
}

/**
 * Analyze coverage of a single framework
 */
function analyzeFramework(
  normalizedText: string,
  originalText: string,
  frameworkName: string,
  framework: Framework,
): SingleFrameworkCoverage {
  // Check if framework is referenced by name
  const frameworkNameNormalized = normalizeFrameworkName(frameworkName);
  const referenced =
    normalizedText.includes(frameworkNameNormalized) ||
    normalizedText.includes(frameworkName.toLowerCase());

  // Check which concepts are mentioned
  const conceptsFound: string[] = [];
  const totalConcepts = Object.keys(framework.concepts).length;

  for (const [conceptName, concept] of Object.entries(framework.concepts)) {
    if (isConceptMentioned(normalizedText, originalText, conceptName, concept)) {
      conceptsFound.push(conceptName);
    }
  }

  // Calculate coverage percentage
  const coverage = totalConcepts > 0 ? Math.round((conceptsFound.length / totalConcepts) * 100) : 0;

  return {
    name: frameworkName,
    referenced,
    conceptsFound,
    totalConcepts,
    coverage,
  };
}

/**
 * Normalize framework name for matching
 */
function normalizeFrameworkName(name: string): string {
  return name.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ');
}

/**
 * Check if a concept is mentioned in the text
 */
function isConceptMentioned(
  normalizedText: string,
  originalText: string,
  conceptName: string,
  concept: { definition: string; examples?: string[] },
): boolean {
  // Check concept name
  const conceptNameNormalized = conceptName.toLowerCase().replace(/_/g, ' ');
  if (normalizedText.includes(conceptNameNormalized)) {
    return true;
  }

  // Check concept name variations (handle acronyms, common forms)
  const nameWords = conceptNameNormalized.split(' ').filter((w) => w.length > 2);
  const wordMatches = nameWords.filter((word) => normalizedText.includes(word));
  if (wordMatches.length >= Math.ceil(nameWords.length * 0.7)) {
    return true;
  }

  // Check for key terms from the definition
  const definitionKeywords = extractKeywords(concept.definition);
  const keywordMatches = definitionKeywords.filter((kw) => normalizedText.includes(kw));
  if (keywordMatches.length >= 3) {
    return true;
  }

  // Check examples (if mentioned, concept is being used)
  if (concept.examples) {
    for (const example of concept.examples) {
      const exampleWords = example
        .toLowerCase()
        .split(' ')
        .filter((w) => w.length > 4);
      const exampleMatches = exampleWords.filter((w) => normalizedText.includes(w));
      if (exampleMatches.length >= Math.ceil(exampleWords.length * 0.5)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract keywords from text for matching
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'dare',
    'ought',
    'used',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'at',
    'by',
    'from',
    'up',
    'about',
    'into',
    'over',
    'after',
    'beneath',
    'under',
    'above',
    'this',
    'that',
    'these',
    'those',
    'it',
    'its',
    'and',
    'but',
    'or',
    'nor',
    'so',
    'yet',
    'both',
    'either',
    'neither',
    'not',
    'only',
    'own',
    'same',
    'than',
    'too',
    'very',
    'just',
    'also',
    'now',
    'here',
    'there',
    'when',
    'where',
    'why',
    'how',
    'all',
    'each',
    'every',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'any',
    'which',
    'who',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));
}

/**
 * Check if a diagnostic question is being used
 */
function isQuestionUsed(normalizedText: string, question: string): boolean {
  // Direct question reference
  const normalizedQuestion = question.toLowerCase();
  if (normalizedText.includes(normalizedQuestion)) {
    return true;
  }

  // Key question words used
  const questionKeywords = extractKeywords(normalizedQuestion).slice(0, 4);
  const keywordMatches = questionKeywords.filter((kw) => normalizedText.includes(kw));

  return keywordMatches.length >= Math.ceil(questionKeywords.length * 0.6);
}

/**
 * Calculate overall coverage score
 */
function calculateCoverageScore(
  frameworkCoverage: Record<string, SingleFrameworkCoverage>,
  conceptsMentioned: string[],
  questionsUsed: string[],
  persona: PersonaDefinition,
): number {
  let score = 0;
  const frameworks = Object.values(frameworkCoverage);

  if (frameworks.length === 0) return 100; // No frameworks to check

  // Framework reference score (30 points max)
  const referencedCount = frameworks.filter((f) => f.referenced).length;
  const referenceScore = (referencedCount / frameworks.length) * 30;
  score += referenceScore;

  // Concept coverage score (50 points max)
  const totalConcepts = frameworks.reduce((sum, f) => sum + f.totalConcepts, 0);
  const uniqueConcepts = [...new Set(conceptsMentioned)].length;
  const conceptScore = totalConcepts > 0 ? (uniqueConcepts / totalConcepts) * 50 : 50;
  score += conceptScore;

  // Question usage score (20 points max)
  let totalQuestions = 0;
  for (const framework of Object.values(persona.frameworks)) {
    totalQuestions += (framework.questions ?? []).length;
  }
  const questionScore = totalQuestions > 0 ? (questionsUsed.length / totalQuestions) * 20 : 20;
  score += questionScore;

  return Math.round(score);
}

/**
 * Generate human-readable coverage assessment
 */
function generateCoverageAssessment(
  score: number,
  frameworkCoverage: Record<string, SingleFrameworkCoverage>,
  conceptsMentioned: string[],
  questionsUsed: string[],
  personaName: string,
): string {
  const lines: string[] = [];

  // Overall assessment
  if (score >= 80) {
    lines.push(`Excellent ${personaName} framework coverage (${score}/100).`);
  } else if (score >= 60) {
    lines.push(`Good ${personaName} framework coverage (${score}/100).`);
  } else if (score >= 40) {
    lines.push(`Moderate ${personaName} framework coverage (${score}/100).`);
  } else {
    lines.push(`Low ${personaName} framework coverage (${score}/100).`);
  }

  // Framework breakdown
  const frameworks = Object.entries(frameworkCoverage);
  const referencedFrameworks = frameworks.filter(([, f]) => f.referenced);
  lines.push(`Frameworks referenced: ${referencedFrameworks.length}/${frameworks.length}`);

  // Per-framework details
  for (const [name, coverage] of frameworks) {
    const status = coverage.referenced ? '✓' : '○';
    lines.push(
      `  ${status} ${name}: ${coverage.conceptsFound.length}/${coverage.totalConcepts} concepts (${coverage.coverage}%)`,
    );
  }

  // Concepts summary
  const uniqueConcepts = [...new Set(conceptsMentioned)];
  lines.push(`Total concepts used: ${uniqueConcepts.length}`);

  // Questions summary
  if (questionsUsed.length > 0) {
    lines.push(`Diagnostic questions applied: ${questionsUsed.length}`);
  }

  return lines.join('\n');
}

/**
 * Quick check if framework coverage is adequate
 */
export function quickFrameworkCheck(
  text: string,
  persona: PersonaDefinition,
  threshold = 50,
): boolean {
  const result = analyzeFrameworkCoverage(text, persona);
  return result.coverageScore >= threshold;
}

/**
 * Get framework usage suggestions
 */
export function getFrameworkSuggestions(text: string, persona: PersonaDefinition): string[] {
  const result = analyzeFrameworkCoverage(text, persona);
  const suggestions: string[] = [];

  // Suggest unreferenced frameworks
  for (const [name, coverage] of Object.entries(result.frameworkCoverage)) {
    if (!coverage.referenced && coverage.totalConcepts > 0) {
      suggestions.push(`Consider referencing the ${name} framework`);
    }
  }

  // Suggest unused concepts from referenced frameworks
  for (const [name, coverage] of Object.entries(result.frameworkCoverage)) {
    if (coverage.referenced && coverage.coverage < 50) {
      const framework = persona.frameworks[name];
      const unusedConcepts = Object.keys(framework.concepts).filter(
        (c) => !coverage.conceptsFound.includes(c),
      );
      if (unusedConcepts.length > 0) {
        suggestions.push(
          `Apply more concepts from ${name}: ${unusedConcepts.slice(0, 3).join(', ')}`,
        );
      }
    }
  }

  // Suggest diagnostic questions
  for (const [name, framework] of Object.entries(persona.frameworks)) {
    const questions = framework.questions ?? [];
    const unusedQuestions = questions.filter((q) => !result.questionsUsed.includes(q));
    if (unusedQuestions.length > 0 && questions.length > 0) {
      suggestions.push(
        `Consider using diagnostic question: "${unusedQuestions[0].slice(0, 50)}..."`,
      );
      break; // Only suggest one question
    }
  }

  return suggestions.slice(0, 5);
}

/**
 * Get detailed framework usage report
 */
export function getFrameworkReport(
  text: string,
  persona: PersonaDefinition,
): Record<
  string,
  {
    referenced: boolean;
    concepts: { name: string; used: boolean }[];
    questions: { text: string; used: boolean }[];
  }
> {
  const result = analyzeFrameworkCoverage(text, persona);
  const report: Record<
    string,
    {
      referenced: boolean;
      concepts: { name: string; used: boolean }[];
      questions: { text: string; used: boolean }[];
    }
  > = {};

  for (const [name, framework] of Object.entries(persona.frameworks)) {
    const coverage = result.frameworkCoverage[name];

    report[name] = {
      referenced: coverage?.referenced ?? false,
      concepts: Object.keys(framework.concepts).map((conceptName) => ({
        name: conceptName,
        used: coverage?.conceptsFound.includes(conceptName) ?? false,
      })),
      questions: (framework.questions ?? []).map((q) => ({
        text: q,
        used: result.questionsUsed.includes(q),
      })),
    };
  }

  return report;
}
