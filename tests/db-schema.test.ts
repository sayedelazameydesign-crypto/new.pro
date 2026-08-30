// ===== اختبار تطابق schema Drizzle مع DDL الفعلي — المرحلة D2 =====
// بلا شبكة: يقارن تعريفات الجداول بسلاسل CREATE TABLE الحرفية الموجودة في
// lib/storage-neon.ts و lib/auth-db.ts — أي انحراف مستقبلي يكسر هذا الاختبار.

import { test } from "node:test";
import assert from "node:assert/strict";
import { getTableConfig } from "drizzle-orm/pg-core";
import { nahwaSync, nahwaUsers, nahwaAuthIdentities } from "../lib/db/schema";

function tableShape(t: Parameters<typeof getTableConfig>[0]) {
  const cfg = getTableConfig(t);
  return {
    name: cfg.name,
    columns: cfg.columns.map((c) => c.name).sort(),
  };
}

test("D-1 nahwa_sync يطابق CREATE TABLE في storage-neon.ts", () => {
  const s = tableShape(nahwaSync);
  assert.equal(s.name, "nahwa_sync");
  assert.deepEqual(s.columns, ["data", "device_id", "updated_at"]);
});

test("D-2 nahwa_users يطابق CREATE TABLE في auth-db.ts", () => {
  const s = tableShape(nahwaUsers);
  assert.equal(s.name, "nahwa_users");
  assert.deepEqual(s.columns, [
    "created_at",
    "email",
    "id",
    "image",
    "name",
    "password_hash",
  ]);
});

test("D-3 nahwa_auth_identities يطابق CREATE TABLE في auth-db.ts", () => {
  const s = tableShape(nahwaAuthIdentities);
  assert.equal(s.name, "nahwa_auth_identities");
  assert.deepEqual(s.columns, [
    "created_at",
    "email_at_provider",
    "id",
    "provider",
    "provider_account_id",
    "updated_at",
    "user_id",
  ]);
});

test("D-4 القيود الفريدة والفهارس معرّفة (uq + idx على user_id)", () => {
  const cfg = getTableConfig(nahwaAuthIdentities);
  const uniq = cfg.uniqueConstraints.map((u) => u.name);
  assert.ok(uniq.includes("uq_identity_per_provider"));
  const idx = cfg.indexes.map((i) => ((i as { config?: { name?: string } }).config?.name ?? i as object) as string)
    .map((n) => (typeof n === "string" ? n : ""));
  assert.ok(idx.includes("idx_nahwa_auth_identities_user"));
});
