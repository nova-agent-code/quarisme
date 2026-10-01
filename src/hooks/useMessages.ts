"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Attachment } from "@/lib/storage";
import type { Message } from "@/lib/types";

const PAGE_SIZE = 50;

export function useMessages(
  conversationId: string | null,
  recipientId: string | null,
  currentUserId: string,
  otherUserName: string,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const mounted = useRef(true);

  const senderNameFor = useCallback(
    (senderId: string) =>
      senderId === currentUserId ? "You" : otherUserName,
    [currentUserId, otherUserName],
  );

  const fetchPage = useCallback(
    async (before?: string) => {
      if (!conversationId) return;
      const supabase = getSupabase();
      let query = supabase
        .from("messages_with_profiles")
        .select("*")
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (before) {
        query = query.lt("created_at", before);
      }
      const { data, error } = await query;
      if (!mounted.current) return;
      if (error) {
        setError("Failed to load messages.");
        return;
      }
      const page = ((data as Message[]) ?? []).reverse();
      if (before) {
        setMessages((prev) => [...page, ...prev]);
      } else {
        setMessages(page);
      }
      setHasMore(page.length === PAGE_SIZE);
    },
    [conversationId],
  );

  const loadOlder = useCallback(async () => {
    if (!conversationId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const oldest = messages[messages.length - 1]?.created_at;
    await fetchPage(oldest);
    setLoadingMore(false);
  }, [conversationId, loadingMore, hasMore, messages, fetchPage]);

  useEffect(() => {
    mounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([]);
    setHasMore(true);
    setError(null);
    if (conversationId) {
      setLoading(true);
      fetchPage().then(() => mounted.current && setLoading(false));
    }
    return () => {
      mounted.current = false;
    };
  }, [conversationId, fetchPage]);

  useEffect(() => {
    if (!conversationId) return;
    const supabase = getSupabase();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = { ...(payload.new as Message), sender_name: senderNameFor((payload.new as Message).sender_id) };
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = { ...(payload.new as Message), sender_name: senderNameFor((payload.new as Message).sender_id) };
          setMessages((prev) => {
            if (!prev.some((m) => m.id === msg.id)) return prev;
            return prev.map((m) => (m.id === msg.id ? msg : m));
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const id = payload.old.id as string;
          setMessages((prev) => prev.filter((m) => m.id !== id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, senderNameFor]);

  useEffect(() => {
    if (!conversationId) return;
    const supabase = getSupabase();

    async function loadHidden() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_message_states")
        .select("message_id")
        .eq("user_id", user.id);
      if (mounted.current) {
        setHiddenIds(new Set((data ?? []).map((r) => r.message_id)));
      }
    }
    loadHidden();

    const channel = supabase
      .channel(`ums:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_message_states" },
        () => {
          loadHidden();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const visibleMessages = messages.filter((m) => !hiddenIds.has(m.id));

  const sendMessage = useCallback(
    async (
      content: string,
      replyToId?: string | null,
      attachment?: Attachment | null,
    ) => {
      if (!conversationId) return;
      const supabase = getSupabase();
      const tempId =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const senderId = user?.id ?? "";
      const optimistic: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: senderId,
        sender_name: senderNameFor(senderId),
        recipient_id: recipientId,
        recipient_name: null,
        attachment_url: attachment?.url ?? null,
        attachment_type: attachment?.type ?? null,
        attachment_name: attachment?.name ?? null,
        attachment_size: attachment?.size ?? null,
        content,
        reply_to_message_id: replyToId ?? null,
        created_at: new Date().toISOString(),
        updated_at: null,
        edited_at: null,
        deleted_at: null,
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          content,
          reply_to_message_id: replyToId ?? null,
          recipient_id: recipientId,
          attachment_url: attachment?.url ?? null,
          attachment_type: attachment?.type ?? null,
          attachment_name: attachment?.name ?? null,
          attachment_size: attachment?.size ?? null,
        })
        .select()
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw new Error("Message failed to send.");
      }
      const sent = {
        ...(data as Message),
        sender_name: senderId ? senderNameFor(senderId) : null,
      };
      setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)));
      return sent;
    },
    [conversationId, recipientId, senderNameFor],
  );

  const editMessage = useCallback(
    async (id: string, content: string) => {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("messages")
        .update({ content })
        .eq("id", id);
      if (error) throw new Error("Message failed to edit.");
    },
    [],
  );

  const deleteForEveryone = useCallback(async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error("Message failed to delete.");
  }, []);

  const deleteForMe = useCallback(
    async (id: string) => {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("user_message_states")
        .upsert({ message_id: id, user_id: user.id, deleted_for_user: true });
      if (error) throw new Error("Message failed to delete.");
      setHiddenIds((prev) => new Set(prev).add(id));
    },
    [],
  );

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    const supabase = getSupabase();
    await supabase.rpc("mark_conversation_read", {
      p_conversation: conversationId,
    });
  }, [conversationId]);

  return {
    messages: visibleMessages,
    allMessages: messages,
    loading,
    loadingMore,
    hasMore,
    error,
    loadOlder,
    sendMessage,
    editMessage,
    deleteForEveryone,
    deleteForMe,
    markRead,
  };
}
