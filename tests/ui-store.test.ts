// ===== اختبارات حالة الواجهة (zustand) — المرحلة D1 =====
// initial / transitions / reset — بلا DOM.

import { test } from "node:test";
import assert from "node:assert/strict";
import { useUiStore, autoDismissToast } from "../lib/ui-store";

test("Z-1 الحالة الأولية: لا توست", () => {
  useUiStore.setState({ toasts: [] });
  assert.deepEqual(useUiStore.getState().toasts, []);
});

test("Z-2 انتقال الحالة: pushToast يضيف بالترتيب مع معرف فريد", () => {
  useUiStore.getState().clearToasts();
  useUiStore.getState().pushToast("error", "خطأ أول");
  useUiStore.getState().pushToast("success", "نجاح ثانٍ");
  const t = useUiStore.getState().toasts;
  assert.equal(t.length, 2);
  assert.equal(t[0].kind, "error");
  assert.equal(t[1].text, "نجاح ثانٍ");
  assert.notEqual(t[0].id, t[1].id);
});

test("Z-3 سقف التوست: لا يتجاوز 4 عناصر (الأقدم يُزاح)", () => {
  useUiStore.getState().clearToasts();
  for (let i = 0; i < 6; i++) useUiStore.getState().pushToast("info", `رسالة ${i}`);
  const t = useUiStore.getState().toasts;
  assert.equal(t.length, 4);
  assert.equal(t[3].text, "رسالة 5"); // الأحدث باقٍ
  assert.ok(!t.some((x) => x.text === "رسالة 0")); // الأقدم زال
});

test("Z-4 dismissToast يزيل عنصرًا وحده", () => {
  useUiStore.getState().clearToasts();
  useUiStore.getState().pushToast("info", "أ");
  useUiStore.getState().pushToast("info", "ب");
  const id = useUiStore.getState().toasts[0].id;
  useUiStore.getState().dismissToast(id);
  assert.equal(useUiStore.getState().toasts.length, 1);
  assert.equal(useUiStore.getState().toasts[0].text, "ب");
});

test("Z-5 reset: clearToasts تعيد الحالة إلى صفر", () => {
  useUiStore.getState().pushToast("info", "x");
  useUiStore.getState().clearToasts();
  assert.deepEqual(useUiStore.getState().toasts, []);
});

test("Z-6 autoDismissToast لا يفشل بلا window (node)", () => {
  // في node لا يوجد window — يجب ألا يرمي
  assert.doesNotThrow(() => autoDismissToast("t1"));
});
