"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, EmptyState, Skeleton, Toast } from "./shared";
import { MessageBubble } from "./MessageBubble";
import { VoiceRecorder } from "./VoiceRecorder";
import { useMessages } from "@/hooks/useMessages";
import { validateAttachment, validateMessageContent } from "@/lib/validation";
import { uploadAttachment, type Attachment } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";

export function ConversationView({
  conversationId,
  otherUserId,
  otherDisplayName,
  currentUserId,
  onBack,
}: {
  conversationId: string;
  otherUserId: string;
  otherDisplayName: string;
  currentUserId: string;
  onBack?: () => void;
}) {
  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    loadOlder,
    sendMessage,
    editMessage,
    deleteForEveryone,
    deleteForMe,
    markRead,
  } = useMessages(conversationId, otherUserId, currentUserId, otherDisplayName);

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const replyMap = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages.length, loading]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      markRead();
    }
  }, [loading, messages.length, markRead]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop === 0 && hasMore && !loadingMore) {
      loadOlder();
    }
  }, [hasMore, loadingMore, loadOlder]);

  async function handleSend() {
    if (pendingAttachment) return;
    const content = draft.trim();
    const validationError = validateMessageContent(content);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSending(true);
    try {
      await sendMessage(content, replyTo?.id ?? null);
      setDraft("");
      setReplyTo(null);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed to send.");
    } finally {
      setSending(false);
    }
  }

  async function handleAttachmentSelect(file: File) {
    const validationError = validateAttachment(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) throw new Error("Not authenticated.");
      const attachment = await uploadAttachment(file, user.id);
      await sendMessage(draft.trim(), replyTo?.id ?? null, attachment);
      setDraft("");
      setReplyTo(null);
      setEditing(null);
      setPendingAttachment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attachment failed to send.");
    } finally {
      setUploading(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  }

  async function handleRecordingSend(blob: Blob) {
    setIsRecording(false);
    setError(null);
    setUploading(true);
    try {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) throw new Error("Not authenticated.");
      const file = new File([blob], `voice-message-${Date.now()}.webm`, { type: blob.type });
      const attachment = await uploadAttachment(file, user.id);
      await sendMessage("", replyTo?.id ?? null, attachment);
      setReplyTo(null);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice message failed to send.");
    } finally {
      setUploading(false);
    }
  }

  function handleRecordingCancel() {
    setIsRecording(false);
  }

  function handleRecordingError(error: string) {
    setError(error);
    setIsRecording(false);
  }

  async function handleEditSave() {
    if (!editing) return;
    const content = draft.trim();
    const validationError = validateMessageContent(content);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    try {
      await editMessage(editing.id, content);
      setEditing(null);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed to edit.");
    }
  }

  function startEdit(m: Message) {
    setEditing(m);
    setDraft(m.content);
    setReplyTo(null);
    setError(null);
  }

  function startReply(m: Message) {
    setReplyTo(m);
    setEditing(null);
    setError(null);
  }

  async function handleDeleteForMe(m: Message) {
    try {
      await deleteForMe(m.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed to delete.");
    }
  }

  async function handleDeleteForEveryone(m: Message) {
    try {
      await deleteForEveryone(m.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed to delete.");
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => showToast("Copied"));
  }

  async function handleSearch() {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("search_messages", {
      p_conversation: conversationId,
      p_query: q,
      p_limit: 50,
    });
    setSearchResults(error ? [] : (data as Message[]));
    setSearching(false);
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back to conversations"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <Avatar name={otherDisplayName} id={otherUserId} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {otherDisplayName}
          </p>
        </div>
        <button
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="Search messages"
          className={`flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 ${
            searchOpen ? "text-indigo-600" : "text-slate-500"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </div>

      {searchOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search messages…"
            aria-label="Search messages"
            autoFocus
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white dark:bg-slate-800 dark:text-slate-100"
          />
          {searching && <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Searching…</p>}
          {!searching && searchQuery.trim() && searchResults.length === 0 && (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">No messages found.</p>
          )}
          <ul className="mt-2 max-h-48 overflow-y-auto">
            {searchResults.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <span className="line-clamp-1">
                    {m.deleted_at ? "This message was deleted" : m.content}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(m.created_at).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-12 w-1/2 self-end" />
            <Skeleton className="h-12 w-3/4" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState title="Start the conversation." />
        ) : (
          <div className="flex flex-col gap-3">
            {hasMore && (
              <div className="flex justify-center">
                {loadingMore ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <button
                    onClick={loadOlder}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Load older messages
                  </button>
                )}
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isOwn={m.sender_id === currentUserId}
                senderName={otherDisplayName}
                senderId={m.sender_id}
                replyTarget={
                  m.reply_to_message_id
                    ? (replyMap.get(m.reply_to_message_id) ?? null)
                    : null
                }
                onReply={startReply}
                onEdit={startEdit}
                onDeleteForMe={handleDeleteForMe}
                onDeleteForEveryone={handleDeleteForEveryone}
                onCopy={handleCopy}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        {(replyTo || editing) && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
            <div className="min-w-0 text-xs text-slate-600">
              <span className="font-semibold">
                {editing ? "Editing" : "Replying to"}
              </span>
              <span className="ml-2 line-clamp-1">
                {editing
                  ? editing.content
                  : replyTo?.deleted_at
                    ? "Original message unavailable"
                    : replyTo?.content}
              </span>
            </div>
            <button
              onClick={() => {
                setReplyTo(null);
                setEditing(null);
                setDraft("");
              }}
              aria-label="Cancel"
              className="ml-2 shrink-0 text-slate-400 hover:text-slate-600"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {pendingAttachment && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
            <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
              <span className="truncate">
                {pendingAttachment.type === "image" ? "📷" : "🎵"} {pendingAttachment.name}
              </span>
            </div>
            <button
              onClick={() => setPendingAttachment(null)}
              aria-label="Remove attachment"
              className="ml-2 shrink-0 text-slate-400 hover:text-slate-600"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {error && (
          <p className="mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</p>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={attachmentInputRef}
            type="file"
            accept="image/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAttachmentSelect(file);
            }}
          />
          <button
            onClick={() => attachmentInputRef.current?.click()}
            disabled={uploading || sending || isRecording}
            aria-label="Attach photo or audio"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          {isRecording ? (
            <VoiceRecorder onSend={handleRecordingSend} onCancel={handleRecordingCancel} onError={handleRecordingError} />
          ) : (
            <>
              <button
                onClick={() => setIsRecording(true)}
                disabled={uploading || sending}
                aria-label="Record voice message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (editing) handleEditSave();
                    else handleSend();
                  }
                }}
                placeholder="Message…"
                aria-label="Message"
                rows={1}
                className="max-h-32 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800 dark:focus:ring-indigo-900/30"
              />
              <button
                onClick={editing ? handleEditSave : handleSend}
                disabled={sending || uploading || (!draft.trim() && !pendingAttachment)}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
              >
                {uploading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}
