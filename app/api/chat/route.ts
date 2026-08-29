// ===== POST /api/chat — محادثة بتدفق نصي (streaming) =====
// يدعم Groq وGemini وHugging Face ووضع العرض بتراجع تلقائي — لا يفشل أبدًا.

import { NextRequest } from "next/server";
import { streamReply, resolveProvider } from "@/lib/ai";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // أقصى مدة على Vercel Hobby المجاني

interface ChatBody {
  messages?: { role: string; content: string }[];
  modelId?: string;
  system?: string;
  temperature?: number;
  apiKey?: string; // مفتاح من لوحة المتصفح (BYOK) — اختياري
}

const MAX_INPUT_PAYLOAD = 60_000; // ~60KB بأمان
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

  let body: ChatBody = {};
  try {
    const raw = await req.text();
    if (raw.length > MAX_INPUT_PAYLOAD) {
      return Response.json({ error: "الرسالة أكبر من الحد المسموح" }, { status: 413 });
    }
    body = raw ? JSON.parse(raw) : {};
  } catch {
    /* سيُرفض أدناه */
  }

  const messages = Array.isArray(body.messages)
    ? body.messages.filter((m) => m && m.role && typeof m.content === "string")
    : [];

  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || !last.content.trim()) {
    return Response.json({ error: "لا توجد رسالة مستخدم صالحة" }, { status: 400 });
  }

  // حماية: قص إضافي حتى لو أرسل العميل أكثر
  const limited = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));

  // temperature مُتحقق منه (0..1.5) وإلا الافتراضي
  const temperature =
    typeof body.temperature === "number" && Number.isFinite(body.temperature)
      ? Math.min(1.5, Math.max(0, body.temperature))
      : 0.7;

  const desiredModelId =
    typeof body.modelId === "string" && body.modelId ? body.modelId : "gemini:gemini-2.5-flash";

  // مفتاح مُرسل من لوحة المتصفح — يتقدّم على بيئة الخادم في هذه الجلسة
  const overrideKey = typeof body.apiKey === "string" ? body.apiKey.trim().slice(0, 300) : "";
  const resolved = resolveProvider(desiredModelId, overrideKey || undefined);

  const system = typeof body.system === "string" ? body.system : "";
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
        })) {
          if (aborted) break; // توقف فورًا عند إلغاء العميل
          send({ chunk });
        }
        if (!aborted) send({ done: true });
      } catch (err) {
        if (!aborted) {
          send({
            error:
              err instanceof Error ? err.message : "حدث خطأ غير متوقع من مزود الذكاء — حاول بعد قليل.",
          });
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
