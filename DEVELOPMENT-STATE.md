# ⚙️ NAWAH AI — DEVELOPMENT STATE (machine-readable)

> حدّث هذا الملف بعد كل دورة تطوير معنوية — حتى تستأنف أي جلسة من هنا دون إعادة بناء المشروع من الذاكرة.

```text
BASELINE            auth-baseline -> 289c7f5   (AUTH HARDENED / FINAL — محمي، غير قابل للإزاحة)
CURRENT_CHECKPOINT  arena/01a05733-new-pro (Phase 0: Zod tighten + hide images + docs/eslint)
                   parent main = 429df9c (PR #12 ci checkout v5). سلسلة سابقة: b75f9bc (PR #10
                   next 16.3.3). المرجع البرمجي = 8918512

STATUS_MATRIX
  - 5.1 = PASS            (قراءة ملفات — مثبتة حيًا)
  - 5.2 = DEFERRED        (كود lib/image باقٍ + 9 اختبارات وحدة) — UI مخفي و/api/image → 503
          IMAGE_DISABLED ما لم IMAGE_GENERATION_ENABLED=1
          BLOCKER = HF ACCOUNT HAS NO ENABLED IMAGE INFERENCE PROVIDER
  - 5.3 = PASS            (الصوت Web Speech API — مثبتة حيًا 6/6)
  - 5.4 = PASS            (التذكّر: ملخص تلقائي للمحادثات الطويلة — مثبتة حيًا 9/9)

COMPLETED
  - المنصة الأساسية (Next 16 / RTL / بث / 4 مزودات + بحث / مزامنة Neon / LocalStore)
  - Auth.js v5 (بريد + Google OAuth حي + GitHub جاهز) + طبقة هوية AUTH HARDENING
  - حماية الحدود (20 chat / 60 sync / دقيقة) + BYOK لوحة مفاتيح + سياسات Provider/BYOK
  - قراءة الملفات المرفقة (5.1): TXT/MD/CSV/JSON/PDF/DOCX — زر 📎 + دمج بالسياق
  - توليد الصور (5.2): POST /api/image + زر 🎨 — مخفيان افتراضيًا (503 IMAGE_DISABLED)
  - الصوت (5.3): lib/speech.ts — إملاء 🎤 + قراءة 🔊 (Web Speech API، واجهة فقط)
  - التذكّر (5.4): lib/summary.ts — عتبة 24 رسالة → ملخص عربي → Conversation.summary
    (يُزامن عبر Neon) → يُحقن في system → يصل فعليًا للمزودات (كان خللًا كامنًا أُصلح)
  - المرحلة 6/1 — PWA: manifest RTL + sw.js (nawah-v1) + أيقونات RGBA + تسجيل SW + وسوم iOS
  - Item 5 (المرحلة 6): CR-005 — Ctrl/⌘+Enter إرسال (الاختصار المعتمد الوحيد) + سحب ملفات
    للإدخال (مسار موحّد بنفس قواعد الاختيار + allowlist إجباري قبل FileReader) + ملء شاشة
    (زر UI عبر Fullscreen API + fullscreenchange + data-fs) — 0 dependencies جديدة
  - Item 4 (المرحلة 6): E2E Playwright — 15 اختبارًا (إرسال/عربي/Enter/فارغ/تحميل/إنشاء/
    حذف نشطة وغير نشطة/إلغاء/إعدادات/استمرارية/refresh/عزل سياقات) — DEV ONLY،
    بلا LLM خارجي (وضع demo)، بلا أسرار، webServer منفصل 3100 + CI خطوات E2E
  - Item 3 (المرحلة 6): مشاركة رابط ?c=id — فتح محادثة محددة من الرابط (مرة واحدة بعد
    loadAll، بلا طلب جديد) + زر نسخ الرابط (Clipboard+fallback، Toast عبر zustand) +
    حالة not-found بلا محادثة عشوائية — NO NEW DEPENDENCY · Privacy: LOCAL-ONLY (موثق)
  - Item 2 (المرحلة 6): وضع القراءة (واجهة كاملة بلا شبكة، تعيد استخدام Markdown) +
    تصدير Markdown (Blob محلي، اسم آمن) + تصدير PDF (طباعة المتصفح + @media print)
    — NO NEW DEPENDENCY (موثق في DEPENDENCY-REVIEW §5 + PHASE6-ITEM2-AUDIT.md)
  - خطة Core Stack (EXECUTION PLAN): PRE_DEPENDENCY_AUDIT (Phase 0) · ربط الزوجي الثلاثي
    (parseChatBody zod متساهلة في /api/chat + providers.tsx/useQuery للـstatus + Toasts zustand)
    · lib/db/schema.ts (Drizzle طبقة مطبوعة فقط) · lib/speech.ts (DEFAULT_SPEECH_LANG=ar-EG)
    · eslint.config.mjs flat · DEPENDENCY-REVIEW.md (R-1..R-8، لا REMOVE) — 124/124
  - توثيق: SYSTEM-GUIDE · BASELINE · TEST-REPORT (15 جولة) · ROADMAP · README

IN_PROGRESS
  - المرحلة 0 (مجاني بلا فيزا): تشديد parseChatBody + إخفاء الصور + مزامنة README + eslint-config-next 16

BLOCKED
  - 5.2 LIVE VERIFICATION    = EXTERNAL PROVIDER BLOCKER (حساب HF بلا مزود صور مفعّل — DEFERRED)
  - AUTH-7 Real Google Browser E2E  = MANUAL / EXTERNAL (بانتظار موافقة المستخدم بحسابه)
  - GitHub OAuth                     = بانتظار AUTH_GITHUB_ID/SECRET من المستخدم
  - Upstash                          = بانتظار UPSTASH_REDIS_REST_URL/TOKEN من المستخدم
  - Vercel CLI token                 = منتهي (لا يضر؛ النشر عبر git integration)
  - (بيئي عابر) حصة Gemini المجانية كانت 429 أثناء جولة التحقق — لا أثر على النتائج

TEST_STATUS        يُحدَّث بعد npm test في هذه الجلسة
CI_STATUS          بانتظار دفع الفرع arena/01a05733-new-pro
DEPLOYMENT_STATUS   LIVE — https://new-pro-kohl.vercel.app (يخدم main@429df9c)
SECURITY_STATUS    No secret leakage · مسار الصور لا يستدعي HF ما لم يُفعَّل العلم

NEXT_SAFE_ACTION   بعد دمج المرحلة 0: GitHub Models + قاطع دائرة 429 (سلسلة مزودين بلا فيزا)
```

<!-- تحديث: 2026-08-30 · المرحلة 6/Item 4: E2E (148/148 + 15/15) · هذا الـcommit -->


## إضافات هذه الجلسة (توثيق)
- FRONTEND-SPEC v1.0 → v1.1 (بروتوكول PR: 3 ثم 2 ثم 4 ثم 5) — مصدر الحقيقة المعتمد للواجهة
  (Evidence Index E-001..E-007، §14 مكدس، §15 معمارية/تدفق، §16 env flags).
- CR-006 العقد: PHASE6-ITEM6-BACKEND-CONTRACT.md — معتمد (أ–و) — Baseline رسمي لتنفيذ Item 6.
