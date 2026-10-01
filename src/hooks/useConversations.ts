"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { ConversationSummary } from "@/lib/types";

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    let result = await supabase.rpc("get_conversations");
    if (result.error) {
      await new Promise((r) => setTimeout(r, 800));
      result = await supabase.rpc("get_conversations");
    }
    if (!mounted.current) return;
    if (result.error) {
      setError("Failed to load conversations.");
    } else {
      setConversations((result.data as ConversationSummary[]) ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();

    const supabase = getSupabase();
    const channel = supabase
      .channel("conversations-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reads" },
        () => {
          refresh();
        },
      )
      .subscribe();

    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { conversations, loading, error, refresh };
}
