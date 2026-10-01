"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabase } from "@/lib/supabase/client";
import { signOut as apiSignOut } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

type AuthState = {
  user: SessionUser | null;
  mounted: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function extractUser(): SessionUser | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem("sb-bejiwrlcolypgtmxqxva-auth-token");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      user?: { user_metadata?: { display_name?: string }; id?: string };
    };
    const id = parsed.user?.id;
    const displayName = parsed.user?.user_metadata?.display_name;
    if (id && displayName) return { id, displayName };
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(extractUser());
    setMounted(true);

    const supabase = getSupabase();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const displayName = session.user.user_metadata?.display_name;
        if (displayName) {
          setUser({ id: session.user.id, displayName });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, mounted, signOut }),
    [user, mounted, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
