// ===== توليد الصور — المرحلة 5.2 (ROADMAP): FLUX.1-schnell عبر Hugging Face =====
// «مجاني بالكامل عبر حساب HF»: Inference Providers يدير النموذج عبر مزودين
// (fal-ai / wavespeed / nscale …) — نجرّب بالترتيب ثم entrypoint الكلاسيكي.
// أمان: لا حفظ على القرص · لا تسجيل للمفتاح · رسائل خطأ عربية معقّمة (بلا أي أثر للمفتاح).

const MODEL_ID = "black-forest-labs/FLUX.1-schnell";
const PROVIDERS = ["fal-ai", "wavespeed", "nscale", "hf-inference"] as const;
const CLASSIC_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;

export const IMAGE_PROMPT_MAX = 800;
const MAX_IMAGE_BYTES = 5_000_000; // سقف الاستجابة (حماية)

/** مفتاح الصور: من لوحة المتصفح (BYOK) يتقدّم على بيئة الخادم — نفس سياسة 4.2 */
export function imageKey(overrideKey?: string): string {
  const k = (overrideKey ?? "").trim().slice(0, 300);
  return k || process.env.HF_TOKEN || "";
}

/** تعيين رموز حالة HF إلى رسائل عربية واضحة (بلا مفتاح/بلا جسم خام إلا مقصوصًا) */
function hfError(status: number, body: string): string {
  const detail = body.slice(0, 160);
  switch (status) {
    case 401:
      return "مفتاح Hugging Face غير صالح أو منتهي الصلاحية — أعد لصقه من لوحة المفاتيح";
    case 402:
      return "الحصة المجانية لتوليد الصور انتهت لهذا الشهر — انتظر التجديد أو أضف مفتاحك الخاص";
    case 403:
      return "الحساب لا يملك صلاحية توليد الصور — فعّل «Inference Providers» من إعدادات حساب Hugging Face (مجاني) ثم أعد المحاولة";
    case 404:
      return "نموذج الصور غير متاح حاليًا — أعد المحاولة بعد قليل";
    case 410:
      return "النموذج غير مدعوم لدى هذا المزود — جرّب لاحقًا أو خيارًا آخر";
    case 429:
      return "تجاوزت حصة توليد الصور — انتظر قليلًا ثم أعد المحاولة";
    case 503:
      return "خدمة توليد الصور تُحمّل النموذج حاليًا — أعد المحاولة بعد دقيقة";
    default:
      return `Hugging Face (${status}): ${detail || "خطأ غير متوقع"}`;
  }
}

async function toImage(res: Response): Promise<Uint8Array> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("image")) {
    const t = await res.text().catch(() => "");
    throw new Error(`استجابة غير متوقعة من خدمة الصور (${t.slice(0, 120) || ct})`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length === 0) throw new Error("استجابة صورة فارغة");
  if (buf.length > MAX_IMAGE_BYTES) throw new Error("الصورة المولدة أكبر من الحد المسموح (5MB)");
  return buf;
}

async function tryProvider(
  url: string,
  netErr: string,
  headers: Record<string, string>,
  body: string,
  fetcher: typeof fetch
): Promise<{ bytes: Uint8Array } | { err: string }> {
  let r: Response;
  try {
    r = await fetcher(url, { method: "POST", headers, body });
  } catch {
    return { err: netErr };
  }
  if (r.ok) {
    try {
      return { bytes: await toImage(r) };
    } catch (e) {
      // استجابة 200 غير صورة/فارغة/أكبر من الحد — خطأ حقيقي لا يُبتلع
      return { err: e instanceof Error ? e.message : "استجابة غير متوقعة من خدمة الصور" };
    }
  }
  return { err: hfError(r.status, await r.text().catch(() => "")) };
}

/** أولوية الرسالة الأكثر تشخيصًا (حصة ← تفعيل ← مفتاح ← غير مدعوم ← عام) */
function priority(msg: string): number {
  if (msg.includes("الحصة")) return 1;
  if (msg.includes("فعّل")) return 2;
  if (msg.includes("مفتاح Hugging Face")) return 3;
  if (msg.includes("غير مدعوم")) return 4;
  if (msg.includes("استجابة")) return 5;
  if (msg.startsWith("Hugging Face")) return 6;
  return 9; // عام أو شبكة
}

/**
 * توليد صورة من وصف نصي عبر FLUX.1-schnell (HF Inference Providers).
 * fetcher قابلة للحقن (للاختبارات) — الافتراضي fetch.
 * المسار: مزودون بالترتيب (fal-ai → wavespeed → nscale → hf-inference) ثم classic،
 * وعند الفشل الكلي تُعرض الرسالة الأكثر تشخيصًا.
 */
export async function generateImage(
  prompt: string,
  apiKey: string,
  fetcher: typeof fetch = fetch
): Promise<{ bytes: Uint8Array }> {
  const p = prompt.trim();
  if (!p) throw new Error("اكتب وصف الصورة أولًا");
  if (p.length > IMAGE_PROMPT_MAX) {
    throw new Error(`وصف الصورة طويل جدًا (الحد ${IMAGE_PROMPT_MAX} حرف)`);
  }
  if (!apiKey) throw new Error("HF_KEY_MISSING");

  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const body = JSON.stringify({ inputs: p });

  const errs: string[] = [];
  for (const prov of PROVIDERS) {
    const r = await tryProvider(
      `https://router.huggingface.co/${prov}/models/${MODEL_ID}`,
      `NET_${prov}`,
      headers,
      body,
      fetcher
    );
    if ("bytes" in r) return r;
    errs.push(r.err ?? "");
  }

  // آخر خيار: entrypoint الكلاسيكي (قد يعمل لنماذج قديمة)
  const classic = await tryProvider(CLASSIC_URL, "NET_CLASSIC", headers, body, fetcher);
  if ("bytes" in classic) return classic;
  errs.push(classic.err ?? "");

  const real = errs.filter((x) => x && !x.startsWith("NET_"));
  if (!real.length) throw new Error("تعذر الاتصال بخدمة توليد الصور");
  const best = real.sort((a, b) => priority(a) - priority(b))[0];
  throw new Error(best);
}
