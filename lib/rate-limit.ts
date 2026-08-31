// ===== طبقة حماية الحدود (Rate Limit) =====
// نافذة ثابتة 60ث. المسار: Neon (ذرة SQL واحدة) → ذاكرة لكل نسخة عند الفشل.
// Upstash يبقى اختياريًا إن لم يوجد DATABASE_URL (لا هدم).
// RATE_LIMIT_DISABLED=1 → تعطيل كامل (للاختبارات المحلية فقط).

import { neon } from "@neondatabase/serverless";

export type RateSource = "memory" | "upstash" | "disabled" | "neon";

export interface RateResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetInSec: number;
  source: RateSource;
}

/** استخراج عنوان العميل (يدعم Vercel Proxy) */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64) || "unknown";
  return req.headers.get("x-real-ip")?.slice(0, 64) || "unknown";
}

export function windowStartFrom(nowMs: number, windowSec: number): Date {
  const ms = windowSec * 1000;
  return new Date(Math.floor(nowMs / ms) * ms);
}

export function rateLimitBackend(): "neon" | "memory" {
  return process.env.DATABASE_URL ? "neon" : "memory";
}

export interface RateLimitDeps {
  now?: () => number;
  random?: () => number;
  hasDatabase?: () => boolean;
  neonHit?: (bucket: string, windowStart: Date) => Promise<number>;
  neonSweep?: (cutoff: Date) => Promise<void>;
}

type MemEntry = { count: number; resetAt: number };

export function createRateLimiter(deps: RateLimitDeps = {}) {
  const mem = new Map<string, MemEntry>();
  let lastSweep = 0;

  const clock = () => (deps.now ? deps.now() : Date.now());
  const rnd = () => (deps.random ? deps.random() : Math.random());
  const dbOn = () => (deps.hasDatabase ? deps.hasDatabase() : !!process.env.DATABASE_URL);

  function memCheck(key: string, limit: number, windowSec: number): RateResult {
    const now = clock();
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

  function maybeSweep(cutoff: Date): void {
    if (rnd() >= 0.1) return;
    const run = deps.neonSweep ?? defaultNeonSweep;
    void Promise.resolve()
      .then(() => run(cutoff))
      .catch((err) => {
        console.warn("[nawah][rate-limit] sweep ignored", err instanceof Error ? err.message : "sweep");
      });
  }

  async function neonCheck(bucket: string, limit: number, windowSec: number): Promise<RateResult> {
    const now = clock();
    const start = windowStartFrom(now, windowSec);
    const hit = deps.neonHit ?? defaultNeonHit;
    const count = await hit(bucket, start);
    maybeSweep(new Date(now - 2 * 60 * 60 * 1000));
    const resetInSec = Math.max(0, Math.ceil((start.getTime() + windowSec * 1000 - now) / 1000));
    return {
      ok: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetInSec,
      source: "neon",
    };
  }

  async function check(route: string, ip: string, limit?: number, windowSec = 60): Promise<RateResult> {
    if (process.env.RATE_LIMIT_DISABLED === "1") {
      return { ok: true, limit: 1_000_000, remaining: 1_000_000, resetInSec: 0, source: "disabled" };
    }
    const lim = limit ?? (Number(process.env.RATE_LIMIT_PER_MIN) || 20);
    const identifier = ip.slice(0, 64) || "unknown";
    const bucket = `${identifier}:${route}`;
    const memKey = `rl:${route}:${identifier}`;

    if (dbOn()) {
      try {
        return await neonCheck(bucket, lim, windowSec);
      } catch (err) {
        // فشل Neon → Map. لا عزل في قاطع المزودات (DB ليست مزود AI).
        console.warn("[nawah][rate-limit] neon failed, fallback memory", err instanceof Error ? err.message : "db");
      }
    } else if (hasUpstash()) {
      try {
        return await upstashCheck(memKey, lim, windowSec);
      } catch {
        /* تعطل Upstash → ذاكرة */
      }
    }
    return memCheck(memKey, lim, windowSec);
  }

  return { check, memCheck, backend: (): "neon" | "memory" => (dbOn() ? "neon" : "memory") };
}

const prod = createRateLimiter();

/** نقطة الدخول الموحدة — يستخدمها chat و conversations */
export async function checkRateLimit(
  bucket: string,
  ip: string,
  limit?: number,
  windowSec = 60
): Promise<RateResult> {
  return prod.check(bucket, ip, limit, windowSec);
}

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
    /* TTL اختياري */
  }

  return {
    ok: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetInSec: ttl,
    source: "upstash",
  };
}

// ── Neon SQL خام (بدون Drizzle migrations) ──
let sql: ReturnType<typeof neon> | null = null;
let ensure: Promise<void> | null = null;

function db() {
  if (!sql) sql = neon(process.env.DATABASE_URL as string);
  return sql;
}

export const RATE_LIMIT_DDL = `CREATE TABLE IF NOT EXISTS rate_limit_hits (
  bucket       text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
)`;

async function ensureTable(): Promise<void> {
  if (ensure) return ensure;
  ensure = (async () => {
    try {
      await db()`CREATE TABLE IF NOT EXISTS rate_limit_hits (
      bucket       text        NOT NULL,
      window_start timestamptz NOT NULL,
      count        integer     NOT NULL DEFAULT 0,
      PRIMARY KEY (bucket, window_start)
    )`;
    } catch (err) {
      ensure = null;
      throw err;
    }
  })();
  return ensure;
}

async function defaultNeonHit(bucket: string, windowStart: Date): Promise<number> {
  await ensureTable();
  const rows = (await db()`INSERT INTO rate_limit_hits (bucket, window_start, count)
    VALUES (${bucket}, ${windowStart.toISOString()}, 1)
    ON CONFLICT (bucket, window_start)
    DO UPDATE SET count = rate_limit_hits.count + 1
    RETURNING count`) as { count: number }[];
  const n = Number(rows?.[0]?.count);
  if (!Number.isFinite(n)) throw new Error("rate_limit_hits: empty returning");
  return n;
}

async function defaultNeonSweep(cutoff: Date): Promise<void> {
  await ensureTable();
  await db()`DELETE FROM rate_limit_hits WHERE window_start < ${cutoff.toISOString()}`;
}
