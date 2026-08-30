# ⚙️ NAWAH AI — DEVELOPMENT STATE (machine-readable)

> حدّث هذا الملف بعد كل دورة تطوير معنوية — حتى تستأنف أي جلسة من هنا دون إعادة بناء المشروع من الذاكرة.

```text
BASELINE            auth-baseline -> 289c7f5   (AUTH HARDENED / FINAL — محمي، غير قابل للإزاحة)
CURRENT_CHECKPOINT  4c42d0e — المرحلة 5.4 (التذكّر) مكتملة ومثبتة حيًا (2026-08-30)

STATUS_MATRIX
  - 5.1 = PASS            (قراءة ملفات — مثبتة حيًا)
  - 5.2 = IMPLEMENTED     (كود + 9 اختبارات صور + CI) — LIVE VERIFICATION = BLOCKED
          BLOCKER = HF ACCOUNT HAS NO ENABLED IMAGE INFERENCE PROVIDER
          STATUS = DEFERRED — EXTERNAL PROVIDER BLOCKER
          (قرار هندسي موثق؛ تُستأنف فور تفعيل مزود صور في حساب HF أو مسار تشغيل معتمد)
  - 5.3 = PASS            (الصوت Web Speech API — مثبتة حيًا 6/6)
  - 5.4 = PASS            (التذكّر: ملخص تلقائي للمحادثات الطويلة — مثبتة حيًا 9/9)

COMPLETED
  - المنصة الأساسية (Next 15 / RTL / بث / 4 مزودات + بحث / مزامنة Neon / LocalStore)
  - Auth.js v5 (بريد + Google OAuth حي + GitHub جاهز) + طبقة هوية AUTH HARDENING
  - حماية الحدود (20 chat / 60 sync / دقيقة) + BYOK لوحة مفاتيح + سياسات Provider/BYOK
  - قراءة الملفات المرفقة (5.1): TXT/MD/CSV/JSON/PDF/DOCX — زر 📎 + دمج بالسياق
  - توليد الصور (5.2): POST /api/image + زر 🎨 — DEFERRED (حساب HF بلا مزود صور مفعّل)
  - الصوت (5.3): lib/speech.ts — إملاء 🎤 + قراءة 🔊 (Web Speech API، واجهة فقط)
  - التذكّر (5.4): lib/summary.ts — عتبة 24 رسالة → ملخص عربي → Conversation.summary
    (يُزامن عبر Neon) → يُحقن في system → يصل فعليًا للمزودات (كان خللًا كامنًا أُصلح)
  - توثيق: SYSTEM-GUIDE · BASELINE · TEST-REPORT (12 جولة) · ROADMAP · README

IN_PROGRESS
  - (لا شيء مفتوح — بين دورات التطوير)

BLOCKED
  - 5.2 LIVE VERIFICATION    = EXTERNAL PROVIDER BLOCKER (حساب HF بلا مزود صور مفعّل — DEFERRED)
  - AUTH-7 Real Google Browser E2E  = MANUAL / EXTERNAL (بانتظار موافقة المستخدم بحسابه)
  - GitHub OAuth                     = بانتظار AUTH_GITHUB_ID/SECRET من المستخدم
  - Upstash                          = بانتظار UPSTASH_REDIS_REST_URL/TOKEN من المستخدم
  - Vercel CLI token                 = منتهي (لا يضر؛ النشر عبر git integration)
  - (بيئي عابر) حصة Gemini المجانية كانت 429 أثناء جولة التحقق — لا أثر على النتائج

TEST_STATUS        85/85 PASS  (30 API + 12 هوية + 2 سباق + 10 استخراج + 9 صور + 9 صوت
                   + 8 تذكّر + 5 مزودات) — متحققة على CI (4c42d0e = success)
CI_STATUS          PASS (4c42d0e)
DEPLOYMENT_STATUS   LIVE — https://new-pro-kohl.vercel.app (يخدم 4c42d0e؛ دليل 5.4 حي 9/9)
SECURITY_STATUS    No secret leakage (git grep قبل/بعد كل دفع نظيف) · BYOK/صلاحيات/بنية لم تُمس

NEXT_SAFE_ACTION   من ROADMAP — بعد 5.4: المرحلة 6 (واجهة وصقل) فما بعدها المرحلة 4
                   (مزودات إضافية Groq/OpenRouter/DeepSeek — تنتظر مفاتيح/أمر المستخدم)
                   البدائل المصرح بها تلقائيًا من المرحلة 6: PWA (manifest + service worker)
                   / وضع القراءة (تصدير Markdown/PDF) — تُفحص بالترتيب الدقيق عند البدء
```

<!-- تحديث: 2026-08-30 · 5.4 مكتملة ومثبتة حيًا (مسار حقيقي 9/9) · HEAD = 4c42d0e -->
