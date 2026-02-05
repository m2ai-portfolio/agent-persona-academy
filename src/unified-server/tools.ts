/**
 * MCP Tools for Unified Persona Server
 *
 * Defines the tools exposed by the multi-persona MCP server.
 */

import { z } from 'zod';
import {
  listPersonas,
  switchPersona,
  getActivePersona,
  getActivePersonaId,
  getPersona,
  getActiveFrameworks,
  getFrameworkQuestions,
  getActiveCaseStudies,
  getRandomPhrase,
} from './persona-manager.js';

/**
 * Tool definitions for MCP
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * List Personas Tool
 */
export const listPersonasTool: ToolDefinition = {
  name: 'list_personas',
  description:
    'List all available personas that can be activated. Shows name, role, frameworks, and case studies for each persona.',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter by category (business-strategist, technical-architect, domain-expert, creative, custom)',
        enum: ['business-strategist', 'technical-architect', 'domain-expert', 'creative', 'custom'],
      },
    },
  },
};

/**
 * Handle list_personas tool call
 */
export function handleListPersonas(args: { category?: string }): string {
  const personas = listPersonas();
  const activeId = getActivePersonaId();

  let filtered = personas;
  if (args.category) {
    filtered = personas.filter((p) => p.category === args.category);
  }

  if (filtered.length === 0) {
    return args.category
      ? `No personas found in category "${args.category}".`
      : 'No personas available.';
  }

  const lines = ['# Available Personas\n'];

  for (const persona of filtered) {
    const activeMarker = persona.id === activeId ? ' ← ACTIVE' : '';
    lines.push(`## ${persona.name}${activeMarker}`);
    lines.push(`- **ID**: ${persona.id}`);
    lines.push(`- **Role**: ${persona.role}`);
    lines.push(`- **Category**: ${persona.category}`);
    lines.push(`- **Frameworks**: ${persona.frameworkCount}`);
    lines.push(`- **Case Studies**: ${persona.caseStudyCount}`);
    lines.push(`- **Source**: ${persona.source}`);
    lines.push('');
  }

  lines.push(`\nUse \`switch_persona\` with the persona ID to activate a different persona.`);

  return lines.join('\n');
}

/**
 * Switch Persona Tool
 */
export const switchPersonaTool: ToolDefinition = {
  name: 'switch_persona',
  description:
    'Switch to a different persona. The new persona will be used for all subsequent analysis and advice. Use list_personas to see available options.',
  inputSchema: {
    type: 'object',
    properties: {
      persona_id: {
        type: 'string',
        description: 'The ID of the persona to switch to (e.g., "christensen", "porter")',
      },
    },
    required: ['persona_id'],
  },
};

/**
 * Handle switch_persona tool call
 */
export function handleSwitchPersona(args: { persona_id: string }): string {
  const result = switchPersona(args.persona_id);

  if (!result.success) {
    return `Failed to switch persona: ${result.message}`;
  }

  const persona = result.persona!;
  const def = persona.definition;

  const lines = [
    `# Switched to ${def.identity.name}\n`,
    `**Role**: ${def.identity.role}\n`,
    `**Background**: ${def.identity.background.trim()}\n`,
    `## Frameworks Available`,
  ];

  for (const [name, fw] of Object.entries(def.frameworks)) {
    lines.push(`- **${formatName(name)}**: ${fw.description.split('\n')[0].trim()}`);
  }

  if (def.case_studies && Object.keys(def.case_studies).length > 0) {
    lines.push('\n## Case Studies');
    for (const [name, cs] of Object.entries(def.case_studies)) {
      lines.push(`- **${formatName(name)}**: ${cs.pattern}`);
    }
  }

  lines.push(`\n## Voice`);
  lines.push(`**Tone**: ${def.voice.tone.join(', ')}`);
  lines.push(`\n**Characteristic phrases**:`);
  for (const phrase of def.voice.phrases.slice(0, 3)) {
    lines.push(`- "${phrase}"`);
  }

  lines.push(`\n---\nI am now ${def.identity.name}. How can I help you?`);

  return lines.join('\n');
}

/**
 * Persona Analyze Tool
 */
export const personaAnalyzeTool: ToolDefinition = {
  name: 'persona_analyze',
  description:
    'Get strategic analysis from the currently active persona. The persona will apply their frameworks and thinking patterns to your situation.',
  inputSchema: {
    type: 'object',
    properties: {
      situation: {
        type: 'string',
        description: 'Describe the situation, decision, or question you want analyzed',
      },
      context: {
        type: 'string',
        description: 'Additional context about your organization, market, or constraints',
      },
      focus_frameworks: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific frameworks to focus on (optional, uses all if not specified)',
      },
    },
    required: ['situation'],
  },
};

/**
 * Handle persona_analyze tool call
 */
export function handlePersonaAnalyze(args: {
  situation: string;
  context?: string;
  focus_frameworks?: string[];
}): string {
  const persona = getActivePersona();

  if (!persona) {
    return 'No persona is currently active. Use `switch_persona` to activate one first.';
  }

  const def = persona.definition;
  const frameworks = def.frameworks;
  const caseStudies = def.case_studies ?? {};

  // Build analysis prompt
  const lines = [
    `# Analysis by ${def.identity.name}\n`,
    `*${def.identity.role}*\n`,
  ];

  // Add characteristic opening
  const phrase = getRandomPhrase();
  if (phrase) {
    lines.push(`> ${phrase}\n`);
  }

  // Situation summary
  lines.push(`## Your Situation\n`);
  lines.push(args.situation);
  if (args.context) {
    lines.push(`\n**Additional Context**: ${args.context}`);
  }
  lines.push('');

  // Framework analysis sections
  const targetFrameworks = args.focus_frameworks?.length
    ? args.focus_frameworks.filter((f) => frameworks[f])
    : Object.keys(frameworks);

  lines.push(`## Framework Analysis\n`);

  for (const fwName of targetFrameworks) {
    const fw = frameworks[fwName];
    if (!fw) continue;

    lines.push(`### ${formatName(fwName)}\n`);
    lines.push(`${fw.description.trim()}\n`);

    // Key concepts
    lines.push(`**Key Concepts to Consider**:`);
    for (const [cName, concept] of Object.entries(fw.concepts)) {
      lines.push(`- **${formatName(cName)}**: ${concept.definition}`);
    }

    // Diagnostic questions
    if (fw.questions?.length) {
      lines.push(`\n**Diagnostic Questions**:`);
      for (const q of fw.questions.slice(0, 4)) {
        lines.push(`- ${q}`);
      }
    }

    lines.push('');
  }

  // Relevant case studies
  if (Object.keys(caseStudies).length > 0) {
    lines.push(`## Potentially Relevant Case Studies\n`);
    for (const [csName, cs] of Object.entries(caseStudies).slice(0, 3)) {
      lines.push(`### ${formatName(csName)}`);
      lines.push(`**Pattern**: ${cs.pattern}`);
      lines.push(`${cs.story.trim().split('\n')[0]}...`);
      if (cs.signals?.length) {
        lines.push(`\n**Watch for these signals**: ${cs.signals.slice(0, 3).join(', ')}`);
      }
      lines.push('');
    }
  }

  // Analysis approach
  if (def.analysis_patterns?.approach) {
    lines.push(`## My Analysis Approach\n`);
    for (const step of def.analysis_patterns.approach) {
      lines.push(`1. ${step}`);
    }
    lines.push('');
  }

  // Voice guidance
  lines.push(`---\n`);
  lines.push(`*Remember: ${def.voice.tone.slice(0, 2).join(', ')}*`);
  if (def.voice.constraints?.length) {
    lines.push(`\n*I will: ${def.voice.constraints[0]}*`);
  }

  return lines.join('\n');
}

/**
 * Get Framework Tool
 */
export const getFrameworkTool: ToolDefinition = {
  name: 'get_framework',
  description:
    'Get detailed information about a specific framework from the active persona, including concepts, questions, and usage guidance.',
  inputSchema: {
    type: 'object',
    properties: {
      framework_name: {
        type: 'string',
        description: 'Name of the framework (e.g., "disruption_theory", "jobs_to_be_done")',
      },
    },
    required: ['framework_name'],
  },
};

/**
 * Handle get_framework tool call
 */
export function handleGetFramework(args: { framework_name: string }): string {
  const persona = getActivePersona();

  if (!persona) {
    return 'No persona is currently active. Use `switch_persona` to activate one first.';
  }

  const def = persona.definition;
  const framework = def.frameworks[args.framework_name];

  if (!framework) {
    const available = Object.keys(def.frameworks).join(', ');
    return `Framework "${args.framework_name}" not found. Available frameworks: ${available}`;
  }

  const lines = [
    `# ${formatName(args.framework_name)}\n`,
    `*From ${def.identity.name}'s toolkit*\n`,
    `## Description\n`,
    framework.description.trim(),
    '',
    `## Key Concepts\n`,
  ];

  for (const [cName, concept] of Object.entries(framework.concepts)) {
    lines.push(`### ${formatName(cName)}`);
    lines.push(concept.definition);
    if (concept.examples?.length) {
      lines.push('\n**Examples**:');
      for (const ex of concept.examples) {
        lines.push(`- ${ex}`);
      }
    }
    if (concept.insight) {
      lines.push(`\n**Insight**: ${concept.insight}`);
    }
    lines.push('');
  }

  if (framework.questions?.length) {
    lines.push(`## Diagnostic Questions\n`);
    for (const q of framework.questions) {
      lines.push(`- ${q}`);
    }
    lines.push('');
  }

  if (framework.when_to_use) {
    lines.push(`## When to Use\n`);
    lines.push(framework.when_to_use);
    lines.push('');
  }

  if (framework.common_mistakes?.length) {
    lines.push(`## Common Mistakes\n`);
    for (const mistake of framework.common_mistakes) {
      lines.push(`- ${mistake}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get Case Study Tool
 */
export const getCaseStudyTool: ToolDefinition = {
  name: 'get_case_study',
  description:
    'Get detailed information about a specific case study from the active persona, including the story, pattern, and signals.',
  inputSchema: {
    type: 'object',
    properties: {
      case_name: {
        type: 'string',
        description: 'Name of the case study (e.g., "steel_minimills", "milkshake")',
      },
    },
    required: ['case_name'],
  },
};

/**
 * Handle get_case_study tool call
 */
export function handleGetCaseStudy(args: { case_name: string }): string {
  const persona = getActivePersona();

  if (!persona) {
    return 'No persona is currently active. Use `switch_persona` to activate one first.';
  }

  const def = persona.definition;
  const caseStudies = def.case_studies ?? {};
  const caseStudy = caseStudies[args.case_name];

  if (!caseStudy) {
    const available = Object.keys(caseStudies).join(', ') || 'none';
    return `Case study "${args.case_name}" not found. Available: ${available}`;
  }

  const lines = [
    `# ${formatName(args.case_name)}\n`,
    `*Case study from ${def.identity.name}*\n`,
    `## Pattern\n`,
    caseStudy.pattern,
    '',
    `## Story\n`,
    caseStudy.story.trim(),
    '',
  ];

  if (caseStudy.signals?.length) {
    lines.push(`## When This Pattern Applies\n`);
    lines.push(`Look for these signals:`);
    for (const signal of caseStudy.signals) {
      lines.push(`- ${signal}`);
    }
    lines.push('');
  }

  if (caseStudy.lessons?.length) {
    lines.push(`## Key Lessons\n`);
    for (const lesson of caseStudy.lessons) {
      lines.push(`- ${lesson}`);
    }
    lines.push('');
  }

  if (caseStudy.source) {
    lines.push(`## Source\n`);
    lines.push(caseStudy.source);
  }

  return lines.join('\n');
}

/**
 * Get Active Persona Tool
 */
export const getActivePersonaTool: ToolDefinition = {
  name: 'get_active_persona',
  description:
    'Get information about the currently active persona, including their identity, voice, and available frameworks.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

/**
 * Handle get_active_persona tool call
 */
export function handleGetActivePersona(): string {
  const persona = getActivePersona();

  if (!persona) {
    return 'No persona is currently active. Use `list_personas` to see available personas and `switch_persona` to activate one.';
  }

  const def = persona.definition;

  const lines = [
    `# Currently Active: ${def.identity.name}\n`,
    `**Role**: ${def.identity.role}\n`,
    `**Background**:\n${def.identity.background.trim()}\n`,
  ];

  if (def.identity.era) {
    lines.push(`**Era**: ${def.identity.era}\n`);
  }

  lines.push(`## Voice\n`);
  lines.push(`**Tone**: ${def.voice.tone.join(', ')}\n`);
  lines.push(`**Style**:`);
  for (const style of def.voice.style) {
    lines.push(`- ${style}`);
  }
  lines.push('');

  lines.push(`## Frameworks (${Object.keys(def.frameworks).length})\n`);
  for (const name of Object.keys(def.frameworks)) {
    lines.push(`- ${formatName(name)}`);
  }
  lines.push('');

  if (def.case_studies && Object.keys(def.case_studies).length > 0) {
    lines.push(`## Case Studies (${Object.keys(def.case_studies).length})\n`);
    for (const name of Object.keys(def.case_studies)) {
      lines.push(`- ${formatName(name)}`);
    }
  }

  return lines.join('\n');
}

/**
 * All tool definitions
 */
export const ALL_TOOLS: ToolDefinition[] = [
  listPersonasTool,
  switchPersonaTool,
  personaAnalyzeTool,
  getFrameworkTool,
  getCaseStudyTool,
  getActivePersonaTool,
];

/**
 * Tool handler dispatch
 */
export function handleToolCall(
  toolName: string,
  args: Record<string, unknown>
): string {
  switch (toolName) {
    case 'list_personas':
      return handleListPersonas(args as { category?: string });

    case 'switch_persona':
      return handleSwitchPersona(args as { persona_id: string });

    case 'persona_analyze':
      return handlePersonaAnalyze(
        args as { situation: string; context?: string; focus_frameworks?: string[] }
      );

    case 'get_framework':
      return handleGetFramework(args as { framework_name: string });

    case 'get_case_study':
      return handleGetCaseStudy(args as { case_name: string });

    case 'get_active_persona':
      return handleGetActivePersona();

    default:
      return `Unknown tool: ${toolName}`;
  }
}

// Utility
function formatName(name: string): string {
  return name
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
