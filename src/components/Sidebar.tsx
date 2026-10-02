"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, EmptyState, Skeleton } from "./shared";
import { SettingsPanel } from "./SettingsPanel";
import { CreateGroupModal } from "./CreateGroupModal";
import { useUserSearch } from "@/hooks/useUserSearch";
import { useAuth } from "@/providers/auth";
import type { ConversationSummary } from "@/lib/types";

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function Sidebar({
  conversations,
  loading,
  selectedId,
  onSelect,
  onAddConnection,
  onCreateGroup,
}: {
  conversations: ConversationSummary[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddConnection: (otherUserId: string) => Promise<string>;
  onCreateGroup: (groupName: string, memberIds: string[]) => Promise<string>;
}) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { results, searching, search, clear } = useUserSearch();
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  async function handleAdd(otherUserId: string) {
    setAddingId(otherUserId);
    setAddError(null);
    try {
      const conversationId = await onAddConnection(otherUserId);
      clear();
      setQuery("");
      onSelect(conversationId);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add connection.");
    } finally {
      setAddingId(null);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/auth");
    router.refresh();
  }

  async function handleCreateGroup(groupName: string, memberIds: string[]) {
    const conversationId = await onCreateGroup(groupName, memberIds);
    onSelect(conversationId);
  }

  return (
    <div className="flex h-full w-full flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">QuarisMe</h1>
      </div>

      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          placeholder="Search people…"
          aria-label="Search people"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          onClick={() => setGroupModalOpen(true)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6M22 11h-6" />
          </svg>
          Create Group
        </button>
        {query.trim() && (
          <div className="mt-2">
            {searching && <Skeleton className="mb-2 h-12 w-full" />}
            {!searching && results.length === 0 && (
              <p className="py-2 text-sm text-slate-400 dark:text-slate-500">No users found.</p>
            )}
            <ul className="max-h-64 overflow-y-auto">
              {results.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={r.display_name} id={r.id} size="sm" />
                    <span className="truncate text-sm font-medium text-slate-800">
                      {r.display_name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAdd(r.id)}
                    disabled={addingId === r.id}
                    className="shrink-0 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    {addingId === r.id ? "…" : "Add"}
                  </button>
                </li>
              ))}
            </ul>
            {addError && <p className="mt-1 text-xs text-red-500">{addError}</p>}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            title="No conversations yet."
            subtitle="Search for someone to start a conversation."
          />
        ) : (
          <ul>
            {conversations.map((c) => (
              <li key={c.conversation_id}>
                <button
                  onClick={() => onSelect(c.conversation_id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selectedId === c.conversation_id
                      ? "bg-indigo-50 dark:bg-indigo-900/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Avatar
                    name={c.is_group ? (c.group_name ?? "Group") : (c.other_display_name ?? "")}
                    id={c.is_group ? c.conversation_id : (c.other_user_id ?? "")}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {c.is_group ? (c.group_name ?? "Group") : (c.other_display_name ?? "")}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                        {formatTime(c.last_message_created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {c.last_message_content ?? "Start the conversation."}
                      </span>
                      {c.unread_count > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-bold text-white">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {user && (
        <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <Avatar name={user.displayName} id={user.id} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {user.displayName}
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.65 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
          <button
            onClick={handleSignOut}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400"
          >
            Sign Out
          </button>
        </div>
      )}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {groupModalOpen && (
        <CreateGroupModal
          onClose={() => setGroupModalOpen(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  );
}
