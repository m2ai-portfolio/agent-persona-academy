#!/usr/bin/env node
/**
 * Unified Multi-Persona MCP Server
 *
 * A single MCP server that can load and switch between multiple personas.
 * Use with Claude Desktop or Claude Code for strategic advisory with
 * different thinking frameworks.
 *
 * Usage:
 *   node dist/unified-server/index.js
 *   node dist/unified-server/index.js --personas ./personas --default christensen
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { initializeManager, getActivePersona, getPersonaCount } from './persona-manager.js';
import { ALL_TOOLS, handleToolCall } from './tools.js';

// Parse command line arguments
function parseArgs(): {
  personasDir: string;
  defaultPersona?: string;
  includeCache: boolean;
} {
  const args = process.argv.slice(2);
  let personasDir = './personas';
  let defaultPersona: string | undefined;
  let includeCache = true;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--personas':
      case '-p':
        personasDir = args[++i];
        break;
      case '--default':
      case '-d':
        defaultPersona = args[++i];
        break;
      case '--no-cache':
        includeCache = false;
        break;
    }
  }

  return { personasDir, defaultPersona, includeCache };
}

async function main() {
  const config = parseArgs();

  // Initialize persona manager
  const discovered = initializeManager({
    localDir: config.personasDir,
    includeCache: config.includeCache,
    defaultPersona: config.defaultPersona,
  });

  if (discovered.length === 0) {
    console.error('No personas found. Check your personas directory.');
    console.error(`Searched: ${config.personasDir}`);
    process.exit(1);
  }

  // Create MCP server
  const server = new Server(
    {
      name: 'persona-academy',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Handle tools/list
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: ALL_TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Handle tools/call
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = handleToolCall(name, args ?? {});

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Log startup info to stderr (stdout is for MCP protocol)
  const activePersona = getActivePersona();
  console.error(`Persona Academy MCP Server starting...`);
  console.error(`  Personas loaded: ${getPersonaCount()}`);
  console.error(`  Active persona: ${activePersona?.definition.identity.name ?? 'none'}`);
  console.error(`  Available tools: ${ALL_TOOLS.length}`);

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Server connected and ready.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
