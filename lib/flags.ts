// ===== أعلام تشغيل اختيارية — مجانية، بلا بطاقة، قابلة للعكس =====
// توليد الصور: Pollinations بلا مفتاح. الزر يظهر عندما IMAGE_GENERATION_ENABLED=1 عبر /api/status.

/** مسار POST /api/image والزر 🎨 — معطّل افتراضيًا */
export function isImageGenerationEnabled(): boolean {
  return process.env.IMAGE_GENERATION_ENABLED === "1";
}
