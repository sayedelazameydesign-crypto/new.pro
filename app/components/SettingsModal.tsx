"use client";

// ===== نافذة الإعدادات: الموديل، تعليمات النظام، الإبداعية، المظهر، اللغة، المفاتيح، البيانات =====

import { useRef, useState } from "react";
import { X, Download, Upload, ExternalLink, KeyRound, Moon, Sun, Languages, Save } from "lucide-react";
import { MODELS } from "@/lib/models";
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

          {/* المفاتيح المجانية */}
          <section className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--bg)]/60">
            <div className="flex items-center gap-2 text-xs font-bold mb-3">
              <KeyRound size={14} />
              {t("keys")}
            </div>
            <div className="space-y-2.5 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t("geminiStatus")}</span>
                <span className={`text-xs font-bold ${status?.gemini ? "text-emerald-400" : "text-red-400"}`}>
                  {status?.gemini ? t("active") : t("inactive")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t("hfStatus")}</span>
                <span className={`text-xs font-bold ${status?.huggingface ? "text-emerald-400" : "text-red-400"}`}>
                  {status?.huggingface ? t("active") : t("inactive")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Groq</span>
                <span className={`text-xs font-bold ${status?.groq ? "text-emerald-400" : "text-red-400"}`}>
                  {status?.groq ? t("active") : t("inactive")}
                </span>
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12px] font-bold text-indigo-400 hover:text-indigo-300"
              >
                {t("getKey")} <ExternalLink size={11} />
              </a>
            </div>
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
