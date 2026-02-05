/**
 * Core type definitions for Agent Persona Academy
 * These types mirror the JSON Schema in schema/persona-schema.json
 */

// ============================================================================
// Identity Types
// ============================================================================

export interface PersonaIdentity {
  /** Display name of the persona */
  name: string;
  /** Title or position */
  role: string;
  /** Credentials, expertise, and relevant history */
  background: string;
  /** Time period of primary expertise (optional) */
  era?: string;
  /** Key publications, frameworks, or contributions */
  notable_works?: string[];
}

// ============================================================================
// Voice Types
// ============================================================================

export interface PersonaVoice {
  /** Descriptive tone characteristics */
  tone: string[];
  /** Characteristic expressions this persona uses */
  phrases: string[];
  /** Communication patterns and approaches */
  style: string[];
  /** What this persona would NOT say or do */
  constraints?: string[];
}

// ============================================================================
// Framework Types
// ============================================================================

export interface FrameworkConcept {
  /** Definition of the concept */
  definition: string;
  /** Examples illustrating the concept */
  examples?: string[];
  /** Key insight about this concept */
  insight?: string;
  /** Nested subconcepts */
  subconcepts?: Record<string, string>;
}

export interface Framework {
  /** Overview of the framework */
  description: string;
  /** Key concepts within this framework */
  concepts: Record<string, FrameworkConcept>;
  /** Diagnostic questions for applying this framework */
  questions?: string[];
  /** Situations where this framework applies */
  when_to_use?: string;
  /** Frequent misapplications to avoid */
  common_mistakes?: string[];
}

// ============================================================================
// Case Study Types
// ============================================================================

export interface CaseStudy {
  /** The pattern this case illustrates */
  pattern: string;
  /** Narrative of the case */
  story: string;
  /** Indicators that this pattern applies */
  signals?: string[];
  /** Key takeaways */
  lessons?: string[];
  /** Original publication or context */
  source?: string;
}

// ============================================================================
// Analysis Pattern Types
// ============================================================================

export interface OutputSection {
  /** Name of the section */
  section: string;
  /** Purpose of this section */
  purpose?: string;
}

export interface AnalysisPatterns {
  /** Step-by-step analysis methodology */
  approach?: string[];
  /** Expected sections in analysis output */
  output_structure?: OutputSection[];
  /** How to combine multiple frameworks */
  synthesis_guidance?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationMarker {
  /** Regex pattern or keyword to detect */
  pattern: string;
  /** Why this pattern matters */
  description?: string;
  /** Importance weight (1-10, default 5) */
  weight?: number;
}

export interface PersonaValidation {
  /** Patterns essential to this persona (need 80%+) */
  must_include: ValidationMarker[];
  /** Patterns that strengthen authenticity */
  should_include?: ValidationMarker[];
  /** Antipatterns that break character */
  must_avoid?: ValidationMarker[];
}

// ============================================================================
// Sample Response Types
// ============================================================================

export interface SampleResponse {
  /** User input to test */
  prompt: string;
  /** Example of high-fidelity response */
  good_response: string;
  /** Example of low-fidelity response */
  bad_response?: string;
  /** Why good is good and bad is bad */
  explanation?: string;
}

// ============================================================================
// Metadata Types
// ============================================================================

export type PersonaCategory =
  | 'business-strategist'
  | 'technical-architect'
  | 'domain-expert'
  | 'creative'
  | 'custom';

export interface PersonaMetadata {
  /** Schema version */
  version?: string;
  /** Persona author */
  author?: string;
  /** Creation date (YYYY-MM-DD) */
  created?: string;
  /** Last update date (YYYY-MM-DD) */
  updated?: string;
  /** Categorization tags */
  tags?: string[];
  /** Persona category */
  category?: PersonaCategory;
}

// ============================================================================
// Complete Persona Definition
// ============================================================================

export interface PersonaDefinition {
  /** Core identity of the persona */
  identity: PersonaIdentity;
  /** Communication characteristics */
  voice: PersonaVoice;
  /** Mental models and analytical frameworks */
  frameworks: Record<string, Framework>;
  /** Canonical examples and stories */
  case_studies?: Record<string, CaseStudy>;
  /** How this persona approaches problems */
  analysis_patterns?: AnalysisPatterns;
  /** Fidelity markers for validation */
  validation: PersonaValidation;
  /** Example prompt/response pairs */
  sample_responses?: Record<string, SampleResponse>;
  /** Administrative metadata */
  metadata?: PersonaMetadata;
}

// ============================================================================
// Runtime Types (for loaded/processed personas)
// ============================================================================

export interface LoadedPersona {
  /** The parsed persona definition */
  definition: PersonaDefinition;
  /** Path to the source YAML file */
  sourcePath: string;
  /** Generated system prompt */
  systemPrompt: string;
  /** Timestamp of when persona was loaded */
  loadedAt: Date;
}

export interface FidelityScore {
  /** Overall score (0-100) */
  score: number;
  /** Breakdown by category */
  breakdown: {
    must_include: { matched: number; total: number; patterns: string[] };
    should_include: { matched: number; total: number; patterns: string[] };
    must_avoid: { triggered: number; patterns: string[] };
  };
  /** Pass/fail determination */
  passed: boolean;
  /** Human-readable assessment */
  assessment: string;
}

// ============================================================================
// Tool Generation Types
// ============================================================================

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
}

export interface GeneratedTool {
  /** Tool name (snake_case) */
  name: string;
  /** Tool description for Claude */
  description: string;
  /** Input parameters */
  parameters: ToolParameter[];
  /** Frameworks to inject into prompt */
  frameworkInjection: string[];
  /** Template for generating the prompt */
  promptTemplate: string;
}

// ============================================================================
// Registry Types
// ============================================================================

export interface RegistryEntry {
  /** Unique persona identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  summary: string;
  /** Author info */
  author: string;
  /** Version string */
  version: string;
  /** Category tag */
  category: PersonaCategory;
  /** All tags */
  tags: string[];
  /** Download URL or path */
  location: string;
  /** Last updated timestamp */
  updated: string;
  /** Download count (if available) */
  downloads?: number;
}

export interface RegistryIndex {
  /** Schema version for the registry */
  schema_version: string;
  /** When the index was last updated */
  updated: string;
  /** List of available personas */
  personas: RegistryEntry[];
}
