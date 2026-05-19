"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

async function client() {
  return createClient(await cookies());
}

function fail(message: string): never {
  redirect(`/?error=${encodeURIComponent(message)}`);
}

export async function createTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const priority = Number(formData.get("priority") ?? 0);
  const dueRaw = String(formData.get("due_at") ?? "").trim();
  const due_at = dueRaw ? new Date(dueRaw).toISOString() : null;

  // user_id is filled by the DB default `auth.uid()`; proxy middleware
  // already guarantees the user is signed in, so no extra getUser() needed.
  const supabase = await client();
  const { error } = await supabase
    .from("tasks")
    .insert({ title, priority, due_at });
  if (error) fail(`添加失败：${error.message}`);

  revalidatePath("/");
}

export async function toggleTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nextStatus = String(formData.get("status") ?? "");
  if (!id || !["pending", "done"].includes(nextStatus)) return;

  const supabase = await client();
  const { error } = await supabase
    .from("tasks")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fail(`更新失败：${error.message}`);

  revalidatePath("/");
}

export async function deleteTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await client();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) fail(`删除失败：${error.message}`);

  revalidatePath("/");
}
