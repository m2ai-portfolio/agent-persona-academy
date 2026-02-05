/**
 * Voice Consistency Analyzer
 *
 * Analyzes text for consistency with a persona's voice characteristics.
 * Checks tone, phrases, style patterns, and constraint compliance.
 */

import type { PersonaDefinition } from '../core/types.js';
import type {
  VoiceAnalysisResult,
  ToneMatch,
  PhraseMatch,
  StyleMatch,
} from './types.js';

/**
 * Tone detection patterns
 * Maps tone descriptors to regex patterns that indicate their presence
 */
const TONE_PATTERNS: Record<string, RegExp[]> = {
  // Academic/Professional tones
  professorial: [
    /\b(theory|theoretical|conceptual|framework)\b/i,
    /\b(research|evidence|studies|data)\b/i,
    /let me (explain|illustrate|clarify)/i,
  ],
  scholarly: [
    /\b(literature|discourse|paradigm|phenomenon)\b/i,
    /\b(analysis|synthesis|critique)\b/i,
  ],
  analytical: [
    /\b(because|therefore|consequently|thus)\b/i,
    /\b(factor|variable|outcome|result)\b/i,
    /the (data|evidence|analysis) (shows|suggests|indicates)/i,
  ],

  // Warmth/Approachability tones
  warm: [
    /\b(wonderful|great question|glad you asked)\b/i,
    /let me (share|tell you about)/i,
    /I (appreciate|understand|hear)/i,
  ],
  approachable: [
    /\b(simply put|in other words|to put it)\b/i,
    /think of it (like|as)/i,
    /imagine (if|that|a)/i,
  ],
  empathetic: [
    /\b(I understand|I see|that makes sense)\b/i,
    /\b(challenge|difficult|struggle)\b/i,
    /many (people|organizations|leaders) face/i,
  ],

  // Communication style tones
  curious: [
    /\?/g,
    /\b(wonder|curious|interesting|intriguing)\b/i,
    /what (if|about|would)/i,
  ],
  thoughtful: [
    /\b(consider|reflect|think about|ponder)\b/i,
    /it's worth (noting|considering|asking)/i,
  ],
  direct: [
    /\b(clearly|simply|directly|specifically)\b/i,
    /the (key|core|main|essential) (point|issue|question)/i,
  ],

  // Expertise tones
  authoritative: [
    /\b(must|should|need to|essential)\b/i,
    /\b(always|never|critical|vital)\b/i,
  ],
  humble: [
    /\b(might|perhaps|possibly|may)\b/i,
    /I (think|believe|suspect)/i,
    /in my (experience|view|opinion)/i,
  ],
  practical: [
    /\b(action|step|implement|apply|use)\b/i,
    /here's (how|what|the)/i,
    /\b(practical|actionable|concrete)\b/i,
  ],

  // Narrative tones
  storytelling: [
    /let me (tell|share) (you )?(a story|an example)/i,
    /\b(once|when|back in|years ago)\b/i,
    /\b(story|narrative|example|case)\b/i,
  ],
  illustrative: [
    /\b(for example|for instance|such as|like)\b/i,
    /consider (the case|how|what)/i,
  ],
};

/**
 * Style pattern detectors
 */
const STYLE_DETECTORS: Record<string, (text: string) => { followed: boolean; confidence: number }> = {
  'Asks questions first': (text) => {
    const sentences = text.split(/[.!?]+/);
    const firstFewSentences = sentences.slice(0, 3).join(' ');
    const hasQuestion = /\?/.test(firstFewSentences);
    return { followed: hasQuestion, confidence: hasQuestion ? 0.8 : 0.2 };
  },

  'Uses examples': (text) => {
    const examplePatterns = /\b(for example|for instance|such as|consider|like when|take the case)\b/i;
    const hasExamples = examplePatterns.test(text);
    const exampleCount = (text.match(examplePatterns) || []).length;
    return { followed: hasExamples, confidence: Math.min(exampleCount * 0.3, 1) };
  },

  'Builds on theory': (text) => {
    const theoryPatterns = /\b(theory|framework|model|concept|principle)\b/i;
    const hasTheory = theoryPatterns.test(text);
    return { followed: hasTheory, confidence: hasTheory ? 0.7 : 0.3 };
  },

  'Cites evidence': (text) => {
    const evidencePatterns = /\b(research|study|data|evidence|findings|analysis shows)\b/i;
    const hasEvidence = evidencePatterns.test(text);
    return { followed: hasEvidence, confidence: hasEvidence ? 0.8 : 0.2 };
  },

  'Acknowledges complexity': (text) => {
    const complexityPatterns = /\b(however|but|although|while|on the other hand|it depends|nuanced)\b/i;
    const acknowledges = complexityPatterns.test(text);
    return { followed: acknowledges, confidence: acknowledges ? 0.7 : 0.3 };
  },

  'Structured response': (text) => {
    const hasStructure = /\b(first|second|third|finally|in conclusion|to summarize)\b/i.test(text);
    const hasBullets = /^[\s]*[-•*]\s/m.test(text);
    const hasNumbering = /^\s*\d+[.)]/m.test(text);
    const followed = hasStructure || hasBullets || hasNumbering;
    return { followed, confidence: followed ? 0.8 : 0.2 };
  },

  'Socratic method': (text) => {
    const questionCount = (text.match(/\?/g) || []).length;
    const hasSocratic = questionCount >= 2;
    return { followed: hasSocratic, confidence: Math.min(questionCount * 0.25, 1) };
  },

  'Concrete over abstract': (text) => {
    const concretePatterns = /\b(specific|example|case|instance|situation|scenario)\b/i;
    const abstractPatterns = /\b(abstract|theoretical|conceptual|philosophical)\b/i;
    const concreteCount = (text.match(concretePatterns) || []).length;
    const abstractCount = (text.match(abstractPatterns) || []).length;
    const followed = concreteCount >= abstractCount;
    return { followed, confidence: followed ? 0.7 : 0.4 };
  },
};

/**
 * Analyze text for voice consistency with a persona
 */
export function analyzeVoiceConsistency(
  text: string,
  persona: PersonaDefinition
): VoiceAnalysisResult {
  const { voice } = persona;

  // Analyze tone markers
  const toneMarkers = analyzeTones(text, voice.tone);

  // Analyze phrase matches
  const phraseMatches = analyzePhrases(text, voice.phrases);

  // Analyze style patterns
  const stylePatterns = analyzeStyles(text, voice.style);

  // Check constraint violations
  const constraintViolations = checkConstraints(text, voice.constraints ?? []);

  // Calculate consistency score
  const consistencyScore = calculateConsistencyScore(
    toneMarkers,
    phraseMatches,
    stylePatterns,
    constraintViolations
  );

  // Generate assessment
  const assessment = generateVoiceAssessment(
    consistencyScore,
    toneMarkers,
    phraseMatches,
    stylePatterns,
    constraintViolations,
    persona.identity.name
  );

  return {
    consistencyScore,
    toneMarkers,
    phraseMatches,
    stylePatterns,
    constraintViolations,
    assessment,
  };
}

/**
 * Analyze text for tone characteristics
 */
function analyzeTones(text: string, expectedTones: string[]): ToneMatch[] {
  return expectedTones.map((tone) => {
    const normalizedTone = tone.toLowerCase();
    const patterns = TONE_PATTERNS[normalizedTone];

    if (!patterns) {
      // Unknown tone - do basic keyword check
      const detected = new RegExp(`\\b${tone}\\b`, 'i').test(text);
      return { expected: tone, detected, evidence: detected ? tone : undefined };
    }

    // Check all patterns for this tone
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return { expected: tone, detected: true, evidence: match[0] };
      }
    }

    return { expected: tone, detected: false };
  });
}

/**
 * Analyze text for characteristic phrases
 */
function analyzePhrases(text: string, expectedPhrases: string[]): PhraseMatch[] {
  const normalizedText = text.toLowerCase();

  return expectedPhrases.map((phrase) => {
    const normalizedPhrase = phrase.toLowerCase();

    // Check for exact match
    if (normalizedText.includes(normalizedPhrase)) {
      return { phrase, matchType: 'exact' as const, matchedText: phrase };
    }

    // Check for variant matches (key words from the phrase)
    const keyWords = normalizedPhrase
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 3);

    if (keyWords.length > 0) {
      const keyWordsFound = keyWords.filter((word) =>
        normalizedText.includes(word)
      );
      if (keyWordsFound.length >= Math.ceil(keyWords.length / 2)) {
        return {
          phrase,
          matchType: 'variant' as const,
          matchedText: keyWordsFound.join(', '),
        };
      }
    }

    return { phrase, matchType: 'absent' as const };
  });
}

/**
 * Analyze text for style patterns
 */
function analyzeStyles(text: string, expectedStyles: string[]): StyleMatch[] {
  return expectedStyles.map((style) => {
    // Check if we have a detector for this style
    const detector = STYLE_DETECTORS[style];

    if (detector) {
      const result = detector(text);
      return { pattern: style, ...result };
    }

    // Generic detection - look for keywords from the style description
    const keywords = style.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const keywordsFound = keywords.filter((kw) =>
      text.toLowerCase().includes(kw)
    );
    const followed = keywordsFound.length >= Math.ceil(keywords.length / 3);

    return {
      pattern: style,
      followed,
      confidence: followed ? 0.5 : 0.3,
    };
  });
}

/**
 * Check for constraint violations
 */
function checkConstraints(text: string, constraints: string[]): string[] {
  const violations: string[] = [];
  const normalizedText = text.toLowerCase();

  for (const constraint of constraints) {
    // Parse constraint to find what to avoid
    const normalizedConstraint = constraint.toLowerCase();

    // Common constraint patterns
    const neverPatterns = [
      /never (use|say|mention|include) (.+)/i,
      /avoid (.+)/i,
      /don't (.+)/i,
      /no (.+)/i,
    ];

    for (const pattern of neverPatterns) {
      const match = normalizedConstraint.match(pattern);
      if (match) {
        const toAvoid = match[match.length - 1];
        // Check if the avoided thing is present
        if (normalizedText.includes(toAvoid)) {
          violations.push(constraint);
          break;
        }
      }
    }

    // Check for specific antipattern keywords
    const antipatternKeywords = [
      { constraint: 'overconfident', patterns: [/\b(definitely|absolutely|certainly|guaranteed)\b/i] },
      { constraint: 'jargon', patterns: [/\b(synergy|leverage|pivot|disrupt)\b/i] },
      { constraint: 'condescending', patterns: [/\b(obviously|clearly you|as anyone knows)\b/i] },
    ];

    for (const { constraint: keyword, patterns } of antipatternKeywords) {
      if (normalizedConstraint.includes(keyword)) {
        for (const antiPattern of patterns) {
          if (antiPattern.test(text)) {
            violations.push(constraint);
            break;
          }
        }
      }
    }
  }

  return [...new Set(violations)]; // Remove duplicates
}

/**
 * Calculate overall voice consistency score
 */
function calculateConsistencyScore(
  toneMarkers: ToneMatch[],
  phraseMatches: PhraseMatch[],
  stylePatterns: StyleMatch[],
  constraintViolations: string[]
): number {
  let score = 0;
  let maxScore = 0;

  // Tone score (40 points max)
  const tonePoints = 40;
  maxScore += tonePoints;
  const tonesDetected = toneMarkers.filter((t) => t.detected).length;
  const toneRatio = toneMarkers.length > 0 ? tonesDetected / toneMarkers.length : 0;
  score += toneRatio * tonePoints;

  // Phrase score (30 points max)
  const phrasePoints = 30;
  maxScore += phrasePoints;
  const exactPhrases = phraseMatches.filter((p) => p.matchType === 'exact').length;
  const variantPhrases = phraseMatches.filter((p) => p.matchType === 'variant').length;
  const phraseScore = phraseMatches.length > 0
    ? (exactPhrases + variantPhrases * 0.5) / phraseMatches.length
    : 0;
  score += phraseScore * phrasePoints;

  // Style score (30 points max)
  const stylePoints = 30;
  maxScore += stylePoints;
  const styleScoreSum = stylePatterns.reduce(
    (sum, s) => sum + (s.followed ? s.confidence : 0),
    0
  );
  const styleAvg = stylePatterns.length > 0
    ? styleScoreSum / stylePatterns.length
    : 0;
  score += styleAvg * stylePoints;

  // Constraint penalty (up to -20 points)
  const constraintPenalty = constraintViolations.length * 10;
  score = Math.max(0, score - constraintPenalty);

  // Normalize to 0-100
  return Math.round((score / maxScore) * 100);
}

/**
 * Generate human-readable voice assessment
 */
function generateVoiceAssessment(
  score: number,
  toneMarkers: ToneMatch[],
  phraseMatches: PhraseMatch[],
  stylePatterns: StyleMatch[],
  constraintViolations: string[],
  personaName: string
): string {
  const lines: string[] = [];

  // Overall assessment
  if (score >= 80) {
    lines.push(`Strong ${personaName} voice consistency (${score}/100).`);
  } else if (score >= 60) {
    lines.push(`Moderate ${personaName} voice consistency (${score}/100).`);
  } else {
    lines.push(`Weak ${personaName} voice consistency (${score}/100).`);
  }

  // Tone feedback
  const detectedTones = toneMarkers.filter((t) => t.detected).map((t) => t.expected);
  const missingTones = toneMarkers.filter((t) => !t.detected).map((t) => t.expected);

  if (detectedTones.length > 0) {
    lines.push(`Detected tones: ${detectedTones.join(', ')}`);
  }
  if (missingTones.length > 0 && missingTones.length <= 3) {
    lines.push(`Missing tones: ${missingTones.join(', ')}`);
  }

  // Phrase feedback
  const exactCount = phraseMatches.filter((p) => p.matchType === 'exact').length;
  const variantCount = phraseMatches.filter((p) => p.matchType === 'variant').length;
  lines.push(`Phrase matches: ${exactCount} exact, ${variantCount} variant of ${phraseMatches.length} expected`);

  // Style feedback
  const followedStyles = stylePatterns.filter((s) => s.followed).length;
  lines.push(`Style patterns: ${followedStyles}/${stylePatterns.length} followed`);

  // Constraint violations
  if (constraintViolations.length > 0) {
    lines.push(`Constraint violations: ${constraintViolations.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Quick check if voice is consistent enough
 */
export function quickVoiceCheck(
  text: string,
  persona: PersonaDefinition,
  threshold = 60
): boolean {
  const result = analyzeVoiceConsistency(text, persona);
  return result.consistencyScore >= threshold;
}

/**
 * Get voice improvement suggestions
 */
export function getVoiceSuggestions(
  text: string,
  persona: PersonaDefinition
): string[] {
  const result = analyzeVoiceConsistency(text, persona);
  const suggestions: string[] = [];

  // Missing tones
  const missingTones = result.toneMarkers.filter((t) => !t.detected);
  for (const tone of missingTones.slice(0, 2)) {
    suggestions.push(`Add ${tone.expected} tone to your response`);
  }

  // Missing phrases
  const missingPhrases = result.phraseMatches.filter(
    (p) => p.matchType === 'absent'
  );
  for (const phrase of missingPhrases.slice(0, 2)) {
    suggestions.push(`Consider using phrase: "${phrase.phrase}"`);
  }

  // Missing styles
  const missingStyles = result.stylePatterns.filter((s) => !s.followed);
  for (const style of missingStyles.slice(0, 2)) {
    suggestions.push(`Apply style pattern: ${style.pattern}`);
  }

  // Constraint fixes
  for (const violation of result.constraintViolations) {
    suggestions.push(`Fix constraint violation: ${violation}`);
  }

  return suggestions;
}
