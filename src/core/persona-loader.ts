/**
 * Persona Loader
 *
 * Loads persona definitions from YAML files and provides typed access
 * to persona components. Supports both local files and cached personas.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
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
  StyleReference,
  PersonaValidation,
  PromptGenerationOptions,
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

  // Resolve convention-based external files before validation
  const personaDir = dirname(filePath);
  resolveExternalFiles(definition, personaDir);

  // Basic validation
  validatePersonaStructure(definition);

  return definition;
}

/**
 * Resolve convention-based external YAML files and merge into the definition.
 *
 * Convention:
 *   frameworks/       → each .yaml becomes a key in definition.frameworks
 *   case-studies/     → each .yaml becomes a key in definition.case_studies
 *   references/       → each .yaml becomes a key in definition.style_references
 *   validation.yaml   → merged into definition.validation
 *   samples.yaml      → merged into definition.sample_responses
 *
 * External files override inline keys with the same name.
 */
export function resolveExternalFiles(
  definition: PersonaDefinition,
  personaDir: string
): void {
  // frameworks/ directory
  const frameworksDir = join(personaDir, 'frameworks');
  if (existsSync(frameworksDir)) {
    const files = readdirSync(frameworksDir).filter((f) => f.endsWith('.yaml'));
    for (const file of files) {
      const key = file.replace(/\.yaml$/, '');
      const content = readFileSync(join(frameworksDir, file), 'utf-8');
      const parsed = parseYaml(content) as Framework;
      if (!definition.frameworks) {
        definition.frameworks = {};
      }
      definition.frameworks[key] = parsed;
    }
  }

  // case-studies/ directory
  const caseStudiesDir = join(personaDir, 'case-studies');
  if (existsSync(caseStudiesDir)) {
    const files = readdirSync(caseStudiesDir).filter((f) => f.endsWith('.yaml'));
    for (const file of files) {
      const key = file.replace(/\.yaml$/, '');
      const content = readFileSync(join(caseStudiesDir, file), 'utf-8');
      const parsed = parseYaml(content) as CaseStudy;
      if (!definition.case_studies) {
        definition.case_studies = {};
      }
      definition.case_studies[key] = parsed;
    }
  }

  // references/ directory
  const referencesDir = join(personaDir, 'references');
  if (existsSync(referencesDir)) {
    const files = readdirSync(referencesDir).filter((f) => f.endsWith('.yaml'));
    for (const file of files) {
      const key = file.replace(/\.yaml$/, '');
      const content = readFileSync(join(referencesDir, file), 'utf-8');
      const parsed = parseYaml(content) as StyleReference;
      if (!definition.style_references) {
        definition.style_references = {};
      }
      definition.style_references[key] = parsed;
    }
  }

  // validation.yaml
  const validationFile = join(personaDir, 'validation.yaml');
  if (existsSync(validationFile)) {
    const content = readFileSync(validationFile, 'utf-8');
    const parsed = parseYaml(content) as PersonaValidation;
    definition.validation = { ...definition.validation, ...parsed };
  }

  // samples.yaml
  const samplesFile = join(personaDir, 'samples.yaml');
  if (existsSync(samplesFile)) {
    const content = readFileSync(samplesFile, 'utf-8');
    const parsed = parseYaml(content) as Record<string, SampleResponse>;
    definition.sample_responses = { ...definition.sample_responses, ...parsed };
  }
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
export function generateSystemPrompt(
  persona: PersonaDefinition,
  options?: PromptGenerationOptions
): string {
  const { identity, voice, frameworks, case_studies, style_references, analysis_patterns } =
    persona;
  const lean = options?.mode === 'lean';

  const sections: string[] = [];

  // Identity section (same in both modes)
  sections.push(`# ${identity.name}

${identity.role}

${identity.background.trim()}`);

  // Voice section (same in both modes)
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
  if (lean) {
    sections.push(`## Analytical Frameworks

${frameworkEntries
  .map(([name, fw]) => {
    const firstSentence = fw.description.trim().split(/\.\s/)[0] + '.';
    return `- **${formatFrameworkName(name)}**: ${firstSentence} *(Use get_framework tool for details)*`;
  })
  .join('\n')}`);
  } else {
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
  }

  // Case studies if present
  if (case_studies && Object.keys(case_studies).length > 0) {
    if (lean) {
      sections.push(`## Reference Cases

${Object.entries(case_studies)
  .map(
    ([name, cs]) =>
      `- **${formatConceptName(name)}**: ${cs.pattern} *(Use get_case_study tool for details)*`
  )
  .join('\n')}`);
    } else {
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
  }

  // Style references if present (omitted in lean mode)
  if (!lean && style_references && Object.keys(style_references).length > 0) {
    sections.push(`## Design References

${Object.entries(style_references)
  .map(
    ([name, ref]) => `### ${formatConceptName(name)}
${ref.description.trim()}

**Design Principles**: ${ref.design_principles.join('; ')}
**Emotional Quality**: ${ref.emotional_quality}${ref.relevant_frameworks?.length ? `\n**Frameworks**: ${ref.relevant_frameworks.map((f) => formatFrameworkName(f)).join(', ')}` : ''}`
  )
  .join('\n\n')}`);
  }

  // Analysis approach if present (approach only in lean mode, no output_structure)
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
