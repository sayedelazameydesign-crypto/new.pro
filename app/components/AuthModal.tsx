"use client";

// ===== نافذة الحساب: تسجيل الدخول / إنشاء حساب (بريد + كلمة مرور) =====

import { useState } from "react";
import { signIn } from "next-auth/react";
import { X, LogIn, UserPlus, Loader2, Lock } from "lucide-react";
import type { TFunc } from "@/lib/i18n";

interface Props {
  enabled: boolean;
  t: TFunc;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ enabled, t, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "register") {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        if (!r.ok) {
          setErr(j?.error ?? t("authFailed"));
          return;
        }
      }
      const res = await signIn("credentials", { redirect: false, email, password });
      if (res && res.error) {
        setErr(t("authFailed"));
        return;
      }
      onSuccess();
    } catch {
      setErr(t("authFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* الرأس */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border)]">
          <h2 className="font-black text-lg">{t("authTitle")}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg)]">
            <X size={18} />
          </button>
        </div>

        {!enabled ? (
          <div className="px-6 py-10 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Lock size={22} />
            </div>
            <p className="text-sm text-[var(--muted)] leading-relaxed">{t("authDisabledMsg")}</p>
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm font-bold">
              {t("cancel")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            {/* التبويبات */}
            <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
              <button
                type="button"
                onClick={() => { setMode("login"); setErr(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold ${
                  mode === "login" ? "bg-indigo-500 text-white" : "bg-[var(--bg)]"
                }`}
              >
                <LogIn size={13} /> {t("authLogin")}
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setErr(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold ${
                  mode === "register" ? "bg-indigo-500 text-white" : "bg-[var(--bg)]"
                }`}
              >
                <UserPlus size={13} /> {t("authRegister")}
              </button>
            </div>

            <p className="text-[11px] text-[var(--muted)] leading-relaxed">{t("authSub")}</p>

            {mode === "register" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("authName")}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] outline-none focus:border-indigo-500 text-sm"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("email")}
              dir="ltr"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] outline-none focus:border-indigo-500 text-sm"
            />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("password")}
              dir="ltr"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] outline-none focus:border-indigo-500 text-sm"
            />

            {err && (
              <div className="text-[12px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : mode === "login" ? <LogIn size={15} /> : <UserPlus size={15} />}
              {mode === "login" ? t("authLogin") : t("authRegister")}
            </button>

            <p className="text-center text-[10px] text-[var(--muted)]">{t("authHint")}</p>
          </form>
        )}
      </div>
    </div>
  );
}
