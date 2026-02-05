# Validation Marker Writing Guide

A guide to creating effective validation markers for persona fidelity testing.

## What Are Validation Markers?

Validation markers are patterns (regex or literal strings) that detect whether a response demonstrates persona characteristics. They enable automated testing of persona fidelity.

## Marker Categories

### must_include (Essential Patterns)

Patterns that a response **must** contain to be considered authentic. These are the core fingerprints of the persona.

**Scoring**: 60 points total, distributed by weight
**Threshold**: 80% of patterns must match for a passing score

```yaml
must_include:
  - pattern: "job[s]? to be done|jobs-to-be-done|JTBD"
    description: "Core JTBD framework reference"
    weight: 10
```

### should_include (Bonus Patterns)

Patterns that **strengthen** authenticity but aren't essential. These add depth and nuance.

**Scoring**: 30 points total, distributed by weight
**Threshold**: None (any matches are bonus)

```yaml
should_include:
  - pattern: "hiring|fire|switch"
    description: "JTBD hiring metaphor"
    weight: 5
```

### must_avoid (Antipatterns)

Patterns that **break** character if present. These are things the persona would never say.

**Scoring**: Penalty points (subtracted from score)
**Threshold**: Any match triggers penalty

```yaml
must_avoid:
  - pattern: "definitely will|guaranteed to"
    description: "Persona never claims certainty"
    weight: 15
```

## Writing Effective Patterns

### Regex Basics

Validation markers use JavaScript regex syntax:

| Pattern | Matches | Example |
|---------|---------|---------|
| `word` | Exact word | "theory" matches "theory" |
| `word\|other` | Either word | "job\|task" matches both |
| `word[s]?` | Optional s | "job[s]?" matches "job" and "jobs" |
| `word.*word` | Words with anything between | "long.*term" matches "long-term" |
| `\b` | Word boundary | `\bthe\b` matches "the" not "other" |
| `[- ]` | Hyphen or space | "long[- ]term" matches both forms |
| `(group)` | Grouping | "(dis)?advantage" matches both |

### Pattern Design Principles

#### 1. Be Flexible, Not Rigid

```yaml
# BAD: Too strict
pattern: "the theory suggests"

# GOOD: Allows natural variation
pattern: "(the )?theory (suggests|indicates|shows)"
```

#### 2. Capture Meaning, Not Exact Words

```yaml
# BAD: Exact phrase only
pattern: "jobs to be done"

# GOOD: Multiple ways to express concept
pattern: "job[s]? to be done|jobs-to-be-done|JTBD|what job"
```

#### 3. Use Word Boundaries

```yaml
# BAD: Matches inside other words
pattern: "the"  # matches "other", "theory", etc.

# GOOD: Matches word only
pattern: "\\bthe\\b"
```

#### 4. Handle Hyphenation

```yaml
# BAD: Only one form
pattern: "long-term"

# GOOD: Both forms
pattern: "long[- ]term"
```

### Examples by Concept Type

#### Framework References

```yaml
# Single framework
pattern: "disruption theory|disruptive innovation"

# Framework with variations
pattern: "(porter'?s )?five forces|5 forces|industry forces"

# Concept within framework
pattern: "margin of safety|margin-of-safety|safety margin"
```

#### Voice Characteristics

```yaml
# Questioning style
pattern: "\\?"  # Responses should contain questions

# Story-telling style
pattern: "(let me|I'll) (tell|share).*(story|example)"

# Humble language
pattern: "(might|perhaps|possibly|may) (be|have|suggest)"
```

#### Topic Coverage

```yaml
# Must discuss certain topics
pattern: "(customer|buyer|consumer|client)"

# Must show analytical depth
pattern: "(analysis|analyze|assessment|evaluate)"
```

#### Persona-Specific Phrases

```yaml
# Buffett's phrases
pattern: "circle of competence|intrinsic value|margin of safety"

# Christensen's phrases
pattern: "hire.*(product|solution)|firing.*solution"

# Drucker's phrases
pattern: "knowledge worker|effective|efficiency"
```

## Weight Guidelines

| Weight | Meaning | Use For |
|--------|---------|---------|
| 1-3 | Nice to have | Stylistic preferences |
| 4-6 | Important | Key concepts, common phrases |
| 7-8 | Very important | Core frameworks, signature phrases |
| 9-10 | Essential | Defining characteristics, severe violations |

**Note**: All weights must be between 1-10. Use the full range for must_avoid patterns too.

### Weight Examples

```yaml
must_include:
  # Essential framework reference
  - pattern: "disruption"
    weight: 10

  # Important concept
  - pattern: "incumbent"
    weight: 7

  # Helpful terminology
  - pattern: "low[- ]end|new[- ]market"
    weight: 5

should_include:
  # Adds authenticity
  - pattern: "steel mini-?mills?"
    weight: 4

  # Nice detail
  - pattern: "HBS|Harvard"
    weight: 2

must_avoid:
  # Severe violation
  - pattern: "guaranteed|certain"
    weight: 10

  # Moderate violation
  - pattern: "best practice"
    weight: 8

  # Minor violation
  - pattern: "synergy|leverage"
    weight: 5
```

## Common Patterns Library

### Academic/Research Personas

```yaml
must_include:
  - pattern: "(research|study|studies|data|evidence) (shows?|suggests?|indicates?)"
    description: "Evidence-based language"
  - pattern: "(theory|framework|model|concept)"
    description: "Theoretical framing"
  - pattern: "\\?"
    description: "Questioning approach"

must_avoid:
  - pattern: "(definitely|certainly|guaranteed)"
    description: "Overconfident claims"
```

### Business Strategy Personas

```yaml
must_include:
  - pattern: "(competitive|competition|competitor)"
    description: "Competitive focus"
  - pattern: "(strategy|strategic|positioning)"
    description: "Strategic framing"
  - pattern: "(value|advantage|differentiat)"
    description: "Value discussion"

must_avoid:
  - pattern: "(best practice|silver bullet|one size fits all)"
    description: "Generic advice"
```

### Leadership/Management Personas

```yaml
must_include:
  - pattern: "(leader|leadership|manage|management)"
    description: "Leadership focus"
  - pattern: "(people|team|organization|culture)"
    description: "Human element"
  - pattern: "(decision|priority|focus)"
    description: "Decision-making"

must_avoid:
  - pattern: "(control|command|dominate)"
    description: "Authoritarian language"
```

### Technical Personas

```yaml
must_include:
  - pattern: "(architecture|design|pattern|system)"
    description: "Technical framing"
  - pattern: "(trade[- ]off|constraint|requirement)"
    description: "Engineering thinking"

must_avoid:
  - pattern: "(magic|perfect|silver bullet)"
    description: "Oversimplification"
```

## Testing Your Markers

### 1. Positive Testing

Verify markers match good responses:

```bash
npm run cli test ./personas/my-persona
```

Check that `good_response` samples score well (>70).

### 2. Negative Testing

Verify markers reject bad responses:

- Check that `bad_response` samples score poorly (<50)
- Verify antipattern detection works

### 3. Edge Cases

Test with:
- Very short responses
- Responses on different topics
- Responses from other personas

### 4. Calibration

If scores are consistently too low or too high:

**Scores too low:**
- Patterns may be too strict
- Weights may be too high
- Missing flexible alternatives

**Scores too high:**
- Patterns may be too loose
- Weights may be too low
- Missing important markers

## Marker Quality Checklist

### must_include
- [ ] 4-6 patterns covering core concepts
- [ ] Patterns use flexible regex
- [ ] Weights reflect actual importance
- [ ] At least one pattern for primary framework
- [ ] At least one pattern for voice characteristic

### should_include
- [ ] 3-5 patterns for bonus authenticity
- [ ] Lower weights than must_include
- [ ] Includes persona-specific references
- [ ] Covers stylistic elements

### must_avoid
- [ ] 2-4 patterns for antipatterns
- [ ] High weights for severe violations
- [ ] Covers things persona would never say
- [ ] Includes common generic language to avoid

## Debugging Markers

### Pattern Not Matching

1. **Test regex**: Use online regex tester
2. **Check case**: Patterns are case-insensitive by default
3. **Check escaping**: `\b`, `\?`, `\.` need escapes
4. **Simplify**: Start simple, add complexity

### Too Many False Positives

1. **Add word boundaries**: `\b` around words
2. **Make more specific**: Add context words
3. **Lower weight**: Reduce impact

### Too Many False Negatives

1. **Add alternatives**: Use `|` for variations
2. **Allow gaps**: Use `.*` between words
3. **Reduce strictness**: Remove unnecessary words

## Advanced Patterns

### Multi-Part Requirements

```yaml
# Require both parts
must_include:
  - pattern: "job[s]? to be done"
    description: "JTBD concept"
    weight: 5
  - pattern: "(functional|emotional|social)"
    description: "Job dimensions"
    weight: 5
```

### Context-Dependent Patterns

```yaml
# Pattern that requires surrounding context
pattern: "(customer|buyer).*job[s]?"
```

### Negation in Patterns

```yaml
# Can't do true negation in regex, but can avoid
# Use must_avoid instead of trying to match "not X"
must_avoid:
  - pattern: "technical analysis"
```

## Resources

- [PERSONA_AUTHORING_GUIDE.md](./PERSONA_AUTHORING_GUIDE.md) - Complete guide
- [VOICE_DESIGN.md](./VOICE_DESIGN.md) - Voice characteristics
- [FRAMEWORK_PATTERNS.md](./FRAMEWORK_PATTERNS.md) - Framework design
- [MDN Regex Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) - JavaScript regex reference
