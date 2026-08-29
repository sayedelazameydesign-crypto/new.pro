"use client";

// ===== الشاشة الرئيسية: إدارة المحادثات + البث المباشر للردود =====

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Copy,
  Menu,
  Cloud,
  LogIn,
  LogOut,
  RefreshCw,
  Send,
  Settings as SettingsIcon,
  Square,
  User,
  WifiOff,
  X,
} from "lucide-react";
import Markdown from "./components/Markdown";
import Sidebar from "./components/Sidebar";
import Welcome from "./components/Welcome";
import ModelPicker from "./components/ModelPicker";
import SettingsModal from "./components/SettingsModal";
import AuthModal from "./components/AuthModal";
import { getModel } from "@/lib/models";
import { makeT } from "@/lib/i18n";
import { DEFAULTS_SETTINGS, LocalStore, newConversation, titleFromMessages } from "@/lib/storage";
import { pullRemote, pushRemote, mergeConversations } from "@/lib/sync";
import { copyText, uid } from "@/lib/utils";
import type { ChatMessage, Conversation, ProviderStatus, Settings } from "@/lib/types";

const store = new LocalStore();

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS_SETTINGS);
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerUsed, setProviderUsed] = useState<string | null>(null); // المزود الفعلي كما قرره الخادم
  const [syncState, setSyncState] = useState<"off" | "syncing" | "synced">("off");
  const [authInfo, setAuthInfo] = useState<{ enabled: boolean; user: { id: string; email: string; name?: string } | null }>({
    enabled: false,
    user: null,
  });
  const [showAuth, setShowAuth] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipAutoScroll = useRef(false);

  const t = makeT(settings.lang);
  const active = conversations.find((c) => c.id === activeId) ?? null;
  const currentModel = getModel(settings.modelId);

  // ===== التحميل الأولي + المزامنة السحابية (قابل لإعادة الاستدعاء بعد الدخول/الخروج) =====
  const syncEnabledRef = useRef(false);

  const loadAll = useCallback(async () => {
    const [convs, st] = await Promise.all([store.load(), store.loadSettings()]);
    let nextConvs = convs;
    let nextSettings = { ...DEFAULTS_SETTINGS, ...st };

    // سحب من السحابة (إن كانت مفعّلة) ودمج ذكي مع المحلي
    const remote = await pullRemote();
    if (remote.enabled) {
      syncEnabledRef.current = true;
      setSyncState("syncing");
      nextConvs = mergeConversations(convs, remote.conversations ?? []);
      if (remote.settings) nextSettings = { ...nextSettings, ...remote.settings };
      // دفع النتيجة المدمجة لتعود السحابة متطابقة
      await pushRemote(nextConvs, nextSettings);
      setSyncState("synced");
    }

    setConversations(nextConvs);
    setSettings(nextSettings);
  }, []);

  useEffect(() => {
    loadAll();
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ gemini: false, huggingface: false, groq: false, search: false }));
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then(setAuthInfo)
      .catch(() => setAuthInfo({ enabled: false, user: null }));
  }, [loadAll]);

  // ===== الحفظ التلقائي المحلي + دفع للسحابة (مؤجل) =====
  useEffect(() => {
    const id = setTimeout(() => {
      store.saveAll(conversations);
      if (syncEnabledRef.current) {
        setSyncState("syncing");
        pushRemote(conversations, settings)
          .then((ok) => setSyncState(ok ? "synced" : "off"))
          .catch(() => setSyncState("off"));
      }
    }, 1200);
    return () => clearTimeout(id);
  }, [conversations, settings]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
    document.documentElement.lang = settings.lang;
    document.documentElement.dir = settings.lang === "ar" ? "rtl" : "ltr";
    store.saveSettings(settings);
  }, [settings]);

  // ===== التمرير التلقائي =====
  useEffect(() => {
    if (!skipAutoScroll.current) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages, streaming]);

  // ===== إدارة المحادثات =====
  const update = useCallback((pid: string, fn: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === pid ? fn(c) : c)));
  }, []);

  const startNewChat = () => {
    setActiveId(null);
    setError(null);
    setShowSidebarMobile(false);
  };

  const createChat = useCallback((): Conversation => {
    const c = newConversation();
    setConversations((prev) => [...prev, c]);
    setActiveId(c.id);
    return c;
  }, []);

  const selectChat = (id: string) => {
    setActiveId(id);
    setError(null);
    setShowSidebarMobile(false);
  };

  const deleteChat = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const renameChat = (id: string, title: string) =>
    update(id, (c) => ({ ...c, title, updatedAt: Date.now() }));

  // ===== قلب البث: يشغل المحادثة ويلحق رد المساعد =====
  const run = useCallback(
    async (conv: Conversation, history: { role: string; content: string }[]) => {
      const asstId = uid();
      const asst: ChatMessage = { id: asstId, role: "assistant", content: "", createdAt: Date.now() };
      setActiveId(conv.id);
      update(conv.id, (c) => ({
        ...c,
        updatedAt: Date.now(),
        messages: [...c.messages, asst],
      }));

      const model = getModel(settings.modelId);
      const ac = new AbortController();
      abortRef.current = ac;
      setStreaming(true);
      setError(null);
      setProviderUsed(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            modelId: settings.modelId,
            system: settings.system,
            temperature: settings.temperature,
          }),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error ?? `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";

        const handlePacket = (packet: string) => {
          for (const line of packet.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            let evt: { chunk?: string; done?: boolean; error?: string; provider?: string };
            try {
              evt = JSON.parse(payload);
            } catch {
              continue;
            }
            if (evt.provider) setProviderUsed(evt.provider);
            if (typeof evt.chunk === "string") {
              update(conv.id, (c) => ({
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === asstId ? { ...m, content: m.content + evt.chunk! } : m
                ),
              }));
            }
            if (evt.done) {
              update(conv.id, (c) => ({
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === asstId ? { ...m, model: model.name } : m
                ),
              }));
            }
            if (evt.error) setError(evt.error);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const p of parts) handlePacket(p);
        }
        if (buf.trim()) handlePacket(buf);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setError((err as Error).message || t("errorProvider"));
        }
      } finally {
        // إزالة رد فارغ (إلغاء أو خطأ قبل أول كلمة)
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conv.id
              ? { ...c, messages: c.messages.filter((m) => !(m.id === asstId && !m.content)) }
              : c
          )
        );
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [settings, update, t]
  );

  // ===== إرسال رسالة جديدة =====
  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || streaming) return;
      setInput("");

      let conv: Conversation;
      if (active && active.messages.length > 0) {
        conv = { ...active, messages: [...active.messages] };
      } else if (active) {
        conv = { ...active, messages: [] };
      } else {
        conv = createChat();
      }

      const userMsg: ChatMessage = { id: uid(), role: "user", content, createdAt: Date.now() };
      const isNew = conv.messages.length === 0;
      const nextConv: Conversation = {
        ...conv,
        title: isNew ? titleFromMessages([userMsg]) : conv.title,
        updatedAt: Date.now(),
        messages: [...conv.messages, userMsg],
      };
      update(conv.id, () => nextConv);

      const history = nextConv.messages.map((m) => ({ role: m.role, content: m.content }));
      await run(nextConv, history);
    },
    [active, input, streaming, createChat, update, run]
  );

  const stopStreaming = () => abortRef.current?.abort();

  // ===== إعادة التوليد: حذف آخر رد مساعد وإعادة الطلب بنفس السياق =====
  const regenerate = async () => {
    if (streaming || !active) return;
    const msgs = active.messages;
    const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;
    const trimmed: Conversation = {
      ...active,
      messages: msgs.filter((m) => m.id !== lastAssistant.id),
    };
    setConversations((prev) => prev.map((c) => (c.id === active.id ? trimmed : c)));
    const history = trimmed.messages.map((m) => ({ role: m.role, content: m.content }));
    await run(trimmed, history);
  };

  // ===== الإعدادات والبيانات =====
  const saveSettings = (s: Settings) => {
    setSettings(s);
    setShowSettings(false);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ settings, conversations }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nawah-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      if (Array.isArray(json.conversations)) {
        setConversations(json.conversations);
        setActiveId(null);
      }
    } catch {
      setError(t("invalidFile"));
    }
  };

  const showChat = !!active && active.messages.length > 0;

  const sidebarEl = (
    <Sidebar
      conversations={conversations}
      activeId={activeId}
      t={t}
      onNew={startNewChat}
      onSelect={selectChat}
      onDelete={deleteChat}
      onRename={renameChat}
      onOpenSettings={() => setShowSettings(true)}
    />
  );

  return (
    <div className="h-dvh flex overflow-hidden">
      {/* القائمة الجانبية — مكتب */}
      <div className="hidden md:flex">{sidebarEl}</div>

      {/* القائمة الجانبية — جوال (درج منزلق) */}
      {showSidebarMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSidebarMobile(false)} />
          <div className="relative h-full bg-[var(--card)] shadow-2xl">{sidebarEl}</div>
        </div>
      )}

      {/* منطقة المحادثة */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="md:hidden p-2 rounded-xl hover:bg-[var(--bg)]"
              onClick={() => setShowSidebarMobile(true)}
              title={t("menu")}
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">
                {showChat ? titleFromMessages(active.messages) : t("appName")}
              </div>
              <div className="text-[11px] text-[var(--muted)] flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {currentModel.name}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {error && (
              <span className="flex items-center gap-1 text-red-400 font-bold text-[11px] max-w-[180px] truncate">
                <WifiOff size={12} />
                {error}
              </span>
            )}
            {streaming && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/12 text-amber-400 font-bold text-[11px]">
                <Square size={10} className="animate-pulse" />
                {t("typing")}
              </span>
            )}
            {/* زر الحساب: دخول أو ملف المستخدم */}
            {authInfo.enabled &&
              (authInfo.user ? (
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[11px] font-black">
                    {(authInfo.user.name || authInfo.user.email)[0]?.toUpperCase()}
                  </div>
                  <span className="text-[11px] font-bold max-w-[110px] truncate" dir="ltr">
                    {authInfo.user.name || authInfo.user.email}
                  </span>
                  <button
                    onClick={async () => {
                      const { signOut } = await import("next-auth/react");
                      await signOut({ redirect: false });
                      setAuthInfo((a) => ({ ...a, user: null }));
                      await loadAll();
                    }}
                    className="text-[var(--muted)] hover:text-red-400"
                    title={t("logout")}
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[12px] font-bold hover:opacity-90 transition-opacity"
                >
                  <LogIn size={14} />
                  {t("authLogin")}
                </button>
              ))}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl hover:bg-[var(--bg)]"
              title={t("settings")}
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </header>

        {/* مؤشر المزامنة السحابية */}
        <div className="px-4 pt-1 flex justify-end">
          {syncState !== "off" && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                syncState === "synced" ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              <Cloud size={12} className={syncState === "syncing" ? "animate-pulse" : ""} />
              {syncState === "synced"
                ? authInfo.user
                  ? t("syncedAccount")
                  : t("syncedDevice")
                : t("syncing")}
            </span>
          )}
        </div>

        {/* تنبيه وضع العرض التجريبي — يرشد المستخدم لإضافة مفتاح */}
        {providerUsed === "demo" && (
          <div className="mx-auto w-full max-w-3xl px-4 pt-3">
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] font-bold text-amber-400 hover:bg-amber-500/15 transition-colors text-start"
            >
              <span className="truncate">{t("demoBanner")}</span>
              <span className="shrink-0 underline underline-offset-2">{t("addKey")} ←</span>
            </button>
          </div>
        )}

        {/* الرسائل */}
        <div
          className="flex-1 overflow-y-auto"
          onWheel={() => (skipAutoScroll.current = true)}
          onTouchMove={() => (skipAutoScroll.current = true)}
        >
          {!showChat ? (
            <Welcome t={t} onPick={sendMessage} onOpenSettings={() => setShowSettings(true)} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {active.messages.map((m, i) => (
                <div
                  key={m.id}
                  className={`msg-in flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-white shadow-lg ${
                      m.role === "user"
                        ? "bg-gradient-to-br from-slate-600 to-slate-800 shadow-black/20"
                        : "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30"
                    }`}
                  >
                    {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    {m.role === "user" ? (
                      <div className="inline-block max-w-full px-4 py-2.5 rounded-2xl rounded-tr-md bg-[var(--bubble-user)] text-[var(--bubble-user-text)] text-[15px] whitespace-pre-wrap break-words leading-relaxed shadow-md">
                        {m.content}
                      </div>
                    ) : (
                      <div className="group">
                        {streaming && i === active.messages.length - 1 && m.content === "" ? (
                          <div className="flex gap-1.5 p-3">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        ) : (
                          <>
                            <Markdown text={m.content} />
                            {streaming && i === active.messages.length - 1 && (
                              <span className="type-cursor" />
                            )}
                          </>
                        )}

                        {!streaming && m.content && (
                          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={async () => {
                                await copyText(m.content);
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[var(--muted)] hover:bg-[var(--bg)]"
                            >
                              <Copy size={12} />
                              {t("copy")}
                            </button>
                            {m.role === "assistant" && i === active.messages.length - 1 && (
                              <button
                                onClick={regenerate}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[var(--muted)] hover:bg-[var(--bg)]"
                              >
                                <RefreshCw size={12} />
                                {t("regenerate")}
                              </button>
                            )}
                            {m.model && (
                              <span className="px-2 py-1 text-[10px] text-[var(--muted)]" dir="ltr">
                                {m.model}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* اختيار الموديل — مكتب */}
        <div className="hidden md:block">
          <ModelPicker
            modelId={settings.modelId}
            status={status}
            t={t}
            onPick={(id) => setSettings((s) => ({ ...s, modelId: id }))}
          />
        </div>

        {/* صندوق الإدخال */}
        <div className="px-4 pb-4 pt-2 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-xl shadow-black/5 focus-within:border-indigo-500 transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                placeholder={t("composerPlaceholder")}
                className="flex-1 bg-transparent outline-none resize-none px-2 py-2 text-[15px] max-h-40 leading-relaxed placeholder:text-[var(--muted)]"
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 160) + "px";
                }}
              />
              {streaming ? (
                <button
                  onClick={stopStreaming}
                  className="w-11 h-11 shrink-0 rounded-xl bg-red-500/90 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                  title={t("stop")}
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-indigo-500/25"
                  title={t("send")}
                >
                  <Send size={17} className="rtl:-scale-x-100" />
                </button>
              )}
            </div>
            <div className="text-center text-[10px] text-[var(--muted)] mt-2 select-none">
              {t("composerHint")}
            </div>
          </div>
        </div>
      </main>

      {/* نافذة الإعدادات */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          status={status}
          t={t}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
          onExport={exportData}
          onImport={importData}
        />
      )}

      {/* نافذة الحساب */}
      {showAuth && (
        <AuthModal
          enabled={authInfo.enabled}
          t={t}
          onClose={() => setShowAuth(false)}
          onSuccess={async () => {
            setShowAuth(false);
            const r = await fetch("/api/auth/status").then((x) => x.json()).catch(() => null);
            if (r) setAuthInfo(r);
            await loadAll();
          }}
        />
      )}
    </div>
  );
}
