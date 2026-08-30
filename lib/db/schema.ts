// ===== تعريف قاعدة البيانات (Drizzle schema) — المرحلة D2 (Database Layer) =====
// يعرّف الجداول الثلاثة القائمة (nahwa_sync / nahwa_users / nahwa_auth_identities)
// كمتطابقة تمامًا مع عبارات CREATE TABLE الفعلية في lib/storage-neon.ts و lib/auth-db.ts.
//
// القرار الهندسي: بلا تغيير تشغيلي — لا تُستبدل استعلامات SQL الخام القائمة،
// ولا تُغيَّر migration strategy؛ هذا الملف هو المصدر المطبعي (typed source of truth)
// للتحقق (انظر tests/db-schema.test.ts) ولأي ترحيل مستقبلي مستند إلى Drizzle.
//
// السائق المناسب لقاعدة البيانات الحالية (Neon HTTP) موجود أصلًا:
// @neondatabase/serverless — لا سائق جديد.

import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

/** nahwa_sync — مزامنة الأجهزة (lib/storage-neon.ts) */
export const nahwaSync = pgTable("nahwa_sync", {
  deviceId: text("device_id").primaryKey(),
  data: text("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** nahwa_users — حسابات البريد/كلمة المرور (lib/auth-db.ts) */
export const nahwaUsers = pgTable("nahwa_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** nahwa_auth_identities — سجل هوية التطبيق (Application Identity Registry) */
export const nahwaAuthIdentities = pgTable(
  "nahwa_auth_identities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => nahwaUsers.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    emailAtProvider: text("email_at_provider"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_identity_per_provider").on(t.provider, t.providerAccountId),
    index("idx_nahwa_auth_identities_user").on(t.userId),
  ]
);
