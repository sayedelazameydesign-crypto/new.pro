# ⚙️ NAWAH AI — DEVELOPMENT STATE (machine-readable)

> حدّث هذا الملف بعد كل دورة تطوير معنوية — حتى تستأنف أي جلسة من هنا دون إعادة بناء المشروع من الذاكرة.

```text
BASELINE            auth-baseline -> 289c7f5   (AUTH HARDENED / FINAL — محمي، غير قابل للإزاحة)
CURRENT_CHECKPOINT  1af6d22 — قرار 5.2 = DEFERRED (قرار هندسي موثق من المستخدم 2026-08-30)
                    5.1 = PASS · 5.2 = DEFERRED / EXTERNAL BLOCKER · 5.3 = IN PROGRESS

STATUS_MATRIX
  - 5.1 = PASS            (قراءة ملفات — مثبتة حيًا)
  - 5.2 = IMPLEMENTED     (كود + 9 اختبارات صور + 63/63 + CI) — LIVE VERIFICATION = BLOCKED
          TESTS = PASS · CI = PASS · LIVE VERIFICATION = BLOCKED
          BLOCKER = HF ACCOUNT HAS NO ENABLED IMAGE INFERENCE PROVIDER
          STATUS = DEFERRED — EXTERNAL PROVIDER BLOCKER
          (لا تُعتبر PASS لأنها لم تُثبت حيًا · ولا FAILED لأن الكود/الاختبارات/CI ناجحة —
           تُستأنف فور تفعيل Image Inference Provider في حساب HF أو توفير مسار تشغيل معتمد)
  - 5.3 = IN PROGRESS     (الصوت: Web Speech API — واجهة فقط، بلا خادم)

COMPLETED
  - المنصة الأساسية (Next 15 / RTL / بث / 4 مزودات + بحث / مزامنة Neon / LocalStore)
  - Auth.js v5 (بريد + Google OAuth حي + GitHub جاهز) + طبقة هوية AUTH HARDENING
  - حماية الحدود (20 chat / 60 sync / دقيقة) + BYOK لوحة مفاتيح + سياسات Provider/BYOK
  - قراءة الملفات المرفقة (المرحلة 5.1): TXT/MD/CSV/JSON/PDF/DOCX — زر 📎 + دمج بالسياق
  - توليد الصور (المرحلة 5.2): POST /api/image + زر 🎨 + عرض PNG في المحادثة — الكود/الاختبارات كاملة،
    محجوبة حيًا بتفعيل مزود الصور في حساب HF (خارجي/يدوي) — DEFERRED (قابل للاستئناف)

IN_PROGRESS
  - 5.3 الصوت: Web Speech API (إملاء + قراءة الردود) — نطاق الواجهة فقط، بلا خادم/خدمة خارجية

BLOCKED
  - 5.2 LIVE VERIFICATION    = EXTERNAL PROVIDER BLOCKER (حساب HF بلا مزود صور مفعّل — DEFERRED)
  - AUTH-7 Real Google Browser E2E  = MANUAL / EXTERNAL (بانتظار موافقة المستخدم بحسابه)
  - GitHub OAuth                     = بانتظار AUTH_GITHUB_ID/SECRET من المستخدم
  - Upstash                          = بانتظار UPSTASH_REDIS_REST_URL/TOKEN من المستخدم
  - Vercel CLI token                 = منتهي (لا يضر؛ النشر عبر git integration)

TEST_STATUS        63/63 PASS  (30 API + 12 هوية + 2 سباق + 10 استخراج ملفات + 9 صور)
                   — متحققة على CI (97203c1 = success)
CI_STATUS          PASS (97203c1) — آخر شريحة كود؛ 1af6d22 = توثيق فقط
DEPLOYMENT_STATUS   LIVE — https://new-pro-kohl.vercel.app (HTTP 200؛ يخدم 97203c1)
SECURITY_STATUS    No secret leakage (git grep قبل كل دفع نظيف) · BYOK/صلاحيات/بنية لم تُمس

NEXT_SAFE_ACTION   5.3: الصوت Web Speech API (واجهة فقط — بلا خادم، بلا تكلفة، بلا خدمة خارجية)
                   دورة كاملة: IMPLEMENT → TYPECHECK → BUILD → TEST → SECURITY → CI → LIVE → EVIDENCE
                   ثم فحص ROADMAP من جديد للخطوة التالية المصرح بها (5.4 التذكّر)
```

<!-- تحديث: 2026-08-30 · 5.2 كود/اختبارات/CI = PASS، التحقق الحي محجوب بتفعيل مزود HF (خارجي) -->
