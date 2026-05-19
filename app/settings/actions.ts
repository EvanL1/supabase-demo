"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { generateToken } from "@/utils/api-tokens";

export async function createApiToken(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim() || "Untitled";

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plaintext, hash } = generateToken();
  const { error } = await supabase
    .from("api_tokens")
    .insert({ user_id: user.id, name, token_hash: hash });

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  redirect(`/settings?created=${encodeURIComponent(plaintext)}`);
}

export async function revokeApiToken(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient(await cookies());
  await supabase.from("api_tokens").delete().eq("id", id);
  revalidatePath("/settings");
}
