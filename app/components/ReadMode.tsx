"use client";

// ===== وضع القراءة (Item 2): عرض المحادثة للقراءة + تصدير Markdown/PDF =====
// - يعيد استخدام عارض Markdown الموجود (لا إعادة بناء).
// - بلا أي طلب شبكة: يعرض بيانات props فقط؛ التصدير محلي عبر lib/export.
// - الحاوية .print-area هي نافذة «حفظ كـ PDF» (طباعة المتصفح) — انظر globals.css.

import { useCallback } from "react";
import { BookOpen, FileDown, Printer, X } from "lucide-react";
import Markdown from "./Markdown";
import { downloadMarkdown, exportFileName, printConversation, roleLabel } from "@/lib/export";
import type { ChatMessage } from "@/lib/types";

interface Props {
  title: string;
  messages: ChatMessage[];
  onExit: () => void;
}

export default function ReadMode({ title, messages, onExit }: Props) {
  const handleMarkdown = useCallback(() => {
    downloadMarkdown({ title, messages }, exportFileName(title));
  }, [title, messages]);

  const handlePdf = useCallback(() => {
    printConversation();
  }, []);

  return (
    <section role="region" aria-label="وضع القراءة" className="min-h-full">
      {/* شريط رأس وضع القراءة (يُخفى في الطباعة) */}
      <header className="no-print flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[var(--border)] sticky top-0 bg-[var(--bg)] z-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 text-indigo-300 text-[11px] font-bold px-2.5 py-1">
          <BookOpen size={12} />
          وضع القراءة
        </span>
        <h2 className="text-[14px] font-bold truncate max-w-[40vw]">{title || "محادثة"}</h2>

        <div className="ms-auto flex items-center gap-1.5">
          <button
            onClick={handleMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-[12px] font-semibold text-[var(--muted)] hover:text-white hover:border-indigo-500/50 transition-colors"
            title="تصدير Markdown (.md)"
            aria-label="تصدير المحادثة بصيغة Markdown"
          >
            <FileDown size={14} />
            Markdown
          </button>
          <button
            onClick={handlePdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-[12px] font-semibold text-[var(--muted)] hover:text-white hover:border-indigo-500/50 transition-colors"
            title="حفظ كـ PDF (طباعة)"
            aria-label="حفظ المحادثة كملف PDF"
          >
            <Printer size={14} />
            PDF
          </button>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[12px] font-bold hover:border-red-500/50 hover:text-red-300 transition-colors"
            aria-label="الخروج من وضع القراءة"
          >
            <X size={14} />
            عودة
          </button>
        </div>
      </header>

      {/* المحتوى القابل للطباعة */}
      <div className="print-area max-w-3xl mx-auto px-4 py-6">
        {messages.length === 0 ? (
          <p className="text-[13px] text-[var(--muted)] text-center">لا توجد رسائل بعد في هذه المحادثة.</p>
        ) : (
          <div className="space-y-6">
            {/* ترويسة العنوان داخل المستند نفسه (للطباعة/التصدير) */}
            <div className="pb-4 border-b border-[var(--border)]">
              <h1 className="text-xl font-extrabold leading-snug">{title || "محادثة"}</h1>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {messages.length} رسالة
              </p>
            </div>

            {messages.map((m, i) => (
              <article key={m.id || `${m.role}-${i}`} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-indigo-500/10 text-indigo-300 text-[10px] font-bold px-2 py-0.5">
                    {roleLabel(m.role)}
                  </span>
                  {m.model && (
                    <span className="text-[10px] text-[var(--muted)]" dir="ltr">
                      {m.model}
                    </span>
                  )}
                </div>
                <Markdown text={m.content} />
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
