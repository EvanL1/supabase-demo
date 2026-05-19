import Link from "next/link";
import { signIn } from "@/app/auth/actions";

type SearchParams = Promise<{ error?: string; notice?: string; redirect?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, notice, redirect: redirectTo } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <form
        action={signIn}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold">登录</h1>
        {notice && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <input type="hidden" name="redirect" value={redirectTo ?? "/"} />
        <Field name="email" label="邮箱" type="email" autoComplete="email" />
        <Field name="password" label="密码" type="password" autoComplete="current-password" />
        <button
          type="submit"
          className="w-full rounded-lg bg-black dark:bg-white text-white dark:text-black h-10 font-medium"
        >
          登录
        </button>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          还没有账号？{" "}
          <Link className="underline" href="/signup">
            注册
          </Link>
        </p>
      </form>
    </main>
  );
}

function Field({
  name,
  label,
  type,
  autoComplete,
}: {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
      <input
        required
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 h-10 outline-none focus:border-zinc-900 dark:focus:border-zinc-200"
      />
    </label>
  );
}
