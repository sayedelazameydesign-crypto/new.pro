"use client";

// ===== نافذة الإعدادات: الموديل، تعليمات النظام، الإبداعية، المظهر، اللغة، المفاتيح، البيانات =====

import { useRef, useState } from "react";
import { X, Download, Upload, ExternalLink, KeyRound, Moon, Sun, Languages, Save, Eye, EyeOff } from "lucide-react";
import { MODELS } from "@/lib/models";
import { getKey, saveKey, type KeyName } from "@/lib/keys";
import type { ProviderStatus, Settings } from "@/lib/types";
import type { TFunc } from "@/lib/i18n";

interface Props {
  settings: Settings;
  status: ProviderStatus | null;
  t: TFunc;
  onSave: (s: Settings) => void;
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function SettingsModal({ settings, status, t, onSave, onClose, onExport, onImport }: Props) {
  const [form, setForm] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[86vh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* الرأس */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border)] sticky top-0 bg-[var(--card)] z-10">
          <h2 className="font-black text-lg">{t("settings")}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg)]">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* الموديل */}
          <section>
            <label className="block text-xs font-bold text-[var(--muted)] mb-2">{t("model")}</label>
            <select
              value={form.modelId}
              onChange={(e) => set("modelId", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] outline-none focus:border-indigo-500 text-sm"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.description}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--muted)] mt-1.5">gemini: 2.5-flash · gemini: 2.5-pro · gemini: 2.0-flash · hf: Mistral/Llama/Qwen · demo</p>
          </section>

          {/* تعليمات النظام */}
          <section>
            <label className="block text-xs font-bold text-[var(--muted)] mb-2">
              {t("systemPrompt")}
            </label>
            <textarea
              value={form.system}
              onChange={(e) => set("system", e.target.value)}
              rows={3}
              placeholder={t("systemPromptHint")}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] outline-none focus:border-indigo-500 text-sm resize-none"
            />
          </section>

          {/* الإبداعية */}
          <section>
            <label className="flex items-center justify-between text-xs font-bold text-[var(--muted)] mb-2">
              <span>{t("temperature")}</span>
              <span className="text-indigo-400 font-black" dir="ltr">{form.temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.1}
              value={form.temperature}
              onChange={(e) => set("temperature", Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </section>

          {/* المظهر واللغة */}
          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--muted)] mb-2">{t("theme")}</label>
              <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
                <button
                  onClick={() => set("theme", "dark")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold ${
                    form.theme === "dark" ? "bg-indigo-500 text-white" : "bg-[var(--bg)]"
                  }`}
                >
                  <Moon size={13} /> {t("dark")}
                </button>
                <button
                  onClick={() => set("theme", "light")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold ${
                    form.theme === "light" ? "bg-indigo-500 text-white" : "bg-[var(--bg)]"
                  }`}
                >
                  <Sun size={13} /> {t("light")}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--muted)] mb-2">{t("language")}</label>
              <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
                <button
                  onClick={() => set("lang", "ar")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold ${
                    form.lang === "ar" ? "bg-indigo-500 text-white" : "bg-[var(--bg)]"
                  }`}
                >
                  <Languages size={13} /> عربي
                </button>
                <button
                  onClick={() => set("lang", "en")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold ${
                    form.lang === "en" ? "bg-indigo-500 text-white" : "bg-[var(--bg)]"
                  }`}
                >
                  <Languages size={13} /> EN
                </button>
              </div>
            </div>
          </section>

          {/* لوحة إدخال المفاتيح — تُحفظ في المتصفح وتعمل فورًا */}
          <section className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--bg)]/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold">
                <KeyRound size={14} />
                {t("keys")}
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
              >
                {t("getKey")} <ExternalLink size={10} />
              </a>
            </div>
            <KeyRow name="GEMINI_API_KEY" label={t("geminiStatus")} envActive={!!status?.gemini} t={t} />
            <KeyRow name="GROQ_API_KEY" label="Groq" envActive={!!status?.groq} t={t} />
            <KeyRow name="HF_TOKEN" label={t("hfStatus")} envActive={!!status?.huggingface} t={t} />
            <KeyRow name="TAVILY_API_KEY" label={t("searchStatus")} envActive={!!status?.search} t={t} />
            <p className="text-[10px] leading-relaxed text-[var(--muted)]">{t("keysHint")}</p>
          </section>

          {/* البيانات */}
          <section>
            <label className="block text-xs font-bold text-[var(--muted)] mb-2">{t("data")}</label>
            <div className="flex gap-2">
              <button
                onClick={onExport}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border)] hover:border-indigo-500 text-xs font-bold transition-colors"
              >
                <Download size={13} /> {t("exportData")}
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border)] hover:border-indigo-500 text-xs font-bold transition-colors"
              >
                <Upload size={13} /> {t("importData")}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImport(f);
                  e.target.value = "";
                }}
              />
            </div>
          </section>

          {/* حفظ */}
          <button
            onClick={save}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all active:scale-[0.99] ${
              saved ? "bg-emerald-500 text-white" : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90"
            }`}
          >
            <Save size={15} />
            {saved ? t("copied") : t("save")}
          </button>
          <p className="text-center text-[10px] text-[var(--muted)]">{t("docs")}</p>
        </div>
      </div>
    </div>
  );
}

// ===== صف إدخال مفتاح: إظهار/إخفاء + حفظ محلي (BYOK) =====
function KeyRow({
  name,
  label,
  envActive,
  t,
}: {
  name: KeyName;
  label: string;
  envActive: boolean;
  t: TFunc;
}) {
  const [val, setVal] = useState(() => getKey(name));
  const [saved, setSaved] = useState(false);
  const [show, setShow] = useState(false);

  const localActive = !!getKey(name);
  const active = envActive || localActive;
  const src = envActive ? t("keyEnv") : localActive ? t("keyLocal") : t("inactive");

  const save = () => {
    saveKey(name, val);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[13px]">{label}</span>
        <span className={`text-[11px] font-bold ${active ? "text-emerald-400" : "text-red-400/80"}`}>
          {active ? `✓ ${src}` : src}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] focus-within:border-indigo-500 transition-colors">
          <input
            type={show ? "text" : "password"}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={t("keysInputPlaceholder")}
            dir="ltr"
            className="flex-1 bg-transparent outline-none text-[12px] placeholder:text-[var(--muted)]"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="text-[var(--muted)] hover:text-[var(--text)]"
            title={show ? t("keyHide") : t("keyShow")}
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <button
          type="button"
          onClick={save}
          className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors ${
            saved
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-[var(--bg)] border-[var(--border)] hover:border-indigo-500"
          }`}
        >
          {saved ? t("keySaved") : t("keySave")}
        </button>
      </div>
    </div>
  );
}
