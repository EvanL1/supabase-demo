import Link from "next/link";
import { cookies, headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createApiToken, revokeApiToken } from "@/app/settings/actions";

type Token = {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
};

type SearchParams = Promise<{ created?: string; error?: string }>;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { created, error } = await searchParams;
  const supabase = createClient(await cookies());
  const { data: tokens } = await supabase
    .from("api_tokens")
    .select("id,name,last_used_at,created_at")
    .order("created_at", { ascending: false });
  const list = (tokens ?? []) as Token[];

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const mcpUrl = `${proto}://${host}/api/mcp`;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="mx-auto max-w-2xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold">
            ← AI Tasks
          </Link>
          <h1 className="text-sm text-zinc-500">设置</h1>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-8 space-y-8">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">MCP 接入</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            生成一个 API token，把下面的 URL 和 token 配进 Claude
            Desktop / Cursor / 其他 MCP client，就可以用自然语言管理你的任务。
          </p>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-2 text-sm">
            <div>
              <span className="text-zinc-500">MCP URL：</span>
              <code className="font-mono">{mcpUrl}</code>
            </div>
            <div className="text-zinc-500">
              鉴权 header：<code className="font-mono">Authorization: Bearer &lt;token&gt;</code>
            </div>
          </div>
        </div>

        {created && (
          <div className="rounded-xl border border-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm space-y-2">
            <div className="font-medium text-emerald-700 dark:text-emerald-300">
              新 token 创建成功 — 仅此一次可见，请立即保存：
            </div>
            <code className="block break-all rounded bg-white dark:bg-black p-3 font-mono text-xs">
              {created}
            </code>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <form
          action={createApiToken}
          className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4"
        >
          <input
            name="name"
            placeholder="Token 用途（如 Claude Desktop on Mac）"
            className="flex-1 bg-transparent outline-none placeholder:text-zinc-400 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-black dark:bg-white text-white dark:text-black h-9 px-4 text-sm font-medium"
          >
            生成 token
          </button>
        </form>

        <div className="space-y-2">
          <h3 className="text-sm uppercase tracking-wide text-zinc-500">
            已有 token
          </h3>
          {list.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">还没有任何 token</p>
          ) : (
            <ul className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 divide-y divide-zinc-200 dark:divide-zinc-800">
              {list.map((t) => (
                <li key={t.id} className="flex items-center gap-3 p-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-xs text-zinc-500">
                      {t.last_used_at
                        ? `最近使用 ${new Date(t.last_used_at).toLocaleString()}`
                        : "未使用过"}
                      {" · "}
                      创建于 {new Date(t.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <form action={revokeApiToken}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="text-xs text-zinc-400 hover:text-red-500"
                    >
                      撤销
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
