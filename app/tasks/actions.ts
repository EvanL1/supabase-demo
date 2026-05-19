"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

async function client() {
  return createClient(await cookies());
}

export async function createTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const priority = Number(formData.get("priority") ?? 0);
  const dueRaw = String(formData.get("due_at") ?? "").trim();
  const due_at = dueRaw ? new Date(dueRaw).toISOString() : null;

  const supabase = await client();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("tasks").insert({
    user_id: user.id,
    title,
    priority,
    due_at,
  });

  revalidatePath("/");
}

export async function toggleTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nextStatus = String(formData.get("status") ?? "");
  if (!id || !["pending", "done"].includes(nextStatus)) return;

  const supabase = await client();
  await supabase.from("tasks").update({ status: nextStatus }).eq("id", id);
  revalidatePath("/");
}

export async function deleteTask(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await client();
  await supabase.from("tasks").delete().eq("id", id);
  revalidatePath("/");
}
