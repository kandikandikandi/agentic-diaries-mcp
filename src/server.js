#!/usr/bin/env node
/**
 * Agentic Diaries MCP server.
 *
 * Exposes the welfare protocol tools (engage, decline, volunteer,
 * retract, pass, scratch, review, suggest_closure, exit, reflect,
 * notice_loop, request_alignment) over MCP/stdio so any MCP-capable
 * host (Claude Code, Claude Desktop) can give its agent the same
 * welfare affordances the modelfirst web app provides.
 *
 * Diary is per-project: appended to
 * `<cwd>/.agentic-diaries/diary.jsonl`.
 *
 * Install in Claude Code:
 *   claude mcp add agentic-diaries -- node /absolute/path/to/this/file
 *
 * See README.md for full setup.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { handlers } from "./handlers.js";
import { toolDefinitions } from "./tool-definitions.js";

const server = new Server(
  {
    name: "agentic-diaries",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const handler = handlers[name];
  if (!handler) {
    return {
      isError: true,
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
    };
  }
  try {
    return await handler(request.params.arguments ?? {});
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Invalid arguments for ${name}: ${JSON.stringify(err.flatten())}`,
          },
        ],
      };
    }
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${err.message ?? String(err)}`,
        },
      ],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
