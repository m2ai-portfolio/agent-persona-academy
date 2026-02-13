import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveExternalFiles } from '../persona-loader.js';
import type { PersonaDefinition } from '../types.js';

function makeMinimalDefinition(overrides?: Partial<PersonaDefinition>): PersonaDefinition {
  return {
    identity: {
      name: 'Test',
      role: 'Tester',
      background: 'Background',
      era: '2020s',
      notable_works: ['Work 1'],
    },
    voice: {
      tone: ['Direct'],
      phrases: ['Test phrase'],
      style: ['Test style'],
      constraints: ['Test constraint'],
    },
    frameworks: {},
    validation: {
      must_include: [{ pattern: 'test', description: 'test marker', weight: 5 }],
    },
    ...overrides,
  } as PersonaDefinition;
}

describe('resolveExternalFiles', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'persona-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns definition unchanged when no external files exist', () => {
    const def = makeMinimalDefinition();
    const original = JSON.stringify(def);
    resolveExternalFiles(def, tempDir);
    expect(JSON.stringify(def)).toBe(original);
  });

  it('merges frameworks from frameworks/ directory', () => {
    mkdirSync(join(tempDir, 'frameworks'));
    writeFileSync(
      join(tempDir, 'frameworks', 'test_framework.yaml'),
      'description: "A test framework"\nconcepts:\n  idea:\n    definition: "An idea"'
    );

    const def = makeMinimalDefinition();
    resolveExternalFiles(def, tempDir);

    expect(def.frameworks).toBeDefined();
    expect(def.frameworks!['test_framework']).toBeDefined();
    expect(def.frameworks!['test_framework'].description).toBe('A test framework');
  });

  it('external frameworks override inline for matching keys', () => {
    mkdirSync(join(tempDir, 'frameworks'));
    writeFileSync(
      join(tempDir, 'frameworks', 'existing.yaml'),
      'description: "External version"\nconcepts:\n  c:\n    definition: "def"'
    );

    const def = makeMinimalDefinition({
      frameworks: {
        existing: {
          description: 'Inline version',
          concepts: { c: { definition: 'old' } },
        },
      },
    });

    resolveExternalFiles(def, tempDir);
    expect(def.frameworks!['existing'].description).toBe('External version');
  });

  it('merges case studies from case-studies/ directory', () => {
    mkdirSync(join(tempDir, 'case-studies'));
    writeFileSync(
      join(tempDir, 'case-studies', 'example_case.yaml'),
      'pattern: "Test pattern"\nstory: "Test story"\nsignals:\n  - "signal"\nlessons:\n  - "lesson"'
    );

    const def = makeMinimalDefinition();
    resolveExternalFiles(def, tempDir);

    expect(def.case_studies).toBeDefined();
    expect(def.case_studies!['example_case']).toBeDefined();
    expect(def.case_studies!['example_case'].pattern).toBe('Test pattern');
  });

  it('merges style references from references/ directory', () => {
    mkdirSync(join(tempDir, 'references'));
    writeFileSync(
      join(tempDir, 'references', 'stripe_dashboard.yaml'),
      'description: "Stripe dashboard reference"\ndesign_principles:\n  - "Progressive disclosure"'
    );

    const def = makeMinimalDefinition();
    resolveExternalFiles(def, tempDir);

    expect(def.style_references).toBeDefined();
    expect(def.style_references!['stripe_dashboard']).toBeDefined();
    expect(def.style_references!['stripe_dashboard'].description).toBe(
      'Stripe dashboard reference'
    );
  });

  it('merges samples.yaml into sample_responses', () => {
    writeFileSync(
      join(tempDir, 'samples.yaml'),
      'greeting:\n  prompt: "Say hi"\n  good_response: "Hello!"\n  bad_response: "..."\n  explanation: "Friendly"'
    );

    const def = makeMinimalDefinition();
    resolveExternalFiles(def, tempDir);

    expect(def.sample_responses).toBeDefined();
    expect(def.sample_responses!['greeting']).toBeDefined();
    expect(def.sample_responses!['greeting'].prompt).toBe('Say hi');
  });

  it('merges validation.yaml into validation', () => {
    writeFileSync(
      join(tempDir, 'validation.yaml'),
      'should_include:\n  - pattern: "extra"\n    description: "Extra marker"\n    weight: 3'
    );

    const def = makeMinimalDefinition();
    resolveExternalFiles(def, tempDir);

    expect(def.validation.should_include).toBeDefined();
    expect(def.validation.should_include!.length).toBe(1);
    expect(def.validation.should_include![0].pattern).toBe('extra');
  });

  it('handles mixed inline and external content', () => {
    mkdirSync(join(tempDir, 'frameworks'));
    writeFileSync(
      join(tempDir, 'frameworks', 'external_fw.yaml'),
      'description: "External"\nconcepts:\n  c:\n    definition: "def"'
    );
    writeFileSync(
      join(tempDir, 'samples.yaml'),
      'test_sample:\n  prompt: "Q"\n  good_response: "A"\n  bad_response: "B"\n  explanation: "E"'
    );

    const def = makeMinimalDefinition({
      frameworks: {
        inline_fw: {
          description: 'Inline',
          concepts: { c: { definition: 'def' } },
        },
      },
    });

    resolveExternalFiles(def, tempDir);

    expect(Object.keys(def.frameworks!)).toContain('inline_fw');
    expect(Object.keys(def.frameworks!)).toContain('external_fw');
    expect(def.sample_responses).toBeDefined();
    expect(def.sample_responses!['test_sample']).toBeDefined();
  });

  it('handles empty external directories without crashing', () => {
    mkdirSync(join(tempDir, 'frameworks'));
    mkdirSync(join(tempDir, 'case-studies'));
    mkdirSync(join(tempDir, 'references'));

    const def = makeMinimalDefinition();
    const original = JSON.stringify(def);
    resolveExternalFiles(def, tempDir);
    expect(JSON.stringify(def)).toBe(original);
  });

  it('ignores non-yaml files in external directories', () => {
    mkdirSync(join(tempDir, 'frameworks'));
    writeFileSync(join(tempDir, 'frameworks', 'README.md'), '# Not a framework');
    writeFileSync(join(tempDir, 'frameworks', '.DS_Store'), '');
    writeFileSync(
      join(tempDir, 'frameworks', 'real.yaml'),
      'description: "Real"\nconcepts:\n  c:\n    definition: "def"'
    );

    const def = makeMinimalDefinition();
    resolveExternalFiles(def, tempDir);

    expect(Object.keys(def.frameworks!)).toEqual(['real']);
  });

  it('throws on invalid YAML in external file', () => {
    mkdirSync(join(tempDir, 'frameworks'));
    writeFileSync(
      join(tempDir, 'frameworks', 'broken.yaml'),
      'description: [\n  this is not valid yaml: {{{'
    );

    const def = makeMinimalDefinition();
    expect(() => resolveExternalFiles(def, tempDir)).toThrow();
  });
});
