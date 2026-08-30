# ⚙️ NAWAH AI — DEVELOPMENT STATE (machine-readable)

> حدّث هذا الملف بعد كل دورة تطوير معنوية — حتى تستأنف أي جلسة من هنا دون إعادة بناء المشروع من الذاكرة.

```text
BASELINE            auth-baseline -> 289c7f5   (AUTH HARDENED / FINAL — محمي، غير قابل للإزاحة)
CURRENT_CHECKPOINT  — المرحلة 6 بدأت: PWA مكتملة (manifest + sw.js + أيقونات + تسجيل)
                   HEAD السابق 229b1e7 (5.4) — دفعة PWA قيد الرفع

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
  - المرحلة 6 — PWA (البند 1): app/manifest.ts + public/sw.js + أيقونات 192/512/180
    من app/icon.svg (نواة ذرّة — أُعيد تصميمها هندسيًا بلا خطوط نظام) + تسجيل الخادم
    في page.tsx + وسوم iOS في layout.tsx + 3 اختبارات API جديدة (manifest/icons/sw)

BLOCKED
  - 5.2 LIVE VERIFICATION    = EXTERNAL PROVIDER BLOCKER (حساب HF بلا مزود صور مفعّل — DEFERRED)
  - AUTH-7 Real Google Browser E2E  = MANUAL / EXTERNAL (بانتظار موافقة المستخدم بحسابه)
  - GitHub OAuth                     = بانتظار AUTH_GITHUB_ID/SECRET من المستخدم
  - Upstash                          = بانتظار UPSTASH_REDIS_REST_URL/TOKEN من المستخدم
  - Vercel CLI token                 = منتهي (لا يضر؛ النشر عبر git integration)
  - (بيئي عابر) حصة Gemini المجانية كانت 429 أثناء جولة التحقق — لا أثر على النتائج

TEST_STATUS        88/88 PASS  (30 API + 12 هوية + 2 سباق + 10 استخراج + 9 صور + 9 صوت
                   + 8 تذكّر + 5 مزودات + 3 PWA) — 85/85 سابقة على CI (229b1e7)
CI_STATUS          PASS (229b1e7) — دفعة PWA قيد الرفع
DEPLOYMENT_STATUS   LIVE — https://new-pro-kohl.vercel.app (يخدم 4c42d0e؛ دليل 5.4 حي 9/9)
SECURITY_STATUS    No secret leakage (git grep قبل/بعد كل دفع نظيف) · BYOK/صلاحيات/بنية لم تُمس

NEXT_SAFE_ACTION   المرحلة 6 — بند 2: وضع القراءة (تصدير محادثة Markdown/PDF) ثم
                   بند 3: مشاركة رابط ?c=id ثم E2E ثم التحسينات ثم الذكاء —
                   بالترتيب الدقيق من ROADMAP؛ كل بند يُغلق باختبارات + CI + دفع
```

<!-- تحديث: 2026-08-30 · المرحلة 6: PWA مكتملة (88/88 محليًا) · HEAD = 229b1e7 + دفعة PWA قيد الرفع -->
