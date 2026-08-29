#!/usr/bin/env node
// ===== أداة تشخيص مزودات الذكاء — بدون تعديل أي كود في النواة =====
// الاستخدام:
//   node scripts/check-providers.mjs                         # فحص المفاتيح فقط
//   BASE_URL=http://localhost:3000 node scripts/check-providers.mjs  # + اختبار حي عبر الخادم
//   BASE_URL=https://nawah-ai-alpha.vercel.app node scripts/check-providers.mjs  # اختبار النطاق الحي

const PROVIDERS = [
  { name: "Groq", env: "GROQ_API_KEY", modelId: "groq:llama-3.3-70b-versatile" },
  { name: "Gemini", env: "GEMINI_API_KEY", modelId: "gemini:gemini-2.5-flash" },
  { name: "Hugging Face", env: "HF_TOKEN", modelId: "hf:mistralai/Mistral-7B-Instruct-v0.3" },
];

const BASE = process.env.BASE_URL || "http://localhost:3000";
const ANY_BLOCK = "قل: اختبار ناجح";

console.log("🔑 فحص المفاتيح المتوفرة في البيئة:");
let any = false;
for (const p of PROVIDERS) {
  const has = !!process.env[p.env];
  if (has) any = true;
  console.log(`  ${has ? "✅" : "⛔"} ${p.name.padEnd(14)} (${p.env})`);
}
if (!any) console.log("  (لا يوجد مفتاح بعد — سيعمل وضع العرض التجريبي فقط)");

if (any) {
  console.log(`\n🧪 اختبار حي عبر ${BASE}/api/chat ...\n`);
  for (const p of PROVIDERS) {
    if (!process.env[p.env]) continue;
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
      const firstChunk = (text.match(/"chunk":"([^"]{0,55})/) || [])[1] || "";
      const ms = Date.now() - t0;
      const ok = used && used !== "demo";
      console.log(
        `  ${ok ? "✅" : "⛔"} ${p.name.padEnd(14)} → استُخدم فعليًا: ${used} | ${ms}ms | ${JSON.stringify(firstChunk)}`
      );
    } catch (e) {
      console.log(`  ⛔ ${p.name.padEnd(14)} → فشل الاتصال: ${e.message}`);
    }
  }
  console.log("\n💡 ملاحظة: إن ظهر 'demo' رغم وجود مفتاح، فالطلب لم يصل للخادم بعد إعداد البيئة الجديد (أعد النشر).");
}
