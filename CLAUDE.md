# CLAUDE.md - Agent Persona Academy

## Quick Commands

```bash
# Development
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run dev          # Watch mode

# CLI (after build)
npm run cli create   # Create new persona
npm run cli validate # Validate persona YAML
npm run cli test     # Run fidelity tests

# Testing
npm test             # Run all tests
npm run test:core    # Test core engine only
```

## Project Purpose

Factory and runtime system for creating Claude persona agents. Two modes:
1. **Factory**: CLI generates standalone MCP servers per persona
2. **Runtime**: Unified server loads multiple personas dynamically

## Architecture

```
src/
├── core/              # Reusable engine (persona loading, prompt gen, validation)
├── cli/               # CLI commands (create, validate, test, publish)
├── unified-server/    # Multi-persona MCP server
├── templates/         # Scaffolding templates
└── registry/          # Remote persona management

personas/              # Built persona packages
schema/                # JSON Schema definitions
docs/                  # User documentation
```

## Key Files

| File | Purpose |
|------|---------|
| `src/core/persona-loader.ts` | YAML → typed PersonaDefinition |
| `src/core/prompt-generator.ts` | PersonaDefinition → system prompt |
| `src/core/tool-factory.ts` | Config → MCP tool definitions |
| `src/core/validation-engine.ts` | Response → fidelity score |
| `schema/persona-schema.json` | Canonical persona YAML format |
| `templates/persona.yaml.template` | Starting point for new personas |

## Persona YAML Structure

```yaml
identity:         # Who is this persona?
  name, role, background

voice:            # How do they communicate?
  tone, phrases, style, constraints

frameworks:       # What mental models do they use?
  [name]: description, concepts, questions

case_studies:     # What examples do they reference?
  [name]: pattern, story, signals

analysis_patterns:  # How do they approach problems?
  approach, output_structure

validation:       # How do we verify fidelity?
  must_include, should_include, must_avoid

sample_responses: # What does good/bad look like?
  [id]: prompt, good_response, bad_response
```

## Development Guidelines

### Adding a New Persona
1. `npm run cli create <name>` - scaffold from template
2. Edit `personas/<name>/persona.yaml`
3. `npm run cli validate personas/<name>` - check schema
4. `npm run cli test personas/<name>` - run fidelity tests
5. Build MCP server: `npm run cli build personas/<name>`

### Core Engine Principles
- **Prompt-shaping over logic** - Generate prompts, don't execute logic
- **YAML as source of truth** - All persona data in single file
- **Runtime loading** - No compilation for persona changes
- **Fidelity enforcement** - Validate outputs against markers

### Framework Implementation
Each framework in a persona should have:
- Clear description of the mental model
- 3-5 core concepts with definitions
- 5-8 diagnostic questions
- Examples showing application

### Validation Markers
Write regex patterns that detect:
- **must_include**: Patterns essential to this persona's voice
- **should_include**: Patterns that strengthen authenticity
- **must_avoid**: Antipatterns that break character

## Blueprint Reference

See `BLUEPRINT.md` for:
- Complete phase breakdown with checkboxes
- Architecture diagrams
- Planned persona categories
- Technical decisions and rationale
- Success metrics

## Dependencies

- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **yaml**: YAML parsing
- **zod**: Runtime type validation
- **ajv**: JSON Schema validation
- **commander**: CLI framework
