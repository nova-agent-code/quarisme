"use client";

import { useTheme } from "@/providers/theme";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { theme, toggle } = useTheme();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Appearance
          </p>
          <button
            onClick={toggle}
            className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                {theme === "dark" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Dark mode
                </p>
                <p className="text-xs text-slate-400">
                  {theme === "dark" ? "On" : "Off"}
                </p>
              </div>
            </div>
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${
                theme === "dark" ? "bg-indigo-600" : "bg-slate-300"
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  theme === "dark" ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
