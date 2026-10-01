"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { ConversationView } from "@/components/ConversationView";
import { EmptyState } from "@/components/shared";
import { useAuth } from "@/providers/auth";
import { useConversations } from "@/hooks/useConversations";
import { getSupabase } from "@/lib/supabase/client";

export default function HomePage() {
  const { user, mounted } = useAuth();
  const router = useRouter();
  const { conversations, loading: conversationsLoading, refresh } = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const selected =
    conversations.find((c) => c.conversation_id === selectedId) ?? null;

  const otherUser = selected
    ? { id: selected.other_user_id, displayName: selected.other_display_name }
    : null;

  useEffect(() => {
    if (mounted && !user) {
      router.push("/auth");
    }
  }, [mounted, user, router]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobileView("chat");
  }, []);

  const handleAddConnection = useCallback(
    async (otherUserId: string): Promise<string> => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("add_connection", {
        p_other: otherUserId,
      });
      if (error) throw new Error("Failed to add connection.");
      await refresh();
      return data as string;
    },
    [refresh],
  );

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div
        className={`w-full shrink-0 md:w-80 ${
          mobileView === "chat" ? "hidden md:block" : "block"
        }`}
      >
        <Sidebar
          conversations={conversations}
          loading={conversationsLoading}
          selectedId={selectedId}
          onSelect={handleSelect}
          onAddConnection={handleAddConnection}
        />
      </div>

      <div
        className={`min-w-0 flex-1 ${
          mobileView === "list" ? "hidden md:block" : "block"
        }`}
      >
        {selected && otherUser ? (
          <ConversationView
            conversationId={selected.conversation_id}
            otherUserId={otherUser.id}
            otherDisplayName={otherUser.displayName}
            currentUserId={user.id}
            onBack={() => setMobileView("list")}
          />
        ) : (
          <div className="hidden h-full md:flex">
            <EmptyState
              title="Select a conversation."
              subtitle="Choose a chat from the sidebar or search for someone new."
            />
          </div>
        )}
      </div>
    </div>
  );
}
