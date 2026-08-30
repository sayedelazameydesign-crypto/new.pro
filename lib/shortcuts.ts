// ===== اختصارات لوحة المفاتيح (CR-005 / Item 5) — منطق نقي قابل للاختبار بدون DOM =====
// الاختصار المعتمد الوحيد (مصفوفة §6 النهائية): Ctrl/⌘ + Enter → إرسال.
// ملاحظة مقصودة: Enter وحده وShift+Enter يعالَجان في المكان القائم (أزرار/textarea) —
// هذا الملف لا يدّعي أي اختصار آخر، فلن يُكسر Enter/Shift+Enter القائمان.

export interface KeyInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

/** هل هذا هو اختصار الإرسال المعتمد؟ (Ctrl أو ⌘ + Enter — بلا Shift/Alt) */
export function isSendShortcut(e: KeyInput): boolean {
  return (
    e.key === "Enter" &&
    (e.ctrlKey === true || e.metaKey === true) &&
    e.shiftKey !== true &&
    e.altKey !== true
  );
}
