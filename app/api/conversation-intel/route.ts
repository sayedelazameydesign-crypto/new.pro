// ===== POST /api/conversation-intel — CR-006 (Item 6): توليد عنوان أفضل للمحادثة =====
// العقد المعتمد (أ–و) — لا كود آخر يمس هذا المسار:
//   · خادم stateless: الطلب يحمل modelId + source (أول رسالة مستخدم فقط — privacy A).
//   · لا استدعاء عند غياب المفاتيح (no-provider) — بلا مشاركة demo في العناوين.
//   · JSON بسيط (لا SSE)؛ الأخطاء مُعقَّمة بـ sanitizeError (لا مفاتيح/محتوى).
//   · rate-limit: bucket "intel" 10/دقيقة/IP (عقد هـ).
// لا يلمس: /api/chat، /api/conversations، auth، db، validation.ts القائمة.

import { NextRequest } from "next/server";
import { resolveProvider, sanitizeError, streamReply } from "@/lib/ai";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  intelRequestSchema,
  cleanSource,
  sanitizeTitle,
  intelSystem,
  INTEL_MAX_TOKENS,
  INTEL_TEMPERATURE,
  type IntelResult,
} from "@/lib/intel";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // نفس /api/chat — أمان Vercel Hobby

export async function POST(req: NextRequest) {
  // ── 1) حماية الحدود (bucket خاص بالعناوين) ──
  const ip = getClientIp(req);
  const rl = await checkRateLimit("intel", ip, 10);
  if (!rl.ok) {
    return Response.json(
      {
        ok: false,
        code: "rate-limited",
        error: "تجاوزت الحد المسموح لتوليد العناوين في الدقيقة. انتظر قليلاً.",
        resetInSec: rl.resetInSec,
      },
      { status: 429, headers: { "Retry-After": String(Math.max(1, rl.resetInSec)) } }
    );
  }

  // ── 2) تحقق Zod (نفس نمط /api/chat — بلا تعديل validation.ts القائمة) ──
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, code: "invalid", error: "جسم الطلب غير صالح." }, { status: 400 });
  }
  const parsed = intelRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "invalid", error: "طلب غير صالح: " + parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  // ── 3) قاعدة الخصوصية A: تنظيف المصدر (فرض سقف صارم) — مصدر فارغ بعد التنظيف = رفض ──
  const source = cleanSource(parsed.data.source);
  if (!source) {
    return Response.json({ ok: false, code: "invalid", error: "لا يوجد نص صالح لتوليد العنوان." }, { status: 400 });
  }

  // ── 4) المزود: لا استدعاء بلا مفتاح (no-provider / demo / search) ──
  const modelId = parsed.data.modelId || "gemini:gemini-2.5-flash";
  const resolved = resolveProvider(modelId, parsed.data.apiKey);
  if (resolved.provider === "demo" || resolved.provider === "search") {
    return Response.json({
      ok: false,
      code: "no-provider",
      error: "لا يوجد مزود مفعّل لتوليد العنوان — سيبقى العنوان المحلي.",
    });
  }

  // ── 5) التوليد: جمع تدفق المزود (JSON بلا SSE) + تعقيم العنوان ──
  try {
    let out = "";
    for await (const chunk of streamReply({
      provider: resolved.provider,
      model: resolved.model,
      messages: [{ role: "user", content: source }],
      apiKey: resolved.apiKey,
      maxTokens: INTEL_MAX_TOKENS,
      temperature: INTEL_TEMPERATURE,
      system: intelSystem(parsed.data.lang),
    })) {
      out += chunk;
      if (out.length > 2000) break; // حارس ضد تدفق مارق
    }
    const value = sanitizeTitle(out);
    if (!value) {
      return Response.json({
        ok: false,
        code: "provider-error",
        error: "لم ينتج المزود عنوانًا صالحًا — سيبقى العنوان المحلي.",
      });
    }
    const result: IntelResult = { ok: true, value, provider: resolved.provider, model: resolved.model, generatedAt: Date.now() };
    return Response.json(result);
  } catch (err) {
    // لا تسريب: نعقّم المفتاح والمحتوى الحساس من الرسالة
    const safe = sanitizeError(err, resolved.apiKey, parsed.data.apiKey, source);
    return Response.json({ ok: false, code: "provider-error", error: safe });
  }
}
