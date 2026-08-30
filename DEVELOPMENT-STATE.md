# ⚙️ NAWAH AI — DEVELOPMENT STATE (machine-readable)

> حدّث هذا الملف بعد كل دورة تطوير معنوية — حتى تستأنف أي جلسة من هنا دون إعادة بناء المشروع من الذاكرة.

```text
BASELINE            auth-baseline -> 289c7f5   (AUTH HARDENED / FINAL — محمي، غير قابل للإزاحة)
CURRENT_CHECKPOINT  8c87717 — المرحلة 5.3 (الصوت) مكتملة ومثبتة حيًا (2026-08-30)

STATUS_MATRIX
  - 5.1 = PASS            (قراءة ملفات — مثبتة حيًا)
  - 5.2 = IMPLEMENTED     (كود + 9 اختبارات صور + CI) — LIVE VERIFICATION = BLOCKED
          BLOCKER = HF ACCOUNT HAS NO ENABLED IMAGE INFERENCE PROVIDER
          STATUS = DEFERRED — EXTERNAL PROVIDER BLOCKER
          (قرار هندسي موثق؛ لا PASS (لم تُثبت حيًا) ولا FAILED (كود/اختبارات/CI ناجحة) —
           تُستأنف فور تفعيل مزود صور في حساب HF أو توفير مسار تشغيل معتمد)
  - 5.3 = PASS            (الصوت Web Speech API — مثبتة حيًا 6/6 بالدليل)

COMPLETED
  - المنصة الأساسية (Next 15 / RTL / بث / 4 مزودات + بحث / مزامنة Neon / LocalStore)
  - Auth.js v5 (بريد + Google OAuth حي + GitHub جاهز) + طبقة هوية AUTH HARDENING
  - حماية الحدود (20 chat / 60 sync / دقيقة) + BYOK لوحة مفاتيح + سياسات Provider/BYOK
  - قراءة الملفات المرفقة (5.1): TXT/MD/CSV/JSON/PDF/DOCX — زر 📎 + دمج بالسياق
  - توليد الصور (5.2): POST /api/image + زر 🎨 — كود/اختبارات كاملة؛ DEFERRED (حساب HF بلا مزود صور)
  - الصوت (5.3): lib/speech.ts (إملاء SpeechRecognition + قراءة speechSynthesis، تنظيف Markdown،
    تقسيم مقاطع، اختيار صوت عربي) + زر 🎤 + زر 🔊 على كل رد + i18n AR/EN — واجهة فقط بلا خادم
  - توثيق: SYSTEM-GUIDE · BASELINE · TEST-REPORT (11 جولات) · ROADMAP · README

IN_PROGRESS
  - (لا شيء مفتوح — بين دورات التطوير)

BLOCKED
  - 5.2 LIVE VERIFICATION    = EXTERNAL PROVIDER BLOCKER (حساب HF بلا مزود صور مفعّل — DEFERRED)
  - AUTH-7 Real Google Browser E2E  = MANUAL / EXTERNAL (بانتظار موافقة المستخدم بحسابه)
  - GitHub OAuth                     = بانتظار AUTH_GITHUB_ID/SECRET من المستخدم
  - Upstash                          = بانتظار UPSTASH_REDIS_REST_URL/TOKEN من المستخدم
  - Vercel CLI token                 = منتهي (لا يضر؛ النشر عبر git integration)

TEST_STATUS        72/72 PASS  (30 API + 12 هوية + 2 سباق + 10 استخراج ملفات + 9 صور + 9 صوت)
                   — متحققة على CI (8c87717 = success)
CI_STATUS          PASS (8c87717)
DEPLOYMENT_STATUS   LIVE — https://new-pro-kohl.vercel.app (يخدم 8c87717؛ دليل 5.3 حي 6/6)
SECURITY_STATUS    No secret leakage (git grep قبل/بعد كل دفع نظيف) · BYOK/صلاحيات/بنية لم تُمس

NEXT_SAFE_ACTION   من ROADMAP — بعد 5.3 تأتي المرحلة 5.4: التذكّر
                   (ملخص ذكي تلقائي للمحادثات الطويلة عبر Neon + الجلسة) — شريحة مصرح بها
                   تُنفَّذ تلقائيًا وفق directive دون انتظار موافقة
```

<!-- تحديث: 2026-08-30 · 5.3 مكتملة ومثبتة حيًا (Playwright/Chromium 6/6) · HEAD = 8c87717 -->
