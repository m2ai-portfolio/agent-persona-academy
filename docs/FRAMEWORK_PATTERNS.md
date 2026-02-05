# Framework Implementation Patterns

A guide to designing effective mental model frameworks for personas.

## Why Frameworks Matter

Frameworks transform personas from "voice actors" into "thinking partners." They provide:

- **Structured analysis**: Systematic approaches to problems
- **Transferable insights**: Patterns that apply across situations
- **Authentic expertise**: The actual intellectual contribution of the persona

Without frameworks, a persona can only mimic how someone talks. With frameworks, it can demonstrate how they think.

## Framework Anatomy

Every framework should have these components:

```yaml
frameworks:
  framework_name:
    description: "What this framework is and why it matters"

    concepts:
      concept_name:
        definition: "Clear explanation"
        examples: ["Concrete illustrations"]
        insight: "Key non-obvious truth"
        subconcepts: {} # Optional nested concepts

    questions: ["Diagnostic questions for application"]
    when_to_use: "Signals that this framework applies"
    common_mistakes: ["Pitfalls to avoid"]
```

## Pattern 1: The Analytical Matrix

Use when the persona thinks in terms of 2x2 grids or multi-dimensional classification.

### Example: Porter's Generic Strategies

```yaml
frameworks:
  generic_strategies:
    description: |
      Three fundamental approaches to competitive advantage: cost leadership,
      differentiation, or focus. Companies must choose—being "stuck in the
      middle" leads to below-average performance.

    concepts:
      cost_leadership:
        definition: "Competing by having the lowest costs in the industry"
        examples:
          - "Walmart's supply chain efficiency"
          - "Southwest Airlines' no-frills model"
          - "Amazon's scale economics"
        insight: "Requires relentless efficiency, not just low prices"
        subconcepts:
          economies_of_scale: "Cost advantages from volume"
          experience_curve: "Cost reduction through learning"

      differentiation:
        definition: "Competing through unique value that justifies premium prices"
        examples:
          - "Apple's design and ecosystem"
          - "BMW's driving experience"
          - "Starbucks' third place concept"
        insight: "Must create value buyers will pay for, not just be different"

      focus:
        definition: "Targeting a narrow market segment with tailored strategy"
        examples:
          - "Ferrari in luxury sports cars"
          - "Enterprise Rent-A-Car in replacement rentals"
        insight: "Depth in narrow segment beats breadth across many"

      stuck_in_middle:
        definition: "Failing to achieve any strategic position"
        examples:
          - "Department stores competing with both discounters and boutiques"
        insight: "The most dangerous competitive position"

    questions:
      - "What is your basis for competitive advantage—cost or differentiation?"
      - "Are you targeting a broad market or focused segment?"
      - "Can you be #1 or #2 in your chosen strategy?"
      - "Are you trying to be everything to everyone?"

    when_to_use: "When a company needs to define or clarify its competitive strategy"

    common_mistakes:
      - "Assuming differentiation means higher costs"
      - "Pursuing both cost leadership and differentiation simultaneously"
      - "Focus strategy becoming too narrow to sustain"
```

### When to Use This Pattern

- Persona categorizes things into types
- Analysis involves trade-offs between dimensions
- Strategic choices are mutually exclusive

## Pattern 2: The Process Framework

Use when the persona thinks in terms of sequential steps or stages.

### Example: Christensen's Jobs-to-be-Done

```yaml
frameworks:
  jobs_to_be_done:
    description: |
      Customers don't buy products—they hire them to get jobs done. Understanding
      the job (functional, emotional, social) reveals what customers truly need.

    concepts:
      job_definition:
        definition: "The progress a customer seeks in a specific circumstance"
        examples:
          - "I need to feel productive during my commute"
          - "I want to feel confident at an important meeting"
        insight: "Jobs are stable over time even as solutions change"

      job_dimensions:
        definition: "Jobs have functional, emotional, and social components"
        subconcepts:
          functional: "The practical task to accomplish"
          emotional: "How the customer wants to feel"
          social: "How others perceive the customer"
        examples:
          - "Hiring a suit: functional (look professional), emotional (feel confident), social (signal success)"

      circumstance:
        definition: "The specific situation that triggers the job"
        examples:
          - "Morning commute when I'm tired but have 30 minutes"
          - "Before an important presentation"
        insight: "Same person, different circumstance = different job"

      competing_solutions:
        definition: "All the ways a customer might address the job"
        examples:
          - "For 'kill time on commute': podcasts, audiobooks, social media, sleep"
        insight: "True competitors are often from different categories"

    questions:
      - "What job is the customer trying to get done?"
      - "What's the circumstance that triggers this job?"
      - "What functional, emotional, and social dimensions exist?"
      - "What are they currently 'hiring' to do this job?"
      - "What would cause them to 'fire' the current solution?"

    when_to_use: "When trying to understand customer motivation or design new products"

    common_mistakes:
      - "Defining jobs too narrowly (product-centric)"
      - "Ignoring emotional and social dimensions"
      - "Forgetting the circumstance"
```

### When to Use This Pattern

- Persona thinks about causation and sequences
- Understanding requires unpacking a process
- Application involves following steps

## Pattern 3: The Diagnostic Framework

Use when the persona evaluates situations against criteria.

### Example: Buffett's Investment Criteria

```yaml
frameworks:
  investment_criteria:
    description: |
      Four criteria for investment-worthy businesses: understandable,
      favorable long-term economics, able and honest management,
      and available at a sensible price.

    concepts:
      understandability:
        definition: "The business must be within your circle of competence"
        examples:
          - "Buffett understands insurance, candy, and newspapers"
          - "He avoided tech stocks for decades"
        insight: "If you can't understand it in 10 minutes, move on"
        subconcepts:
          circle_of_competence: "Areas of genuine expertise"
          edge_awareness: "Knowing what you don't know"

      long_term_economics:
        definition: "Durable competitive advantage with growing value"
        examples:
          - "Coca-Cola's brand and distribution"
          - "See's Candies' pricing power"
        insight: "The moat must widen over time, not erode"
        subconcepts:
          economic_moat: "Sustainable competitive barrier"
          return_on_capital: "Efficient use of invested capital"

      quality_management:
        definition: "Honest, capable managers who think like owners"
        examples:
          - "Managers who report bad news promptly"
          - "Capital allocators who return excess cash"
        insight: "Great business + poor management = poor investment"

      sensible_price:
        definition: "Price provides margin of safety relative to value"
        examples:
          - "Paying 70 cents for a dollar of value"
        insight: "Price is what you pay, value is what you get"

    questions:
      - "Can I explain how this business makes money?"
      - "Will this competitive advantage exist in 10 years?"
      - "Do I trust management to allocate capital wisely?"
      - "Am I paying a fair price for this business?"
      - "What's my margin of safety if I'm wrong?"

    when_to_use: "When evaluating any potential investment"

    common_mistakes:
      - "Skipping the understanding step for 'hot' opportunities"
      - "Confusing competitive advantages with competitive activity"
      - "Trusting management without verification"
      - "Letting a great business justify any price"
```

### When to Use This Pattern

- Persona evaluates quality or fit
- Analysis involves scoring against criteria
- Decisions require meeting thresholds

## Pattern 4: The Tension Framework

Use when the persona thinks about trade-offs and balancing competing forces.

### Example: Drucker's Effectiveness vs Efficiency

```yaml
frameworks:
  effectiveness_efficiency:
    description: |
      Effectiveness is doing the right things; efficiency is doing things right.
      Many managers focus on efficiency while neglecting effectiveness—
      optimizing activities that shouldn't be done at all.

    concepts:
      effectiveness:
        definition: "Selecting the right goals and priorities"
        examples:
          - "Deciding which products to develop"
          - "Choosing which customers to serve"
        insight: "There is nothing so useless as doing efficiently what should not be done at all"

      efficiency:
        definition: "Minimizing resources required to achieve goals"
        examples:
          - "Reducing manufacturing costs"
          - "Streamlining processes"
        insight: "Efficiency matters only after effectiveness is established"

      the_tension:
        definition: "Optimizing for one can undermine the other"
        examples:
          - "Efficient cost-cutting that eliminates innovation capacity"
          - "Effective vision without efficient execution"
        insight: "Sequence matters: effectiveness first, then efficiency"

    questions:
      - "Are we doing the right things, or just doing things right?"
      - "What activities should we stop doing entirely?"
      - "Are we optimizing the wrong things?"
      - "What would happen if we focused only on effectiveness?"

    when_to_use: "When organizations are busy but not productive"

    common_mistakes:
      - "Measuring efficiency without questioning effectiveness"
      - "Cutting costs that enable future growth"
      - "Confusing busyness with productivity"
```

### When to Use This Pattern

- Persona sees tension between opposing forces
- Good decisions require balance
- Extremes in either direction fail

## Pattern 5: The Lifecycle Framework

Use when the persona thinks about evolution through stages.

### Example: Christensen's Disruption Trajectory

```yaml
frameworks:
  disruption_trajectory:
    description: |
      Disruptive innovations start with inferior products in overlooked
      markets, then improve until they capture mainstream customers.
      Incumbents fail not from ignorance but from rational resource allocation.

    concepts:
      early_stage:
        definition: "Disruptor offers inferior product to non-consumers"
        examples:
          - "Early personal computers vs. mainframes"
          - "Mobile phones vs. landlines"
        insight: "Mainstream customers correctly reject early disruptors"

      improvement_trajectory:
        definition: "Disruptor's improvement rate exceeds customer needs growth"
        examples:
          - "Disk drive capacity doubling yearly"
          - "Digital camera resolution improvements"
        insight: "The race is between improvement and requirements"

      market_capture:
        definition: "Disruptor becomes 'good enough' for mainstream"
        examples:
          - "PCs reaching business capability"
          - "Streaming video matching DVD quality"
        insight: "The switch happens suddenly once threshold is crossed"

      incumbent_retreat:
        definition: "Incumbent moves upmarket, ceding low end"
        examples:
          - "Integrated steel mills abandoning rebar to mini-mills"
        insight: "Retreat feels rational at each step but is fatal cumulatively"

    questions:
      - "Where is this innovation on its trajectory?"
      - "What's the rate of improvement vs. customer requirements?"
      - "Are incumbents rationally retreating upmarket?"
      - "When will 'good enough' be reached?"

    when_to_use: "When analyzing competitive threats or innovation opportunities"

    common_mistakes:
      - "Assuming disruption happens overnight"
      - "Confusing any innovation with disruption"
      - "Underestimating how long the process takes"
```

### When to Use This Pattern

- Persona sees things evolving through phases
- Timing and sequence matter
- Position in lifecycle determines strategy

## Framework Quality Checklist

Before finalizing a framework, verify:

- [ ] **Description** clearly explains what and why
- [ ] **Concepts** have definitions, examples, and insights
- [ ] **Questions** are diagnostic and actionable
- [ ] **When to use** helps Claude select the right framework
- [ ] **Common mistakes** shows nuanced understanding
- [ ] **Examples** are concrete and memorable

## Framework Coverage Guidelines

| Persona Type | Minimum Frameworks | Typical Count |
|-------------|-------------------|---------------|
| Business strategist | 3-4 | 4-6 |
| Technical architect | 2-3 | 3-5 |
| Domain expert | 2-3 | 3-4 |
| Creative/author | 1-2 | 2-3 |

## Advanced: Framework Interaction

Great personas show how frameworks connect:

```yaml
analysis_patterns:
  synthesis_guidance: |
    When analyzing a business:
    1. Start with Jobs-to-be-Done to understand customer motivation
    2. Apply Disruption Theory to assess competitive threats
    3. Use CPP Framework to evaluate organizational capability
    4. Consider Resource Dependence for implementation barriers

    These frameworks are complementary, not competing. Jobs-to-be-Done
    explains WHY customers switch; Disruption Theory explains WHEN
    they'll be ready to switch.
```

## Resources

- [PERSONA_AUTHORING_GUIDE.md](./PERSONA_AUTHORING_GUIDE.md) - Complete authoring guide
- [VOICE_DESIGN.md](./VOICE_DESIGN.md) - Voice characteristics
- [VALIDATION_MARKERS.md](./VALIDATION_MARKERS.md) - Testing framework usage
