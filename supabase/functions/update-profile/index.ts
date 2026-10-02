import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient, createPublishableClient } from "../_shared/supabase.ts";
import { validateDisplayName } from "../_shared/validation.ts";

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const UPDATE_FAILED = "Failed to update display name. Please try again.";

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

    const nameError = validateDisplayName(displayName);
    if (nameError) return json({ error: nameError }, 400);

    const authClient = createPublishableClient(req);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Not authenticated." }, 401);
    }

    const admin = createAdminClient();

    const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, display_name: displayName },
    });

    if (metaError) {
      return json({ error: UPDATE_FAILED }, 500);
    }

    const { error: profileError } = await admin.rpc("update_display_name", {
      p_new_name: displayName,
    });

    if (profileError) {
      return json({ error: profileError.message ?? UPDATE_FAILED }, 409);
    }

    return json({ displayName });
  } catch {
    return json({ error: UPDATE_FAILED }, 500);
  }
});
