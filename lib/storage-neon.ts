// ===== التخزين السحابي عبر Neon (Postgres مجاني) — خلف /api/conversations =====
// يُنشأ الجدول تلقائيًا عند أول استخدام — صفر إعدادات يدوية.
// ملاحظة: اسم الجدول مكتوب حرفيًا (لا يمكن تعميمه كمعامل)، والقيم كلها معاملات.

import { neon } from "@neondatabase/serverless";

export interface SyncPayload {
  v: 1;
  conversations: unknown[];
  settings: unknown;
}

let sql: ReturnType<typeof neon> | null = null;
let ensure: Promise<void> | null = null;

function db() {
  if (!sql) sql = neon(process.env.DATABASE_URL as string);
  return sql;
}

async function ensureTable(): Promise<void> {
  if (ensure) return ensure;
  ensure = (async () => {
    await db()`CREATE TABLE IF NOT EXISTS nahwa_sync (
      device_id  TEXT PRIMARY KEY,
      data       TEXT NOT NULL,          -- JSON serialized: {v:1, conversations, settings}
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  })();
  return ensure;
}

export async function pullDevice(deviceId: string): Promise<SyncPayload | null> {
  await ensureTable();
  const rows = (await db()`SELECT data FROM nahwa_sync WHERE device_id = ${deviceId} LIMIT 1`) as {
    data: string;
  }[];
  if (!rows || rows.length === 0) return null;
  try {
    return JSON.parse(rows[0].data) as SyncPayload;
  } catch {
    return null;
  }
}

export async function pushDevice(deviceId: string, payload: SyncPayload): Promise<void> {
  await ensureTable();
  const data = JSON.stringify(payload);
  await db()`INSERT INTO nahwa_sync (device_id, data, updated_at)
    VALUES (${deviceId}, ${data}, now())
    ON CONFLICT (device_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
}

export async function deleteDevice(deviceId: string): Promise<void> {
  await ensureTable();
  await db()`DELETE FROM nahwa_sync WHERE device_id = ${deviceId}`;
}
