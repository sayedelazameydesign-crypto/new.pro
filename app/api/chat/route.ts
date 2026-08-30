// ===== POST /api/chat — محادثة بتدفق نصي (streaming) =====
// يدعم Groq وGemini وHugging Face ووضع العرض بتراجع تلقائي — لا يفشل أبدًا.
// يدعم أيضًا «قراءة الملفات» (المرحلة 5): مرفقات TXT/MD/CSV/JSON/PDF/DOCX تُستخرج
// نصوصها وتُدمج في رسالة المستخدم الأخيرة (قبل ترحيلها للمزود).

import { NextRequest } from "next/server";
import { streamReply, resolveProvider, sanitizeError } from "@/lib/ai";
import { mergeAttachments } from "@/lib/file-extract";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { parseChatBody } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // أقصى مدة على Vercel Hobby المجاني

// حد الحمولة الكلية: يسمح بملفات حتى ~4MB base64 (تحت حد Vercel 4.5MB)
const MAX_INPUT_PAYLOAD = 4_400_000;
const MAX_MESSAGE_TEXT = 60_000; // حد نص الرسائل (بدون المرفقات) — لا يُفتح للإساءة النصية
const MAX_MESSAGES = 20; // عدد الرسائل الأقصى المستلم

export async function POST(req: NextRequest) {
  // ── طبقة 1: حماية الحدود (Rate Limit) — تُفحص قبل أي معالجة ──
  const ip = getClientIp(req);
  const rl = await checkRateLimit("chat", ip);
  if (!rl.ok) {
    return Response.json(
      {
        error: "تجاوزت الحد المسموح من الرسائل في الدقيقة. انتظر قليلاً ثم أعد المحاولة.",
        code: "RATE_LIMITED",
        resetInSec: rl.resetInSec,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, rl.resetInSec)),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Source": rl.source,
        },
      }
    );
  }

  // ── طبقة 2: تسوية منطق الطلب عبر zod (تعيد نفس سلوك الفلترة اليدوية القديمة حرفيًا) ──
  let rawJson: unknown = {};
  try {
    const raw = await req.text();
    if (raw.length > MAX_INPUT_PAYLOAD) {
      return Response.json({ error: "الرسالة أكبر من الحد المسموح" }, { status: 413 });
    }
    rawJson = raw ? JSON.parse(raw) : {};
  } catch {
    /* سيُرفض أدناه (messages: []) */
  }

  const body = parseChatBody(rawJson);
  const messages = body.messages.slice(0, MAX_MESSAGES);

  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return Response.json({ error: "لا توجد رسالة مستخدم صالحة" }, { status: 400 });
  }

  // حماية: سقف نص الرسائل (بدون المرفقات) — رفع حد الحمولة للملفات لا يفتح بابًا نصيًا
  const textSize = messages.reduce((n, m) => n + m.content.length, 0);
  if (textSize > MAX_MESSAGE_TEXT) {
    return Response.json({ error: "الرسالة أكبر من الحد المسموح" }, { status: 413 });
  }

  // المرحلة 5 — قراءة الملفات: تُستخرج وتُدمج في رسالة المستخدم الأخيرة (رفض واضح 400)
  try {
    await mergeAttachments(body.files, last);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "تعذر قراءة الملف المرفق" },
      { status: 400 }
    );
  }
  if (!last.content.trim()) {
    return Response.json({ error: "لا توجد رسالة مستخدم صالحة" }, { status: 400 });
  }

  // حماية: قص إضافي حتى لو أرسل العميل أكثر
  const limited = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));

  // temperature مُتحقق منه (0..1.5) وإلا الافتراضي
  const temperature =
    typeof body.temperature === "number"
      ? Math.min(1.5, Math.max(0, body.temperature))
      : 0.7;

  const desiredModelId = body.modelId ? body.modelId : "gemini:gemini-2.5-flash";

  // مفتاح مُرسل من لوحة المتصفح (BYOK) — يتقدّم على بيئة الخادم في هذه الجلسة.
  // سياسة الأمان: لا يُخزَّن خادميًا، لا يُسجَّل، لا يظهر في أخطاء أو أحداث SSE،
  // ويُرفض إن احتوى محارف تحكم (يمنع حقن الترويسات).
  const outKey =
    typeof body.apiKey === "string" ? body.apiKey.trim().slice(0, 300) : "";
  if (/[\u0000-\u001f\u007f]/.test(outKey)) {
    return Response.json(
      { error: "المفتاح غير صالح — أزل الأسطر الجديدة وأعد اللصق" },
      { status: 400 }
    );
  }
  const resolved = resolveProvider(desiredModelId, outKey || undefined);

  const system = body.system ?? "";
  const maxTokens = Math.min(2048, Number(process.env.MAX_TOKENS) || 1024);

  const enc = new TextEncoder();
  let aborted = false;
  const abortHandler = () => {
    aborted = true;
  };
  req.signal.addEventListener("abort", abortHandler, { once: true });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        if (!aborted) controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      try {
        // إعلام الواجهة بالمزود الفعلي المستخدم
        send({ provider: resolved.provider });
        for await (const chunk of streamReply({
          provider: resolved.provider,
          model: resolved.model,
          messages: limited,
          apiKey: resolved.apiKey,
          maxTokens,
          temperature,
          system,
        })) {
          if (aborted) break; // توقف فورًا عند إلغاء العميل
          send({ chunk });
        }
        if (!aborted) send({ done: true });
      } catch (err) {
        if (!aborted) {
          // تعقيم إجباري: لا يصل أي أثر للمفاتيح إلى العميل عبر SSE
          const safeMsg = sanitizeError(err, resolved.apiKey, outKey);
          // تدقيق داخلي آمن (بلا مفاتيح وبلا محتوى مستخدم)
          console.warn("[nawah][provider-error]", { provider: resolved.provider, reason: safeMsg.slice(0, 120) });
          send({ error: safeMsg });
        }
      } finally {
        req.signal.removeEventListener("abort", abortHandler);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      }
    },
    cancel() {
      aborted = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      // ترويسات الحماية ظاهرة دائمًا (قياسية) — للرصد والتحقق
      "X-RateLimit-Limit": String(rl.limit),
      "X-RateLimit-Remaining": String(rl.remaining),
      "X-RateLimit-Reset": String(rl.resetInSec),
      "X-RateLimit-Source": rl.source,
    },
  });
}
