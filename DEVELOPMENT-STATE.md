# ⚙️ NAWAH AI — DEVELOPMENT STATE (machine-readable)

> حدّث هذا الملف بعد كل دورة تطوير معنوية — حتى تستأنف أي جلسة من هنا دون إعادة بناء المشروع من الذاكرة.

```text
BASELINE            auth-baseline -> 289c7f5   (AUTH HARDENED / FINAL — محمي، غير قابل للإزاحة)
CURRENT_CHECKPOINT  45591b4 — المرحلة 6/2: خطة Core Stack مكتملة (ربط Zod+React Query+Zustand)
                   + Phase 0 Audit + Phase 2 DB schema + Phase 4 Voice + Phase 6 Lint/Tests
                   + DEPENDENCY-REVIEW (المرحلة 9) — كل الـGates خضراء (بيانات أسفل)
                   HEAD السابق 56f2af1 (PWA) — المهمة الحالية أُغلقت بالكامل

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

TEST_STATUS        124/124 PASS (30 API + 12 هوية + 2 سباق + 10 استخراج + 9 صور + 15 صوت
                   + 8 تذكّر + 5 مزودات + 3 PWA + 10 zod-val + 6 توست + 5 react-query
                   + 5 SSE + 4 db-schema) — lint 0/0 · typecheck نظيف · build ✓ (6/6)
CI_STATUS          PASS (45591b4 — آخر دفعة؛ 56f2af1 و229b1e7 success سابقًا)
DEPLOYMENT_STATUS   LIVE — https://new-pro-kohl.vercel.app (يخدم 45591b4؛ دليل: 30 رسالة
                   + temp=99 → 200 عبر /api/chat الحي = تسامح zod منشور)
SECURITY_STATUS    No secret leakage (git grep قبل/بعد كل دفع نظيف — مفاتيح الاختبارات وهمية
                   معلومة) · BYOK/صلاحيات/بنية لم تُمس

NEXT_SAFE_ACTION   المرحلة 6 — بند 2: وضع القراءة (تصدير محادثة Markdown/PDF) ثم
                   بند 3: مشاركة رابط ?c=id ثم E2E ثم التحسينات ثم الذكاء —
                   بالترتيب الدقيق من ROADMAP؛ كل بند يُغلق باختبارات + CI + دفع
```

<!-- تحديث: 2026-08-30 · المرحلة 6/2: خطة Core Stack مكتملة (124/124 محليًا + CI PASS + LIVE) · HEAD = 45591b4 -->
