"use client";

// ===== حاوية الإشعارات (Toasts) — zustand — المرحلة D1 =====
// تقرأ المتجر المركزي وتعرض التوستات؛ كل توست يُزال ذاتيًا بعد مهلة.
// لا تؤثر على منطق التطبيق: عرض فقط (إضافة/إزالة تلقائية).

import { useEffect } from "react";
import { useUiStore, autoDismissToast } from "@/lib/ui-store";

const KIND_CLS: Record<string, string> = {
  info: "border-slate-600/60 bg-[#161b26] text-slate-200",
  error: "border-red-500/50 bg-[#1a1114] text-red-200",
  success: "border-emerald-500/50 bg-[#0f1a16] text-emerald-200",
};

export default function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  // جدولة الإزالة الذاتية لكل توست جديد (آمن في الخادم/المتصفح)
  useEffect(() => {
    for (const t of toasts) autoDismissToast(t.id);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[120] flex w-[min(92vw,360px)] -translate-x-1/2 flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`msg-in border px-4 py-2.5 rounded-xl text-sm font-semibold text-right shadow-xl backdrop-blur transition-opacity hover:opacity-90 ${KIND_CLS[t.kind] ?? KIND_CLS.info}`}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}
