# ⚙️ NAWAH AI — DEVELOPMENT STATE (machine-readable)

> حدّث هذا الملف بعد كل دورة تطوير معنوية — حتى تستأنف أي جلسة من هنا دون إعادة بناء المشروع من الذاكرة.

```text
BASELINE            auth-baseline -> 289c7f5   (AUTH HARDENED / FINAL — محمي، غير قابل للإزاحة)
CURRENT_CHECKPOINT  arena/01a05733-new-pro (Phase F: Neon distributed rate limit)
                   parent E 6b27d21 · D 10289f8 · 0 f87b702 · main 429df9c.

STATUS_MATRIX
  - 5.1 = PASS            (قراءة ملفات — مثبتة حيًا)
  - 5.2 = POLLINATIONS    زر عبر /api/status.image · POST يعيد URL مباشر · HF lib/image باقٍ كمرجع
  - 5.3 = PASS            (الصوت Web Speech API — مثبتة حيًا 6/6)
  - 5.4 = PASS            (التذكّر: ملخص تلقائي للمحادثات الطويلة — مثبتة حيًا 9/9)

COMPLETED
  - المنصة الأساسية (Next 16 / RTL / بث / 4 مزودات + بحث / مزامنة Neon / LocalStore)
  - Auth.js v5 (بريد + Google OAuth حي + GitHub جاهز) + طبقة هوية AUTH HARDENING
  - حماية الحدود (20 chat / 60 sync / 12 image / 10 intel) — F: Neon ذرة SQL + هبوط Map
  - قراءة الملفات المرفقة (5.1): TXT/MD/CSV/JSON/PDF/DOCX — زر 📎 + دمج بالسياق
  - توليد الصور (5.2/E): Pollinations URL مباشر + قاطع 429 + Zod 3–500 / 256|512|1024
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
  - (لا شيء مفتوح بعد دفعة F)

BLOCKED
  - 5.2 LIVE TLS من الصندوق = ECONNRESET إلى image.pollinations.ai (بناء الرابط ✓)
  - AUTH-7 Real Google Browser E2E  = MANUAL / EXTERNAL (بانتظار موافقة المستخدم بحسابه)
  - GitHub OAuth                     = بانتظار AUTH_GITHUB_ID/SECRET من المستخدم
  - Upstash                          = بانتظار UPSTASH_REDIS_REST_URL/TOKEN من المستخدم
  - Vercel CLI token                 = منتهي (لا يضر؛ النشر عبر git integration)
  - (بيئي عابر) حصة Gemini المجانية كانت 429 أثناء جولة التحقق — لا أثر على النتائج

TEST_STATUS        وحدات 148/148 (بلا خادم) · lint 0 · typecheck
CI_STATUS          بانتظار دفع arena/01a05733-new-pro
DEPLOYMENT_STATUS   LIVE — https://new-pro-kohl.vercel.app (يخدم main@429df9c)
SECURITY_STATUS    صور بلا مفتاح · لا بروكسي بايتات عبر Vercel

NEXT_SAFE_ACTION   عدّاد Neon للحدود الموزّعة
```

<!-- تحديث: 2026-08-30 · المرحلة 6/Item 4: E2E (148/148 + 15/15) · هذا الـcommit -->


## إضافات هذه الجلسة (توثيق)
- FRONTEND-SPEC v1.0 → v1.1 (بروتوكول PR: 3 ثم 2 ثم 4 ثم 5) — مصدر الحقيقة المعتمد للواجهة
  (Evidence Index E-001..E-007، §14 مكدس، §15 معمارية/تدفق، §16 env flags).
- CR-006 العقد: PHASE6-ITEM6-BACKEND-CONTRACT.md — معتمد (أ–و) — Baseline رسمي لتنفيذ Item 6.
