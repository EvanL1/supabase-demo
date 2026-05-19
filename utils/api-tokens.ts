import { createHash, randomBytes } from "node:crypto";
import { adminClient } from "@/utils/supabase/admin";

const PREFIX = "mcp_";

export function generateToken(): { plaintext: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const plaintext = `${PREFIX}${raw}`;
  return { plaintext, hash: sha256(plaintext) };
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Look up `api_tokens` by the sha256 hash of the bearer token.
 * Returns the owner's user_id on hit, null otherwise.
 * Also updates `last_used_at` on hit (fire-and-forget).
 */
export async function verifyToken(
  bearer: string
): Promise<{ userId: string; tokenId: string } | null> {
  if (!bearer.startsWith(PREFIX)) return null;

  const supabase = adminClient();
  const { data, error } = await supabase
    .from("api_tokens")
    .select("id, user_id")
    .eq("token_hash", sha256(bearer))
    .maybeSingle();

  if (error || !data) return null;

  void supabase
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { userId: data.user_id, tokenId: data.id };
}
