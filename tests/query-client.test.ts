// ===== اختبارات حالة الخادم (TanStack Query) — المرحلة D1 =====
// loading / success / error عبر QueryClient مباشرةً (بلا React renderer — يكفي
// لإثبات معاني الحالات الثلاث + مفاتيح الاستعلام المركزية).

import { test } from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { makeQueryClient, queryKeys } from "../lib/query-client";

test("Q-1 makeQueryClient ينتج عميلًا جاهزًا بالسياسات المطلوبة", () => {
  const qc = makeQueryClient();
  assert.ok(qc instanceof QueryClient);
  assert.equal(qc.getDefaultOptions().queries?.staleTime, 30_000);
  assert.equal(qc.getDefaultOptions().queries?.retry, 1);
});

test("Q-2 loading: الاستعلام قيد الانتظار تظهر حالته pending", async () => {
  const qc = makeQueryClient();
  let resolve!: (v: string) => void;
  const p = new Promise<string>((r) => (resolve = r));
  const task = qc.fetchQuery({ queryKey: ["k"], queryFn: () => p });
  assert.equal(qc.getQueryState(["k"])?.status, "pending");
  resolve("تم");
  await task;
  assert.equal(qc.getQueryState(["k"])?.status, "success");
});

test("Q-3 success: البيانات تُخزَّن وتُسترجع من الكاش", async () => {
  const qc = makeQueryClient();
  const data = await qc.fetchQuery<{ ok: boolean }>({
    queryKey: ["status"],
    queryFn: () => ({ ok: true }),
  });
  assert.deepEqual(data, { ok: true });
  assert.equal(qc.getQueryData<{ ok: boolean }>(["status"])?.ok, true);
});

test("Q-4 error: فشل الدالة يجعل الحالة error بعد إعادة محاولة واحدة", async () => {
  const qc = makeQueryClient();
  let attempts = 0;
  await assert.rejects(
    qc.fetchQuery({
      queryKey: ["bad"],
      queryFn: async () => {
        attempts++;
        throw new Error("فشل");
      },
    })
  );
  assert.equal(qc.getQueryState(["bad"])?.status, "error");
  assert.equal(attempts, 2); // المحاولة الأولى + retry: 1
});

test("Q-5 المفاتيح المركزية ثابتة (عقد للاستهلاك)", () => {
  assert.deepEqual(queryKeys.providerStatus, ["provider-status"]);
  assert.deepEqual(queryKeys.models, ["models"]);
  assert.deepEqual(queryKeys.authStatus, ["auth-status"]);
});
