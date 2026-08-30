# ⚙️ NAWAH AI — DEVELOPMENT STATE (machine-readable)

> حدّث هذا الملف بعد كل دورة تطوير معنوية — حتى تستأنف أي جلسة من هنا دون إعادة بناء المشروع من الذاكرة.

```text
BASELINE            auth-baseline -> 289c7f5   (AUTH HARDENED / FINAL — محمي، غير قابل للإزاحة)
CURRENT_CHECKPOINT  97203c1 — المرحلة 5.2 (توليد صور): كود + اختبارات + CI = PASS،
                     لكن التحقق الحي = FAIL (الحساب لا يملك مزودات صور مفعّلة) — انظر BLOCKED

COMPLETED
  - المنصة الأساسية (Next 15 / RTL / بث / 4 مزودات + بحث / مزامنة Neon / LocalStore)
  - Auth.js v5 (بريد + Google OAuth حي + GitHub جاهز) + طبقة هوية AUTH HARDENING
  - حماية الحدود (20 chat / 60 sync / دقيقة) + BYOK لوحة مفاتيح + سياسات Provider/BYOK
  - قراءة الملفات المرفقة (المرحلة 5.1): TXT/MD/CSV/JSON/PDF/DOCX — زر 📎 + دمج بالسياق
  - توليد الصور (المرحلة 5.2): POST /api/image + زر 🎨 + عرض PNG في المحادثة — الكود/الاختبارات كاملة
  - توثيق: SYSTEM-GUIDE · BASELINE · TEST-REPORT (9 جولات) · ROADMAP · README

IN_PROGRESS
  - 5.2 التحقق الحي (بعد 97203c1): 10/10 الطلبات فشلت — كل المزودين/النماذج تعيد
    400/410 «Model not supported by provider …». التشخيص: حساب HF (المفتاح في Vercel env)
    لم يُفعِّل أي مزود صور (fal-ai/wavespeed/nscale/replicate) من إعدادات الحساب،
    ولا يوجد أي نموذج text-to-image مستضاف على بنية hf-inference نفسها (فُحص 0/200).
    رسالة HF (410) الأولى: «deprecated and no longer supported by provider hf-inference».
    الحل المطلوب (يدوي خارجي): تفعيل أحد المزودين من hf.co/settings/inference-providers
    (خطوات تسجيل الدخول + متابعة مزود) — ثم إعادة 20/09 أو التحقق الحي مباشرة.
    — أو التبديل إلى خدمة مجانية خارجية (Pollinations تنجح بلا مفتاح — اختبار حي ناجح)
      لكنه خيار يتطلب موافقة (خدمة خارجية جديدة).

BLOCKED
  - 5.2 التحقق الحي    = ينتظر تفعيل المزود في حساب HF (يدوي/خارجي) أو موافقة على بديل
  - AUTH-7 Real Google Browser E2E  = MANUAL / EXTERNAL (بانتظار موافقة المستخدم بحسابه)
  - GitHub OAuth                     = بانتظار AUTH_GITHUB_ID/SECRET من المستخدم
  - Upstash                          = بانتظار UPSTASH_REDIS_REST_URL/TOKEN من المستخدم
  - Vercel CLI token                 = منتهي (لا يضر؛ النشر عبر git integration)

TEST_STATUS        63/63 PASS  (30 API + 12 هوية + 2 سباق + 10 استخراج ملفات + 9 صور)
                   — متحققة على CI (97203c1 = success)
CI_STATUS          PASS (97203c1)
DEPLOYMENT_STATUS   LIVE — https://new-pro-kohl.vercel.app (HTTP 200؛ يخدم 97203c1)
SECURITY_STATUS    No secret leakage (git grep قبل الدفع نظيف) · BYOK/صلاحيات/بنية لم تُمس

NEXT_SAFE_ACTION   1) الحصول على قرار المستخدم لـ 5.2: تفعيل مزود HF يدويًا (مع إعادة التحقق الحي)
                       أو الموافقة على Pollinations كبديل مجاني خارجي — أو تصنيف 5.2 Deferred
                       والانتقال إلى 5.3 (ممنوع التجاوز قبل قرار صريح وفق directive)
                   2) ثم 5.3: الصوت Web Speech API (واجهة فقط — بلا خادم)
                   3) ثم 5.4: التذكّر (ملخص ذكي للمحادثات الطويلة عبر Neon)
```

<!-- تحديث: 2026-08-30 · 5.2 كود/اختبارات/CI = PASS، التحقق الحي محجوب بتفعيل مزود HF (خارجي) -->
