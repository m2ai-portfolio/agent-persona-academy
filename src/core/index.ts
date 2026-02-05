/**
 * Agent Persona Academy - Core Module
 *
 * Exports all core functionality for loading, validating,
 * and working with persona definitions.
 */

// Types
export type {
  PersonaIdentity,
  PersonaVoice,
  FrameworkConcept,
  Framework,
  CaseStudy,
  OutputSection,
  AnalysisPatterns,
  ValidationMarker,
  PersonaValidation,
  SampleResponse,
  PersonaCategory,
  PersonaMetadata,
  PersonaDefinition,
  LoadedPersona,
  FidelityScore,
  ToolParameter,
  GeneratedTool,
  RegistryEntry,
  RegistryIndex,
} from './types.js';

// Persona Loader
export {
  loadPersonaFromFile,
  loadPersona,
  clearPersonaCache,
  getFramework,
  getFrameworkNames,
  getDiagnosticQuestions,
  getAllDiagnosticQuestions,
  getCaseStudy,
  getCaseStudyNames,
  getVoice,
  getRandomPhrase,
  getValidationMarkers,
  getSampleResponses,
  generateSystemPrompt,
  getPersonasDirectory,
} from './persona-loader.js';

// Validation Engine
export {
  calculateFidelityScore,
  validateAgainstSamples,
  quickFidelityCheck,
  getSuggestions,
} from './validation-engine.js';

export type { SampleValidationResult } from './validation-engine.js';
