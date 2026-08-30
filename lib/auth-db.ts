// ===== طبقة قاعدة بيانات الحسابات (Neon) — الجداول تُنشأ تلقائيًا =====

import { neon } from "@neondatabase/serverless";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

let sql: ReturnType<typeof neon> | null = null;
let ensure: Promise<void> | null = null;

export function db() {
  if (!sql) sql = neon(process.env.DATABASE_URL as string);
  return sql;
}

export async function ensureTables(): Promise<void> {
  if (ensure) return ensure;
  ensure = (async () => {
    await db()`CREATE TABLE IF NOT EXISTS nahwa_users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      name          TEXT,
      image         TEXT,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    // ترقية آمنة (idempotent) للمخططات القديمة
    await db()`ALTER TABLE nahwa_users ADD COLUMN IF NOT EXISTS image TEXT`;
    // سجل هوية التطبيق (Application Identity Registry):
    // يقفل الفجوة بين OAuth Authentication و Application User Provisioning.
    await db()`CREATE TABLE IF NOT EXISTS nahwa_auth_identities (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL REFERENCES nahwa_users(id) ON DELETE CASCADE,
      provider            TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      email_at_provider   TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT uq_identity_per_provider UNIQUE (provider, provider_account_id)
    )`;
    await db()`CREATE INDEX IF NOT EXISTS idx_nahwa_auth_identities_user ON nahwa_auth_identities (user_id)`;
  })();
  return ensure;
}

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  password_hash: string;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  await ensureTables();
  const rows = (await db()`SELECT id, email, name, image, password_hash FROM nahwa_users WHERE email = ${email} LIMIT 1`) as UserRow[];
  return rows?.[0] ?? null;
}

export async function createUser(id: string, email: string, name: string, passwordHash: string): Promise<void> {
  await ensureTables();
  await db()`INSERT INTO nahwa_users (id, email, name, password_hash) VALUES (${id}, ${email}, ${name}, ${passwordHash})`;
}

// ── تجزئة كلمة المرور (scrypt من node:crypto — بدون أي مكتبات خارجية) ──
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const idx = stored.indexOf(":");
  if (idx === -1) return false;
  const salt = stored.slice(0, idx);
  const hash = stored.slice(idx + 1);
  try {
    const calc = scryptSync(password, salt, 64);
    const buf = Buffer.from(hash, "hex");
    return buf.length === calc.length && timingSafeEqual(calc, buf);
  } catch {
    return false;
  }
}
