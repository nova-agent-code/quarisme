"use client";

import { useCallback, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { UserSearchResult } from "@/lib/types";

export function useUserSearch() {
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const id = ++requestId.current;
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("search_users", {
        p_query: q,
        p_limit: 20,
      });
      if (id !== requestId.current) return;
      if (error) {
        setError("Search failed.");
        setResults([]);
      } else {
        setResults((data as UserSearchResult[]) ?? []);
        setError(null);
      }
      setSearching(false);
    }, 300);
  }, []);

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setResults([]);
    setSearching(false);
    setError(null);
  }, []);

  return { results, searching, error, search, clear };
}
