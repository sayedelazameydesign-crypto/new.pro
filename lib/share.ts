// ===== مشاركة المحادثة عبر ?c=<id> (Item 3) =====
// كل المنطق نقي وقابل للاختبار. القواعد:
//  - الرابط = معرف المحادثة فقط (لا محتوى رسائل، لا مفاتيح، لا BYOK، لا بيانات إعدادات).
//  - المعرف يُفحص بقاعدة صارمة قبل أي استخدام (يمنع XSS/حقن/أطوال شاذة).
//  - النسخ عبر Clipboard API + fallback (navigator.clipboard → execCommand) — بلا مكتبة.

/** المعرف المسموح: UUID v4 أو fallback base36 (id-...)— أحرف آمنة فقط */
const SHARE_ID_RE = /^[A-Za-z0-9_-]{8,80}$/;

/** هل المعرف صالح للمشاركة؟ (قبل أي استخدام) */
export function isValidShareId(id: unknown): id is string {
  return typeof id === "string" && SHARE_ID_RE.test(id);
}

/**
 * بناء رابط مشاركة: `<base>?c=<id>` — يُبني في المتصفح (origin+pathname) أو base صريح (اختبار).
 * لا يقرأ ولا يضم أي شيء غير المعرف.
 */
export function buildShareUrl(id: string, base?: string): string {
  const clean = encodeURIComponent(id);
  if (base) return `${base}?c=${clean}`;
  if (typeof window === "undefined") return `/?c=${clean}`;
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?c=${clean}`;
}

/**
 * استخراج معرف صالح من query string (أو search كامل).
 * - لا c → null (missing)
 * - c غير مطابق للقاعدة → null (malformed)
 * - c مطابق → المعرف (مفكوك الترميز بأمان عبر URLSearchParams)
 */
export function parseShareId(search: string | null | undefined): string | null {
  if (!search) return null;
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const raw = params.get("c");
    if (raw === null) return null;
    return isValidShareId(raw) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * قرار فتح المعرف ضمن محادثات متاحة.
 * - لا c في الرابط → "none" (السلوك الحالي كما هو)
 * - c موجود في القائمة → "ok" (نفتحها)
 * - c غير موجود → "unknown" (لا محادثة عشوائية — not-found state)
 */
export type ShareResolution = { status: "none" } | { status: "ok"; id: string } | { status: "unknown"; id: string };

export function resolveShareId(
  search: string | null | undefined,
  availableIds: readonly string[]
): ShareResolution {
  const id = parseShareId(search);
  if (id === null) return { status: "none" };
  return availableIds.includes(id) ? { status: "ok", id } : { status: "unknown", id };
}

/** نسخ رابط المشاركة إلى الحافظة — يعيد "copied" | "failed" */
export async function copyShareLink(id: string, base?: string): Promise<"copied" | "failed"> {
  const url = buildShareUrl(id, base);
  // 1) المسار الحديث
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return "copied";
    }
  } catch {
    /* ننتقل للـ fallback */
  }
  // 2) fallback قديم (iframe مخفي + execCommand) — أو بلا DOM → فشل
  if (typeof document === "undefined") return "failed";
  try {
    const ta = document.createElement("textarea");
    ta.value = url;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const okFlag = document.execCommand("copy");
    ta.remove();
    return okFlag ? "copied" : "failed";
  } catch {
    return "failed";
  }
}
