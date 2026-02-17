# Agent Persona Academy - Blueprint

**Project**: Persona factory and runtime system for Claude agents
**Status**: Phase 12 Complete
**Started**: 2025-01-14
**Updated**: 2026-01-14
**Blueprint Pattern**: Based on christensen-mcp (proven in 4.5 hours)

---

## Vision

A comprehensive system for creating, managing, and deploying persona-driven Claude agents. Supports both:
1. **Factory Mode**: CLI generates standalone persona MCP servers
2. **Runtime Mode**: Unified server loads multiple personas dynamically

Personas are stored in a remote registry (GitHub-based) for sharing across Claude Desktop, Claude Code, and multi-agent workflows.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT PERSONA ACADEMY                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Remote    │    │   Local     │    │   In-Memory │        │
│  │  Registry   │───▶│   Cache     │───▶│   Personas  │        │
│  │  (GitHub)   │    │  (~/personas)│    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                                     │                 │
│         │              ┌──────────────────────┘                 │
│         ▼              ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    CORE ENGINE                           │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │   │
│  │  │   Schema    │ │   Loader    │ │  Prompt         │    │   │
│  │  │  Validator  │ │   (YAML)    │ │  Generator      │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │   │
│  │  │   Tool      │ │  Framework  │ │   Fidelity      │    │   │
│  │  │  Factory    │ │   Engine    │ │   Validator     │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                  │
│         ▼                 ▼                 ▼                  │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│  │  Factory    │   │  Unified    │   │  Validation │          │
│  │   CLI       │   │  MCP Server │   │   Suite     │          │
│  │             │   │             │   │             │          │
│  │ > create    │   │ Tools:      │   │ > test      │          │
│  │ > validate  │   │ - analyze   │   │ > score     │          │
│  │ > publish   │   │ - switch    │   │ > compare   │          │
│  │ > pull      │   │ - list      │   │             │          │
│  └─────────────┘   └─────────────┘   └─────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase Breakdown

### Phase 1: Core Engine Foundation ✅
**Goal**: Extract and generalize christensen-mcp patterns into reusable core

- [x] **1.1** Create JSON Schema for persona YAML validation
- [x] **1.2** Build generic persona loader (YAML → typed objects)
- [x] **1.3** Implement universal system prompt generator
- [x] **1.4** Create framework engine (load/query/inject)
- [ ] **1.5** Build tool factory (generate tools from config) - *deferred to Phase 5*
- [x] **1.6** Implement fidelity validation engine

**Deliverables**:
- [x] `src/core/` with 4 modules (types, loader, validation, index)
- [x] Comprehensive type definitions
- [ ] Unit tests for each module - *deferred*

---

### Phase 2: Persona Schema & Templates ✅
**Goal**: Define the canonical persona format and scaffolding

- [x] **2.1** Formalize persona YAML schema (identity, voice, frameworks, validation)
- [x] **2.2** Create persona.yaml template with inline documentation
- [ ] **2.3** Create framework.ts template (pattern from christensen) - *deferred to Phase 5*
- [ ] **2.4** Create MCP server template (index.ts boilerplate) - *deferred to Phase 5*
- [x] **2.5** Build schema validation with helpful error messages
- [x] **2.6** Port christensen as first persona using new schema

**Deliverables**:
- [x] `schema/persona-schema.json`
- [x] `templates/persona.yaml.template`
- [x] `personas/christensen/` (ported with 4 frameworks, 5 case studies)

---

### Phase 3: CLI Factory Tool ✅
**Goal**: `npx persona-academy create <persona-name>` scaffolding

- [x] **3.1** CLI framework setup (commander)
- [x] **3.2** `create` command - scaffold new persona from template
- [x] **3.3** `validate` command - check persona against schema
- [ ] **3.4** `build` command - compile persona MCP server - *deferred to Phase 5*
- [x] **3.5** `test` command - run fidelity validation
- [x] **3.6** Interactive prompts for persona authoring
- [x] **3.7** `list` command - show available personas (bonus)
- [x] **3.8** `info` command - detailed persona information (bonus)

**Deliverables**:
- [x] `src/cli/` with 5 commands (create, validate, test, list, info)
- [x] `bin/persona-academy` executable configuration
- [x] npm package configuration

---

### Phase 4: Remote Persona Registry ✅
**Goal**: GitHub-based persona sharing (like Perceptor for contexts)

- [x] **4.1** Design registry structure (GitHub repo layout)
- [x] **4.2** `pull` command - fetch persona from registry
- [ ] **4.3** `push` command - publish persona to registry - *deferred*
- [x] **4.4** `remote` command - browse available personas
- [x] **4.5** Local cache management (~/.persona-academy/personas/)
- [x] **4.6** Version tracking and SHA-based update detection
- [x] **4.7** `cache` command - manage local cache (bonus)

**Deliverables**:
- [x] `src/registry/` module (types, cache-manager, github-client)
- [x] CLI commands: pull, remote, cache
- [x] `docs/REGISTRY_SETUP.md` documentation
- [ ] Actual registry repository - *requires manual setup*

---

### Phase 5: Unified Multi-Persona Server ✅
**Goal**: Single MCP server supporting multiple personas with switching

- [x] **5.1** Design multi-persona tool interface
- [x] **5.2** `switch_persona` tool - change active persona
- [x] **5.3** `list_personas` tool - show available personas
- [x] **5.4** `persona_analyze` tool - generic analysis with active persona
- [x] **5.5** `get_framework` tool - access framework details
- [x] **5.6** `get_case_study` tool - access case study details
- [x] **5.7** `get_active_persona` tool - view current persona info
- [x] **5.8** Persona manager for runtime loading/switching
- [x] **5.9** CLI `serve` command

**Deliverables**:
- [x] `src/unified-server/` (persona-manager, tools, index)
- [x] Multi-persona MCP server with 6 tools
- [x] Claude Desktop configuration examples
- [x] `persona-academy serve` command

---

### Phase 6: Validation & Testing Suite ✅
**Goal**: Comprehensive persona quality assurance

- [x] **6.1** Automated fidelity scoring (from markers)
- [x] **6.2** Sample prompt/response testing
- [x] **6.3** Cross-persona comparison metrics
- [x] **6.4** Voice consistency analysis
- [x] **6.5** Framework coverage validation
- [x] **6.6** CI/CD integration (GitHub Actions)

**Deliverables**:
- [x] `src/validation/` module (types, voice-analyzer, framework-coverage, comparison, report-generator, test-runner)
- [x] Test runner for personas with JUnit XML output
- [x] Quality reports with recommendations
- [x] CLI commands: `report`, `compare`
- [x] GitHub Actions workflow for CI/CD

---

### Phase 7: Documentation & Community ✅
**Goal**: Enable others to create and share personas

- [x] **7.1** Persona Authoring Guide (step-by-step)
- [x] **7.2** Framework Implementation Patterns
- [x] **7.3** Voice Design Principles
- [x] **7.4** Validation Marker Writing Guide
- [x] **7.5** Example personas (2-3 beyond Christensen)
- [ ] **7.6** Video walkthrough or demo - *deferred*

**Deliverables**:
- [x] `docs/PERSONA_AUTHORING_GUIDE.md` - Complete step-by-step guide
- [x] `docs/FRAMEWORK_PATTERNS.md` - Framework design patterns
- [x] `docs/VOICE_DESIGN.md` - Voice design principles
- [x] `docs/VALIDATION_MARKERS.md` - Writing effective markers
- [x] `personas/porter/` - Michael Porter competitive strategy persona
- [x] `personas/drucker/` - Peter Drucker management philosophy persona
- [x] README with quick start (updated)

---

### Phase 8: Department Infrastructure ✅
**Goal**: Establish department system without breaking existing functionality

- [x] **8.1** Create `schema/department-schema.json` defining department YAML format
- [x] **8.2** Add department types to `src/core/types.ts` (`DepartmentDefinition`, `DepartmentQualityMetric`, `DepartmentValidationOverrides`, `DepartmentLearningPolicy`, `LoadedDepartment`)
- [x] **8.3** Add optional `department` field to `PersonaMetadata` in types and JSON schema
- [x] **8.4** Create `src/departments/` module (department-loader, department-manager, index)
- [x] **8.5** Create department YAML files (engineering, business-strategy, operations)
- [x] **8.6** Add `department` field to all 8 existing persona metadata

**Deliverables**:
- [x] `schema/department-schema.json`
- [x] `src/departments/` module (3 files)
- [x] `departments/engineering/department.yaml` (carmack, hopper, lamport, liskov)
- [x] `departments/business-strategy/department.yaml` (christensen, porter, drucker)
- [x] `departments/operations/department.yaml` (sky-lynx)
- [x] All 8 persona.yaml files updated with `department` field

---

### Phase 9: Department-Aware Validation ✅
**Goal**: Validation engine respects department configuration

- [x] **9.1** Update `calculateFidelityScore()` to accept `additionalMustAvoid` and configurable `passingScore`
- [x] **9.2** Add `department` context to `QualityReport` type
- [x] **9.3** Update `report-generator.ts` to pass department context and display in reports
- [x] **9.4** Update `PersonaSummary` in persona-manager to include `department`

**Deliverables**:
- [x] `FidelityScoreOptions` type with `additionalMustAvoid` and `passingScore`
- [x] `DepartmentContext` type in report-generator
- [x] Department name displayed in formatted quality reports

---

### Phase 10: Michelangelo Persona & Creative Department ✅
**Goal**: First creative persona proves the department system works

- [x] **10.1** Create `departments/creative/department.yaml` with voice-dominant weights
- [x] **10.2** Create `personas/michelangelo/persona.yaml` with 4 frameworks, 3 case studies
- [x] **10.3** Create `departments/creative/LEARNED_RULES.md` (empty initial)
- [x] **10.4** Validate Michelangelo persona against schema and fidelity tests

**Deliverables**:
- [x] `departments/creative/department.yaml` — voice weight 0.5, fidelity threshold 65
- [x] `personas/michelangelo/persona.yaml` — Creative Director & Visual Philosopher
- [x] Fidelity test: good response 84/100, bad response 0/100
- [x] Isolation proof: Carmack's must_include "measur|profil|benchmark" is Michelangelo's must_avoid

---

### Phase 11: Sky-Lynx Department Scoping ✅
**Goal**: Sky-Lynx can target recommendations to departments

- [x] **11.1** Add `ALL_IN_DEPARTMENT` to `TargetScope` enum in Snow-Town contracts
- [x] **11.2** Add `target_department` field to `ImprovementRecommendation`
- [x] **11.3** Add `target_department` column and query support to Snow-Town store
- [x] **11.4** Update Sky-Lynx `Recommendation` model with `target_department`
- [x] **11.5** Update Sky-Lynx analysis prompt to include department context
- [x] **11.6** Update Sky-Lynx parser to extract `target_department`
- [x] **11.7** Create `src/departments/learning-adapter.ts` with policy evaluation

**Deliverables**:
- [x] Snow-Town contracts updated with department scoping
- [x] Sky-Lynx loads department definitions for analysis context
- [x] Learning adapter evaluates recommendations against department policies

---

### Phase 12: CLI & Server Integration ✅
**Goal**: Surface department functionality in CLI and MCP server

- [x] **12.1** Create `src/cli/commands/department.ts` (list, info subcommands)
- [x] **12.2** Add `--department` filter to `list` command
- [x] **12.3** Update `report` command with department context
- [x] **12.4** Add `list_departments` tool to MCP server
- [x] **12.5** Add `department` filter to `list_personas` tool
- [x] **12.6** Update persona-manager to discover departments on init
- [x] **12.7** Update CLAUDE.md with department system documentation
- [x] **12.8** Update BLUEPRINT.md with Phases 8-12

**Deliverables**:
- [x] `persona-academy department list` and `department info <id>` commands
- [x] `persona-academy list --department engineering` filtering
- [x] MCP server `list_departments` tool (7 total tools)
- [x] Updated documentation

---

## Persona Categories (Planned)

### Business Strategists
| Persona | Focus Areas | Canonical Frameworks |
|---------|-------------|---------------------|
| Clayton Christensen | Innovation, disruption | JTBD, Disruption Theory, CPP |
| Michael Porter | Competition, strategy | 5 Forces, Value Chain, Generic Strategies |
| Peter Drucker | Management, leadership | MBO, Knowledge Worker, Innovation |
| Andy Grove | Operations, paranoia | OKRs, 10X, Strategic Inflection Points |
| Rita McGrath | Strategy, growth | Discovery-Driven Planning, Transient Advantage |

### Technical Architects
| Persona | Focus Areas | Canonical Patterns |
|---------|-------------|-------------------|
| Martin Fowler | Enterprise patterns | Refactoring, DDD, CQRS |
| Kent Beck | XP, testing | TDD, Simple Design, Courage |
| Robert Martin | Clean code | SOLID, Clean Architecture |
| Eric Evans | Domain modeling | DDD, Bounded Context, Aggregates |
| Sam Newman | Microservices | Decomposition, API Design |

### Domain Experts (Healthcare - for Ratchet integration)
| Persona | Focus Areas | Domain Knowledge |
|---------|-------------|-----------------|
| Home Health Nurse | Patient care, compliance | OASIS, Medicare regulations, care planning |
| Healthcare Administrator | Operations, billing | Revenue cycle, scheduling optimization |
| Clinical Informaticist | EMR, interoperability | HL7, FHIR, clinical workflows |

---

## Technical Decisions

### Persona YAML Schema (Draft)
```yaml
# Required top-level sections
identity:
  name: string          # Display name
  role: string          # Title/position
  background: string    # Credentials, expertise
  era: string           # Time period of expertise (optional)

voice:
  tone: string[]        # Descriptive tone characteristics
  phrases: string[]     # Characteristic expressions
  style: string[]       # Communication patterns
  constraints: string[] # What this persona would NOT say

frameworks:
  [framework_name]:
    description: string
    concepts:
      [concept_name]:
        definition: string
        examples: string[]
    questions: string[]   # Diagnostic questions

case_studies:
  [case_name]:
    pattern: string       # Pattern this illustrates
    story: string         # Narrative
    signals: string[]     # When to apply

analysis_patterns:
  approach: string[]      # Step-by-step analysis method
  output_structure:       # Expected output format
    - section: string
      purpose: string

validation:
  must_include:
    - pattern: string     # Regex or keyword
      description: string # Why it matters
  should_include:
    - pattern: string
      description: string
  must_avoid:
    - pattern: string
      description: string

sample_responses:
  [prompt_id]:
    prompt: string
    good_response: string
    bad_response: string
    explanation: string
```

### Tool Generation Pattern
```typescript
// From persona YAML, generate:
// 1. analyze_[domain] - main analysis tool
// 2. [persona]_insight - quick perspective
// 3. get_framework - reference tool
// 4. case_study - pattern matching

interface ToolConfig {
  name: string;
  description: string;
  parameters: ZodSchema;
  promptTemplate: string;
  frameworkInjection: string[];
}
```

### Registry Structure
```
m2ai-portfolio/persona-registry/
├── personas/
│   ├── christensen/
│   │   ├── persona.yaml
│   │   ├── metadata.json
│   │   └── README.md
│   ├── porter/
│   ├── drucker/
│   └── ...
├── index.json           # Persona catalog
└── schema/
    └── persona-v1.json  # Current schema version
```

---

## Dependencies

### Core
- `@modelcontextprotocol/sdk` - MCP protocol
- `yaml` - YAML parsing
- `zod` - Runtime validation
- `ajv` - JSON Schema validation

### CLI
- `commander` - CLI framework
- `inquirer` - Interactive prompts
- `chalk` - Terminal colors
- `ora` - Spinners

### Registry
- `simple-git` - Git operations
- `node-fetch` - HTTP requests

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to create new persona | < 2 hours (with templates) |
| Persona fidelity score | > 85/100 |
| CLI usability | Single command to scaffold |
| Registry latency | < 5s to pull persona |
| Multi-persona switching | < 500ms |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Persona quality varies widely | Strong schema validation + fidelity scoring |
| Framework complexity explosion | Start simple, add gradually |
| Registry security | GitHub-based with PR reviews |
| Persona conflicts in multi-mode | Clear active persona indicator |

---

## Next Steps

1. [ ] Phase 13: Code Review Persona — role-based persona for engineering department
2. [ ] Phase 14: Fully Developed Agent — TBD placeholder for future expansion
3. [ ] Increase unit test coverage to ~70% of critical modules

---

### Phase 13: Code Review Persona
**Goal**: Add a role-based Code Review persona to the engineering department

- [ ] **13.1** Create `personas/code-reviewer/persona.yaml` with review-focused frameworks
- [ ] **13.2** Add `code-reviewer` to `departments/engineering/department.yaml` personas list
- [ ] **13.3** Validate persona against schema and fidelity tests
- [ ] **13.4** Update README.md Included Personas section

---

### Phase 14: Fully Developed Agent (TBD)
**Goal**: Placeholder for future expansion into a fully developed agent workflow

- [ ] **14.1** Define requirements and scope
- [ ] **14.2** Design agent architecture
- [ ] **14.3** Implementation
- [ ] **14.4** Testing and validation

*Details to be determined based on project direction and user needs.*

---

## Backlog (Deferred from Phases 1-7)

Items deferred during initial development, tracked for future consideration:

- [ ] **1.5** Build tool factory (generate tools from config) — *deferred from Phase 1*
- [ ] **2.3** Create framework.ts template — *deferred from Phase 2*
- [ ] **2.4** Create MCP server template (index.ts boilerplate) — *deferred from Phase 2*
- [ ] **3.4** `build` command - compile persona MCP server — *deferred from Phase 3*
- [ ] **4.3** `push` command - publish persona to registry — *deferred from Phase 4*
- [ ] **1.6b** Unit tests for core modules — *deferred from Phase 1*
- [ ] **7.6** Video walkthrough or demo — *deferred from Phase 7*

---

*Blueprint created: 2025-01-14*
*Based on: christensen-mcp patterns (4.5 hour build, 90/100 fidelity)*
