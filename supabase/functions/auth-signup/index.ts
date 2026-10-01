import { corsHeaders } from "../_shared/cors.ts";
import { clientIp, rateLimit } from "../_shared/rate-limit.ts";
import { createAdminClient, createPublishableClient } from "../_shared/supabase.ts";
import {
  normalizeDisplayName,
  validateDisplayName,
  validatePassword,
} from "../_shared/validation.ts";

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

const NAME_TAKEN = "This display name is already taken. Please choose another.";
const CREATE_FAILED = "Account creation failed. Please try again.";

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
    const passwordError = validatePassword(password);
    if (passwordError) return json({ error: passwordError }, 400);

    const admin = createAdminClient();
    const ip = clientIp(req);

    if (!(await rateLimit(admin, `signup:${ip}`, 10, 3600))) {
      return json({ error: "Too many attempts. Please try again later." }, 429);
    }

    const normalized = normalizeDisplayName(displayName);

    const { data: existing, error: lookupError } = await admin
      .from("profiles")
      .select("id")
      .eq("display_name_normalized", normalized)
      .maybeSingle();
    if (lookupError) return json({ error: CREATE_FAILED }, 500);
    if (existing) return json({ error: NAME_TAKEN }, 409);

    const identifier = `${crypto.randomUUID()}@quarisme.auth.invalid`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: identifier,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (createError || !created.user) {
      const { data: raced } = await admin
        .from("profiles")
        .select("id")
        .eq("display_name_normalized", normalized)
        .maybeSingle();
      if (raced) return json({ error: NAME_TAKEN }, 409);
      return json({ error: CREATE_FAILED }, 500);
    }

    const userId = created.user.id;

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      return json({ error: CREATE_FAILED }, 500);
    }

    const authClient = createPublishableClient(req);
    const { data: signIn, error: signInError } =
      await authClient.auth.signInWithPassword({ email: identifier, password });

    if (signInError || !signIn.session) {
      return json({ error: CREATE_FAILED }, 500);
    }

    return json({
      session: sanitizeSession(signIn.session),
      user: { id: userId, displayName },
    });
  } catch {
    return json({ error: CREATE_FAILED }, 500);
  }
});
