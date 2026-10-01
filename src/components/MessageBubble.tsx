"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "./shared";
import { AudioPlayer } from "./AudioPlayer";
import type { Message } from "@/lib/types";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type MenuAction = "copy" | "reply" | "edit" | "deleteMe" | "deleteAll";

export function MessageBubble({
  message,
  isOwn,
  senderName,
  senderId,
  replyTarget,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onCopy,
}: {
  message: Message;
  isOwn: boolean;
  senderName: string;
  senderId: string;
  replyTarget: Message | null;
  onReply: (m: Message) => void;
  onEdit: (m: Message) => void;
  onDeleteForMe: (m: Message) => void;
  onDeleteForEveryone: (m: Message) => void;
  onCopy: (text: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    bubbleRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const deleted = message.deleted_at !== null;

  function handleAction(action: MenuAction) {
    setMenuOpen(false);
    switch (action) {
      case "copy":
        onCopy(message.content);
        break;
      case "reply":
        onReply(message);
        break;
      case "edit":
        onEdit(message);
        break;
      case "deleteMe":
        onDeleteForMe(message);
        break;
      case "deleteAll":
        onDeleteForEveryone(message);
        break;
    }
  }

  const menuItems: { action: MenuAction; label: string }[] = [
    { action: "copy", label: "Copy" },
    { action: "reply", label: "Reply" },
  ];
  if (isOwn && !deleted) {
    menuItems.push({ action: "edit", label: "Edit" });
  }
  if (!deleted) {
    menuItems.push({ action: "deleteMe", label: "Delete for me" });
  }
  if (isOwn && !deleted) {
    menuItems.push({ action: "deleteAll", label: "Delete for everyone" });
  }

  return (
    <div ref={bubbleRef} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`group relative max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && (
          <div className="mb-1 ml-1 flex items-center gap-1.5">
            <Avatar name={senderName} id={senderId} size="sm" />
            <span className="text-xs font-medium text-slate-500">{senderName}</span>
          </div>
        )}

        {message.reply_to_message_id && (
          <div
            className={`mb-1 rounded-lg border-l-2 px-2.5 py-1.5 text-xs ${
              isOwn
                ? "border-indigo-300 bg-indigo-100/60 text-indigo-900 dark:bg-indigo-900/40"
                : "border-slate-300 bg-slate-100 text-slate-600 dark:bg-slate-800"
            }`}
          >
            {replyTarget ? (
              <>
                <span className="font-semibold">
                  {replyTarget.sender_id === senderId ? "You" : senderName}
                </span>
                <span className="mt-0.5 line-clamp-2 block">
                  {replyTarget.deleted_at
                    ? "Original message unavailable"
                    : replyTarget.content}
                </span>
              </>
            ) : (
              <span className="italic text-slate-400">Original message unavailable</span>
            )}
          </div>
        )}

        <div
          className={`relative rounded-2xl px-3.5 py-2 ${
            isOwn
              ? "rounded-br-md bg-indigo-600 text-white"
              : "rounded-bl-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
          } ${deleted ? "opacity-70" : ""}`}
        >
          {deleted ? (
            <p className="text-sm italic">This message was deleted</p>
          ) : (
            <>
              {message.attachment_url && message.attachment_type === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.attachment_url}
                  alt={message.attachment_name ?? "attachment"}
                  className="mb-1.5 max-h-64 max-w-full rounded-lg"
                />
              )}
              {message.attachment_url && message.attachment_type === "audio" && (
                <AudioPlayer src={message.attachment_url} isOwn={isOwn} />
              )}
              {message.content && (
                <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
              )}
            </>
          )}
          <div
            className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
              isOwn ? "text-indigo-200" : "text-slate-400"
            }`}
          >
            {message.edited_at && !deleted && <span>Edited</span>}
            <span>{formatTimestamp(message.created_at)}</span>
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Message options"
            className={`absolute -top-3 ${isOwn ? "-left-2" : "-right-2"} flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-opacity hover:text-slate-900 group-hover:opacity-100 max-md:opacity-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div
            ref={menuRef}
            className={`absolute z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800 ${
              isOwn ? "right-0" : "left-0"
            }`}
          >
            {menuItems.map((item) => (
              <button
                key={item.action}
                onClick={() => handleAction(item.action)}
                className="block w-full px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
