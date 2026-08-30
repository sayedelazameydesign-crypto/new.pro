// ===== فحص/تصنيف الملفات المرفقة (CR-005 / Item 5) — منطق نقي قابل للاختبار بدون DOM =====
// قواعد مطابقة تمامًا للمسار القائم (input[type=file] + lib/file-extract.ts):
//   · قائمة بيضاء بالامتدادات (نفس accept): txt, md, markdown, csv, json, pdf, docx
//   · حد 1 ميجابايت لكل ملف
//   · حد 3 ملفات لكل رسالة
// نقطة أمان مقصودة (موثقة في AUDIT): drop يتجاوز سمة accept في المتصفح،
// لذا هذا الفحص إجباري على المسارين (اختيار + سحب) قبل أي FileReader أو إرسال شبكة.

export const MAX_ATTACH_BYTES = 1_000_000;
export const MAX_ATTACH_FILES = 3;

export const ATTACH_ALLOWED_EXT: ReadonlySet<string> = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "json",
  "pdf",
  "docx",
]);

export type AttachRejectReason = "unsupported" | "tooBig" | "maxFiles";

export interface AttachItem {
  name: string;
  size: number;
}

export interface AttachVerdict {
  ok: boolean;
  name: string;
  reason?: AttachRejectReason;
}

/** امتداد الملف (أحرف صغيرة، بلا نقطة) — بلا امتداد/مخفي → "" */
export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i <= 0 ? "" : name.slice(i + 1).toLowerCase();
}

/** هل الامتداد ضمن القائمة البيضاء؟ (يطابق accept وlib/file-extract.ts حرفيًا) */
export function isAllowedExt(name: string): boolean {
  return ATTACH_ALLOWED_EXT.has(extOf(name));
}

/**
 * تصنيف دفعة ملفات: المقبول منها والمرفوض مع السبب، وفق نفس قواعد المسار القائم.
 * لا يقرأ أي محتوى للقرار — فحص فوق البيانات الوصفية فقط (اسم/حجم).
 * مدخلات File الحقيقية (متصفح أو Node ≥20) متوافقة بنيويًا مع AttachItem.
 */
export function classifyAttach<T extends AttachItem>(incoming: T[]): {
  accepted: T[];
  rejected: AttachVerdict[];
} {
  const rejected: AttachVerdict[] = [];
  const accepted = incoming.slice(0, MAX_ATTACH_FILES);
  const overflow = incoming.slice(MAX_ATTACH_FILES);

  for (const f of accepted) {
    if (!isAllowedExt(f.name)) {
      rejected.push({ ok: false, name: f.name, reason: "unsupported" });
    } else if (f.size > MAX_ATTACH_BYTES) {
      rejected.push({ ok: false, name: f.name, reason: "tooBig" });
    }
  }
  for (const f of overflow) {
    rejected.push({ ok: false, name: f.name, reason: "maxFiles" });
  }
  // المقبول = ما لم يُرفض من النافذة الأولى (تُحفظ الفهارس لا الكائنات لإبقاء الاختبار حتميًا)
  const okSet = new Set(
    accepted.filter((f) => !rejected.some((r) => r.name === f.name && r.ok === false)).map((f) => f.name)
  );
  return {
    accepted: accepted.filter((f) => okSet.has(f.name)),
    rejected,
  };
}
