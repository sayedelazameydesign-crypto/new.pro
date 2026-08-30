"use client";

// ===== عرض الماركداون + تلوين الكود + زر نسخ =====

import React, { useState } from "react";
import { useUiStore } from "@/lib/ui-store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const lang = /language-(\w+)/.exec(className || "")?.[1] ?? "";
  const code = String(children ?? "");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      // إشعار مركزي (zustand) — نقطة الاستخدام الحقيقية للتوست
      useUiStore.getState().pushToast("success", "تم نسخ الكود إلى الحافظة");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      useUiStore.getState().pushToast("error", "تعذر النسخ — اسمح بالوصول إلى الحافظة");
    }
  };

  return (
    <div className="relative my-2 group/code">
      <div className="flex items-center justify-between px-3 py-1.5 rounded-t-xl bg-[#161b26] border border-b-0 border-[var(--border)]">
        <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase" dir="ltr">
          {lang || "code"}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          {copied ? "تم النسخ" : "نسخ"}
        </button>
      </div>
      <pre className="!rounded-t-none">{children}</pre>
    </div>
  );
}

export default function Markdown({ text }: { text: string }) {
  return (
    <div className="md text-[15px] leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: (props) => {
            const { className, children, ...rest } = props as React.ComponentPropsWithoutRef<"code">;
            const isBlock = /language-/.test(className || "") || String(children ?? "").includes("\n");
            if (isBlock) return <CodeBlock className={className}>{children}</CodeBlock>;
            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
