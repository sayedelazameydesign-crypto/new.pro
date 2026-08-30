"use client";

// ===== الشاشة الرئيسية: إدارة المحادثات + البث المباشر للردود =====

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUiStore } from "@/lib/ui-store";
import { copyShareLink, resolveShareId } from "@/lib/share";
import {
  Bot,
  BookOpen,
  Copy,
  Menu,
  Share2,
  Cloud,
  ImagePlus,
  LogIn,
  LogOut,
  Mic,
  Paperclip,
  RefreshCw,
  Send,
  Settings as SettingsIcon,
  Square,
  User,
  Volume2,
  WifiOff,
  X,
} from "lucide-react";
import Markdown from "./components/Markdown";
import ReadMode from "./components/ReadMode";
import Sidebar from "./components/Sidebar";
import Welcome from "./components/Welcome";
import ModelPicker from "./components/ModelPicker";
import SettingsModal from "./components/SettingsModal";
import AuthModal from "./components/AuthModal";
import { getModel, splitModelId } from "@/lib/models";
import { getKey, PROVIDER_TO_KEY } from "@/lib/keys";
import { makeT } from "@/lib/i18n";
import {
  DEFAULT_SPEECH_LANG,
  ambientSpeechApi,
  createRecognizer,
  speak,
  speechAvailable,
  stopSpeak,
  type Recognizer,
} from "@/lib/speech";
import { DEFAULTS_SETTINGS, LocalStore, newConversation, titleFromMessages } from "@/lib/storage";
import { pullRemote, pushRemote, mergeConversations } from "@/lib/sync";
import { copyText, uid } from "@/lib/utils";
import { summarize, shouldSummarize, composeSystem } from "@/lib/summary";
import type { ChatMessage, Conversation, ProviderStatus, Settings } from "@/lib/types";
import { queryKeys } from "@/lib/query-client";
import Toasts from "@/app/components/Toasts";

const store = new LocalStore();

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS_SETTINGS);
  // حالة المزودين عبر React Query (كاش + retry + staleTime) — بدل fetch منفصل
  const { data: status } = useQuery({
    queryKey: queryKeys.providerStatus,
    queryFn: async () => {
      const r = await fetch("/api/status");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as ProviderStatus;
    },
    // نفس السلوك القديم عند الفشل/قبل التحميل (لا null يزعج الواجهة):
    // لا نعرّض null — نعرض «الكل غير مفعّل» كما كان catch يفعل
    initialData: { gemini: false, huggingface: false, groq: false, search: false } as ProviderStatus,
  });
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<{ name: string; data: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerUsed, setProviderUsed] = useState<string | null>(null); // المزود الفعلي كما قرره الخادم
  const [syncState, setSyncState] = useState<"off" | "syncing" | "synced">("off");
  const [authInfo, setAuthInfo] = useState<{
    enabled: boolean;
    user: { id: string; email: string; name?: string } | null;
    providers?: { github: boolean; google: boolean };
  }>({
    enabled: false,
    user: null,
    providers: { github: false, google: false },
  });
  const [showAuth, setShowAuth] = useState(false);
  const [readMode, setReadMode] = useState(false); // Item 2: وضع القراءة (يُصفَّر عند تبديل المحادثة)
  const [shareMissing, setShareMissing] = useState<string | null>(null); // Item 3: ?c=id غير موجود محليًا
  const appliedShareRef = useRef(false); // يطبَّق مرة واحدة عند أول تحميل

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

    // Item 3 — مشاركة ?c=id: فتح المحادثة المطلوبة مرة واحدة عند أول تحميل (بلا طلب جديد)
    if (!appliedShareRef.current) {
      appliedShareRef.current = true;
      const res = resolveShareId(
        typeof window !== "undefined" ? window.location.search : null,
        nextConvs.map((c) => c.id)
      );
      if (res.status === "ok") {
        setActiveId(res.id);
      } else if (res.status === "unknown") {
        // لا محادثة عشوائية ولا انهيار: حالة not-found واضحة
        setShareMissing(res.id);
      }
    }
  }, []);

  useEffect(() => {
    loadAll();
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then(setAuthInfo)
      .catch(() => setAuthInfo({ enabled: false, user: null }));
    // PWA (المرحلة 6): تسجيل Service Worker — يتجاهل بصمت مَن لا يدعمه
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
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
    async (
      conv: Conversation,
      history: { role: string; content: string }[],
      attachments?: { name: string; data: string }[],
      systemOverride?: string
    ) => {
      const asstId = uid();
      const asst: ChatMessage = { id: asstId, role: "assistant", content: "", createdAt: Date.now() };
      setActiveId(conv.id);
      update(conv.id, (c) => ({
        ...c,
        updatedAt: Date.now(),
        messages: [...c.messages, asst],
      }));

      const model = getModel(settings.modelId);
      // مفتاح لوحة المتصفح (إن وُجد) يُرسل مع الطلب — يفعّل المزود فورًا دون بيئة
      const keyName = PROVIDER_TO_KEY[splitModelId(settings.modelId).provider];
      const apiKeyOverride = keyName ? getKey(keyName) : "";
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
            system: systemOverride ?? settings.system,
            temperature: settings.temperature,
            ...(apiKeyOverride ? { apiKey: apiKeyOverride } : {}),
            ...(attachments?.length ? { files: attachments } : {}),
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
      if ((!content && files.length === 0) || streaming) return;
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

      // ===== التذكّر (المرحلة 5.4): عند طول المحادثة يُبنى ملخص تلقائي
      // ويُخزَّن في المحادثة (يتزامن عبر Neon) ويكمل السياق بدل تكرار كل الرسائل =====
      let summary = nextConv.summary ?? "";
      let systemMsg = settings.system;
      if (shouldSummarize(nextConv.messages)) {
        summary = summarize(nextConv.messages);
        if (summary) {
          update(conv.id, (c) => ({ ...c, summary }));
          systemMsg = composeSystem(settings.system, summary);
        }
      }

      const history = nextConv.messages.map((m) => ({ role: m.role, content: m.content }));
      await run(nextConv, history, files, systemMsg);
      setFiles([]);
    },
    [active, input, files, streaming, createChat, update, run, settings.system]
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
  // ===== توليد صورة (المرحلة 5.2): FLUX عبر HF — تُعرض داخل المحادثة =====
  const generateImageFlow = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt) {
      setError(t("imagePromptRequired"));
      return;
    }
    if (streaming) return;
    setInput("");

    let conv: Conversation;
    if (active && active.messages.length > 0) conv = { ...active, messages: [...active.messages] };
    else if (active) conv = { ...active, messages: [] };
    else conv = createChat();

    const userMsg: ChatMessage = { id: uid(), role: "user", content: prompt, createdAt: Date.now() };
    const placeholderId = uid();
    const isNew = conv.messages.length === 0;
    const nextConv: Conversation = {
      ...conv,
      title: isNew ? titleFromMessages([userMsg]) : conv.title,
      updatedAt: Date.now(),
      messages: [
        ...conv.messages,
        userMsg,
        { id: placeholderId, role: "assistant", content: t("imageGenerating"), createdAt: Date.now() },
      ],
    };
    update(conv.id, () => nextConv);
    setActiveId(conv.id);
    setError(null);

    try {
      // مفتاح لوحة المتصفح (HF) يتقدّم على بيئة الخادم — نفس سياسة BYOK
      const keyName = PROVIDER_TO_KEY.huggingface;
      const apiKey = keyName ? getKey(keyName) : "";
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ...(apiKey ? { apiKey } : {}) }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      if (!blob.size) throw new Error(t("imageEmpty"));
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error(t("imageEmpty")));
        fr.readAsDataURL(blob);
      });
      update(conv.id, (c) => ({
        ...c,
        updatedAt: Date.now(),
        messages: c.messages.map((m) =>
          m.id === placeholderId ? { ...m, content: `![${t("imageAlt")}](${dataUrl})` } : m
        ),
      }));
    } catch (err) {
      update(conv.id, (c) => ({
        ...c,
        updatedAt: Date.now(),
        messages: c.messages.filter((m) => m.id !== placeholderId),
      }));
      setError((err as Error).message || t("errorProvider"));
    }
  }, [active, input, streaming, createChat, update, t]);

  // ===== الصوت (المرحلة 5.3): إملاء + قراءة عبر Web Speech API — واجهة فقط، بلا خادم =====
  const [dictating, setDictating] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const recognizerRef = useRef<Recognizer | null>(null);
  const dictBaseRef = useRef("");

  const speechLang = settings.lang === "ar" ? DEFAULT_SPEECH_LANG : "en-US";

  const toggleDictation = useCallback(async () => {
    if (dictating) {
      recognizerRef.current?.stop();
      setDictating(false);
      return;
    }
    const api = ambientSpeechApi();
    const { dictation: ok } = speechAvailable(api);
    if (!ok) {
      setError(t("speechUnsupported"));
      return;
    }
    try {
      // طلب إذن الميكروفون صراحةً (بعض المتصفحات تطلبه عند أول استخدام)
      if (navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      }
    } catch {
      /* sigamos — يأخذ المتصفح القرار عند البدء */
    }
    const base = input.trim() ? input.trim() + " " : "";
    dictBaseRef.current = base;
    const rec = createRecognizer(api, speechLang, {
      onText: (text) => setInput(dictBaseRef.current + text),
      onEnd: () => setDictating(false),
      onError: (code) => {
        setDictating(false);
        if (code !== "no-speech" && code !== "aborted") setError(t("dictationError"));
      },
    });
    if (!rec) {
      setError(t("speechUnsupported"));
      return;
    }
    recognizerRef.current = rec;
    setDictating(true);
    rec.start();
  }, [dictating, input, speechLang, t]);

  const toggleSpeak = useCallback(
    (id: string, text: string) => {
      if (speakingId === id) {
        stopSpeak(ambientSpeechApi());
        setSpeakingId(null);
        return;
      }
      const api = ambientSpeechApi();
      const ok = speak(api, text, speechLang, {
        onEnd: () => setSpeakingId(null),
        onError: () => setSpeakingId(null),
      });
      if (ok) setSpeakingId(id);
      else setError(t("speechUnsupported"));
    },
    [speakingId, speechLang, t]
  );

  // إيقاف القراءة عند تبديل المحادثة أو بدء بث جديد
  // (المقصود: التنفيذ عند تغيير activeId فقط — لا عند كل تغيير في speakingId)
  useEffect(() => {
    if (speakingId) {
      stopSpeak(ambientSpeechApi());
      setSpeakingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
  // ===== إرفاق الملفات (المرحلة 5): تُقرأ base64 وتُرسل مع الرسالة =====
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handlePickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    const next = [...files];
    for (const f of picked) {
      if (next.length >= 3) {
        setError(t("fileMax"));
        break;
      }
      if (f.size > 1_000_000) {
        setError(t("fileTooBig"));
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? "");
        const data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        setFiles((prev) => [...prev, { name: f.name, data }]);
      };
      reader.readAsDataURL(f);
    }
  };

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

  // Item 2: الخروج من وضع القراءة عند تبديل المحادثة
  useEffect(() => {
    setReadMode(false);
  }, [activeId]);

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
            {active && (
              <button
                onClick={() => setReadMode(true)}
                className="p-2 rounded-xl hover:bg-[var(--bg)]"
                title={t("readMode")}
                aria-label={t("readMode")}
              >
                <BookOpen size={18} />
              </button>
            )}
            {active && (
              <button
                onClick={async () => {
                  // Item 3: نسخ رابط ?c=id — بلا أي طلب شبكة
                  const r = await copyShareLink(active.id);
                  useUiStore
                    .getState()
                    .pushToast(r === "copied" ? "success" : "error", r === "copied" ? t("shareCopied") : t("shareCopyFailed"));
                }}
                className="p-2 rounded-xl hover:bg-[var(--bg)]"
                title={t("share")}
                aria-label={t("share")}
              >
                <Share2 size={18} />
              </button>
            )}
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

        {/* Item 3 — رابط مشاركة بمعرف غير موجود محليًا: لا عشوائية، لا انهيار */}
        {shareMissing && (
          <div className="mx-auto w-full max-w-3xl px-4 pt-3">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] font-bold text-amber-400">
              <span className="truncate">{t("shareMissing")}</span>
              <button
                onClick={() => {
                  setShareMissing(null);
                  // تنظيف الرابط (بلا إعادة تحميل، بلا طلب)
                  if (typeof window !== "undefined" && window.history?.replaceState) {
                    const url = new URL(window.location.href);
                    url.searchParams.delete("c");
                    window.history.replaceState(null, "", url.toString());
                  }
                }}
                className="shrink-0 underline underline-offset-2"
                aria-label={t("shareMissingClose")}
              >
                {t("shareMissingClose")} ←
              </button>
            </div>
          </div>
        )}

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
          ) : readMode ? (
            /* Item 2: وضع القراءة — بلا شبكة، بلا تعديل بيانات */
            <ReadMode title={active.title} messages={active.messages} onExit={() => setReadMode(false)} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {active.summary && (
                <details className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 px-4 py-3 text-[12px] leading-relaxed text-[var(--muted)]">
                  <summary className="cursor-pointer select-none font-medium">
                    🧠 {t("remember")}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-[12px]">{active.summary}</p>
                </details>
              )}
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
                            {m.role === "assistant" && (
                              <button
                                onClick={() => toggleSpeak(m.id, m.content)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] hover:bg-[var(--bg)] ${
                                  speakingId === m.id
                                    ? "text-emerald-300"
                                    : "text-[var(--muted)]"
                                }`}
                              >
                                <Volume2 size={12} className={speakingId === m.id ? "animate-pulse" : ""} />
                                {speakingId === m.id ? t("listenStop") : t("listen")}
                              </button>
                            )}
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

        {/* اختيار الموديل — مكتب (يُخفى في وضع القراءة) */}
        {!readMode && (
        <div className="hidden md:block">
          <ModelPicker
            modelId={settings.modelId}
            status={status}
            t={t}
            onPick={(id) => setSettings((s) => ({ ...s, modelId: id }))}
          />
        </div>
        )}

        {/* صندوق الإدخال (يُخفى في وضع القراءة) */}
        {!readMode && (
        <div className="px-4 pb-4 pt-2 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-xl shadow-black/5 focus-within:border-indigo-500 transition-colors">
              {/* المرفقات المحددة (المرحلة 5): شريبات صغيرة قابلة للإزالة */}
              {files.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {files.map((f, i) => (
                    <span
                      key={`${f.name}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 text-indigo-300 text-[11px] px-2 py-0.5 max-w-52 truncate"
                    >
                      <Paperclip size={11} className="shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="hover:text-white transition-colors"
                        title={t("removeFile")}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.csv,.json,.pdf,.docx"
                className="hidden"
                onChange={handlePickFiles}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={streaming || files.length >= 3}
                className="w-10 h-10 shrink-0 rounded-xl text-[var(--muted)] hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                title={t("attach")}
              >
                <Paperclip size={16} />
              </button>
              <button
                type="button"
                onClick={generateImageFlow}
                disabled={streaming || !input.trim()}
                className="w-10 h-10 shrink-0 rounded-xl text-[var(--muted)] hover:text-fuchsia-300 hover:bg-fuchsia-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                title={t("imageGenerate")}
              >
                <ImagePlus size={17} />
              </button>
              <button
                type="button"
                onClick={toggleDictation}
                disabled={streaming}
                className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                  dictating
                    ? "bg-red-500/15 text-red-300 animate-pulse"
                    : "text-[var(--muted)] hover:text-emerald-300 hover:bg-emerald-500/10"
                }`}
                title={dictating ? t("dictationStop") : t("dictation")}
              >
                <Mic size={16} />
              </button>
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
                  disabled={!input.trim() && files.length === 0}
                  className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-indigo-500/25"
                  title={t("send")}
                >
                  <Send size={17} className="rtl:-scale-x-100" />
                </button>
              )}
            </div>
            <div className="text-center text-[10px] text-[var(--muted)] mt-2 select-none">
              {dictating ? (
                <span className="text-emerald-400/90">{t("dictationHint")}</span>
              ) : (
                t("composerHint")
              )}
            </div>
          </div>
        </div>
        )}
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

      {/* إشعارات zustand (Toasts) */}
      <Toasts />

      {/* نافذة الحساب */}
      {showAuth && (
        <AuthModal
          enabled={authInfo.enabled}
          t={t}
          providers={authInfo.providers}
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
