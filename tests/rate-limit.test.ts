import { test } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter, windowStartFrom, RATE_LIMIT_DDL } from "../lib/rate-limit";

function stubStore() {
  const store = new Map<string, number>();
  const calls: { bucket: string; windowStart: Date }[] = [];
  return {
    calls,
    neonHit: async (bucket: string, windowStart: Date) => {
      calls.push({ bucket, windowStart });
      const k = `${bucket}|${windowStart.toISOString()}`;
      const n = (store.get(k) ?? 0) + 1;
      store.set(k, n);
      return n;
    },
  };
}

test("RL-1 تجاوز الحد من RETURNING", async () => {
  const sql = stubStore();
  const t = 0;
  const rl = createRateLimiter({
    now: () => t,
    hasDatabase: () => true,
    neonHit: sql.neonHit,
    random: () => 0.9,
  });
  const a = await rl.check("chat", "1.1.1.1", 2, 60);
  const b = await rl.check("chat", "1.1.1.1", 2, 60);
  const c = await rl.check("chat", "1.1.1.1", 2, 60);
  assert.equal(a.ok, true);
  assert.equal(a.source, "neon");
  assert.equal(b.ok, true);
  assert.equal(c.ok, false);
  assert.equal(c.remaining, 0);
  assert.equal(sql.calls[0].bucket, "1.1.1.1:chat");
});

test("RL-2 نافذة جديدة تصفّر العدّ", async () => {
  const sql = stubStore();
  let t = 0;
  const rl = createRateLimiter({
    now: () => t,
    hasDatabase: () => true,
    neonHit: sql.neonHit,
    random: () => 0.9,
  });
  await rl.check("chat", "9.9.9.9", 1, 60);
  const blocked = await rl.check("chat", "9.9.9.9", 1, 60);
  assert.equal(blocked.ok, false);
  t = 60_000;
  const next = await rl.check("chat", "9.9.9.9", 1, 60);
  assert.equal(next.ok, true);
  assert.notEqual(sql.calls[0].windowStart.toISOString(), sql.calls[2].windowStart.toISOString());
  assert.equal(windowStartFrom(60_000, 60).getTime(), 60_000);
});

test("RL-3 فشل SQL يهبط إلى Map ولا يرفض الطلب", async () => {
  const t = 0;
  const rl = createRateLimiter({
    now: () => t,
    hasDatabase: () => true,
    neonHit: async () => {
      throw new Error("neon timeout");
    },
    random: () => 0.9,
  });
  const a = await rl.check("chat", "2.2.2.2", 5, 60);
  assert.equal(a.ok, true);
  assert.equal(a.source, "memory");
});

test("RL-4 التنظيف غير المنتظر لا يرمي unhandled rejection", async () => {
  const seen: unknown[] = [];
  const onUnhandled = (err: unknown) => {
    seen.push(err);
  };
  process.on("unhandledRejection", onUnhandled);
  try {
    const rl = createRateLimiter({
      now: () => 1_000,
      hasDatabase: () => true,
      neonHit: async () => 1,
      neonSweep: async () => {
        throw new Error("sweep boom");
      },
      random: () => 0.01,
    });
    const r = await rl.check("sync", "3.3.3.3", 10, 60);
    assert.equal(r.ok, true);
    await new Promise((res) => setImmediate(res));
    await new Promise((res) => setImmediate(res));
    assert.equal(seen.length, 0);
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
});

test("RL-5 بلا DATABASE_URL → memory", async () => {
  const rl = createRateLimiter({
    now: () => 0,
    hasDatabase: () => false,
    neonHit: async () => {
      throw new Error("should not hit neon");
    },
  });
  const r = await rl.check("intel", "4.4.4.4", 10, 60);
  assert.equal(r.source, "memory");
  assert.equal(r.ok, true);
  assert.equal(rl.backend(), "memory");
});

test("RL-6 DDL خام بلا migration", () => {
  assert.match(RATE_LIMIT_DDL, /rate_limit_hits/);
  assert.match(RATE_LIMIT_DDL, /PRIMARY KEY/);
});
