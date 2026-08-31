# ⚙️ NAWAH AI — DEVELOPMENT STATE (machine-readable)

> حدّث هذا الملف بعد كل دورة تطوير معنوية — حتى تستأنف أي جلسة من هنا دون إعادة بناء المشروع من الذاكرة.

```text
BASELINE            auth-baseline -> 289c7f5   (AUTH HARDENED / FINAL — محمي، غير قابل للإزاحة)
CURRENT_CHECKPOINT  main = 0559dc4 (HEAD — PR #7). سلسلة التوثيق: 2adab69 (Item 5 عبر PR #1)
                   → d8d0d9e → 51a6519 (PR #3 FRONTEND-SPEC v1.0) → 8918512 (PR #2 إغلاق
                   CR-005) → 301f768 (PR #4 FRONTEND-SPEC v1.1) → c02fdb2 (PR #5 v1.1.1)
                   → 9d67b9f (PR #6: CR-006 عقد أ–و معتمد) → 0559dc4 (PR #7:
                   Item 6 DONE — تنفيذ كامل + اختبارات، CI أخضر بعد الدمج).
                   المرجع البرمجي للمشروع = 8918512

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
  - (لا شيء — كل بنود المرحلة المفتوحة أُغلقت؛ بند 2 من المرحلة 6 = NEXT_SAFE_ACTION)

BLOCKED
  - 5.2 LIVE VERIFICATION    = EXTERNAL PROVIDER BLOCKER (حساب HF بلا مزود صور مفعّل — DEFERRED)
  - AUTH-7 Real Google Browser E2E  = MANUAL / EXTERNAL (بانتظار موافقة المستخدم بحسابه)
  - GitHub OAuth                     = بانتظار AUTH_GITHUB_ID/SECRET من المستخدم
  - Upstash                          = بانتظار UPSTASH_REDIS_REST_URL/TOKEN من المستخدم
  - Vercel CLI token                 = منتهي (لا يضر؛ النشر عبر git integration)
  - (بيئي عابر) حصة Gemini المجانية كانت 429 أثناء جولة التحقق — لا أثر على النتائج

TEST_STATUS        Unit/Integration 148/148 · E2E 15/15 (Playwright chromium)
                   · lint 0/0 · typecheck نظيف · build ✓ (6/6)
CI_STATUS          PASS (45591b4 — آخر دفعة؛ 56f2af1 و229b1e7 success سابقًا)
DEPLOYMENT_STATUS   LIVE — https://new-pro-kohl.vercel.app (يخدم 45591b4؛ دليل: 30 رسالة
                   + temp=99 → 200 عبر /api/chat الحي = تسامح zod منشور)
SECURITY_STATUS    No secret leakage (git grep قبل/بعد كل دفع نظيف — مفاتيح الاختبارات وهمية
                   معلومة) · BYOK/صلاحيات/بنية لم تُمس

NEXT_SAFE_ACTION   المرحلة 6 — بند 5: تحسينات (اختصارات لوحة مفاتيح، سحب الملفات للإدخال،
                   وضع ملء الشاشة) ثم بند 6: ذكاء (اقتراح استكمال، عنوان أفضل) —
                   بالترتيب الدقيق من ROADMAP؛ كل بند يُغلق باختبارات + CI + دفع
```

<!-- تحديث: 2026-08-30 · المرحلة 6/Item 4: E2E (148/148 + 15/15) · هذا الـcommit -->


## إضافات هذه الجلسة (توثيق)
- FRONTEND-SPEC v1.0 → v1.1 (بروتوكول PR: 3 ثم 2 ثم 4 ثم 5) — مصدر الحقيقة المعتمد للواجهة
  (Evidence Index E-001..E-007، §14 مكدس، §15 معمارية/تدفق، §16 env flags).
- CR-006 العقد: PHASE6-ITEM6-BACKEND-CONTRACT.md — معتمد (أ–و) — Baseline رسمي لتنفيذ Item 6.
