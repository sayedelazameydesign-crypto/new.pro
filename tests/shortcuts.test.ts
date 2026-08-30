// ===== CR-005: اختصار الإرسال المعتمد الوحيد (Ctrl/⌘+Enter) — node:test =====
// يضمن: لا ادعاء على Enter/Shift+Enter القائمين، ولا أي اختصار آخر.

import { test } from "node:test";
import assert from "node:assert/strict";
import { isSendShortcut } from "../lib/shortcuts";

test("K-1: Ctrl+Enter = إرسال (Windows/Linux)", () => {
  assert.equal(isSendShortcut({ key: "Enter", ctrlKey: true }), true);
});

test("K-2: ⌘+Enter = إرسال (macOS)", () => {
  assert.equal(isSendShortcut({ key: "Enter", metaKey: true }), true);
});

test("K-3: Enter وحده ليس الاختصار (يُرسل بمساره القائم، لا عبر هذه الدالة)", () => {
  assert.equal(isSendShortcut({ key: "Enter", ctrlKey: false, metaKey: false }), false);
});

test("K-4: Shift+Ctrl+Enter ليس إرسالًا (سطر جديد — محمي كسلوك قائم)", () => {
  assert.equal(isSendShortcut({ key: "Enter", ctrlKey: true, shiftKey: true }), false);
});

test("K-5: Alt+Ctrl+Enter ليس إرسالًا", () => {
  assert.equal(isSendShortcut({ key: "Enter", ctrlKey: true, altKey: true }), false);
});

test("K-6: مفاتيح أخرى مع Ctrl لا تعتبر إرسالًا", () => {
  assert.equal(isSendShortcut({ key: "k", ctrlKey: true }), false);
  assert.equal(isSendShortcut({ key: "Enter", ctrlKey: true, metaKey: true }), true); // كلا التعديلين معًا ما زال إرسالًا
});
