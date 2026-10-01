import { getSupabase } from "./supabase/client";
import type { AuthSession, SessionUser } from "./types";

type AuthResponse = {
  session: AuthSession;
  user: SessionUser;
};

async function invokeAuth(
  slug: string,
  body: Record<string, unknown>,
): Promise<AuthResponse> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke(slug, { body });
  if (error) {
    let message = "Request failed. Please try again.";
    const context = error.context as { json?: () => Promise<unknown> } | null;
    if (context?.json) {
      try {
        const parsed = (await context.json()) as { error?: string };
        if (parsed.error) message = parsed.error;
      } catch {
        // keep default message
      }
    }
    throw new Error(message);
  }
  if (!data || !(data as AuthResponse).session) {
    throw new Error("Request failed. Please try again.");
  }
  return data as AuthResponse;
}

export async function signUp(
  displayName: string,
  password: string,
): Promise<SessionUser> {
  const { session, user } = await invokeAuth("auth-signup", {
    displayName,
    password,
  });
  await getSupabase().auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  return user;
}

export async function signIn(
  displayName: string,
  password: string,
): Promise<SessionUser> {
  const { session, user } = await invokeAuth("auth-signin", {
    displayName,
    password,
  });
  await getSupabase().auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  return user;
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}
