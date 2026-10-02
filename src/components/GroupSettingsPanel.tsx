"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar } from "./shared";
import { useUserSearch } from "@/hooks/useUserSearch";
import type { GroupMember } from "@/lib/types";

export function GroupSettingsPanel({
  conversationId,
  currentUserId,
  groupName,
  onClose,
  onChanged,
}: {
  conversationId: string;
  currentUserId: string;
  groupName: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const { results, searching, search, clear } = useUserSearch();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const loadMembers = useCallback(async () => {
    const { getSupabase } = await import("@/lib/supabase/client");
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("get_group_members", {
      p_conversation: conversationId,
    });
    if (error) {
      setError("Failed to load members.");
    } else {
      setMembers((data as GroupMember[]) ?? []);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMembers();
  }, [loadMembers]);

  const isAdmin = members.some(
    (m) => m.user_id === currentUserId && m.role === "admin",
  );

  async function handleKick(userId: string) {
    setActing(true);
    setError(null);
    try {
      const { getSupabase } = await import("@/lib/supabase/client");
      await getSupabase().rpc("kick_group_member", {
        p_conversation: conversationId,
        p_user: userId,
      });
      await loadMembers();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member.");
    } finally {
      setActing(false);
    }
  }

  async function handleMakeAdmin(userId: string) {
    setActing(true);
    setError(null);
    try {
      const { getSupabase } = await import("@/lib/supabase/client");
      await getSupabase().rpc("make_group_admin", {
        p_conversation: conversationId,
        p_user: userId,
      });
      await loadMembers();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to make admin.");
    } finally {
      setActing(false);
    }
  }

  async function handleAddMembers() {
    if (selected.length === 0) return;
    setActing(true);
    setError(null);
    try {
      const { getSupabase } = await import("@/lib/supabase/client");
      await getSupabase().rpc("add_group_members", {
        p_conversation: conversationId,
        p_member_ids: selected,
      });
      setSelected([]);
      setQuery("");
      clear();
      setAddOpen(false);
      await loadMembers();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add members.");
    } finally {
      setActing(false);
    }
  }

  async function handleSaveGroupName() {
    if (!newGroupName.trim()) {
      setError("Group name is required.");
      return;
    }
    setSavingName(true);
    setError(null);
    try {
      const { getSupabase } = await import("@/lib/supabase/client");
      await getSupabase().rpc("update_group_name", {
        p_conversation: conversationId,
        p_new_name: newGroupName.trim(),
      });
      setEditingName(false);
      setNewGroupName("");
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update group name.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleLeaveGroup() {
    setActing(true);
    setError(null);
    try {
      const { getSupabase } = await import("@/lib/supabase/client");
      await getSupabase().rpc("leave_group", {
        p_conversation: conversationId,
      });
      onChanged?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave group.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Group Settings
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {editingName ? (
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
                className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            ) : (
              <p className="flex-1 truncate text-sm text-slate-500 dark:text-slate-400">
                {groupName}
              </p>
            )}
            {isAdmin && (
              editingName ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={handleSaveGroupName}
                    disabled={savingName}
                    aria-label="Save group name"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setNewGroupName("");
                    }}
                    aria-label="Cancel"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setNewGroupName(groupName);
                    setEditingName(true);
                  }}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
                >
                  Edit
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Members ({members.length})
            </p>
            {isAdmin && (
              <button
                onClick={() => setAddOpen((v) => !v)}
                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {addOpen ? "Cancel" : "+ Add Members"}
              </button>
            )}
          </div>

          {addOpen && isAdmin && (
            <div className="mb-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  search(e.target.value);
                }}
                placeholder="Search people…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              {searching && <p className="py-1 text-xs text-slate-400">Searching…</p>}
              <ul className="mt-1 max-h-32 overflow-y-auto">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() =>
                        setSelected((prev) =>
                          prev.includes(r.id)
                            ? prev.filter((id) => id !== r.id)
                            : [...prev, r.id],
                        )
                      }
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Avatar name={r.display_name} id={r.id} size="sm" />
                      <span className="flex-1 truncate text-sm text-slate-800 dark:text-slate-200">
                        {r.display_name}
                      </span>
                      {selected.includes(r.id) && (
                        <span className="text-indigo-600 dark:text-indigo-400">✓</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleAddMembers}
                disabled={acting || selected.length === 0}
                className="mt-2 w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Add {selected.length > 0 ? `(${selected.length})` : ""} Members
              </button>
            </div>
          )}

          {loading ? (
            <p className="py-4 text-sm text-slate-400">Loading members…</p>
          ) : (
            <ul className="space-y-1">
              {members.map((m) => {
                const isSelf = m.user_id === currentUserId;
                return (
                  <li
                    key={m.user_id}
                    className="flex items-center gap-3 rounded-xl px-2 py-2"
                  >
                    <Avatar name={m.display_name} id={m.user_id} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {isSelf ? "You" : m.display_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {m.role === "admin" ? "Admin" : "Member"}
                      </p>
                    </div>
                    {isAdmin && !isSelf && (
                      <div className="flex shrink-0 gap-1">
                        {m.role !== "admin" && (
                          <button
                            onClick={() => handleMakeAdmin(m.user_id)}
                            disabled={acting}
                            className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
                          >
                            Make Admin
                          </button>
                        )}
                        <button
                          onClick={() => handleKick(m.user_id)}
                          disabled={acting}
                          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/30"
                        >
                          Kick
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
            <button
              onClick={handleLeaveGroup}
              disabled={acting}
              className="w-full rounded-lg border border-red-200 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Leave Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
