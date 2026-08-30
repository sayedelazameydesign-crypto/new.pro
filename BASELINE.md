# 🧊 BASELINE — تجميد شريحة AUTH IDENTITY HARDENING

> **الحالة:** `AUTH HARDENED / FINAL` · **تاريخ التجميد:** 2026-08-30
> **الوسم:** `auth-baseline` → **`289c7f5`** (غير قابل للانزياح؛ أي شريحة لاحقة تبدأ فوقه)
> **انظر أيضًا:** `SYSTEM-GUIDE.md` (قسم 4.3 + RELEASE STATUS) · `TEST-REPORT.md` (الجولتان الثامنة/الثامنة-ب)

---

## 1) الحالة المجمّدة (Baseline State)

```
BASELINE     289c7f5
──────────────────────────────────────────
AUTH         HARDENED / FINAL
TESTS        39/39 PASS
CI           PASS
RACE SAFETY  PASS
SECRETS      NO LEAKAGE
BYOK         UNCHANGED
PERMISSIONS  UNCHANGED
INFRASTRUCTURE UNCHANGED
OAUTH CONFIG UNCHANGED
REAL GOOGLE E2E  MANUAL / EXTERNAL
```

## 2) بوابات المصادقة — النتيجة النهائية

| البوابة | الحالة | الدليل |
|---|---|---|
| AUTH-1 OAuth Authorization Contract | **PASS** | متصفح حقيقي → `accounts.google.com` ببياناتنا |
| AUTH-2 OAuth Callback Contract | **PASS*** | مسار callback حي + تبادل كود مقبول (`invalid_grant`) |
| AUTH-3 Application Provisioning | **PASS** | `ensureApplicationUser()` إلزامي في دورة الجلسة (12 اختبارًا) |
| AUTH-4 Identity Idempotency | **PASS** | تسلسلي + **RACE-R1 ✅ + RACE-R2 ✅** (10 متزامنة → صف واحد) |
| AUTH-5 Canonical Session Identity | **PASS*** | `session.user.id` = `nahwa_users.id` (وليس معرّف المزود) |
| AUTH-6 Sync Scope | **PASS** | `user:<canonicalUserId>` فقط |
| AUTH-7 Real Google Browser E2E | **MANUAL / EXTERNAL** | يتطلب credential/موافقة بشرية — خارج اختبارات البنية |

> `*` كما هو مقرر: AUTH-2 وAUTH-5 مُثبتان كعقد داخل التطبيق (اختبارات identity + سباق)؛ الدليل الكامل
> داخل NextAuth الحي يُغلق فقط عبر AUTH-7 (تحقق خارجي بطبيعته — ليس نقصًا في البنية).

## 3) آليات الإغلاق (طبقتان — كما اعتمده المراجِع)

```
Application layer          Database integrity
ensureApplicationUser()      UNIQUE(provider, provider_account_id)
   ↓ converge (ON CONFLICT   UNIQUE(email)
     DO NOTHING RETURNING)
   ↓
المتسابقون ينتهون إلى SAME canonical user — لا تحويل التعارض إلى فشل
```

## 4) حدود الشريحة (لا شيء خارج النطاق ممسوس)

لا تغيير: Google Cloud OAuth config · Vercel permissions · deployment infra · مزود جديد ·
BYOK policy · تخزين أسرار OAuth · تسجيل access tokens · أي refactor خارج auth/provisioning.

## 5) الحوكمة — كيف تُستأنف العمل فوق هذا الأساس

| ما بعده | القاعدة |
|---|---|
| **Google Browser E2E** | `RELEASE EVIDENCE` مستقل (بيد المستخدم) — **ليس** جزءًا من إصلاح الهوية |
| **GitHub OAuth** | شريحة مستقلة فوق `289c7f5` (نفس نمط Google المثبت: مفاتيح → نشر → إثبات) |
| **Upstash / أي ميزة** | شريحة مستقلة فوق `289c7f5` — لا تُمزج مع دليل النسخة |

> **لا يُعاد فتح `AUTH IDENTITY HARDENING`.** أي تغيير لاحق في OAuth/provisioning يبدأ
> شريحة جديدة فوق `289c7f5` حتى لا يختلط دليل هذا الإصدار بدورة إصلاح جديدة.

---

*بُني هذا الملف بعد التحقق الحي: محلي = GitHub = `289c7f5` · CI success · git نظيف · لا أسرار في التاريخ.*
