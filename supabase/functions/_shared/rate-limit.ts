import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}

export async function rateLimit(
  admin: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = Date.now();
  const windowStartMs = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;
  const windowStart = new Date(windowStartMs).toISOString();

  const { data, error } = await admin
    .from("auth_rate_limits")
    .select("window_start, count")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || new Date(data.window_start).getTime() < windowStartMs) {
    const { error: upsertError } = await admin
      .from("auth_rate_limits")
      .upsert({ key, window_start: windowStart, count: 1 });
    if (upsertError) throw upsertError;
    return true;
  }

  if (data.count >= limit) return false;

  const { error: updateError } = await admin
    .from("auth_rate_limits")
    .update({ count: data.count + 1 })
    .eq("key", key)
    .eq("window_start", data.window_start);
  if (updateError) throw updateError;
  return true;
}
