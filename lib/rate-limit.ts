// ===== طبقة حماية الحدود (Rate Limit) =====
// تعمل فورًا بدون أي إعداد: نافذة زمنية لكل IP في ذاكرة الخادم.
// عند إضافة مفاتيح Upstash (مجانية) → تنتقل تلقائيًا لتقييد موزّع عبر كل الخوادم.
// RATE_LIMIT_DISABLED=1 → تعطيل كامل (للاختبارات المحلية فقط).

export interface RateResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetInSec: number;
  source: "memory" | "upstash" | "disabled";
}

/** استخراج عنوان العميل (يدعم Vercel Proxy) */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64) || "unknown";
  return req.headers.get("x-real-ip")?.slice(0, 64) || "unknown";
}

// ── تنفيذ الذاكرة (لكل نسخة خادم — يعمل محليًا ودائمًا) ──
const mem = new Map<string, { count: number; resetAt: number }>();
let lastSweep = 0;

function memCheck(key: string, limit: number, windowSec: number): RateResult {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    for (const [k, v] of mem) if (v.resetAt <= now) mem.delete(k);
    lastSweep = now;
  }
  const cur = mem.get(key);
  if (!cur || cur.resetAt <= now) {
    mem.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, limit, remaining: limit - 1, resetInSec: windowSec, source: "memory" };
  }
  cur.count += 1;
  const ok = cur.count <= limit;
  return {
    ok,
    limit,
    remaining: Math.max(0, limit - cur.count),
    resetInSec: Math.max(0, Math.ceil((cur.resetAt - now) / 1000)),
    source: "memory",
  };
}

// ── تنفيذ Upstash (اختياري — تقييد موزّع صحيح على Vercel) ──
const hasUpstash = () => !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

async function upstashCheck(key: string, limit: number, windowSec: number): Promise<RateResult> {
  const base = (process.env.UPSTASH_REDIS_REST_URL as string).replace(/\/$/, "");
  const auth = `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`;
  const incr = await fetch(`${base}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: auth },
  });
  const j1 = (await incr.json()) as { result?: number; error?: string };
  if (!incr.ok || typeof j1.result !== "number") {
    throw new Error(j1?.error || "Upstash error");
  }
  const count = j1.result;

  let ttl = windowSec;
  try {
    if (count === 1) {
      await fetch(`${base}/expire/${encodeURIComponent(key)}/${windowSec}`, {
        headers: { Authorization: auth },
      });
    } else {
      const ttlRes = await fetch(`${base}/ttl/${encodeURIComponent(key)}`, {
        headers: { Authorization: auth },
      });
      const j2 = (await ttlRes.json()) as { result?: number };
      if (typeof j2.result === "number" && j2.result > 0) ttl = j2.result;
    }
  } catch {
    /* TTL اختياري — لا يوقف التقييد */
  }

  return {
    ok: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetInSec: ttl,
    source: "upstash",
  };
}

/** نقطة الدخول الموحدة — يستخدمها chat و conversations */
export async function checkRateLimit(
  bucket: string,
  ip: string,
  limit?: number,
  windowSec = 60
): Promise<RateResult> {
  if (process.env.RATE_LIMIT_DISABLED === "1") {
    return { ok: true, limit: 1_000_000, remaining: 1_000_000, resetInSec: 0, source: "disabled" };
  }
  const lim = limit ?? (Number(process.env.RATE_LIMIT_PER_MIN) || 20);
  const key = `rl:${bucket}:${ip}`;
  if (hasUpstash()) {
    try {
      return await upstashCheck(key, lim, windowSec);
    } catch {
      /* تعطل Upstash → نتراجع لأمان الذاكرة (لا نسمح بالانفلات) */
    }
  }
  return memCheck(key, lim, windowSec);
}
