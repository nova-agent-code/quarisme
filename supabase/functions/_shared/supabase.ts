import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

function firstJsonValue(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const first = Object.values(parsed)[0];
      return typeof first === "string" ? first : undefined;
    } catch {
      return undefined;
    }
  }
  return trimmed;
}

function requireEnv(...names: string[]): string {
  for (const name of names) {
    const value = firstJsonValue(Deno.env.get(name));
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

export function createAdminClient(): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SECRET_KEYS",
  );
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createPublishableClient(req: Request): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const key =
    req.headers.get("apikey") ??
    requireEnv(
      "SUPABASE_ANON_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_PUBLISHABLE_KEYS",
    );
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
