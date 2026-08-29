#!/usr/bin/env node
// ===== أداة تشخيص مزودات الذكاء — فحص المفاتيح + اختبار حي عبر الخادم =====
// الاستخدام:
//   node scripts/check-providers.mjs                                  # فحص المفاتيح المحلية فقط
//   BASE_URL=https://new-pro-kohl.vercel.app node scripts/check-providers.mjs  # اختبار النطاق الحي
//   BASE_URL=http://localhost:3000 node scripts/check-providers.mjs   # اختبار محلي

const PROVIDERS = [
  { name: "Groq", env: "GROQ_API_KEY", modelId: "groq:openai/gpt-oss-120b" },
  { name: "Gemini", env: "GEMINI_API_KEY", modelId: "gemini:gemini-2.5-flash" },
  { name: "Hugging Face", env: "HF_TOKEN", modelId: "hf:Qwen/Qwen2.5-7B-Instruct" },
];

const BASE = process.env.BASE_URL || "http://localhost:3000";
const ANY_BLOCK = "قل: اختبار ناجح";

console.log("🔑 فحص المفاتيح المتوفرة في بيئة التشغيل:");
let any = false;
for (const p of PROVIDERS) {
  const has = !!process.env[p.env];
  if (has) any = true;
  console.log(`  ${has ? "✅" : "⛔"} ${p.name.padEnd(14)} (${p.env})`);
}
if (!any) console.log("  (لا يوجد مفتاح في البيئة المحلية — لكن الخادم قد يملك مفاتيحه الخاصة)");

console.log(`\n🧪 اختبار حي عبر ${BASE}/api/chat ...\n`);
for (const p of PROVIDERS) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: ANY_BLOCK }],
        modelId: p.modelId,
      }),
    });
    const text = await res.text();
    const used = (text.match(/"provider":"([^"]+)"/) || [])[1] || "?";
    const errMatch = text.match(/"error":"([^"]{0,80})/);
    const firstChunk = (text.match(/"chunk":"([^"]{0,55})/) || [])[1] || "";
    const ms = Date.now() - t0;
    const ok = used && used !== "demo" && !errMatch;
    console.log(
      `  ${ok ? "✅" : "⛔"} ${p.name.padEnd(14)} → استُخدم: ${used} | ${ms}ms | ${JSON.stringify(
        firstChunk
      )}${errMatch ? " | خطأ: " + errMatch[1] : ""}`
    );
  } catch (e) {
    console.log(`  ⛔ ${p.name.padEnd(14)} → فشل الاتصال: ${e.message}`);
  }
}
console.log("\n💡 'demo' تعني أن الخادم لم يجد مفتاحًا لهذا المزود (تحقق من متغيرات البيئة وأعد النشر).");
