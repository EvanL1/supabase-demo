import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { adminClient } from "@/utils/supabase/admin";
import { verifyToken } from "@/utils/api-tokens";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const StatusSchema = z.enum(["pending", "done"]);
const PrioritySchema = z.number().int().min(0).max(3);

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "list_tasks",
      "List the authenticated user's tasks. Optionally filter by status.",
      {
        status: StatusSchema.optional().describe(
          "Filter: 'pending' or 'done'. Omit for all."
        ),
        limit: z.number().int().min(1).max(200).default(50),
      },
      async (args, extra) => {
        const userId = requireUser(extra);
        const supabase = adminClient();
        let q = supabase
          .from("tasks")
          .select("id,title,notes,status,priority,due_at,created_at,updated_at")
          .eq("user_id", userId)
          .order("status", { ascending: true })
          .order("priority", { ascending: false })
          .order("due_at", { ascending: true, nullsFirst: false })
          .limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q;
        if (error) return errorText(error.message);
        return jsonText({ tasks: data ?? [] });
      }
    );

    server.tool(
      "create_task",
      "Create a new task for the authenticated user.",
      {
        title: z.string().min(1).max(500),
        notes: z.string().optional(),
        priority: PrioritySchema.default(0).describe(
          "0=none, 1=low, 2=medium, 3=high"
        ),
        due_at: z
          .string()
          .datetime()
          .optional()
          .describe("ISO 8601 timestamp, e.g. 2026-05-20T09:00:00Z"),
      },
      async (args, extra) => {
        const userId = requireUser(extra);
        const supabase = adminClient();
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            user_id: userId,
            title: args.title,
            notes: args.notes ?? null,
            priority: args.priority,
            due_at: args.due_at ?? null,
          })
          .select()
          .single();
        if (error) return errorText(error.message);
        return jsonText({ task: data });
      }
    );

    server.tool(
      "update_task",
      "Update fields of an existing task. Only provided fields are changed.",
      {
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        notes: z.string().nullable().optional(),
        status: StatusSchema.optional(),
        priority: PrioritySchema.optional(),
        due_at: z.string().datetime().nullable().optional(),
      },
      async (args, extra) => {
        const userId = requireUser(extra);
        const { id, ...patch } = args;
        const supabase = adminClient();
        const { data, error } = await supabase
          .from("tasks")
          .update(patch)
          .eq("id", id)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) return errorText(error.message);
        return jsonText({ task: data });
      }
    );

    server.tool(
      "complete_task",
      "Mark a task as done.",
      { id: z.string().uuid() },
      async (args, extra) => {
        const userId = requireUser(extra);
        const supabase = adminClient();
        const { data, error } = await supabase
          .from("tasks")
          .update({ status: "done" })
          .eq("id", args.id)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) return errorText(error.message);
        return jsonText({ task: data });
      }
    );

    server.tool(
      "delete_task",
      "Delete a task permanently.",
      { id: z.string().uuid() },
      async (args, extra) => {
        const userId = requireUser(extra);
        const supabase = adminClient();
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", args.id)
          .eq("user_id", userId);
        if (error) return errorText(error.message);
        return jsonText({ deleted: args.id });
      }
    );
  },
  { serverInfo: { name: "ai-tasks", version: "0.1.0" } },
  { basePath: "/api", disableSse: true, verboseLogs: false }
);

// Bearer-token auth gate. We bypass mcp-handler's OAuth machinery and
// stuff the verified user_id into `extra.authInfo` so each tool sees it.
export async function GET(req: Request) {
  return guarded(req);
}
export async function POST(req: Request) {
  return guarded(req);
}
export async function DELETE(req: Request) {
  return guarded(req);
}

async function guarded(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) return unauthorized("missing bearer token");

  const verified = await verifyToken(m[1].trim());
  if (!verified) return unauthorized("invalid token");

  // Attach to the request so tool handlers can read it via `extra.authInfo`.
  (req as Request & { auth?: unknown }).auth = {
    token: m[1],
    clientId: verified.tokenId,
    scopes: [],
    extra: { userId: verified.userId },
  };

  return handler(req);
}

function unauthorized(reason: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32001, message: `unauthorized: ${reason}` },
      id: null,
    }),
    {
      status: 401,
      headers: {
        "content-type": "application/json",
        "www-authenticate": 'Bearer realm="mcp"',
      },
    }
  );
}

type ToolExtra = { authInfo?: { extra?: { userId?: string } } };

function requireUser(extra: ToolExtra): string {
  const userId = extra.authInfo?.extra?.userId;
  if (!userId) throw new Error("unauthenticated");
  return userId;
}

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

function jsonText(payload: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function errorText(message: string): ToolResult {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}
