// ===== اختبار السباق (Race/Concurrency) لهوية التطبيق =====
// "idempotency ≠ concurrency safety": الاختبار التسلسلي قد ينجح بينما يفشل
// التنفيذ المتزامن. هذا الملف يثبت العقد تحت 10 استدعاءات متوازية لنفس الهوية:
//   Expected: بالضبط صف واحد في nahwa_users + صف واحد في nahwa_auth_identities
//             + كل الاستدعاءات العشرة تعيد SAME canonical userId.
//
// مستودعان وهميان:
//   atomic       — العمليات ذرّية (يحاكي الوضع المثالي)
//   db realistic — يحاكي دلالات PostgreSQL الحقيقية: check-then-insert غير الذرّي
//                  (قراءة ثم كتابة مع مهلة) + قيود UNIQUE — يكشف السباق الحقيقي.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureApplicationUser, type AuthIdentity, type IdentityStore } from "../lib/identity";

interface FakeUser {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  created_at: number;
}
interface FakeIdentity {
  user_id: string;
  provider: string;
  provider_account_id: string;
}

function makeStore(opts: { realisticRace?: boolean } = {}) {
  const users = new Map<string, FakeUser>();
  const identities: FakeIdentity[] = [];
  let seq = 0;
  // في الوضع الواقعي: كل عملية تنتظر فعليًا (محاكاة RTT إلى Neon)
  // فيقع التداخل الحقيقي بين SELECT و INSERT كما في قاعدة بيانات حقيقية.
  const delay = () =>
    opts.realisticRace ? new Promise((r) => setTimeout(r, 2)) : Promise.resolve();

  const store: IdentityStore = {
    async findIdentity(provider, providerAccountId) {
      await delay();
      const hit = identities.find(
        (i) => i.provider === provider && i.provider_account_id === providerAccountId
      );
      return hit ? { userId: hit.user_id } : null;
    },
    async findUserByEmail(email) {
      await delay();
      const hit = [...users.values()].find((u) => u.email === (email ?? "").toLowerCase());
      return hit ? { id: hit.id } : null;
    },
    async createUser(identity) {
      await delay(); // ← النافذة غير الذرّية: SELECTان انتهيا قبل أن يبدأ أي INSERT
      // دلالات ON CONFLICT (email) DO NOTHING RETURNING: لا نرمي — نتقارب على صف الفائز
      const email =
        (identity.email ?? "").trim().toLowerCase() ||
        `oauth-${identity.provider}-${identity.providerAccountId}@noreply.local`;
      const existing = [...users.values()].find((u) => u.email === email);
      if (existing) return { userId: existing.id };
      const id = `user-${++seq}`;
      users.set(id, {
        id,
        email,
        name: identity.name ?? null,
        password_hash: "",
        created_at: Date.now(),
      });
      return { userId: id };
    },
    async linkIdentity(userId, identity) {
      await delay();
      if (
        identities.some(
          (i) => i.provider === identity.provider && i.provider_account_id === identity.providerAccountId
        )
      ) {
        return; // ON CONFLICT DO NOTHING
      }
      if (!users.has(userId)) throw new Error("FK user_id غير موجود");
      identities.push({
        user_id: userId,
        provider: identity.provider,
        provider_account_id: identity.providerAccountId,
      });
    },
    async removeUserIfFresh(userId) {
      const u = users.get(userId);
      if (u && u.password_hash === "") users.delete(userId);
    },
  };

  return { store, users, identities };
}

const google: AuthIdentity = {
  provider: "google",
  providerAccountId: "race-google-001",
  email: "race@example.test",
  name: "مستخدم سباق",
};

async function runRace(store: IdentityStore) {
  const results = await Promise.allSettled(
    Array.from({ length: 10 }, () => ensureApplicationUser(google, store))
  );
  return results;
}

// ── R1) 10 استدعاءات متزامنة (مخزن ذرّي) → الناتج المطلوب ──
test("RACE-R1 مخزن ذرّي: 10 متزامنة → مستخدم واحد + هوية واحدة + نفس canonical", async () => {
  const { store, users, identities } = makeStore();
  const results = await runRace(store);
  const ok = results.filter((r) => r.status === "fulfilled");
  assert.equal(ok.length, 10, "كل الاستدعاءات يجب أن تنجح");
  const ids = new Set(
    ok.map((r) => (r as PromiseFulfilledResult<{ userId: string }>).value.userId)
  );
  assert.equal(ids.size, 1, "نفس canonical userId للجميع");
  assert.equal(users.size, 1, "صف واحد بالضبط في nahwa_users");
  assert.equal(identities.length, 1, "صف واحد بالضبط في nahwa_auth_identities");
});

// ── R2) 10 استدعاءات متزامنة (دلالات DB واقعية: check-then-insert غير ذرّي) ──
test("RACE-R2 دلالات DB واقعية: 10 متزامنة → مستخدم واحد + هوية واحدة + نفس canonical", async () => {
  const { store, users, identities } = makeStore({ realisticRace: true });
  const results = await runRace(store);
  const ok = results.filter((r) => r.status === "fulfilled");
  const failed = results.filter((r) => r.status === "rejected");
  console.log(
    "    نتيجة: نجح",
    ok.length,
    "من 10 —",
    failed.length,
    "فشلًا:",
    failed.map((f) => (f as PromiseRejectedResult).reason?.message?.slice(0, 60)).join(" | ")
  );
  assert.equal(ok.length, 10, "كل الاستدعاءات العشرة يجب أن تنجح تحت السباق");
  const ids = new Set(
    ok.map((r) => (r as PromiseFulfilledResult<{ userId: string }>).value.userId)
  );
  assert.equal(ids.size, 1);
  assert.equal(users.size, 1);
  assert.equal(identities.length, 1);
});
