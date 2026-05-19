import Link from "next/link";
import { signUp } from "@/app/auth/actions";

type SearchParams = Promise<{ error?: string }>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <form
        action={signUp}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold">注册</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <label className="block space-y-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">邮箱</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 h-10 outline-none focus:border-zinc-900 dark:focus:border-zinc-200"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">密码（≥ 6 位）</span>
          <input
            required
            minLength={6}
            type="password"
            name="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 h-10 outline-none focus:border-zinc-900 dark:focus:border-zinc-200"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-black dark:bg-white text-white dark:text-black h-10 font-medium"
        >
          创建账号
        </button>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          已有账号？{" "}
          <Link className="underline" href="/login">
            登录
          </Link>
        </p>
      </form>
    </main>
  );
}
