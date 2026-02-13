# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build & develop
npm install              # Install dependencies
npm run build            # Compile TypeScript (tsc)
npm run dev              # Watch mode (tsc --watch)

# CLI (requires build first)
npm run cli create <name>              # Scaffold new persona
npm run cli validate ./personas/<name> # Validate persona YAML against schema
npm run cli test ./personas/<name>     # Run fidelity tests (--threshold 70 default)
npm run cli list                       # List local personas
npm run cli list -- --department engineering  # Filter by department
npm run cli info <name>                # Persona details (--frameworks, --prompt)
npm run cli report ./personas/<name>   # Quality report (--run-tests, --junit)
npm run cli compare ./personas         # Cross-persona comparison (--matrix, --text "...")
npm run cli department list            # List all departments
npm run cli department info <id>       # Department details
npm run cli serve                      # Start unified MCP server (--personas dir --default id)
npm run cli -- remote                  # Browse remote registry
npm run cli -- pull <id>               # Fetch from registry

# Testing
npm test                 # Run all tests (vitest)
npm run test:core        # Test core engine only

# Code quality
npm run lint             # ESLint
npm run format           # Prettier
```

## Architecture

TypeScript ESM project (`"type": "module"`, NodeNext resolution). All imports use `.js` extensions per ESM convention.

### Data Flow Pipeline

The core pipeline is: **YAML file → PersonaDefinition → system prompt / fidelity score**

1. `persona-loader.ts` reads YAML, validates structure, caches `LoadedPersona` objects
2. `generateSystemPrompt()` (in persona-loader.ts) converts `PersonaDefinition` into a formatted markdown system prompt with identity, voice, frameworks, case studies, and analysis approach sections separated by `---`
3. `validation-engine.ts` scores text against `ValidationMarker` patterns (must_include/should_include/must_avoid) producing a `FidelityScore` (0-100, pass threshold configurable via department, must_include threshold 80%)

### Module Boundaries

- **`src/core/`** — Types (`PersonaDefinition`, `DepartmentDefinition`, and all nested interfaces), loader, validation engine, prompt generation. This is the only module that touches YAML parsing for personas. Everything else imports from `core/index.ts`.
- **`src/departments/`** — Department system providing isolation boundaries. `department-loader.ts` loads department YAML files. `department-manager.ts` handles runtime discovery, persona-to-department resolution, and validation config merging. `learning-adapter.ts` bridges Sky-Lynx recommendations with department learning policies.
- **`src/cli/`** — Commander-based CLI. Entry point is `src/cli/index.ts` (also the `bin` target). Each command is a separate file in `commands/`. No business logic here — delegates to core, validation, departments, and registry modules.
- **`src/unified-server/`** — Multi-persona MCP server. `persona-manager.ts` holds global mutable state (`ManagerState`) tracking active persona and loaded persona cache. `tools.ts` defines 7 MCP tools and their handlers. `index.ts` wires up `@modelcontextprotocol/sdk` Server with stdio transport.
- **`src/validation/`** — Extended validation suite beyond core fidelity: voice analysis, framework coverage, cross-persona comparison, report generation, and CI test runner (JUnit XML output).
- **`src/registry/`** — GitHub-based remote persona registry. `github-client.ts` fetches from GitHub API, `cache-manager.ts` handles local cache at `~/.persona-academy/personas/`.

### Department System

Departments provide isolation boundaries — quality criteria that work for engineering personas (precision, measurement) are antithetical to creative personas (expressiveness, rule-breaking).

- Department YAML files live in `departments/<id>/department.yaml`
- Schema at `schema/department-schema.json`
- Each department defines: `identity`, `quality_criteria` (validation overrides, shared must_avoid), `learning_policy` (thresholds for Sky-Lynx auto-apply), `personas` list
- Current departments: `engineering` (carmack, hopper, lamport, liskov), `business-strategy` (christensen, porter, drucker), `operations` (sky-lynx), `creative` (michelangelo)
- Dual membership declaration: department lists personas AND persona declares department in metadata (validated for consistency)
- Merge hierarchy: default config < department overrides < persona-specific

### Persona YAML Schema

Canonical schema at `schema/persona-schema.json`. Required top-level sections: `identity`, `voice`, `frameworks` (≥1), `validation` (with `must_include` ≥1). Optional: `case_studies`, `analysis_patterns`, `sample_responses`, `metadata` (includes optional `department` field).

Personas live in `personas/<id>/persona.yaml`. Current personas: christensen, porter, drucker, sky-lynx, carmack, hopper, liskov, lamport, michelangelo.

### Unified MCP Server Tools

The server exposes 7 tools: `list_personas`, `switch_persona`, `persona_analyze`, `get_framework`, `get_case_study`, `get_active_persona`, `list_departments`. Tool dispatch is in `handleToolCall()` in `tools.ts`.

### Key Types

- **`PersonaDefinition`** — Defined in `src/core/types.ts`. All persona data flows through this interface. Key nested types: `PersonaIdentity`, `PersonaVoice`, `Framework`, `CaseStudy`, `ValidationMarker`, `SampleResponse`, `PersonaMetadata`.
- **`DepartmentDefinition`** — Defined in `src/core/types.ts`. Department config with `DepartmentIdentity`, `DepartmentQualityMetric`, `DepartmentLearningPolicy`.

## Design Principles

- **Prompt-shaping over logic** — Core generates prompts from YAML, it doesn't execute persona reasoning
- **YAML as source of truth** — All persona and department data in YAML files, no compilation step for changes
- **Fidelity enforcement** — Validate outputs against regex markers in must_include/should_include/must_avoid
- **Department isolation** — Engineering must_include patterns can be creative must_avoid patterns (and vice versa)

## Adding a New Persona

1. `npm run cli create <name>` — scaffolds from `src/templates/persona.yaml.template`
2. Edit `personas/<name>/persona.yaml`
3. Add `department` to metadata and add persona ID to the department's `department.yaml`
4. `npm run cli validate personas/<name>` — check against JSON Schema
5. Add `sample_responses` with good/bad examples for fidelity testing
6. `npm run cli test personas/<name>` — verify fidelity score passes department threshold

## CI/CD

GitHub Actions workflow at `.github/workflows/persona-validation.yml` runs on pushes to main/develop affecting `personas/`, `departments/`, `src/`, `schema/`, or `package.json`. Pipeline: lint → type check → unit tests → validate all personas → fidelity tests (threshold 70) → quality report (PR comment on pull requests).
