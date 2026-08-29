"use client";

// ===== اختيار الموديل من قائمة القائمة الجانبية السفلية =====

import { useState } from "react";
import { Check, ChevronDown, Cpu } from "lucide-react";
import { MODELS, getModel } from "@/lib/models";
import type { ProviderStatus } from "@/lib/types";
import type { TFunc } from "@/lib/i18n";

interface Props {
  modelId: string;
  status: ProviderStatus | null;
  t: TFunc;
  onPick: (id: string) => void;
}

function ProviderBadge({ provider }: { provider: string }) {
  const map: Record<string, string> = {
    gemini: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    huggingface: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    groq: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    search: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    demo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  };
  const label: Record<string, string> = {
    gemini: "Gemini",
    huggingface: "Hugging Face",
    groq: "Groq",
    search: "بحث",
    demo: "Demo",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${map[provider] ?? map.demo}`}
      dir="ltr"
    >
      {label[provider] ?? provider}
    </span>
  );
}

export default function ModelPicker({ modelId, status, t, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const current = getModel(modelId);

  return (
    <div className="relative px-4 pb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:border-indigo-500/50 transition-colors text-sm"
      >
        <div className="flex-1 min-w-0 text-start">
          <div className="text-[10px] text-[var(--muted)] font-bold">{t("currentModel")}</div>
          <div className="font-bold truncate">{current.name}</div>
        </div>
        <ChevronDown size={15} className={`text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 inset-x-4 z-30 max-h-[320px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl p-1.5">
          {MODELS.map((m) => {
            const isFree = m.free;
            return (
              <button
                key={m.id}
                onClick={() => {
                  onPick(m.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-start hover:bg-[var(--bg)] transition-colors ${
                  m.id === modelId ? "bg-indigo-500/10" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[13px] truncate">{m.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isFree ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {t("free")}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--muted)] truncate mt-0.5">{m.description}</div>
                </div>
                <ProviderBadge provider={m.provider} />
                {m.id === modelId && <Check size={15} className="text-indigo-400 shrink-0" />}
              </button>
            );
          })}

          {/* حالة المفاتيح */}
          <div className="mt-1 pt-2 border-t border-[var(--border)] px-3 pb-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--muted)] mb-1.5">
              <Cpu size={11} />
              {t("providerKeys")}
            </div>
            <div className="flex gap-1.5">
              <span
                className={`flex-1 text-center px-2 py-1 rounded-lg text-[10px] font-bold ${
                  status?.groq ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/10 text-red-400/80"
                }`}
              >
                Groq {status?.groq ? "✓" : "—"}
              </span>
              <span
                className={`flex-1 text-center px-2 py-1 rounded-lg text-[10px] font-bold ${
                  status?.gemini ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/10 text-red-400/80"
                }`}
              >
                Gemini {status?.gemini ? "✓" : "—"}
              </span>
              <span
                className={`flex-1 text-center px-2 py-1 rounded-lg text-[10px] font-bold ${
                  status?.huggingface ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/10 text-red-400/80"
                }`}
              >
                HF {status?.huggingface ? "✓" : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
