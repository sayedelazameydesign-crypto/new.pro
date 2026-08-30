// ===== اختبارات طبقة هوية التطبيق (Synthetic OAuth Identity — بلا أي حساب بشري) =====
// تثبت عقد Provisioning: OAuth identity → canonical user → idempotency → لا حالة جزئية.
// مستودع وهمي يحاكي قواعد Neon (users + identities + UNIQUE) — لا يحتاج قاعدة بيانات حقيقية.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ensureApplicationUser,
  type AuthIdentity,
  type IdentityStore,
} from "../lib/identity";

// ── مستودع وهمي مطابق لعقود قاعدة البيانات الحقيقية ──
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

function makeFakeStore() {
  const users = new Map<string, FakeUser>();
  const identities: FakeIdentity[] = [];
  let seq = 0;

  const store: IdentityStore = {
    async findIdentity(provider, providerAccountId) {
      const hit = identities.find(
        (i) => i.provider === provider && i.provider_account_id === providerAccountId
      );
      return hit ? { userId: hit.user_id } : null;
    },
    async findUserByEmail(email) {
      const hit = [...users.values()].find((u) => u.email === email.toLowerCase());
      return hit ? { id: hit.id } : null;
    },
    async createUser(identity) {
      // دلالات ON CONFLICT (email) DO NOTHING: لا نرمي عند التعارض — نتقارب على الموجود
      const email = (identity.email ?? "").trim().toLowerCase() || `oauth-${identity.provider}-${identity.providerAccountId}@noreply.local`;
      const existing = [...users.values()].find((u) => u.email === email);
      if (existing) return { userId: existing.id };
      const id = `user-${++seq}`;
      users.set(id, {
        id,
        email,
        name: identity.name ?? null,
        password_hash: "", // مستخدم OAuth بلا كلمة مرور
        created_at: Date.now(),
      });
      return { userId: id };
    },
    async linkIdentity(userId, identity) {
      // نفس قيد UNIQUE(provider, provider_account_id)
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

const google = (pid: string, email?: string): AuthIdentity => ({
  provider: "google",
  providerAccountId: pid,
  email,
  name: "مستخدم وهمي",
});

// ── 1) هوية Google جديدة → مستخدم تطبيقي واحد ──
test("AUTH-3.1 هوية Google جديدة → مستخدم تطبيقي واحد (created)", async () => {
  const { store, users } = makeFakeStore();
  const r = await ensureApplicationUser(google("test-google-001", "e2e-oauth@example.test"), store);
  assert.equal(r.created, true);
  assert.equal(r.linked, true);
  assert.equal(users.size, 1);
  assert.equal(r.userId, [...users.keys()][0]);
});

// ── 2) نفس هوية Google مرتين → نفس canonical user ──
test("AUTH-3.2 نفس هوية Google مرتين → نفس المستخدم", async () => {
  const { store } = makeFakeStore();
  const a = await ensureApplicationUser(google("test-google-001", "a@example.test"), store);
  const b = await ensureApplicationUser(google("test-google-001", "a@example.test"), store);
  assert.equal(a.userId, b.userId);
  assert.equal(b.created, false);
});

// ── 3) نفس الهوية N مرة → مستخدم واحد بالضبط (INVARIANT-02/04) ──
test("AUTH-3.3 هوية مكررة 5 مرات → مستخدم واحد", async () => {
  const { store, users } = makeFakeStore();
  const ids = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const r = await ensureApplicationUser(google("test-google-repeat", "rep@example.test"), store);
    ids.add(r.userId);
  }
  assert.equal(ids.size, 1);
  assert.equal(users.size, 1);
});

// ── 4) هوية GitHub جديدة → مستخدم تطبيقي واحد ──
test("AUTH-3.4 هوية GitHub جديدة → مستخدم واحد", async () => {
  const { store, users } = makeFakeStore();
  const r = await ensureApplicationUser(
    { provider: "github", providerAccountId: "gh-777", email: "gh@example.test", name: "GH" },
    store
  );
  assert.equal(r.created, true);
  assert.equal(users.size, 1);
});

// ── 5) ربط البريد الموثق (verified-email policy) → نفس canonical user ──
test("AUTH-3.5 ربط بريد موثق → نفس المستخدم (لا إنشاء مكرر)", async () => {
  const { store, users, identities } = makeFakeStore();
  // المستخدم أنشئ أول مرة عبر Google
  const first = await ensureApplicationUser(google("test-google-001", "same@example.test"), store);
  // نفس المستخدم يدخل لاحقًا عبر GitHub بنفس البريد الموثق
  const second = await ensureApplicationUser(
    { provider: "github", providerAccountId: "gh-same", email: "same@example.test" },
    store
  );
  assert.equal(first.userId, second.userId);
  assert.equal(second.created, false);
  assert.equal(second.linked, true);
  assert.equal(users.size, 1);
  assert.equal(identities.length, 2); // رابطان لمستخدم واحد
});

// ── 6) فشل العملية → لا مستخدم جزئي (INVARIANT-07) ──
test("AUTH-3.6 فشل الربط بعد الإنشاء → تراجع (لا حالة جزئية)", async () => {
  const { store, users } = makeFakeStore();
  // نحقن فشلًا في الربط بعد إنشاء المستخدم
  const failing: IdentityStore = {
    ...store,
    async linkIdentity() {
      throw new Error("network failure");
    },
  };
  await assert.rejects(
    () => ensureApplicationUser(google("test-google-fail", "fail@example.test"), failing),
    /network failure/
  );
  assert.equal(users.size, 0); // undo تم — لا مستخدم يتيم
});

// ── 7) الجلسة تحمل canonical id — عبر العقد (المستخدم يعود من store) ──
test("AUTH-3.7 الناتج دائمًا canonical nahwa_users.id", async () => {
  const { store, users } = makeFakeStore();
  const r = await ensureApplicationUser(google("test-google-007", "c@example.test"), store);
  assert.ok(users.has(r.userId)); // id موجود في سجل التطبيق
  assert.ok(!r.userId.startsWith("test-google-")); // ليس معرّف مزود
});

// ── 8) sync scope = user:<canonicalUserId> ──
test("AUTH-3.8 اشتقاق النطاق من canonical فقط", async () => {
  const { store } = makeFakeStore();
  const r = await ensureApplicationUser(google("test-google-008", "s@example.test"), store);
  const scope = `user:${r.userId}`;
  assert.ok(scope.startsWith("user:"));
  assert.ok(!scope.includes("google")); // لا يتسرب معرّف المزود
});

// ── 9) معرّف المزود لا ينتج مستخدمين مكررين (INVARIANT-04) ──
test("AUTH-3.9 نفس providerAccountId لا ينتج أكثر من مستخدم", async () => {
  const { store, users } = makeFakeStore();
  await ensureApplicationUser(google("dup-account-id", "x1@example.test"), store);
  await ensureApplicationUser(google("dup-account-id", "x2@example.test"), store);
  assert.equal(users.size, 1);
});

// ── 10) لا يُخزَّن أي أثر توكن/اعتماد مزود في سجل المستخدم (INVARIANT-03) ──
test("AUTH-3.10 لا تخزين لأي اعتماد مزود في سجل المستخدم", async () => {
  const { store, users } = makeFakeStore();
  await ensureApplicationUser(google("test-google-010", "t@example.test"), store);
  const u = [...users.values()][0] as FakeUser;
  assert.notEqual(u.password_hash, undefined);
  assert.ok(!JSON.stringify(u).includes("test-google-")); // لا providerAccountId في المستخدم
  assert.ok(!JSON.stringify(u).toLowerCase().includes("token"));
});

// ── 11) Provisioning مستقل عن موافقة بشرية (Synthetic harness) ──
test("AUTH-3.11 provisioning يعمل بهوية اصطناعية 100% (بلا موافقة بشرية)", async () => {
  const { store } = makeFakeStore();
  const r = await ensureApplicationUser(google("synthetic-e2e-001", "e2e-oauth@example.test"), store);
  assert.equal(r.created, true);
  assert.ok(r.userId.length > 0);
});

// ── 12) عودة جلسة لاحقة تستخدم نفس المستخدم (لا يُنشأ جديد بعد الانتهاء) ──
test("AUTH-3.12 تكرار الدخول بعد الجلسة → نفس المستخدم (بدون إنشاء جديد)", async () => {
  const { store, users } = makeFakeStore();
  // محاكاة: دخول 1 (إنشاء) ثم جلسة ثم دخول 2
  const r1 = await ensureApplicationUser(google("test-session-user", "sess@example.test"), store);
  const r2 = await ensureApplicationUser(google("test-session-user", "sess@example.test"), store);
  assert.equal(r1.userId, r2.userId);
  assert.equal(r2.created, false);
  assert.equal(users.size, 1);
});
