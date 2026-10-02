"use client";

import { useState } from "react";
import { Avatar } from "./shared";
import { useUserSearch } from "@/hooks/useUserSearch";
import type { UserSearchResult } from "@/lib/types";

export function CreateGroupModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (groupName: string, memberIds: string[]) => Promise<void>;
}) {
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { results, searching, search } = useUserSearch();
  const [query, setQuery] = useState("");

  function toggleMember(user: UserSearchResult) {
    setSelected((prev) =>
      prev.some((m) => m.id === user.id)
        ? prev.filter((m) => m.id !== user.id)
        : [...prev, user],
    );
  }

  async function handleCreate() {
    setError(null);
    if (!groupName.trim()) {
      setError("Group name is required.");
      return;
    }
    if (selected.length === 0) {
      setError("Select at least one member.");
      return;
    }
    setCreating(true);
    try {
      await onCreate(groupName.trim(), selected.map((m) => m.id));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group.");
    } finally {
      setCreating(false);
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
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Create Group
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Group Name
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Weekend Plans"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Add Members
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                search(e.target.value);
              }}
              placeholder="Search people…"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          {selected.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Selected ({selected.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selected.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleMember(m)}
                    className="flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-1 pr-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300"
                  >
                    <Avatar name={m.display_name} id={m.id} size="sm" />
                    {m.display_name}
                    <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim() && (
            <div className="mt-2">
              {searching && <p className="py-2 text-xs text-slate-400">Searching…</p>}
              {!searching && results.length === 0 && (
                <p className="py-2 text-xs text-slate-400">No users found.</p>
              )}
              <ul className="max-h-40 overflow-y-auto">
                {results
                  .filter((r) => !selected.some((m) => m.id === r.id))
                  .map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => toggleMember(r)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Avatar name={r.display_name} id={r.id} size="sm" />
                        <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                          {r.display_name}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
