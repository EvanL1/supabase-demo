# AI Tasks — AI-native task manager with MCP

A TickTick-style cloud-hosted task manager built on **Next.js 16 + Supabase**, with first-class **MCP (Model Context Protocol)** support so any LLM client (Claude Desktop, Cursor, ChatGPT, custom agents) can read and write your tasks via natural language.

## Architecture

```
┌──────────────────┐         ┌──────────────────────┐
│ Web UI (Next 16) │ ──────▶ │  Supabase Postgres   │
│  RSC + Actions   │ ◀────── │  (RLS by user_id)    │
└──────────────────┘         └──────────────────────┘
         ▲                            ▲
         │ Supabase Auth              │ service_role
         │ (cookie session)           │
         │                            │
         │              ┌─────────────┴──────────┐
         │              │  /api/mcp endpoint     │
         │              │  Streamable HTTP MCP   │
         │              │  Bearer-token auth     │
         │              └────────────▲───────────┘
         │                           │
         │              ┌────────────┴───────────┐
         │              │ Claude Desktop / Cursor│
         │              │  any MCP client        │
         │              └────────────────────────┘
```

## One-time setup

### 1. Apply the database migration

In the Supabase Dashboard → **SQL Editor**, paste and run:

```
supabase/migrations/0001_init.sql
```

This creates the `tasks` and `api_tokens` tables, RLS policies, and the `updated_at` trigger.

### 2. Fill in `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=...              # already set
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...  # already set
SUPABASE_SERVICE_ROLE_KEY=...             # ← add this
```

Get the `service_role` key from Supabase Dashboard → **Project Settings → API**. It bypasses RLS, so:

- **Never** expose it to the browser.
- Only the `/api/mcp` route uses it (to validate opaque bearer tokens against `api_tokens.token_hash`).

### 3. (Optional) Disable email confirmation while testing

Dashboard → **Authentication → Providers → Email** → turn off "Confirm email", so freshly signed-up accounts can sign in immediately.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

## How MCP works here

1. User signs in to the web app.
2. On `/settings` they click **生成 token** and copy the `mcp_...` value (shown only once).
3. They configure their MCP client to point at `https://<your-host>/api/mcp` with `Authorization: Bearer mcp_...`.
4. The route handler (`app/api/[transport]/route.ts`) validates the bearer (`sha256` hash lookup), stuffs the resolved `user_id` into `request.auth`, then delegates to the MCP server which exposes:
   - `list_tasks(status?, limit?)`
   - `create_task(title, notes?, priority?, due_at?)`
   - `update_task(id, ...patch)`
   - `complete_task(id)`
   - `delete_task(id)`

All tool handlers manually constrain every query with `.eq("user_id", verifiedUserId)`. That's a defence-in-depth check on top of the bearer validation.

### Example: Claude Desktop config

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-tasks": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-deploy.vercel.app/api/mcp",
        "--header",
        "Authorization:Bearer mcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      ]
    }
  }
}
```

Restart Claude Desktop, and tasks appear as tools.

### Example: curl smoke test

```bash
curl -X POST https://your-deploy.vercel.app/api/mcp \
  -H "Authorization: Bearer mcp_..." \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Deploy

Push to Vercel; add all three env vars in the project settings. The `/api/mcp` endpoint becomes public — anyone with a valid bearer token (i.e. a user who's logged in and generated one) can hit it.

## File layout

```
app/
  page.tsx                 # tasks dashboard (auth-gated)
  login/, signup/          # auth forms
  auth/actions.ts          # signIn / signUp / signOut
  tasks/actions.ts         # createTask / toggleTask / deleteTask
  settings/                # MCP token management
  api/[transport]/route.ts # MCP Streamable HTTP endpoint
utils/supabase/
  server.ts                # RSC client (uses cookies, RLS-bound to user)
  client.ts                # browser client
  middleware.ts            # session refresh + auth gate
  admin.ts                 # service_role client (server-only)
utils/api-tokens.ts        # generate + sha256-hash + verify bearer tokens
proxy.ts                   # Next 16 proxy (renamed from middleware.ts)
supabase/migrations/
  0001_init.sql            # tables, RLS, triggers
```
