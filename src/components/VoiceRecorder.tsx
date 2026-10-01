"use client";

import { useEffect, useRef, useState } from "react";

export function VoiceRecorder({
  onSend,
  onCancel,
  onError,
}: {
  onSend: (blob: Blob) => void;
  onCancel: () => void;
  onError?: (error: string) => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Microphone access not available. Please ensure you're using HTTPS or localhost.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.start(250);
        timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to access microphone";
        if (onError) onError(errorMessage);
        onCancel();
      }
    }
    start();
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onCancel, onError]);

  function handleSend() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      onSend(blob);
    };
    recorder.stop();
  }

  function handleCancel() {
    mediaRecorderRef.current?.stop();
    onCancel();
  }

  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleCancel}
        aria-label="Cancel recording"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
          {mm}:{ss.toString().padStart(2, "0")}
        </span>
        <div className="flex h-6 flex-1 items-end justify-end gap-[3px] overflow-hidden">
          {[...Array(24)].map((_, i) => (
            <span
              key={i}
              className="w-[3px] shrink-0 animate-pulse rounded-full bg-red-400"
              style={{
                height: `${6 + Math.abs(Math.sin(i * 1.3)) * 18}px`,
                animationDelay: `${(i % 8) * 0.09}s`,
                animationDuration: "0.9s",
              }}
            />
          ))}
        </div>
      </div>
      <button
        onClick={handleSend}
        aria-label="Send voice message"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-700"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>
    </div>
  );
}
