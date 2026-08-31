// ===== أعلام تشغيل اختيارية — مجانية، بلا بطاقة، قابلة للعكس =====
// توليد الصور (5.2) معلّق حيًا: حساب HF بلا مزود صور. الزر المخفي أفضل من ميزة ظاهرة معطّلة.
// إعادة التفعيل لاحقًا: IMAGE_GENERATION_ENABLED=1 (خادم) + NEXT_PUBLIC_IMAGE_GENERATION=1 (واجهة).

/** مسار POST /api/image — معطّل افتراضيًا */
export function isImageGenerationEnabled(): boolean {
  return process.env.IMAGE_GENERATION_ENABLED === "1";
}

/** زر 🎨 في الواجهة — معطّل افتراضيًا (قيمة بناء، ليست سرًا) */
export const IMAGE_UI_ENABLED = process.env.NEXT_PUBLIC_IMAGE_GENERATION === "1";
