# Persona Academy - System Diagrams

## 1. System Architecture Diagram

```mermaid
graph TB
    subgraph DataLayer["Data Layer"]
        YAML["Base Personas<br/>(YAML Definitions)"]
        MODULES["Specialist Modules<br/>(Loadable Expertise)"]
        CONSTRAINTS["Constraint Definitions<br/>(Rules & Patterns)"]
    end

    subgraph CompositionLayer["Composition Layer"]
        LOADER["Loader<br/>(Parse & Validate)"]
        COMPOSER["Composer<br/>(Merge Components)"]
        CONSTRAINT_ENGINE["Constraint Engine<br/>(Enforce Rules)"]
        PROMPT_GEN["System Prompt<br/>Generator"]
    end

    subgraph AgentLayer["Agent Layer"]
        ROLE["Role<br/>(Composed Agent)"]
        TOOLS["MCP Tools<br/>(Tool Interface)"]
        MEMORY["Context Memory<br/>(Decision History)"]
    end

    subgraph DeploymentLayer["Deployment Layer"]
        MCP_SERVER["MCP Server<br/>(Tool Handler)"]
        INTERFACE["Claude Interface<br/>(Tool Calls)"]
    end

    YAML --> LOADER
    MODULES --> LOADER
    CONSTRAINTS --> CONSTRAINT_ENGINE

    LOADER --> COMPOSER
    LOADER --> CONSTRAINT_ENGINE
    COMPOSER --> ROLE
    CONSTRAINT_ENGINE --> ROLE

    ROLE --> PROMPT_GEN
    PROMPT_GEN --> TOOLS
    TOOLS --> MEMORY

    MEMORY --> MCP_SERVER
    TOOLS --> MCP_SERVER
    MCP_SERVER --> INTERFACE

    style YAML fill:#e1f5e1
    style MODULES fill:#e1f5e1
    style CONSTRAINTS fill:#e1f5e1
    style LOADER fill:#fff4e1
    style COMPOSER fill:#fff4e1
    style CONSTRAINT_ENGINE fill:#fff4e1
    style PROMPT_GEN fill:#fff4e1
    style ROLE fill:#e1f0ff
    style TOOLS fill:#e1f0ff
    style MEMORY fill:#e1f0ff
    style MCP_SERVER fill:#f0e1ff
    style INTERFACE fill:#f0e1ff
```

---

## 2. Composition Flow Diagram

```mermaid
graph LR
    START([User Creates Role]) --> LOAD_YAML["Load Base Persona<br/>YAML"]

    LOAD_YAML --> VALIDATE_YAML{YAML<br/>Valid?}
    VALIDATE_YAML -->|No| ERROR1["Error:<br/>Invalid Format"]
    VALIDATE_YAML -->|Yes| LOAD_MODULES["Load Specialist<br/>Modules"]

    LOAD_MODULES --> VALIDATE_MODULES{Modules<br/>Found?}
    VALIDATE_MODULES -->|No| ERROR2["Error:<br/>Module Not Found"]
    VALIDATE_MODULES -->|Yes| MERGE["Merge Base +<br/>Specialist Knowledge"]

    MERGE --> APPLY_CONSTRAINTS["Apply Constraint<br/>Engine Rules"]

    APPLY_CONSTRAINTS --> CHECK_CONFLICTS{Constraint<br/>Conflicts?}
    CHECK_CONFLICTS -->|Yes| ERROR3["Error:<br/>Conflicting Rules"]
    CHECK_CONFLICTS -->|No| GENERATE_PROMPT["Generate System<br/>Prompt"]

    GENERATE_PROMPT --> CREATE_TOOLS["Create MCP<br/>Tool Signatures"]

    CREATE_TOOLS --> VALIDATE_COHERENCE{Coherence<br/>Check}
    VALIDATE_COHERENCE -->|Low| WARN["Warning:<br/>Low Coherence"]
    VALIDATE_COHERENCE -->|High| BUILD_AGENT

    WARN --> BUILD_AGENT["Build Agent<br/>Instance"]
    BUILD_AGENT --> READY["Ready:<br/>Persona Agent"]

    ERROR1 --> END([Error State])
    ERROR2 --> END
    ERROR3 --> END
    READY --> END([Success])

    style LOAD_YAML fill:#fff4e1
    style LOAD_MODULES fill:#fff4e1
    style MERGE fill:#fff4e1
    style APPLY_CONSTRAINTS fill:#ffe1e1
    style GENERATE_PROMPT fill:#fff4e1
    style CREATE_TOOLS fill:#fff4e1
    style BUILD_AGENT fill:#e1f0ff
    style READY fill:#c8f0c8
    style ERROR1 fill:#ffc8c8
    style ERROR2 fill:#ffc8c8
    style ERROR3 fill:#ffc8c8
    style WARN fill:#ffe1c8
```

---

## 3. Boardroom Orchestration Pattern

```mermaid
sequenceDiagram
    participant User
    participant Claude as Claude<br/>Orchestrator
    participant Selector as Role Selector
    participant P1 as Persona A<br/>(Expert Tool)
    participant P2 as Persona B<br/>(Expert Tool)
    participant P3 as Persona C<br/>(Expert Tool)
    participant Synthesizer as Response<br/>Synthesizer

    User->>Claude: Ask strategic question
    Claude->>Selector: Which personas needed?
    Selector-->>Claude: Personas A, B, C ranked

    par Parallel Persona Calls
        Claude->>P1: Call Persona A tool<br/>(with context)
        Claude->>P2: Call Persona B tool<br/>(with context)
        Claude->>P3: Call Persona C tool<br/>(with context)
    end

    P1-->>Claude: Perspective A + reasoning
    P2-->>Claude: Perspective B + reasoning
    P3-->>Claude: Perspective C + reasoning

    Claude->>Synthesizer: Merge perspectives
    Synthesizer-->>Claude: Integrated response<br/>with citations
    Claude->>User: Strategic answer<br/>with multi-persona<br/>reasoning

    style Claude fill:#e1f0ff
    style P1 fill:#e1f5e1
    style P2 fill:#e1f5e1
    style P3 fill:#e1f5e1
    style Selector fill:#fff4e1
    style Synthesizer fill:#f0e1ff
```

---

## 4. Factory Pipeline Diagram

```mermaid
graph TD
    START([Start Development]) --> DESIGN["1. Design Phase:<br/>Create Base Persona YAML"]

    DESIGN --> DESIGN_REVIEW{Review<br/>Definition?}
    DESIGN_REVIEW -->|Revise| DESIGN
    DESIGN_REVIEW -->|Approve| MODULE_PHASE

    MODULE_PHASE["2. Module Phase:<br/>Create/Select Specialist<br/>Modules"]

    MODULE_PHASE --> MODULE_REVIEW{Modules<br/>Complete?}
    MODULE_REVIEW -->|Add More| MODULE_PHASE
    MODULE_REVIEW -->|Done| COMPOSE_PHASE

    COMPOSE_PHASE["3. Composition Phase:<br/>Define Role<br/>Composition"]

    COMPOSE_PHASE --> CONSTRAINT_PHASE["4. Constraint Phase:<br/>Define Validation<br/>Patterns"]

    CONSTRAINT_PHASE --> VALIDATE_PHASE["5. Validation Phase:<br/>Run Fidelity Tests"]

    VALIDATE_PHASE --> VALIDATE_RESULTS{Fidelity<br/>Score OK?}
    VALIDATE_RESULTS -->|Low Score| ITERATE["Iterate:<br/>Adjust Persona/Rules"]
    ITERATE --> DESIGN
    VALIDATE_RESULTS -->|High Score| GENERATE_PHASE

    GENERATE_PHASE["6. Generation Phase:<br/>Generate MCP Server<br/>Code"]

    GENERATE_PHASE --> DEPLOY_PHASE["7. Deployment Phase:<br/>Build & Deploy MCP<br/>Server"]

    DEPLOY_PHASE --> TEST_PHASE["8. Test Phase:<br/>Integration Tests<br/>with Claude"]

    TEST_PHASE --> TEST_RESULTS{Tests<br/>Pass?}
    TEST_RESULTS -->|Fail| DEBUG["Debug &<br/>Fix"]
    DEBUG --> TEST_PHASE
    TEST_RESULTS -->|Pass| MONITOR

    MONITOR["9. Monitor Phase:<br/>Track Usage &<br/>Performance"]
    MONITOR --> END([Production Ready])

    style DESIGN fill:#fff4e1
    style MODULE_PHASE fill:#fff4e1
    style COMPOSE_PHASE fill:#fff4e1
    style CONSTRAINT_PHASE fill:#ffe1e1
    style VALIDATE_PHASE fill:#ffc8c8
    style GENERATE_PHASE fill:#e1f0ff
    style DEPLOY_PHASE fill:#e1f0ff
    style TEST_PHASE fill:#e1f0ff
    style MONITOR fill:#c8f0c8
    style END fill:#c8f0c8
```

---

## 5. Fidelity Validation Flow

```mermaid
graph LR
    START([Validation Cycle]) --> SELECT["Select Test Case:<br/>Decision + Context"]

    SELECT --> PROMPT_BUILD["Build System<br/>Prompt<br/>(with persona definition)"]

    PROMPT_BUILD --> CALL_CLAUDE["Call Claude API<br/>with Persona +<br/>Test Input"]

    CALL_CLAUDE --> RESPONSE["Get Response<br/>from Claude"]

    RESPONSE --> PARSE["Parse & Extract<br/>Key Patterns"]

    PARSE --> CHECK_POSITIVE["Check Positive<br/>Patterns"]

    CHECK_POSITIVE --> MUST_INCLUDE["must_include<br/>patterns present?"]
    MUST_INCLUDE -->|No| FAIL1["FAIL:<br/>Missing required<br/>content"]
    MUST_INCLUDE -->|Yes| SHOULD_INCLUDE

    SHOULD_INCLUDE["should_include<br/>patterns present?"]
    SHOULD_INCLUDE -->|No| SCORE1["Score: 0.7<br/>(partial match)"]
    SHOULD_INCLUDE -->|Yes| SCORE2["Score: 0.9<br/>(good match)"]

    SCORE1 --> CHECK_NEGATIVE
    SCORE2 --> CHECK_NEGATIVE

    CHECK_NEGATIVE["Check Negative<br/>Patterns"]

    CHECK_NEGATIVE --> MUST_AVOID["must_avoid<br/>patterns present?"]
    MUST_AVOID -->|Yes| FAIL2["FAIL:<br/>Contains prohibited<br/>content"]
    MUST_AVOID -->|No| SHOULD_AVOID

    SHOULD_AVOID["should_avoid<br/>patterns present?"]
    SHOULD_AVOID -->|Yes| PENALTY["Reduce score<br/>by 0.2"]
    SHOULD_AVOID -->|No| FINAL_SCORE

    PENALTY --> FINAL_SCORE
    SCORE1 --> FINAL_SCORE
    SCORE2 --> FINAL_SCORE

    FINAL_SCORE["Calculate Final<br/>Fidelity Score"]

    FINAL_SCORE --> THRESHOLD{Score >= 0.75?}

    THRESHOLD -->|No| FAIL3["FAIL:<br/>Low Fidelity"]
    THRESHOLD -->|Yes| PASS["PASS:<br/>Fidelity Validated"]

    FAIL1 --> END([Validation Result])
    FAIL2 --> END
    FAIL3 --> END
    PASS --> END

    style SELECT fill:#fff4e1
    style PROMPT_BUILD fill:#fff4e1
    style CALL_CLAUDE fill:#e1f0ff
    style RESPONSE fill:#e1f0ff
    style PARSE fill:#fff4e1
    style CHECK_POSITIVE fill:#c8e1ff
    style MUST_INCLUDE fill:#c8e1ff
    style SHOULD_INCLUDE fill:#c8e1ff
    style SCORE1 fill:#ffe1c8
    style SCORE2 fill:#e1f5e1
    style CHECK_NEGATIVE fill:#c8e1ff
    style MUST_AVOID fill:#c8e1ff
    style SHOULD_AVOID fill:#c8e1ff
    style PENALTY fill:#ffe1c8
    style FINAL_SCORE fill:#fff4e1
    style PASS fill:#c8f0c8
    style FAIL1 fill:#ffc8c8
    style FAIL2 fill:#ffc8c8
    style FAIL3 fill:#ffc8c8
```

---

## 6. Component Interaction Diagram (C4-style)

```mermaid
graph TB
    subgraph PersonaAcademy["Persona Academy System"]
        subgraph ConfigLayer["Configuration Layer"]
            YAML_FILES["YAML Files<br/>(Persona Specs)"]
            MODULE_REGISTRY["Module Registry<br/>(Expertise Catalog)"]
            CONSTRAINT_RULES["Constraint Rules<br/>(Validation Specs)"]
        end

        subgraph CompositionEngine["Composition Engine"]
            PARSER["YAML Parser"]
            MERGER["Component Merger"]
            VALIDATOR["Constraint Validator"]
            COHERENCE_CHECK["Coherence Checker"]
        end

        subgraph AgentCore["Agent Core"]
            PERSONA["Persona Instance"]
            SYSTEM_PROMPT["System Prompt<br/>Template"]
            TOOL_DEFINITIONS["Tool Definitions"]
        end
    end

    subgraph MCPIntegration["MCP Integration"]
        MCP_SERVER["MCP Server<br/>(Python)"]
        TOOL_HANDLERS["Tool Handlers"]
        CONTEXT_MANAGER["Context Manager"]
    end

    subgraph ClaudeIntegration["Claude Integration"]
        CLAUDE["Claude API<br/>(Primary LLM)"]
        TOOL_CALLER["Tool Caller<br/>(requests tools)"]
    end

    YAML_FILES --> PARSER
    MODULE_REGISTRY --> PARSER
    CONSTRAINT_RULES --> VALIDATOR

    PARSER --> MERGER
    MERGER --> VALIDATOR
    VALIDATOR --> COHERENCE_CHECK

    COHERENCE_CHECK --> PERSONA
    PERSONA --> SYSTEM_PROMPT
    PERSONA --> TOOL_DEFINITIONS

    SYSTEM_PROMPT --> MCP_SERVER
    TOOL_DEFINITIONS --> MCP_SERVER

    MCP_SERVER --> TOOL_HANDLERS
    MCP_SERVER --> CONTEXT_MANAGER

    TOOL_HANDLERS --> CLAUDE
    CLAUDE --> TOOL_CALLER
    TOOL_CALLER --> TOOL_HANDLERS

    style YAML_FILES fill:#e1f5e1
    style MODULE_REGISTRY fill:#e1f5e1
    style CONSTRAINT_RULES fill:#e1f5e1
    style PARSER fill:#fff4e1
    style MERGER fill:#fff4e1
    style VALIDATOR fill:#ffe1e1
    style COHERENCE_CHECK fill:#ffe1c8
    style PERSONA fill:#e1f0ff
    style SYSTEM_PROMPT fill:#e1f0ff
    style TOOL_DEFINITIONS fill:#e1f0ff
    style MCP_SERVER fill:#f0e1ff
    style TOOL_HANDLERS fill:#f0e1ff
    style CONTEXT_MANAGER fill:#f0e1ff
    style CLAUDE fill:#e1f5e1
    style TOOL_CALLER fill:#e1f5e1
```

---

## 7. State Machine - Persona Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Defined: Create persona YAML

    Defined --> ModulesLoaded: Load specialist modules

    ModulesLoaded --> Composed: Merge components

    Composed --> ConstraintsApplied: Apply validation rules

    ConstraintsApplied --> SystemPromptGenerated: Generate system prompt

    SystemPromptGenerated --> ToolsCreated: Create tool definitions

    ToolsCreated --> FidelityTesting: Run validation tests

    FidelityTesting --> FidelityPass: Score >= 0.75
    FidelityTesting --> FidelityFail: Score < 0.75

    FidelityFail --> Defined: Iterate persona

    FidelityPass --> MCPServerBuilt: Build MCP server code

    MCPServerBuilt --> Deployed: Deploy to production

    Deployed --> Active: Receive tool calls

    Active --> Active: Process requests

    Active --> Monitoring: Track metrics

    Monitoring --> Active: Continue operating

    note right of Defined
        Persona YAML created
        with base properties
    end note

    note right of FidelityTesting
        Run test cases
        Check patterns
        Calculate score
    end note

    note right of Active
        Persona receives
        requests via MCP
        and executes tools
    end note
```

---

## 8. Composition Matrix - Persona Building Blocks

```mermaid
graph TB
    subgraph Input["Input Components"]
        BP["Base Persona<br/>- Identity<br/>- Core values<br/>- Decision framework"]
        SM["Specialist Modules<br/>- Domain expertise<br/>- Tool capabilities<br/>- Patterns"]
        CR["Constraint Rules<br/>- must_include<br/>- must_avoid<br/>- should_include<br/>- should_avoid"]
        MP["Metadata/Profile<br/>- Name<br/>- Version<br/>- Dependencies"]
    end

    subgraph Composition["Composition Process"]
        LOAD["Load & Parse<br/>All components"]
        MERGE["Merge Knowledge<br/>Bases"]
        RESOLVE["Resolve Conflicts<br/>& Dependencies"]
        ENHANCE["Enhance System<br/>Prompt"]
    end

    subgraph Output["Output Artifact"]
        PA["Persona Agent<br/>- System prompt<br/>- Tool handlers<br/>- Context memory<br/>- Decision logic"]
    end

    BP --> LOAD
    SM --> LOAD
    CR --> LOAD
    MP --> LOAD

    LOAD --> MERGE
    MERGE --> RESOLVE
    RESOLVE --> ENHANCE

    ENHANCE --> PA

    CR -.->|Validates| PA

    style BP fill:#e1f5e1
    style SM fill:#e1f5e1
    style CR fill:#ffe1e1
    style MP fill:#e1f5e1
    style LOAD fill:#fff4e1
    style MERGE fill:#fff4e1
    style RESOLVE fill:#fff4e1
    style ENHANCE fill:#fff4e1
    style PA fill:#e1f0ff
```

---

## Diagram Usage Guide

### Diagram 1: System Architecture
Use to explain how Persona Academy components fit together. Start here for stakeholder overview.
- Shows data flow from configuration → composition → deployment
- Color coding: Green (input), Yellow (processing), Blue (output), Purple (integration)

### Diagram 2: Composition Flow
Use to explain the step-by-step process of creating a role from scratch.
- Shows validation gates and error paths
- Warning states for suboptimal but acceptable outputs

### Diagram 3: Boardroom Orchestration
Use to illustrate multi-agent decision-making pattern.
- Sequence diagram showing parallel tool calls
- Demonstrates how Claude synthesizes multiple expert perspectives

### Diagram 4: Factory Pipeline
Use for project management and development workflow visualization.
- Shows 9 phases from design through production
- Feedback loops for iteration and refinement
- Identifies when to cycle back vs. move forward

### Diagram 5: Fidelity Validation
Use to explain the testing and validation system in detail.
- Shows decision tree for pattern matching
- Scoring thresholds and penalty system
- Clear pass/fail criteria

### Diagram 6: Component Interaction (C4)
Use for architecture deep-dive and system design reviews.
- Shows layer separation (config → composition → agent → MCP)
- Bidirectional communication with Claude

### Diagram 7: State Machine
Use to explain persona lifecycle from creation to production.
- Shows all states and transitions
- Iteration loops for failing validations

### Diagram 8: Composition Matrix
Use to explain how individual components combine into a complete persona.
- Shows input components, process steps, and output artifact
- Constraint validation as a cross-cutting concern

---

## Color Scheme Legend

| Color | Meaning |
|-------|---------|
| Green (#e1f5e1) | Input, configuration, modules |
| Yellow (#fff4e1) | Processing, composition, generation |
| Light Blue (#e1f0ff) | Core agent, execution |
| Purple (#f0e1ff) | MCP server integration |
| Light Red (#ffe1e1) | Constraints, validation rules |
| Orange (#ffe1c8) | Warnings, partial success |
| Salmon (#ffc8c8) | Errors, failures |
| Light Green (#c8f0c8) | Success, production ready |

