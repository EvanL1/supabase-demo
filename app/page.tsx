import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { signOut } from "@/app/auth/actions";
import { createTask, toggleTask, deleteTask } from "@/app/tasks/actions";

type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: "pending" | "done";
  priority: number;
  due_at: string | null;
  created_at: string;
};

const PRIORITY_LABEL: Record<number, string> = {
  0: "无",
  1: "低",
  2: "中",
  3: "高",
};

export default async function Page() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("status", { ascending: true })
    .order("priority", { ascending: false })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const list = (tasks ?? []) as Task[];
  const pending = list.filter((t) => t.status === "pending");
  const done = list.filter((t) => t.status === "done");

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="mx-auto max-w-2xl px-6 h-14 flex items-center justify-between">
          <h1 className="font-semibold">AI Tasks</h1>
          <nav className="flex items-center gap-4 text-sm">
            <span className="text-zinc-500">{user?.email}</span>
            <Link href="/settings" className="underline">
              设置
            </Link>
            <form action={signOut}>
              <button className="underline" type="submit">
                退出
              </button>
            </form>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-8 space-y-8">
        <form
          action={createTask}
          className="space-y-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5"
        >
          <input
            required
            name="title"
            placeholder="今天要做点什么？"
            className="w-full bg-transparent text-lg outline-none placeholder:text-zinc-400"
          />
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-zinc-500">优先级</span>
              <select
                name="priority"
                defaultValue="0"
                className="rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 h-8"
              >
                <option value="0">无</option>
                <option value="1">低</option>
                <option value="2">中</option>
                <option value="3">高</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-zinc-500">截止</span>
              <input
                type="datetime-local"
                name="due_at"
                className="rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 h-8"
              />
            </label>
            <button
              type="submit"
              className="ml-auto rounded-lg bg-black dark:bg-white text-white dark:text-black h-8 px-4 font-medium"
            >
              添加
            </button>
          </div>
        </form>

        <TaskGroup title="待办" tasks={pending} emptyHint="一切归零，可以喘口气 ☕️" />
        {done.length > 0 && (
          <TaskGroup title={`已完成 (${done.length})`} tasks={done} dim />
        )}
      </section>
    </main>
  );
}

function TaskGroup({
  title,
  tasks,
  emptyHint,
  dim,
}: {
  title: string;
  tasks: Task[];
  emptyHint?: string;
  dim?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm uppercase tracking-wide text-zinc-500">{title}</h2>
      {tasks.length === 0 && emptyHint && (
        <p className="text-zinc-500 italic text-sm">{emptyHint}</p>
      )}
      <ul className={dim ? "opacity-60" : ""}>
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-3 py-2 border-b border-zinc-200 dark:border-zinc-800 last:border-b-0"
          >
            <form action={toggleTask}>
              <input type="hidden" name="id" value={t.id} />
              <input
                type="hidden"
                name="status"
                value={t.status === "done" ? "pending" : "done"}
              />
              <button
                type="submit"
                aria-label="toggle"
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  t.status === "done"
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-zinc-400"
                }`}
              >
                {t.status === "done" ? "✓" : ""}
              </button>
            </form>
            <div className="flex-1 min-w-0">
              <div
                className={`truncate ${
                  t.status === "done" ? "line-through text-zinc-500" : ""
                }`}
              >
                {t.title}
              </div>
              <div className="text-xs text-zinc-500 flex gap-3">
                {t.priority > 0 && <span>P{t.priority} · {PRIORITY_LABEL[t.priority]}</span>}
                {t.due_at && <span>{new Date(t.due_at).toLocaleString()}</span>}
              </div>
            </div>
            <form action={deleteTask}>
              <input type="hidden" name="id" value={t.id} />
              <button
                type="submit"
                className="text-xs text-zinc-400 hover:text-red-500"
              >
                删除
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
