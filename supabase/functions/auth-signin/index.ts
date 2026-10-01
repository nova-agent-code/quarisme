import { corsHeaders } from "../_shared/cors.ts";
import { clientIp, rateLimit } from "../_shared/rate-limit.ts";
import { createAdminClient, createPublishableClient } from "../_shared/supabase.ts";
import { normalizeDisplayName, validateDisplayName } from "../_shared/validation.ts";

type TokenSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeSession(session: TokenSession): TokenSession {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
  };
}

const INVALID_CREDENTIALS = "Invalid display name or password.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  try {
    const body: unknown = await req.json().catch(() => null);
    const record = body as Record<string, unknown> | null;
    const displayName =
      typeof record?.displayName === "string" ? record.displayName.trim() : "";
    const password = typeof record?.password === "string" ? record.password : "";

    const nameError = validateDisplayName(displayName);
    if (nameError) return json({ error: nameError }, 400);
    if (!password) return json({ error: "Password is required." }, 400);

    const admin = createAdminClient();
    const ip = clientIp(req);
    const normalized = normalizeDisplayName(displayName);

    const [perIdentity, perIp] = await Promise.all([
      rateLimit(admin, `signin:${ip}:${normalized}`, 8, 300),
      rateLimit(admin, `signin-ip:${ip}`, 30, 300),
    ]);
    if (!perIdentity || !perIp) {
      return json(
        { error: "Too many attempts. Please try again in a few minutes." },
        429,
      );
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, display_name")
      .eq("display_name_normalized", normalized)
      .maybeSingle();

    if (profileError) return json({ error: "Sign in failed. Please try again." }, 500);
    if (!profile) return json({ error: INVALID_CREDENTIALS }, 401);

    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(
      profile.id,
    );
    const identifier = authUser.user?.email;
    if (userError || !identifier) return json({ error: INVALID_CREDENTIALS }, 401);

    const authClient = createPublishableClient(req);
    const { data: signIn, error: signInError } =
      await authClient.auth.signInWithPassword({ email: identifier, password });

    if (signInError || !signIn.session) {
      return json({ error: INVALID_CREDENTIALS }, 401);
    }

    return json({
      session: sanitizeSession(signIn.session),
      user: { id: profile.id, displayName: profile.display_name },
    });
  } catch {
    return json({ error: "Sign in failed. Please try again." }, 500);
  }
});
