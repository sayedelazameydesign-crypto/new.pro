"use client";

// ===== القائمة الجانبية: المحادثات + البحث + الإعدادات =====

import { useMemo, useState } from "react";
import {
  MessageCircle,
  Plus,
  Search,
  Settings,
  Trash2,
  Pencil,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import type { Conversation } from "@/lib/types";
import type { TFunc } from "@/lib/i18n";
import { titleFromMessages } from "@/lib/storage";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  t: TFunc;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onOpenSettings: () => void;
}

function groupKey(date: number): "today" | "last7" | "older" {
  const now = new Date();
  const d = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (target === today) return "today";
  if (today - target < 7 * 86400000) return "last7";
  return "older";
}

export default function Sidebar({
  conversations,
  activeId,
  t,
  onNew,
  onSelect,
  onDelete,
  onRename,
  onOpenSettings,
}: Props) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.trim().toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, query]);

  const groups: { key: "today" | "last7" | "older"; items: Conversation[] }[] = [];
  for (const key of ["today", "last7", "older"] as const) {
    const items = filtered.filter((c) => groupKey(c.updatedAt) === key);
    if (items.length) groups.push({ key, items });
  }

  const commitRename = (id: string) => {
    const val = editText.trim();
    if (val) onRename(id, val);
    setEditingId(null);
  };

  return (
    <aside className="w-[290px] shrink-0 h-full flex flex-col border-e border-[var(--border)] bg-[var(--card)]/60">
      {/* الشعار */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Sparkles size={20} className="text-white" />
        </div>
        <div className="leading-tight">
          <div className="font-extrabold text-[15px]">{t("appName")}</div>
          <div className="text-[11px] text-[var(--muted)]">{t("appTagline")}</div>
        </div>
      </div>

      {/* محادثة جديدة */}
      <div className="px-4">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/25"
        >
          <Plus size={17} />
          {t("newChat")}
        </button>
      </div>

      {/* البحث */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
          <Search size={15} className="text-[var(--muted)] shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="bg-transparent outline-none text-sm w-full placeholder:text-[var(--muted)]"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[var(--muted)] hover:text-[var(--text)]">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* قائمة المحادثات */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {groups.length === 0 && (
          <div className="text-center text-xs text-[var(--muted)] py-8">{t("noResults")}</div>
        )}
        {groups.map((g) => (
          <div key={g.key}>
            <div className="px-2 pb-1 text-[11px] font-bold text-[var(--muted)]">{t(g.key)}</div>
            <div className="space-y-0.5">
              {g.items.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={`group flex items-center gap-0.5 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    c.id === activeId
                      ? "bg-indigo-500/12 text-[var(--text)] font-semibold"
                      : "hover:bg-[var(--bg)] text-[var(--muted)]"
                  }`}
                >
                  <MessageCircle size={15} className="shrink-0 opacity-70" />
                  {editingId === c.id ? (
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => commitRename(c.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-transparent outline-none border-b border-indigo-500 text-sm mx-1.5"
                    />
                  ) : (
                    <span className="flex-1 min-w-0 truncate px-2">{c.title || titleFromMessages(c.messages)}</span>
                  )}
                  {editingId !== c.id && (
                    <span className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        title={t("rename")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(c.id);
                          setEditText(c.title || titleFromMessages(c.messages));
                        }}
                        className="p-1 rounded hover:bg-[var(--border)] text-[var(--muted)]"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        title={t("delete")}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(t("deleteConfirm"))) onDelete(c.id);
                        }}
                        className="p-1 rounded hover:bg-red-500/15 hover:text-red-400 text-[var(--muted)]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  )}
                  {editingId === c.id && (
                    <span className="flex items-center gap-0.5">
                      <button onClick={() => commitRename(c.id)} className="p-1 rounded hover:bg-emerald-500/15 text-emerald-500">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-[var(--border)] text-[var(--muted)]">
                        <X size={14} />
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* الإعدادات */}
      <div className="p-4 border-t border-[var(--border)]">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--bg)] transition-colors"
        >
          <Settings size={17} />
          {t("settings")}
        </button>
      </div>
    </aside>
  );
}
