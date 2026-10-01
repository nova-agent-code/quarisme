"use client";

import { useEffect, useRef, useState } from "react";

const SPEEDS = [1, 1.5, 2, 0.5];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  isOwn,
}: {
  src: string;
  isOwn: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);
    const onProgress = () => {
      if (audio.buffered.length > 0) {
        setBuffered(audio.buffered.end(audio.buffered.length - 1));
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("progress", onProgress);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("progress", onProgress);
    };
  }, [src]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => undefined);
      setPlaying(true);
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  }

  function cycleSpeed() {
    const audio = audioRef.current;
    if (!audio) return;
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    audio.playbackRate = next;
    setSpeed(next);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div className="mb-1.5 flex items-center gap-2.5">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        aria-label={playing ? "Pause audio" : "Play audio"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          isOwn
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        }`}
      >
        {playing ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className="group relative h-1.5 w-full cursor-pointer rounded-full bg-black/15 dark:bg-white/15"
          onClick={handleSeek}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-black/10 dark:bg-white/10"
            style={{ width: `${bufferedProgress}%` }}
          />
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${
              isOwn ? "bg-white" : "bg-indigo-600"
            }`}
            style={{ width: `${progress}%` }}
          />
          <div
            className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full shadow transition-transform group-hover:scale-110 ${
              isOwn ? "bg-white" : "bg-indigo-600"
            }`}
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <div
          className={`mt-1 flex items-center justify-between text-[10px] font-medium ${
            isOwn ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <span>{formatTime(currentTime)}</span>
          <button
            onClick={cycleSpeed}
            aria-label="Playback speed"
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
              isOwn
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"
            }`}
          >
            {speed}x
          </button>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
