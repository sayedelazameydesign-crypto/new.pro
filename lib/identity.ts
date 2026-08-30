// ===== طبقة هوية التطبيق (Application Identity Registry) =====
//
// يقفل الفجوة بين «مصادقة OAuth» و«إنشاء مستخدم التطبيق»:
//
//   OAuth Provider
//       ↓ provider + providerAccountId
//   nahwa_auth_identities
//       ↓ user_id
//   nahwa_users.id  (canonical application user)
//       ↓ session.user.id
//   syncScope = user:<canonicalUserId>
//
// القاعدة الأساسية: session.user.id يجب أن يمثل دائمًا هوية التطبيق القانونية
// (canonical)، وليس معرّفًا خارجيًا (Google sub / GitHub id). بهذا تبقى
// المزامنة ومنطق التطبيق مستقلين عن المزود الاجتماعي وقابلين للاستبدال.
//
// سياسة الربط المعتمدة (LINK_POLICY: verified-email):
//   البريد قادم من مزود OAuth الذي أثبت ملكيته — لذا يُسمح بربط هوية OAuth
//   بمستخدم تطبيقي قائم بنفس البريد. المفتاح الأساسي للهوية يظل
//   (provider, providerAccountId) وليس البريد وحده؛ UNIQUE يُحمي من الازدواج.
//
// Idempotency: نفس الهوية (N مرة) → نفس canonical userId دائمًا.
// لا حالة جزئية: إن فشل الربط بعد الإنشاء → تراجع (undo) عن المستخدم الجديد.

import { db, ensureTables, findUserByEmail } from "./auth-db";
import { uid } from "./utils";
import { createHash } from "node:crypto";

export type OAuthProvider = "google" | "github";

export interface AuthIdentity {
  provider: OAuthProvider;
  providerAccountId: string;
  email?: string;
  name?: string;
  image?: string;
}

export interface EnsureIdentityResult {
  userId: string; // canonical application user ID (nahwa_users.id)
  created: boolean; // هل أُنشئ مستخدم جديد في هذه الدعوة؟
  linked: boolean; // هل أُنشئ/استُخدم ربط هوية في هذه الدعوة؟
}

/** Port: واجهة التخزين — تُحقَّق فوق Neon (realStore) أو وهمي في الاختبارات */
export interface IdentityStore {
  findIdentity(provider: OAuthProvider, providerAccountId: string): Promise<{ userId: string } | null>;
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  /** إنشاء مستخدم جديد — أو إرجاع الموجود عند تعارض البريد (ON CONFLICT DO NOTHING RETURNING).
   *  بهذا يتقارب السباق المتوازي على صف واحد: 10 استدعاءات متزامنة → صف واحد (UNIQUE(email) هو الحامي). */
  createUser(identity: AuthIdentity): Promise<{ userId: string }>;
  linkIdentity(userId: string, identity: AuthIdentity): Promise<void>;
  /** تراجع عن مستخدم أُنشئ في نفس العملية (best-effort rollback) */
  removeUserIfFresh(userId: string, note: string): Promise<void>;
}

/** بريد صناعي حتمي (deterministic) عند غياب بريد المزود — نفس الهوية → نفس البريد → converge */
function syntheticEmail(provider: string, pid: string): string {
  const h = createHash("sha256").update(`${provider}:${pid}`).digest("hex").slice(0, 24);
  return `oauth-${h}@noreply.nawah.local`;
}

// ===== التنفيذ الحقيقي فوق Neon =====
export const realIdentityStore: IdentityStore = {
  async findIdentity(provider, providerAccountId) {
    await ensureTables();
    const rows = (await db()`
      SELECT user_id FROM nahwa_auth_identities
      WHERE provider = ${provider} AND provider_account_id = ${providerAccountId}
      LIMIT 1`) as { user_id: string }[];
    return rows?.[0] ? { userId: rows[0].user_id } : null;
  },

  async findUserByEmail(email) {
    const u = await findUserByEmail(email);
    return u ? { id: u.id } : null;
  },

  async createUser(identity) {
    await ensureTables();
    const email =
      (identity.email ?? "").trim().toLowerCase() ||
      syntheticEmail(identity.provider, identity.providerAccountId);
    // ON CONFLICT (email) DO NOTHING: يمنع الازدواج حتى تحت التوازي (UNIQUE هو الحامي)
    const inserted = (await db()`
      INSERT INTO nahwa_users (id, email, name, image, password_hash)
      VALUES (${uid()}, ${email}, ${identity.name ?? null}, ${identity.image ?? null}, '')
      ON CONFLICT (email) DO NOTHING
      RETURNING id`) as { id: string }[];
    if (inserted?.[0]) return { userId: inserted[0].id };
    // سباق: مستخدم بنفس البريد أُنشئ للتو من استدعاء موازٍ → نتقارب على صفه
    const existing = (await db()`
      SELECT id FROM nahwa_users WHERE email = ${email} LIMIT 1`) as { id: string }[];
    if (existing?.[0]) return { userId: existing[0].id };
    throw new Error("IDENTITY_CONFLICT: تعذر إنشاء أو إيجاد المستخدم");
  },

  async linkIdentity(userId, identity) {
    await ensureTables();
    // ON CONFLICT DO NOTHING: إن وُجد الربط (سباق متوازٍ) لا نكرر — idempotency
    await db()`
      INSERT INTO nahwa_auth_identities (id, user_id, provider, provider_account_id, email_at_provider)
      VALUES (${uid()}, ${userId}, ${identity.provider}, ${identity.providerAccountId}, ${identity.email ?? null})
      ON CONFLICT (provider, provider_account_id) DO NOTHING`;
  },

  async removeUserIfFresh(userId, note) {
    // نزيل فقط المستخدم الذي أُنشئ للتو بلا كلمة مرور (لا نمس حسابات قائمة)
    await db()`DELETE FROM nahwa_users WHERE id = ${userId} AND password_hash = ''`;
    console.warn("[nawah][identity][rollback]", { userId, note: note.slice(0, 120) });
  },
};

/**
 * الضامن الوحيد لكل طرق الدخول: إرجاع canonical application user.
 * 1) باستخدام (provider, providerAccountId) إن وُجد — دائماً نفس المستخدم.
 * 2) وإلا بحث بالبريد الموثق من المزود (LINK_POLICY: verified-email).
 * 3) وإلا إنشاء مستخدم تطبيقي + ربط الهوية.
 * ذرّي منطقيًا (لا حالة جزئية: فشل → undo) وidempotent.
 */
export async function ensureApplicationUser(
  identity: AuthIdentity,
  store: IdentityStore = realIdentityStore
): Promise<EnsureIdentityResult> {
  const pid = String(identity.providerAccountId ?? "").trim();
  if (!identity.provider || !pid) {
    throw new Error("IDENTITY_INVALID: المزود أو providerAccountId مفقود");
  }
  const clean = { ...identity, providerAccountId: pid };

  // 1) هوية معروفة → نفس المستخدم (INVARIANT-02/04)
  const existing = await store.findIdentity(clean.provider, pid);
  if (existing) {
    console.warn("[nawah][identity][resolved]", {
      provider: clean.provider,
      userId: existing.userId,
      resolution: "existing-identity",
    });
    return { userId: existing.userId, created: false, linked: false };
  }

  // 2) مستخدم بنفس البريد الموثق → ربط الهوية به (لا إنشاء مكرر)
  const email = clean.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await store.findUserByEmail(email);
    if (byEmail) {
      await store.linkIdentity(byEmail.id, clean);
      console.warn("[nawah][identity][resolved]", {
        provider: clean.provider,
        userId: byEmail.id,
        resolution: "linked-verified-email",
      });
      return { userId: byEmail.id, created: false, linked: true };
    }
  }

  // 3) مستخدم جديد + ربط — مع تراجع إن فشل الربط (لا حالة جزئية).
  //    createUser يتقارب على صف واحد حتى تحت التوازي (ON CONFLICT + إعادة حل):
  //    10 استدعاءات متزامنة لنفس الهوية → صف واحد + نفس canonical userId.
  const fresh = await store.createUser(clean);
  try {
    await store.linkIdentity(fresh.userId, clean);
  } catch (err) {
    await store.removeUserIfFresh(fresh.userId, "link-failed");
    throw err;
  }
  console.warn("[nawah][identity][resolved]", {
    provider: clean.provider,
    userId: fresh.userId,
    resolution: "created",
  });
  return { userId: fresh.userId, created: true, linked: true };
}
