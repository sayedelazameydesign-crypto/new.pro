// ===== POST /api/auth/register — إنشاء حساب (بريد + كلمة مرور مجزأة في Neon) =====

import { NextRequest } from "next/server";
import { authEnabled } from "@/lib/auth";
import { findUserByEmail, createUser, hashPassword } from "@/lib/auth-db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";

  // التحقق من الصحة أولًا (بغض النظر عن تفعيل الحسابات)
  if (!EMAIL_RE.test(email) || email.length > 120) {
    return Response.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return Response.json({ error: "كلمة المرور يجب أن تكون ٨ أحرف على الأقل" }, { status: 400 });
  }
  if (!authEnabled()) {
    return Response.json({ error: "الحسابات غير مفعّلة على هذا الخادم" }, { status: 503 });
  }

  // حماية من إساءة التسجيل
  const rl = await checkRateLimit("auth", getClientIp(req), 10);
  if (!rl.ok) {
    return Response.json({ error: "طلبات كثيرة — انتظر قليلاً", code: "RATE_LIMITED" }, { status: 429 });
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return Response.json({ error: "هذا البريد مسجّل مسبقًا — سجّل الدخول" }, { status: 409 });
    }
    const id = crypto.randomUUID();
    const displayName = name || email.split("@")[0] || "مستخدم";
    await createUser(id, email, displayName, hashPassword(password));
    return Response.json({ ok: true, id, email, name: displayName });
  } catch (err) {
    return Response.json(
      { error: "تعذر إنشاء الحساب", detail: err instanceof Error ? err.message : "" },
      { status: 500 }
    );
  }
}
