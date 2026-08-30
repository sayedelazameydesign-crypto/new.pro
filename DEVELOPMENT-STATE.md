# ⚙️ NAWAH AI — DEVELOPMENT STATE (machine-readable)

> حدّث هذا الملف بعد كل دورة تطوير معنوية — حتى تستأنف أي جلسة من هنا دون إعادة بناء المشروع من الذاكرة.

```text
BASELINE            auth-baseline -> 289c7f5   (AUTH HARDENED / FINAL — محمي، غير قابل للإزاحة)
CURRENT_CHECKPOINT  6cfa882 — المرحلة 5.1 (قراءة الملفات) مكتملة ومفعّلة حيًا (2026-08-30)

COMPLETED
  - المنصة الأساسية (Next 15 / RTL / بث / 4 مزودات + بحث / مزامنة Neon / LocalStore)
  - Auth.js v5 (بريد + Google OAuth حي + GitHub جاهز) + طبقة هوية AUTH HARDENING
  - حماية الحدود (20 chat / 60 sync / دقيقة) + BYOK لوحة مفاتيح + سياسات Provider/BYOK
  - قراءة الملفات المرفقة (المرحلة 5.1): TXT/MD/CSV/JSON/PDF/DOCX — زر 📎 + دمج بالسياق
  - توثيق: SYSTEM-GUIDE · BASELINE · TEST-REPORT (9 جولات) · ROADMAP · README

IN_PROGRESS
  - (لا شيء مفتوح — بين دورات التطوير)

BLOCKED
  - AUTH-7 Real Google Browser E2E  = MANUAL / EXTERNAL (بانتظار موافقة المستخدم بحسابه)
  - GitHub OAuth                     = بانتظار AUTH_GITHUB_ID/SECRET من المستخدم
  - Upstash                          = بانتظار UPSTASH_REDIS_REST_URL/TOKEN من المستخدم
  - Vercel CLI token                 = منتهي (لا يضر؛ النشر عبر git integration)

TEST_STATUS        51/51 PASS  (25 API + 12 هوية + 2 سباق + 10 استخراج ملفات + 2 مرفقات API) — متحققة على CI نفسه
CI_STATUS          PASS (6cfa882)
DEPLOYMENT_STATUS   LIVE — https://new-pro-kohl.vercel.app (HTTP 200)
SECURITY_STATUS    No secret leakage (فحص كامل التاريخ نظيف) · BYOK/صلاحيات/بنية لم تُمس

NEXT_SAFE_ACTION   — من ROADMAP بالترتيب:
                   1) المرحلة 5.3: الصوت Web Speech API (واجهة فقط — بلا خادم، قابلة للتحقق بمتصفح حقيقي)
                   2) المرحلة 5.4: التذكّر (ملخص ذكي للمحادثات الطويلة عبر Neon)
                   3) المرحلة 5.2: توليد الصور FLUX عبر HF (مشروط بتفعيل Inference Providers يدويًا من حساب المستخدم)
                   4) المرحلة 4: OpenRouter / DeepSeek (تراجع إضافي)
                   2) المرحلة 5.3: الصوت Web Speech API (واجهة فقط — بلا خادم)
                   3) المرحلة 5.4: التذكّر (ملخص ذكي للمحادثات الطويلة)
                   4) المرحلة 4: OpenRouter / DeepSeek (تراجع إضافي) — بانتظار مفاتيح/أمر
```

<!-- تحديث: 2026-08-30 · قراءة الملفات (5.1) مكتملة — 51/51 -->
