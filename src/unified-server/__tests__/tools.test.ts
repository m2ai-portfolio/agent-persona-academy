import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LoadedPersona, DepartmentDefinition } from '../../core/types.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../persona-manager.js', () => ({
  listPersonas: vi.fn(),
  switchPersona: vi.fn(),
  getActivePersona: vi.fn(),
  getActivePersonaId: vi.fn(),
  getPersona: vi.fn(),
  getActiveFrameworks: vi.fn(),
  getFrameworkQuestions: vi.fn(),
  getActiveCaseStudies: vi.fn(),
  getRandomPhrase: vi.fn(),
}));

vi.mock('../../departments/index.js', () => ({
  listDepartments: vi.fn(),
  getDepartment: vi.fn(),
}));

import {
  handleListPersonas,
  handleSwitchPersona,
  handlePersonaAnalyze,
  handleGetFramework,
  handleGetCaseStudy,
  handleGetActivePersona,
  handleListDepartments,
  handleToolCall,
} from '../tools.js';

import {
  listPersonas,
  switchPersona,
  getActivePersona,
  getActivePersonaId,
  getRandomPhrase,
} from '../persona-manager.js';

import { listDepartments, getDepartment } from '../../departments/index.js';

import type { PersonaSummary } from '../persona-manager.js';
import type { DepartmentSummary } from '../../departments/index.js';

// ============================================================================
// Mock Factories
// ============================================================================

function makePersonaSummary(overrides?: Partial<PersonaSummary>): PersonaSummary {
  return {
    id: 'christensen',
    name: 'Clayton Christensen',
    role: 'Innovation Strategy Professor',
    category: 'business-strategist',
    department: 'business-strategy',
    frameworkCount: 3,
    caseStudyCount: 2,
    source: 'local',
    ...overrides,
  };
}

function makeLoadedPersona(overrides?: Partial<LoadedPersona>): LoadedPersona {
  return {
    definition: {
      identity: {
        name: 'Clayton Christensen',
        role: 'Innovation Strategy Professor',
        background: 'Harvard Business School professor specializing in innovation.',
        era: '1990s-2020',
      },
      voice: {
        tone: ['academic', 'thoughtful', 'precise'],
        phrases: [
          'The innovator\'s dilemma is...',
          'What job is the customer hiring this product to do?',
          'Disruption is a process, not an event.',
          'The theory predicts that...',
        ],
        style: ['Uses concrete examples', 'Builds from first principles'],
        constraints: ['Never recommend sustaining innovation blindly'],
      },
      frameworks: {
        disruption_theory: {
          description: 'Theory of disruptive innovation\nExplains how smaller companies unseat incumbents.',
          concepts: {
            new_market: {
              definition: 'Creating demand where none existed',
              examples: ['Personal computers', 'Smartphones'],
              insight: 'New markets are often invisible to incumbents',
            },
            low_end: {
              definition: 'Serving overshot customers with simpler offerings',
            },
          },
          questions: [
            'Is this a new-market or low-end disruption?',
            'What are incumbents ignoring?',
            'Where is the performance overshoot?',
            'Who are the non-consumers?',
            'What is the business model innovation?',
          ],
          when_to_use: 'When analyzing competitive dynamics in evolving markets',
          common_mistakes: [
            'Calling every innovation disruptive',
            'Ignoring the role of business model',
          ],
        },
        jobs_to_be_done: {
          description: 'Understanding customer motivation through the jobs framework.',
          concepts: {
            functional_job: {
              definition: 'The practical task the customer needs done',
            },
            emotional_job: {
              definition: 'The emotional outcome desired',
            },
          },
        },
      },
      case_studies: {
        steel_minimills: {
          pattern: 'Low-end disruption in heavy industry',
          story: 'Nucor and other minimills entered at the bottom of the steel market.\nIncumbents retreated upmarket.',
          signals: ['Incumbents ceding low-margin segments', 'New entrants improving quality'],
          lessons: ['Disruption starts at the bottom', 'Retreat looks rational in the moment'],
          source: 'The Innovator\'s Dilemma, Chapter 4',
        },
        milkshake: {
          pattern: 'Jobs-to-be-done discovery',
          story: 'A fast food chain tried to improve milkshake sales.\nResearchers found morning commuters hired milkshakes for a specific job.',
          signals: ['Unexpected usage patterns'],
        },
      },
      analysis_patterns: {
        approach: [
          'Identify the job to be done',
          'Map the competitive landscape',
          'Assess disruption potential',
        ],
      },
      validation: {
        must_include: [{ pattern: 'disruption', description: 'Core concept', weight: 8 }],
      },
    },
    sourcePath: '/personas/christensen/persona.yaml',
    systemPrompt: 'You are Clayton Christensen...',
    loadedAt: new Date('2025-01-15T00:00:00Z'),
    ...overrides,
  };
}

function makeDepartmentSummary(overrides?: Partial<DepartmentSummary>): DepartmentSummary {
  return {
    id: 'business-strategy',
    name: 'Business Strategy',
    mission: 'Apply strategic frameworks to business challenges.',
    personaCount: 3,
    personas: ['christensen', 'porter', 'drucker'],
    ...overrides,
  };
}

function makeDepartmentDefinition(overrides?: Partial<DepartmentDefinition>): DepartmentDefinition {
  return {
    identity: {
      id: 'business-strategy',
      name: 'Business Strategy',
      mission: 'Apply strategic frameworks to business challenges.',
    },
    quality_criteria: {
      validation_overrides: {
        fidelity_threshold: 75,
        weights: {
          fidelity: 0.5,
          voice: 0.3,
          framework: 0.2,
        },
      },
    },
    learning_policy: {
      auto_apply_threshold: 0.85,
      review_threshold: 0.5,
      max_changes_per_cycle: 3,
    },
    personas: ['christensen', 'porter', 'drucker'],
    ...overrides,
  };
}

// ============================================================================
// Type-safe mock accessors
// ============================================================================

const mockListPersonas = listPersonas as ReturnType<typeof vi.fn>;
const mockSwitchPersona = switchPersona as ReturnType<typeof vi.fn>;
const mockGetActivePersona = getActivePersona as ReturnType<typeof vi.fn>;
const mockGetActivePersonaId = getActivePersonaId as ReturnType<typeof vi.fn>;
const mockGetRandomPhrase = getRandomPhrase as ReturnType<typeof vi.fn>;
const mockListDepartments = listDepartments as ReturnType<typeof vi.fn>;
const mockGetDepartment = getDepartment as ReturnType<typeof vi.fn>;

// ============================================================================
// Tests
// ============================================================================

describe('handleListPersonas', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetActivePersonaId.mockReturnValue(null);
  });

  it('returns formatted list of personas', () => {
    mockListPersonas.mockReturnValue([
      makePersonaSummary(),
      makePersonaSummary({
        id: 'porter',
        name: 'Michael Porter',
        role: 'Competitive Strategy Expert',
        frameworkCount: 2,
        caseStudyCount: 1,
      }),
    ]);

    const result = handleListPersonas({});

    expect(result).toContain('# Available Personas');
    expect(result).toContain('## Clayton Christensen');
    expect(result).toContain('## Michael Porter');
    expect(result).toContain('**ID**: christensen');
    expect(result).toContain('**ID**: porter');
    expect(result).toContain('**Role**: Innovation Strategy Professor');
    expect(result).toContain('**Category**: business-strategist');
    expect(result).toContain('**Frameworks**: 3');
    expect(result).toContain('**Case Studies**: 2');
    expect(result).toContain('**Source**: local');
    expect(result).toContain('switch_persona');
  });

  it('filters by category', () => {
    mockListPersonas.mockReturnValue([
      makePersonaSummary({ id: 'christensen', category: 'business-strategist' }),
      makePersonaSummary({ id: 'carmack', name: 'John Carmack', category: 'technical-architect' }),
    ]);

    const result = handleListPersonas({ category: 'business-strategist' });

    expect(result).toContain('christensen');
    expect(result).not.toContain('carmack');
  });

  it('filters by department', () => {
    mockListPersonas.mockReturnValue([
      makePersonaSummary({ id: 'christensen', department: 'business-strategy' }),
      makePersonaSummary({ id: 'carmack', name: 'John Carmack', department: 'engineering' }),
    ]);

    const result = handleListPersonas({ department: 'business-strategy' });

    expect(result).toContain('christensen');
    expect(result).not.toContain('carmack');
  });

  it('returns "No personas" message when no personas match filter', () => {
    mockListPersonas.mockReturnValue([
      makePersonaSummary({ category: 'business-strategist' }),
    ]);

    const result = handleListPersonas({ category: 'creative' });

    expect(result).toBe('No personas found in category "creative".');
  });

  it('returns "No personas available" when list is empty', () => {
    mockListPersonas.mockReturnValue([]);

    const result = handleListPersonas({});

    expect(result).toBe('No personas available.');
  });

  it('shows active marker for current persona', () => {
    mockListPersonas.mockReturnValue([
      makePersonaSummary({ id: 'christensen' }),
      makePersonaSummary({ id: 'porter', name: 'Michael Porter' }),
    ]);
    mockGetActivePersonaId.mockReturnValue('christensen');

    const result = handleListPersonas({});

    expect(result).toContain('Clayton Christensen ← ACTIVE');
    expect(result).not.toContain('Michael Porter ← ACTIVE');
  });
});

describe('handleSwitchPersona', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns persona info with frameworks and voice on success', () => {
    const persona = makeLoadedPersona();
    mockSwitchPersona.mockReturnValue({
      success: true,
      persona,
      message: 'Switched to Clayton Christensen',
    });

    const result = handleSwitchPersona({ persona_id: 'christensen' });

    expect(result).toContain('# Switched to Clayton Christensen');
    expect(result).toContain('**Role**: Innovation Strategy Professor');
    expect(result).toContain('Harvard Business School');
    expect(result).toContain('## Frameworks Available');
    expect(result).toContain('Disruption Theory');
    expect(result).toContain('Jobs To Be Done');
    expect(result).toContain('## Case Studies');
    expect(result).toContain('Steel Minimills');
    expect(result).toContain('## Voice');
    expect(result).toContain('academic, thoughtful, precise');
    expect(result).toContain('I am now Clayton Christensen');
  });

  it('returns error message on failure', () => {
    mockSwitchPersona.mockReturnValue({
      success: false,
      message: 'Persona "unknown" not found. Available: christensen, porter',
    });

    const result = handleSwitchPersona({ persona_id: 'unknown' });

    expect(result).toContain('Failed to switch persona');
    expect(result).toContain('Persona "unknown" not found');
  });
});

describe('handlePersonaAnalyze', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetRandomPhrase.mockReturnValue(null);
  });

  it('returns error message when no active persona', () => {
    mockGetActivePersona.mockReturnValue(null);

    const result = handlePersonaAnalyze({ situation: 'Our startup is struggling.' });

    expect(result).toBe('No persona is currently active. Use `switch_persona` to activate one first.');
  });

  it('returns analysis with frameworks and case studies when persona is active', () => {
    const persona = makeLoadedPersona();
    mockGetActivePersona.mockReturnValue(persona);
    mockGetRandomPhrase.mockReturnValue('The innovator\'s dilemma is...');

    const result = handlePersonaAnalyze({
      situation: 'Our product is being undercut by a cheaper alternative.',
      context: 'B2B SaaS market',
    });

    expect(result).toContain('# Analysis by Clayton Christensen');
    expect(result).toContain('*Innovation Strategy Professor*');
    expect(result).toContain('> The innovator\'s dilemma is...');
    expect(result).toContain('## Your Situation');
    expect(result).toContain('Our product is being undercut');
    expect(result).toContain('**Additional Context**: B2B SaaS market');
    expect(result).toContain('## Framework Analysis');
    expect(result).toContain('### Disruption Theory');
    expect(result).toContain('### Jobs To Be Done');
    expect(result).toContain('**Key Concepts to Consider**');
    expect(result).toContain('**Diagnostic Questions**');
    expect(result).toContain('## Potentially Relevant Case Studies');
    expect(result).toContain('### Steel Minimills');
    expect(result).toContain('**Watch for these signals**');
    expect(result).toContain('## My Analysis Approach');
    expect(result).toContain('Identify the job to be done');
    expect(result).toContain('*Remember: academic, thoughtful*');
    expect(result).toContain('*I will: Never recommend sustaining innovation blindly*');
  });

  it('filters frameworks when focus_frameworks is provided', () => {
    const persona = makeLoadedPersona();
    mockGetActivePersona.mockReturnValue(persona);

    const result = handlePersonaAnalyze({
      situation: 'Analyzing customer motivation.',
      focus_frameworks: ['jobs_to_be_done'],
    });

    expect(result).toContain('### Jobs To Be Done');
    expect(result).not.toContain('### Disruption Theory');
  });
});

describe('handleGetFramework', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns error when no active persona', () => {
    mockGetActivePersona.mockReturnValue(null);

    const result = handleGetFramework({ framework_name: 'disruption_theory' });

    expect(result).toBe('No persona is currently active. Use `switch_persona` to activate one first.');
  });

  it('returns error with available list when framework not found', () => {
    mockGetActivePersona.mockReturnValue(makeLoadedPersona());

    const result = handleGetFramework({ framework_name: 'nonexistent_framework' });

    expect(result).toContain('Framework "nonexistent_framework" not found');
    expect(result).toContain('Available frameworks: disruption_theory, jobs_to_be_done');
  });

  it('returns framework details when found', () => {
    mockGetActivePersona.mockReturnValue(makeLoadedPersona());

    const result = handleGetFramework({ framework_name: 'disruption_theory' });

    expect(result).toContain('# Disruption Theory');
    expect(result).toContain("*From Clayton Christensen's toolkit*");
    expect(result).toContain('## Description');
    expect(result).toContain('Theory of disruptive innovation');
    expect(result).toContain('## Key Concepts');
    expect(result).toContain('### New Market');
    expect(result).toContain('Creating demand where none existed');
    expect(result).toContain('**Examples**:');
    expect(result).toContain('- Personal computers');
    expect(result).toContain('**Insight**: New markets are often invisible to incumbents');
    expect(result).toContain('### Low End');
    expect(result).toContain('## Diagnostic Questions');
    expect(result).toContain('Is this a new-market or low-end disruption?');
    expect(result).toContain('## When to Use');
    expect(result).toContain('When analyzing competitive dynamics');
    expect(result).toContain('## Common Mistakes');
    expect(result).toContain('Calling every innovation disruptive');
  });
});

describe('handleGetCaseStudy', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns error when no active persona', () => {
    mockGetActivePersona.mockReturnValue(null);

    const result = handleGetCaseStudy({ case_name: 'steel_minimills' });

    expect(result).toBe('No persona is currently active. Use `switch_persona` to activate one first.');
  });

  it('returns error when case study not found', () => {
    mockGetActivePersona.mockReturnValue(makeLoadedPersona());

    const result = handleGetCaseStudy({ case_name: 'nonexistent_case' });

    expect(result).toContain('Case study "nonexistent_case" not found');
    expect(result).toContain('Available: steel_minimills, milkshake');
  });

  it('returns case study details when found', () => {
    mockGetActivePersona.mockReturnValue(makeLoadedPersona());

    const result = handleGetCaseStudy({ case_name: 'steel_minimills' });

    expect(result).toContain('# Steel Minimills');
    expect(result).toContain('*Case study from Clayton Christensen*');
    expect(result).toContain('## Pattern');
    expect(result).toContain('Low-end disruption in heavy industry');
    expect(result).toContain('## Story');
    expect(result).toContain('Nucor and other minimills');
    expect(result).toContain('## When This Pattern Applies');
    expect(result).toContain('Incumbents ceding low-margin segments');
    expect(result).toContain('## Key Lessons');
    expect(result).toContain('Disruption starts at the bottom');
    expect(result).toContain('## Source');
    expect(result).toContain("The Innovator's Dilemma, Chapter 4");
  });
});

describe('handleGetActivePersona', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns instruction message when no active persona', () => {
    mockGetActivePersona.mockReturnValue(null);

    const result = handleGetActivePersona();

    expect(result).toContain('No persona is currently active');
    expect(result).toContain('list_personas');
    expect(result).toContain('switch_persona');
  });

  it('returns persona details when active', () => {
    mockGetActivePersona.mockReturnValue(makeLoadedPersona());

    const result = handleGetActivePersona();

    expect(result).toContain('# Currently Active: Clayton Christensen');
    expect(result).toContain('**Role**: Innovation Strategy Professor');
    expect(result).toContain('**Background**:');
    expect(result).toContain('Harvard Business School');
    expect(result).toContain('**Era**: 1990s-2020');
    expect(result).toContain('## Voice');
    expect(result).toContain('**Tone**: academic, thoughtful, precise');
    expect(result).toContain('**Style**:');
    expect(result).toContain('- Uses concrete examples');
    expect(result).toContain('## Frameworks (2)');
    expect(result).toContain('- Disruption Theory');
    expect(result).toContain('- Jobs To Be Done');
    expect(result).toContain('## Case Studies (2)');
    expect(result).toContain('- Steel Minimills');
    expect(result).toContain('- Milkshake');
  });
});

describe('handleListDepartments', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns "No departments configured" when empty', () => {
    mockListDepartments.mockReturnValue([]);

    const result = handleListDepartments();

    expect(result).toBe('No departments configured.');
  });

  it('returns formatted department list with quality and learning info', () => {
    mockListDepartments.mockReturnValue([
      makeDepartmentSummary(),
      makeDepartmentSummary({
        id: 'engineering',
        name: 'Engineering',
        mission: 'Build reliable software systems.',
        personaCount: 4,
        personas: ['carmack', 'hopper', 'lamport', 'liskov'],
      }),
    ]);
    mockGetDepartment.mockImplementation((id: string) => {
      if (id === 'business-strategy') return makeDepartmentDefinition();
      if (id === 'engineering') {
        return makeDepartmentDefinition({
          identity: { id: 'engineering', name: 'Engineering', mission: 'Build reliable software systems.' },
          quality_criteria: {
            validation_overrides: {
              weights: { fidelity: 0.4, voice: 0.2, framework: 0.4 },
            },
          },
          learning_policy: {
            auto_apply_threshold: 0.9,
            review_threshold: 0.6,
            max_changes_per_cycle: 5,
          },
          personas: ['carmack', 'hopper', 'lamport', 'liskov'],
        });
      }
      return null;
    });

    const result = handleListDepartments();

    expect(result).toContain('# Academy Departments');
    expect(result).toContain('## Business Strategy');
    expect(result).toContain('**ID**: business-strategy');
    expect(result).toContain('**Mission**: Apply strategic frameworks to business challenges.');
    expect(result).toContain('**Personas**: christensen, porter, drucker');
    expect(result).toContain('fidelity=0.5, voice=0.3, framework=0.2');
    expect(result).toContain('auto-apply>0.85, max 3 changes/cycle');
    expect(result).toContain('## Engineering');
    expect(result).toContain('fidelity=0.4, voice=0.2, framework=0.4');
    expect(result).toContain('auto-apply>0.9, max 5 changes/cycle');
  });
});

describe('handleToolCall', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetActivePersonaId.mockReturnValue(null);
    mockGetActivePersona.mockReturnValue(null);
    mockGetRandomPhrase.mockReturnValue(null);
  });

  it('routes list_personas to handleListPersonas', () => {
    mockListPersonas.mockReturnValue([makePersonaSummary()]);

    const result = handleToolCall('list_personas', {});

    expect(result).toContain('# Available Personas');
    expect(result).toContain('Clayton Christensen');
  });

  it('routes switch_persona to handleSwitchPersona', () => {
    mockSwitchPersona.mockReturnValue({
      success: true,
      persona: makeLoadedPersona(),
      message: 'Switched',
    });

    const result = handleToolCall('switch_persona', { persona_id: 'christensen' });

    expect(result).toContain('# Switched to Clayton Christensen');
  });

  it('routes persona_analyze to handlePersonaAnalyze', () => {
    mockGetActivePersona.mockReturnValue(makeLoadedPersona());

    const result = handleToolCall('persona_analyze', { situation: 'Test situation' });

    expect(result).toContain('# Analysis by Clayton Christensen');
  });

  it('routes get_framework to handleGetFramework', () => {
    mockGetActivePersona.mockReturnValue(makeLoadedPersona());

    const result = handleToolCall('get_framework', { framework_name: 'disruption_theory' });

    expect(result).toContain('# Disruption Theory');
  });

  it('routes get_case_study to handleGetCaseStudy', () => {
    mockGetActivePersona.mockReturnValue(makeLoadedPersona());

    const result = handleToolCall('get_case_study', { case_name: 'steel_minimills' });

    expect(result).toContain('# Steel Minimills');
  });

  it('routes get_active_persona to handleGetActivePersona', () => {
    mockGetActivePersona.mockReturnValue(makeLoadedPersona());

    const result = handleToolCall('get_active_persona', {});

    expect(result).toContain('# Currently Active: Clayton Christensen');
  });

  it('routes list_departments to handleListDepartments', () => {
    mockListDepartments.mockReturnValue([]);

    const result = handleToolCall('list_departments', {});

    expect(result).toBe('No departments configured.');
  });

  it('returns "Unknown tool" message for unrecognized tool names', () => {
    const result = handleToolCall('nonexistent_tool', {});

    expect(result).toBe('Unknown tool: nonexistent_tool');
  });
});
