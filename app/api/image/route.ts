// ===== POST /api/image — Pollinations (بلا مفتاح، بلا بروكسي بايتات) =====
// يُرجع رابطًا مباشرًا يحمّله المتصفح. العلم IMAGE_GENERATION_ENABLED=1.

import { NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isImageGenerationEnabled } from "@/lib/flags";
import { parseImageBody } from "@/lib/validation";
import { issuePollinationsImage } from "@/lib/ai/providers/pollinations";
import { providerBreaker } from "@/lib/ai/breaker";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const MAX_BODY = 8_000;

export async function POST(req: NextRequest) {
  if (!isImageGenerationEnabled()) {
    return Response.json(
      {
        error: "توليد الصور غير مفعّل حاليًا — اضبط IMAGE_GENERATION_ENABLED=1.",
        code: "IMAGE_DISABLED",
      },
      { status: 503 }
    );
  }

  // ~1 طلب / 5 ثوانٍ على الطبقة المجانية ≈ 12/دقيقة
  const ip = getClientIp(req);
  const lim = Number(process.env.RATE_LIMIT_IMAGE_PER_MIN) || 12;
  const rl = await checkRateLimit("image", ip, lim);
  if (!rl.ok) {
    providerBreaker.recordFailure("pollinations", { status: 429 });
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

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return Response.json({ error: "طلب تالف" }, { status: 400 });
  }
  if (raw.length > MAX_BODY) {
    return Response.json({ error: "الحمولة أكبر من الحد" }, { status: 413 });
  }

  let json: unknown = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    return Response.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const parsed = parseImageBody(json);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const issued = issuePollinationsImage({
    prompt: parsed.data.prompt,
    width: parsed.data.width,
    height: parsed.data.height,
  });
  if (!issued.ok) {
    return Response.json(
      {
        error: "مزود الصور معزول مؤقتًا بعد ضغط الحصة — أعد المحاولة بعد دقائق.",
        code: "CIRCUIT_OPEN",
      },
      { status: 429 }
    );
  }

  return Response.json(
    {
      url: issued.url,
      source: issued.source,
      width: issued.width,
      height: issued.height,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Image-Source": issued.source,
      },
    }
  );
}
