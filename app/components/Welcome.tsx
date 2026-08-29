"use client";

// ===== شاشة الترحيب (بدون محادثة) =====

import { Sparkles, Zap, Globe2, Cpu, ArrowRight } from "lucide-react";
import type { TFunc } from "@/lib/i18n";

interface Props {
  t: TFunc;
  onPick: (text: string) => void;
  onOpenSettings: () => void;
}

const ICONS = [Zap, Globe2, Cpu, Sparkles];
const SUGGESTION_KEYS = ["s1", "s2", "s3", "s4"];

export default function Welcome({ t, onPick, onOpenSettings }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">
      <div className="max-w-2xl w-full">
        {/* الشعار الكبير */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 mb-5">
            <Sparkles size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-black mb-2 bg-gradient-to-l from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {t("welcomeTitle")}
          </h1>
          <p className="text-[var(--muted)] text-sm max-w-md leading-relaxed">{t("welcomeSub")}</p>
          <button
            onClick={onOpenSettings}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {t("setupTitle")}
            <ArrowRight size={13} className="rtl:rotate-180" />
          </button>
        </div>

        {/* الاقتراحات */}
        <div className="grid sm:grid-cols-2 gap-3">
          {SUGGESTION_KEYS.map((k, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <button
                key={k}
                onClick={() => onPick(t(k))}
                className="flex items-center gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-indigo-500/60 hover:-translate-y-0.5 transition-all text-start"
              >
                <div className="w-9 h-9 shrink-0 rounded-xl bg-indigo-500/12 flex items-center justify-center text-indigo-400">
                  <Icon size={17} />
                </div>
                <span className="text-[13px] leading-snug text-[var(--text)]/90">{t(k)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
