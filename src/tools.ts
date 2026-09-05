import type { Env, Memory, Space } from "./types";
import { forget, recall, recent, remember, stats, update } from "./memory";

/** MCP tool schemas advertised to clients. */
export const TOOL_DEFS = [
  {
    name: "remember",
    description:
      "Save a durable memory for later. Use this to persist facts, decisions, preferences, " +
      "or context you'll want to recall in a future session. Returns the stored memory's id.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "The fact or note to remember." },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional lowercase tags for grouping (e.g. ['project-x','preference']).",
        },
        metadata: {
          type: "object",
          description: "Optional structured metadata to attach.",
          additionalProperties: true,
        },
      },
      required: ["content"],
    },
  },
  {
    name: "recall",
    description:
      "Semantically search your memories for anything relevant to a query. Returns the closest " +
      "matches with a similarity score. Use this before answering when past context might help.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What you're trying to remember." },
        limit: { type: "number", description: "Max results (1-50, default 8)." },
        min_similarity: {
          type: "number",
          description: "Only return matches at/above this cosine similarity (0-1, default 0).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_recent",
    description: "List the most recently stored memories, newest first. Optionally filter by tag.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (1-50, default 10)." },
        tag: { type: "string", description: "Only return memories carrying this tag." },
      },
    },
  },
  {
    name: "stats",
    description: "Get a summary of this memory space (how many memories it holds).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "update",
    description:
      "Edit an existing memory by id. Provide any of content, tags, or metadata. " +
      "Changing content re-embeds it so future recall stays accurate.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The memory id to edit." },
        content: { type: "string", description: "New content (re-embedded)." },
        tags: { type: "array", items: { type: "string" }, description: "Replacement tags." },
        metadata: { type: "object", description: "Replacement metadata.", additionalProperties: true },
      },
      required: ["id"],
    },
  },
  {
    name: "forget",
    description: "Permanently delete a memory by its id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "The memory id to delete." } },
      required: ["id"],
    },
  },
] as const;

type ToolResult = { summary: string; data: unknown };

/** Execute a tool call and return a structured result. */
export async function callTool(
  env: Env,
  space: Space,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  switch (name) {
    case "remember": {
      const m = await remember(env, space, args as never);
      return { summary: `Remembered (id: ${m.id}).`, data: m };
    }
    case "recall": {
      const results = await recall(env, space, args as never);
      return { summary: summarizeRecall(results), data: results };
    }
    case "list_recent": {
      const results = await recent(env, space, args as never);
      return { summary: `${results.length} recent ${plural(results.length)}.`, data: results };
    }
    case "stats": {
      const s = await stats(env, space);
      return { summary: `${s.memory_count} ${plural(s.memory_count)} stored.`, data: s };
    }
    case "update": {
      const m = await update(env, space, args as never);
      return { summary: `Updated memory ${m.id}.`, data: m };
    }
    case "forget": {
      const r = await forget(env, space, args as never);
      return {
        summary: r.deleted ? "Memory deleted." : "No memory found with that id.",
        data: r,
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function summarizeRecall(results: Memory[]): string {
  if (results.length === 0) return "No relevant memories found.";
  const lines = results.map((m) => {
    const sim = typeof m.similarity === "number" ? ` (${(m.similarity * 100).toFixed(0)}%)` : "";
    return `• ${m.content}${sim}`;
  });
  return `${results.length} relevant ${plural(results.length)}:\n${lines.join("\n")}`;
}

function plural(n: number): string {
  return n === 1 ? "memory" : "memories";
}
