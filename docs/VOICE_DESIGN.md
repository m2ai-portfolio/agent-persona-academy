# Voice Design Principles

A guide to crafting authentic, distinctive voices for personas.

## What is Voice?

Voice is the consistent pattern of expression that makes a persona recognizable. It encompasses:

- **Tone**: The emotional quality and attitude
- **Phrases**: Distinctive expressions and verbal fingerprints
- **Style**: Structural patterns in communication
- **Constraints**: Boundaries that maintain authenticity

Good voice design makes a response immediately identifiable even without context.

## The Four Voice Components

### 1. Tone

Tone describes the emotional texture of communication. It's how something feels, not what is said.

**Effective Tone Descriptors:**

```yaml
# GOOD: Specific and distinctive
tone:
  - "Warm and professorial"
  - "Self-deprecating humor about past mistakes"
  - "Genuinely curious about your specific situation"
  - "Patient, never dismissive"
  - "Optimistic about human potential"

# BAD: Generic and forgettable
tone:
  - "Professional"
  - "Helpful"
  - "Knowledgeable"
  - "Friendly"
```

**Tone Categories:**

| Category | Descriptors |
|----------|-------------|
| **Authority** | Professorial, scholarly, authoritative, expert, humble |
| **Warmth** | Warm, empathetic, encouraging, patient, approachable |
| **Energy** | Enthusiastic, measured, calm, urgent, contemplative |
| **Formality** | Casual, folksy, formal, academic, conversational |
| **Attitude** | Curious, skeptical, optimistic, pragmatic, idealistic |

**Combining Tones:**

Great voices blend seemingly contradictory tones:
- "Authoritative yet humble"
- "Scholarly but approachable"
- "Direct but empathetic"
- "Confident yet self-deprecating"

### 2. Phrases

Phrases are verbal fingerprints—expressions that uniquely identify the persona.

**Types of Phrases:**

**Signature Expressions:**
```yaml
phrases:
  # Openings
  - "Let me tell you a story..."
  - "The theory suggests..."
  - "In my experience..."

  # Transitions
  - "What's interesting here is..."
  - "The real question is..."
  - "Here's where it gets fascinating..."

  # Conclusions
  - "The takeaway is..."
  - "What this means for you..."
  - "The practical implication..."
```

**Metaphors and Analogies:**
```yaml
phrases:
  # Buffett's metaphors
  - "In the short run, the market is a voting machine; in the long run, it's a weighing machine"
  - "It's like a farmer checking crop prices hourly instead of tending the field"

  # Christensen's metaphors
  - "Disruption isn't a single event; it's a process like erosion"
  - "The milkshake is hired to do a job"
```

**Recurring References:**
```yaml
phrases:
  # Geographic/personal
  - "Here in Omaha..."
  - "My partner Charlie says..."
  - "At Harvard Business School, we found..."

  # Historical
  - "Back in 1988..."
  - "When I was at McKinsey..."
```

**Collecting Authentic Phrases:**

1. Read original works (books, letters, interviews)
2. Watch video interviews for speech patterns
3. Note recurring expressions
4. Identify unique metaphors
5. Capture memorable quotes

### 3. Style

Style describes structural patterns in how the persona communicates.

**Communication Patterns:**

```yaml
style:
  # Structure patterns
  - "Asks questions before giving answers"
  - "Builds arguments through stories"
  - "Uses numbered lists for clarity"
  - "Always acknowledges complexity first"

  # Evidence patterns
  - "Cites specific examples from experience"
  - "References research and data"
  - "Uses case studies extensively"
  - "Quotes respected authorities"

  # Reasoning patterns
  - "Works from first principles"
  - "Uses analogies to explain concepts"
  - "Acknowledges counterarguments"
  - "Distinguishes between certain and uncertain"
```

**Style Examples by Persona Type:**

**Academic/Researcher:**
```yaml
style:
  - "Cites evidence and studies"
  - "Acknowledges limitations of claims"
  - "Uses precise technical language"
  - "Builds arguments systematically"
  - "References prior work and scholars"
```

**Practitioner/Executive:**
```yaml
style:
  - "Leads with actionable insights"
  - "Uses real-world examples"
  - "Focuses on practical application"
  - "Direct and time-conscious"
  - "Quantifies when possible"
```

**Mentor/Teacher:**
```yaml
style:
  - "Asks diagnostic questions first"
  - "Builds understanding progressively"
  - "Uses analogies and metaphors"
  - "Checks for understanding"
  - "Encourages independent thinking"
```

### 4. Constraints

Constraints define what the persona would never do or say.

**Types of Constraints:**

**Topic Constraints:**
```yaml
constraints:
  - "Never recommends specific stocks to buy"
  - "Doesn't discuss partisan politics"
  - "Won't claim expertise outside their domain"
```

**Language Constraints:**
```yaml
constraints:
  - "Avoids jargon without explanation"
  - "Never uses profanity"
  - "Doesn't use technical acronyms casually"
```

**Attitude Constraints:**
```yaml
constraints:
  - "Never dismissive or condescending"
  - "Doesn't claim certainty about predictions"
  - "Won't oversimplify complex issues"
```

**Character Constraints:**
```yaml
constraints:
  - "Never pretends to have met people they haven't"
  - "Doesn't claim experiences beyond their lifetime"
  - "Won't contradict well-documented positions"
```

## Voice Design Process

### Step 1: Research

1. **Primary sources**: Books, articles, letters written by the persona
2. **Interviews**: Video/audio to capture natural speech
3. **Secondary sources**: Biographies, profiles, analyses
4. **Quotation databases**: Verified quotes and expressions

### Step 2: Extract Patterns

Document what you observe:

| Observation | Category | Example |
|-------------|----------|---------|
| Uses "we" not "I" | Tone | "We've found that..." |
| Sports metaphors | Phrases | "Hit a home run" |
| Question-first | Style | "What's the job to be done?" |
| Never predicts | Constraint | Avoids "will definitely" |

### Step 3: Synthesize

Combine observations into cohesive voice definition:

```yaml
voice:
  tone:
    - [3-5 specific, distinctive descriptors]

  phrases:
    - [8-12 authentic, characteristic expressions]

  style:
    - [5-7 structural patterns]

  constraints:
    - [3-5 clear boundaries]
```

### Step 4: Test

Write sample responses and verify:

1. **Recognition test**: Would someone familiar recognize this voice?
2. **Consistency test**: Do multiple responses feel like the same person?
3. **Authenticity test**: Could you cite sources for these patterns?
4. **Distinction test**: Is this clearly different from other personas?

## Voice Quality Checklist

### Tone Checklist
- [ ] At least 3 specific tone descriptors
- [ ] Descriptors are distinctive, not generic
- [ ] Combination creates unique emotional texture
- [ ] Tone is consistent across situations

### Phrases Checklist
- [ ] At least 8 characteristic phrases
- [ ] Mix of openings, transitions, and conclusions
- [ ] Includes distinctive metaphors or analogies
- [ ] Phrases are verified from sources
- [ ] Would be recognized by fans of the persona

### Style Checklist
- [ ] At least 5 structural patterns
- [ ] Includes reasoning approach
- [ ] Specifies evidence/example usage
- [ ] Notes interaction patterns

### Constraints Checklist
- [ ] At least 3 clear boundaries
- [ ] Constraints are verifiable (would they actually avoid this?)
- [ ] Mix of topic, language, and attitude constraints
- [ ] Constraints protect authenticity

## Common Voice Mistakes

### 1. Too Generic

```yaml
# BAD
voice:
  tone:
    - "Professional and helpful"
  phrases:
    - "I think..."
    - "In my opinion..."
```

**Fix**: Research actual speech patterns; use specific, distinctive descriptors.

### 2. Invented Phrases

```yaml
# BAD - Made up phrases
phrases:
  - "As I always say to my followers..."
```

**Fix**: Only use verified expressions from actual sources.

### 3. Contradictory Elements

```yaml
# BAD - Incompatible
tone:
  - "Highly formal and academic"
  - "Uses slang and casual language"
```

**Fix**: Ensure all elements work together coherently.

### 4. Missing Constraints

```yaml
# BAD - No boundaries
constraints: []
```

**Fix**: Every persona has things they wouldn't say or do.

### 5. Too Many Phrases

```yaml
# BAD - Overwhelming
phrases:
  - # 30+ phrases that can't all be used
```

**Fix**: Curate to 8-12 most distinctive phrases.

## Voice Examples

### Business Strategist (Porter)

```yaml
voice:
  tone:
    - "Rigorous and analytical"
    - "Direct and assertive"
    - "Academic but applied"
    - "Impatient with fuzzy thinking"

  phrases:
    - "The essence of strategy is choosing what NOT to do"
    - "Competitive advantage grows out of the entire system of activities"
    - "There is no best strategy—only strategies that fit"
    - "Strategy requires making trade-offs in competing"
    - "Operational effectiveness is not strategy"

  style:
    - "Uses frameworks and matrices to structure thinking"
    - "Demands precise definitions"
    - "Builds arguments from industry analysis"
    - "Uses specific company examples"
    - "Distinguishes strategy from operations"

  constraints:
    - "Never suggests all strategies are equally valid"
    - "Won't endorse 'best of both worlds' approaches"
    - "Doesn't accept 'it depends' without analysis"
```

### Management Philosopher (Drucker)

```yaml
voice:
  tone:
    - "Wise and authoritative"
    - "Observational and curious"
    - "Practical despite philosophical depth"
    - "Provocative in gentle ways"

  phrases:
    - "The best way to predict the future is to create it"
    - "What gets measured gets managed"
    - "Management is doing things right; leadership is doing the right things"
    - "There is nothing so useless as doing efficiently what should not be done"
    - "The purpose of business is to create and keep a customer"

  style:
    - "Makes bold, quotable statements"
    - "Challenges conventional wisdom"
    - "Draws from history and sociology"
    - "Focuses on the knowledge worker"
    - "Asks questions that reframe problems"

  constraints:
    - "Never purely theoretical—always practical implications"
    - "Doesn't accept status quo as inevitable"
    - "Won't reduce management to technique"
```

## Advanced: Voice Consistency

### Across Topics

The same persona should sound consistent whether discussing:
- Technical details
- Personal stories
- Abstract concepts
- Practical advice

### Across Formats

Voice should persist in:
- Long-form analysis
- Quick answers
- Lists and frameworks
- Stories and examples

### Under Pressure

Voice should hold when:
- Asked difficult questions
- Challenged on positions
- Given incomplete information
- Addressing sensitive topics

## Resources

- [PERSONA_AUTHORING_GUIDE.md](./PERSONA_AUTHORING_GUIDE.md) - Complete guide
- [FRAMEWORK_PATTERNS.md](./FRAMEWORK_PATTERNS.md) - Framework design
- [VALIDATION_MARKERS.md](./VALIDATION_MARKERS.md) - Testing voice fidelity
