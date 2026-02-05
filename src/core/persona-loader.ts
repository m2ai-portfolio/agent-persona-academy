/**
 * Persona Loader
 *
 * Loads persona definitions from YAML files and provides typed access
 * to persona components. Supports both local files and cached personas.
 */

import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  PersonaDefinition,
  LoadedPersona,
  Framework,
  CaseStudy,
  PersonaVoice,
  ValidationMarker,
  SampleResponse,
} from './types.js';

// Module directory resolution for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache for loaded personas
const personaCache = new Map<string, LoadedPersona>();

/**
 * Load a persona from a YAML file
 */
export function loadPersonaFromFile(filePath: string): PersonaDefinition {
  if (!existsSync(filePath)) {
    throw new Error(`Persona file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  const definition = parseYaml(content) as PersonaDefinition;

  // Basic validation
  validatePersonaStructure(definition);

  return definition;
}

/**
 * Load a persona by name from the personas directory
 */
export function loadPersona(personaName: string): LoadedPersona {
  // Check cache first
  if (personaCache.has(personaName)) {
    return personaCache.get(personaName)!;
  }

  // Try multiple possible locations
  const possiblePaths = [
    // From dist (production)
    join(__dirname, '../../personas', personaName, 'persona.yaml'),
    // From src (development)
    join(__dirname, '../../../personas', personaName, 'persona.yaml'),
    // Absolute path (if provided)
    personaName.endsWith('.yaml') ? personaName : join(personaName, 'persona.yaml'),
  ];

  let definition: PersonaDefinition | null = null;
  let sourcePath = '';

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      definition = loadPersonaFromFile(path);
      sourcePath = path;
      break;
    }
  }

  if (!definition) {
    throw new Error(
      `Persona '${personaName}' not found. Searched:\n${possiblePaths.join('\n')}`
    );
  }

  // Generate system prompt
  const systemPrompt = generateSystemPrompt(definition);

  const loadedPersona: LoadedPersona = {
    definition,
    sourcePath,
    systemPrompt,
    loadedAt: new Date(),
  };

  // Cache for future use
  personaCache.set(personaName, loadedPersona);

  return loadedPersona;
}

/**
 * Clear the persona cache (useful for development/testing)
 */
export function clearPersonaCache(): void {
  personaCache.clear();
}

/**
 * Get a specific framework from a persona
 */
export function getFramework(
  persona: PersonaDefinition,
  frameworkName: string
): Framework | undefined {
  return persona.frameworks[frameworkName];
}

/**
 * Get all framework names from a persona
 */
export function getFrameworkNames(persona: PersonaDefinition): string[] {
  return Object.keys(persona.frameworks);
}

/**
 * Get diagnostic questions for a specific framework
 */
export function getDiagnosticQuestions(
  persona: PersonaDefinition,
  frameworkName: string
): string[] {
  const framework = persona.frameworks[frameworkName];
  return framework?.questions ?? [];
}

/**
 * Get all diagnostic questions across all frameworks
 */
export function getAllDiagnosticQuestions(persona: PersonaDefinition): string[] {
  return Object.values(persona.frameworks).flatMap((f) => f.questions ?? []);
}

/**
 * Get a specific case study from a persona
 */
export function getCaseStudy(
  persona: PersonaDefinition,
  caseName: string
): CaseStudy | undefined {
  return persona.case_studies?.[caseName];
}

/**
 * Get all case study names from a persona
 */
export function getCaseStudyNames(persona: PersonaDefinition): string[] {
  return Object.keys(persona.case_studies ?? {});
}

/**
 * Get the voice configuration from a persona
 */
export function getVoice(persona: PersonaDefinition): PersonaVoice {
  return persona.voice;
}

/**
 * Get a random characteristic phrase from the persona
 */
export function getRandomPhrase(persona: PersonaDefinition): string {
  const phrases = persona.voice.phrases;
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Get validation markers from a persona
 */
export function getValidationMarkers(
  persona: PersonaDefinition
): PersonaDefinition['validation'] {
  return persona.validation;
}

/**
 * Get sample responses from a persona
 */
export function getSampleResponses(
  persona: PersonaDefinition
): Record<string, SampleResponse> {
  return persona.sample_responses ?? {};
}

/**
 * Validate basic persona structure
 */
function validatePersonaStructure(definition: PersonaDefinition): void {
  const errors: string[] = [];

  // Required sections
  if (!definition.identity) {
    errors.push('Missing required section: identity');
  } else {
    if (!definition.identity.name) errors.push('Missing identity.name');
    if (!definition.identity.role) errors.push('Missing identity.role');
    if (!definition.identity.background) errors.push('Missing identity.background');
  }

  if (!definition.voice) {
    errors.push('Missing required section: voice');
  } else {
    if (!definition.voice.tone?.length) errors.push('Missing or empty voice.tone');
    if (!definition.voice.phrases?.length) errors.push('Missing or empty voice.phrases');
    if (!definition.voice.style?.length) errors.push('Missing or empty voice.style');
  }

  if (!definition.frameworks || Object.keys(definition.frameworks).length === 0) {
    errors.push('Missing required section: frameworks (need at least one)');
  }

  if (!definition.validation) {
    errors.push('Missing required section: validation');
  } else {
    if (!definition.validation.must_include?.length) {
      errors.push('Missing or empty validation.must_include');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid persona definition:\n${errors.join('\n')}`);
  }
}

/**
 * Generate system prompt from persona definition
 */
export function generateSystemPrompt(persona: PersonaDefinition): string {
  const { identity, voice, frameworks, case_studies, analysis_patterns } = persona;

  const sections: string[] = [];

  // Identity section
  sections.push(`# ${identity.name}

${identity.role}

${identity.background.trim()}`);

  // Voice section
  sections.push(`## Communication Style

**Tone**: ${voice.tone.join(', ')}

**Characteristic Phrases**:
${voice.phrases.map((p) => `- "${p}"`).join('\n')}

**Approach**:
${voice.style.map((s) => `- ${s}`).join('\n')}`);

  // Constraints if present
  if (voice.constraints?.length) {
    sections.push(`**Constraints** (what ${identity.name} would NOT do):
${voice.constraints.map((c) => `- ${c}`).join('\n')}`);
  }

  // Frameworks section
  const frameworkEntries = Object.entries(frameworks);
  sections.push(`## Analytical Frameworks

${frameworkEntries
  .map(
    ([name, fw]) => `### ${formatFrameworkName(name)}

${fw.description.trim()}

**Key Concepts**:
${Object.entries(fw.concepts)
  .map(([cName, c]) => `- **${formatConceptName(cName)}**: ${c.definition}`)
  .join('\n')}

**Diagnostic Questions**:
${(fw.questions ?? []).map((q) => `- ${q}`).join('\n')}`
  )
  .join('\n\n')}`);

  // Case studies if present
  if (case_studies && Object.keys(case_studies).length > 0) {
    sections.push(`## Reference Cases

${Object.entries(case_studies)
  .map(
    ([name, cs]) => `### ${formatConceptName(name)}
**Pattern**: ${cs.pattern}

${cs.story.trim()}

**When to reference**: ${(cs.signals ?? []).slice(0, 3).join(', ')}`
  )
  .join('\n\n')}`);
  }

  // Analysis approach if present
  if (analysis_patterns?.approach?.length) {
    sections.push(`## Analysis Approach

${analysis_patterns.approach.map((step, i) => `${i + 1}. ${step}`).join('\n')}`);
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Format framework name for display (snake_case to Title Case)
 */
function formatFrameworkName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format concept name for display
 */
function formatConceptName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Export the import helper for finding persona files
export function getPersonasDirectory(): string {
  // Try multiple possible locations
  const possibleDirs = [
    join(__dirname, '../../personas'),
    join(__dirname, '../../../personas'),
  ];

  for (const dir of possibleDirs) {
    if (existsSync(dir)) {
      return dir;
    }
  }

  throw new Error('Personas directory not found');
}
