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
  StyleReference,
  PersonaCategory,
  PersonaMetadata,
  PersonaDefinition,
  LoadedPersona,
  FidelityScore,
  ToolParameter,
  GeneratedTool,
  RegistryEntry,
  RegistryIndex,
  DepartmentIdentity,
  DepartmentChangeType,
  DepartmentValidationOverrides,
  DepartmentQualityMetric,
  DepartmentLearningPolicy,
  DepartmentDefinition,
  LoadedDepartment,
  PromptGenerationOptions,
} from './types.js';

// Persona Loader
export {
  loadPersonaFromFile,
  loadPersona,
  clearPersonaCache,
  resolveExternalFiles,
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

export type { SampleValidationResult, FidelityScoreOptions } from './validation-engine.js';
