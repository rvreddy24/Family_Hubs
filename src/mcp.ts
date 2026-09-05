import type { Env, Space } from "./types";
import { json } from "./http";
import { TOOL_DEFS, callTool } from "./tools";

const SERVER_INFO = { name: "recall", version: "1.0.0" };
const PROTOCOL_VERSION = "2024-11-05";

interface RpcMessage {
  jsonrpc: "2.0";
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function result(id: RpcMessage["id"], value: unknown) {
  return { jsonrpc: "2.0" as const, id, result: value };
}
function rpcError(id: RpcMessage["id"], code: number, message: string) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

/** Handle one JSON-RPC message. Returns null for notifications (no reply). */
async function handleMessage(env: Env, space: Space, msg: RpcMessage): Promise<object | null> {
  const { id, method, params } = msg;

  switch (method) {
    case "initialize":
      return result(id, {
        protocolVersion:
          (params?.protocolVersion as string | undefined) ?? PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "Long-term memory for this agent. Call `recall` before answering when prior " +
          "context may help, and `remember` to persist anything worth keeping.",
      });

    case "notifications/initialized":
    case "notifications/cancelled":
      return null; // notification: no response

    case "ping":
      return result(id, {});

    case "tools/list":
      return result(id, { tools: TOOL_DEFS });

    case "tools/call": {
      const name = params?.name as string;
      const args = (params?.arguments as Record<string, unknown>) ?? {};
      if (!name) return rpcError(id, -32602, "Missing tool name");
      try {
        const { summary, data } = await callTool(env, space, name, args);
        return result(id, {
          content: [
            { type: "text", text: summary },
            { type: "text", text: JSON.stringify(data, null, 2) },
          ],
          structuredContent: { data },
          isError: false,
        });
      } catch (e) {
        return result(id, {
          content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
          isError: true,
        });
      }
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method ?? "(none)"}`);
  }
}

/** MCP Streamable HTTP endpoint. Accepts a single message or a batch array. */
export async function handleMcp(request: Request, env: Env, space: Space): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(rpcError(null, -32700, "Parse error"), 400);
  }

  const messages = Array.isArray(body) ? (body as RpcMessage[]) : [body as RpcMessage];
  const responses: object[] = [];
  for (const msg of messages) {
    const r = await handleMessage(env, space, msg);
    if (r) responses.push(r);
  }

  // Only notifications/responses in the batch -> 202 Accepted, no body.
  if (responses.length === 0) {
    return new Response(null, { status: 202 });
  }
  const payload = Array.isArray(body) ? responses : responses[0];
  return json(payload, 200);
}
