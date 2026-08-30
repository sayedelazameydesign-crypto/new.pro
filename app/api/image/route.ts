// ===== POST /api/image — توليد صورة (المرحلة 5.2) =====
// FLUX.1-schnell عبر Hugging Face — مجاني.  المدخل: {prompt, apiKey?} (مفتاح BYOK اختياري).
// الحماية: حد 10/دقيقة/IP + تحقق prompt + سقف حمولة + تعقيم أخطاء (لا أثر لمفتاح).

import { NextRequest } from "next/server";
import { generateImage, imageKey } from "@/lib/image";
import { sanitizeError } from "@/lib/ai";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // النموذج قد يُحمَّل أول مرة

const MAX_BODY = 20_000;
const MAX_PROMPT = 800;

export async function POST(req: NextRequest) {
  // 1) حماية الحدود (دلو مخصص للصور: 10/دقيقة افتراضيًا)
  const ip = getClientIp(req);
  const lim = Number(process.env.RATE_LIMIT_IMAGE_PER_MIN) || 10;
  const rl = await checkRateLimit("image", ip, lim);
  if (!rl.ok) {
    return Response.json(
      {
        error: "تجاوزت حد توليد الصور في الدقيقة. انتظر قليلاً ثم أعد المحاولة.",
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

  // 2) قراءة الجسم والتحقق
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return Response.json({ error: "طلب تالف" }, { status: 400 });
  }
  if (raw.length > MAX_BODY) {
    return Response.json({ error: "الحمولة أكبر من الحد" }, { status: 413 });
  }

  let body: { prompt?: string; apiKey?: string } = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return Response.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return Response.json({ error: "اكتب وصف الصورة أولًا" }, { status: 400 });
  if (prompt.length > MAX_PROMPT) {
    return Response.json({ error: `وصف الصورة طويل جدًا (الحد ${MAX_PROMPT} حرف)` }, { status: 400 });
  }

  // 3) المفتاح: لوحة المتصفح (BYOK) > بيئة Vercel
  const key = imageKey(typeof body.apiKey === "string" ? body.apiKey : undefined);
  if (!key) {
    return Response.json(
      {
        error:
          "توليد الصور يحتاج مفتاح Hugging Face — أضف HF_TOKEN في Vercel، أو الصق مفتاحك من الإعدادات → المفاتيح المجانية (HF) ليفعل فورًا",
      },
      { status: 503 }
    );
  }

  // 4) التوليد (الاستجابة صورة PNG — أو خطأ عربي معقّم)
  try {
    const { bytes, source } = await generateImage(prompt, key);
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-Image-Source": source,
      },
    });
  } catch (err) {
    const safeMsg = err instanceof Error && err.message === "HF_KEY_MISSING"
      ? "مفتاح Hugging Face مفقود"
      : sanitizeError(err, key);
    console.warn("[nawah][image-error]", { reason: safeMsg.slice(0, 140) });
    return Response.json({ error: safeMsg }, { status: 502 });
  }
}
