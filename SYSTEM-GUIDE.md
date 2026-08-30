# 📘 دليل النظام التفصيلي — «نواة AI»

> **آخر تحديث:** 2026-08-29 · **المستودع:** `sayedelazameydesign-crypto/new.pro` · **النسخة الحية:** `https://new-pro-kohl.vercel.app`
> **المصدر الأساسي لهذا الدليل هو الكود الفعلي في المستودع** — يتم تحديثه بعد كل تغيير مُثبت حيًا.

---

## 1) بطاقة تعريف النظام

| البند | القيمة |
|---|---|
| الاسم | نواة AI (Nawah AI) |
| النوع | منصة محادثة ذكاء اصطناعي بواجهة عربية |
| التكلفة | **مجانية بالكامل — بدون بطاقة ائتمانية إطلاقًا** |
| التكنولوجيا | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4 |
| قاعدة البيانات | Neon Postgres (مجاني) عبر `@neondatabase/serverless` |
| المصادقة | Auth.js v5 (بريد/كلمة مرور + Google OAuth + GitHub OAuth اختياري) |
| الحماية | Rate Limit مدمجة (ذاكرة) مع دعم Upstash اختياريًا |
| النشر | GitHub → Vercel (تلقائي مع CI) |
| الاختبارات | 24 اختبارًا آليًا (`npm test`) + CI على كل push |

**فكرة واحدة:** منصة ذكاء اصطناعي عربية **تعمل دائمًا** — حتى لو لم تُضف أي مفتاح API، تعمل بمزود تجريبي (demo)، وإذا انتهت حصة مزود، تتراجع تلقائيًا للآخر. الحسابات والمزامنة اختيارية: الزائر يعمل محليًا، والمستخدم المسجّل يقرأ محادثاته من أي جهاز.

---

## 2) الفلسفة والقيود التصميمية (لا تُخالف)

1. **مجاني بلا بطاقة دائمًا** — كل الخدمات المستخدمة مجانية (AI Studio، Hugging Face، Groq، Tavily، Neon، Vercel Hobby، GitHub).
2. **لا يفشل الطلب في الظروف المدعومة** — يحاول النظام تزويد الرد عبر تراجع تلقائي إلى `demo` عند فشل المزود أو غياب المفتاح، **ضمن نطاق الأخطاء التي يدعمها مسار الترقّع** (انقطاع خدمة/مهلة خارج هذا النطاق تظهر كرسالة خطأ واضحة للمستخدم — لا ضمان مطلق).
3. **يعمل بلا مفاتيح** — وضع demo جاهز؛ المفاتيح تُضيف قوة فقط.
4. **قابل للتوسع دون هدم** — كل ميزة جديدة تُضاف كوحدة مستقلة؛ التخزين المحلي (LocalStore) يعمل دائمًا كقاع أمان.
5. **واجهة عربية RTL مصقولة** — بث + تظليل كود + وضع داكن.
6. **لا تُرفع أي مفاتيح إلى GitHub** — فقط متغيرات بيئة على Vercel، أو لوحة BYOK في المتصفح.
7. **التوثيق يتبع الإثبات الحي** — لا يُدوّن شيء كمكتمل قبل التحقق عمليًا.

---

## 3) المعمارية العامة

```
┌────────────────────────── المتصفح (عميل RTL) ──────────────────────────┐
│  page.tsx ← يجمّع: المحادثة + الشريط الجانبي + نافذة الدخول + الإعدادات │
│  components/  Sidebar · Welcome · ModelPicker · SettingsModal(BYOK)     │
│               AuthModal · Markdown(تظليل كود)                          │
│  lib/keys.ts (localStorage "nawah:keys")  ← مفاتيح الزائر               │
│  storage.ts (LocalStore — يعمل دائمًا)                                  │
└──────────────┬──────────────────────────────────────────────────────────┘
               │ HTTP (fetch + SSE للبث)
┌──────────────▼────────────────────────────── خادم Vercel ──────────────┐
│  app/api/  chat · models · status · conversations · auth/*             │
│  lib/ai/   index.ts (resolveProvider + streamReply)                    │
│            providers/ demo · gemini · groq · huggingface · search      │
│  lib/auth.ts + auth-db.ts (Auth.js v5 + nahwa_users)                   │
│  lib/rate-limit.ts (20/دقيقة chat · 60/دقيقة sync)                     │
│  lib/sync.ts + storage-neon.ts (نطاق user:<id> أو device:<id>)         │
└──────┬────────────────────────────┬──────────────────────┬──────────────┘
       │                            │                      │
  Neon Postgres                Gemini/Groq/HF/Tavily   (Upstash اختياري)
  nahwa_sync · nahwa_users     (مفاتيح من بيئة Vercel   rate-limit مشترك
                                أو من لوحة المتصفح BYOK) عبر عدة خوادم)
```

**قاعدة المفاتيح (موضّحة في «سياسة حل المزودات» القسم 4.1):** `مفتاح البيئة (Vercel) > مفتاح المتصفح (BYOK) > demo`.

---

## 4) خريطة الملفات ومسؤولياتها (مهام كل وحدة)

### أ) واجهة المستخدم — `app/`

| الملف | المهمة |
|---|---|
| `page.tsx` | الصفحة الرئيسية: تحميل المحادثات، إرسال الطلبات مع `apiKey` من اللوحة، عرض بث SSE، تمرير حالة المزودات الاجتماعية لنافذة الدخول |
| `layout.tsx` | غلاف عربي RTL + `globals.css` |
| `globals.css` | التصميم (داكن، RTL، تنسيق الرموز) |
| `icon.svg` | أيقونة الموقع |
| `components/Sidebar.tsx` | قائمة المحادثات + بحث/حذف + اختيار الحساب الجهازي |
| `components/Welcome.tsx` | شاشة البداية (اقتراحات) |
| `components/ModelPicker.tsx` | قائمة النماذج من `/api/models` |
| `components/SettingsModal.tsx` | ⚙️ الإعدادات + **لوحة المفاتيح BYOK** (4 صفوف: Gemini/Groq/HF/Tavily، إظهار/إخفاء، حفظ في `localStorage`) |
| `components/AuthModal.tsx` | دخول/تسجيل بتبويبين + أزرار «المتابعة عبر Google/GitHub» (تظهر عند التفعيل) + فاصل «أو» |
| `components/Markdown.tsx` | عرض الردود Markdown + تظليل الكود (highlight.js + rehype) |

### ب) طبقة API — `app/api/`

| المسار | المهمة |
|---|---|
| `POST /api/chat` | المحادثة: يتحقق (رسائل/ترتيب/طول)، يقيّد بالـ rate limit، يبث SSE من `streamReply` (أحداث `provider`/`chunk`/`sources`/`done`/`error` المعقّم)، ويطبّق سياسة مفتاح المتصفح (4.2): تحقق صيغة → حذف محارف التحكم (400) → لا تخزين → لا تسجيل → تعقيم أخطاء |
| `GET /api/models` | قائمة النماذج المتاحة للواجهة |
| `GET /api/status` | حالة المزودات `{gemini, huggingface, groq, search}` — **بدون كشف أي مفتاح** |
| `GET/PUT/DELETE /api/conversations` | مزامنة المحادثات: يقرر النطاق (`user:<id>` إن وُجد، وإلا `device:<id>`)؛ 60 طلب/دقيقة |
| `GET /api/auth/[...nextauth]` | نقطة Auth.js v5: credentials + Google + GitHub (المزودان الاجتماعيان مشروطان بوجود المفاتيح)؛ 503 عند تعطيل الحسابات |
| `POST /api/auth/register` | إنشاء حساب بريد/كلمة مرور (تحقق + تجزئة scrypt + 10 محاولات/دقيقة) |
| `GET /api/auth/status` | `{enabled, user, providers:{github, google}}` — تعرف الواجهة بها أزرار الدخول الاجتماعية |

### ج) منطق الذكاء — `lib/ai/`

| الملف | المهمة |
|---|---|
| `index.ts` | **العقل المدبر:** ينفّذ «سياسة حل المزودات» (4.1): `resolveProvider(modelId, overrideKey?)` + `streamReply()` + `sanitizeError()` (تعقيم إجباري) + تدقيق داخلي `[nawah][provider-fallback]` |
| `providers/gemini.ts` | Gemini 2.5 Flash/Pro + 2.0 Flash (بث) |
| `providers/groq.ts` | Groq: `openai/gpt-oss-120b` / `openai/gpt-oss-20b` (بث سريع) |
| `providers/huggingface.ts` | HF: Qwen2.5-7B / Phi-3.5-mini عبر **Inference Providers** |
| `providers/search.ts` | **البحث في الويب (Tavily):** يبث خلاصة + نتائج بمصادر وروابط |
| `providers/demo.ts` | مزود تجريبي (عربي) — يضمن عمل النظام بلا أي مفتاح |
| `sse.ts` | أدوات بث Server-Sent Events |

### د) الحسابات والتخزين والأمان

| الملف | المهمة |
|---|---|
| `lib/models.ts` | تعريف `ProviderKind` + قائمة النماذج (معرّف `provider:model`) + `splitModelId/getModel` |
| `lib/auth.ts` | إعداد Auth.js v5: مزود Credentials + Google + GitHub (مشروط) + `authEnabled()` + `socialProviders()` |
| `lib/auth-db.ts` | جدول `nahwa_users` (إنشاء تلقائي) + تسجيل/تحقق (scrypt + `timingSafeEqual`) |
| `lib/rate-limit.ts` | حدود: محادثة 20/دقيقة، مزامنة 60/دقيقة؛ مصدر `memory` (يعمل فورًا) أو `upstash` (مشترك) أو `disabled` للاختبارات |
| `lib/storage-neon.ts` | القراءة/الكتابة/الحذف في `nahwa_sync` (Postgres) |
| `lib/storage.ts` | التخزين المحلي (LocalStore) — يعمل دائمًا بلا حساب |
| `lib/sync.ts` | منطق المزامنة + `resolveScope`: `user:<id>` وإلا `device:<id>` |
| `lib/keys.ts` | مفاتيح المتصفح: `localStorage "nawah:keys"` + `PROVIDER_TO_KEY` + load/get/save |
| `lib/i18n.ts` | كل نصوص الواجهة (عربي/إنجليزي) |
| `lib/types.ts` · `lib/utils.ts` · `lib/next-auth.d.ts` | أنواع مشتركة + أدوات + تعريفات TS لـ NextAuth |

### هـ) أدوات — `scripts/` و`tests/` و`db/`

| الملف | المهمة |
|---|---|
| `scripts/check-providers.mjs` | تشخيص جاهزية المفاتيح (`npm run check:keys`) |
| `tests/api.test.mjs` | 24 اختبارًا آليًا (API + بث + تراجع + حماية + مزامنة + BYOK + بحث + حالة المزودات) |
| `db/schema.sql` | مخطط Neon (`nahwa_sync` + `nahwa_users`) — يُنشأ تلقائيًا |
| `.github/workflows/ci.yml` | على كل push: تثبيت → فحص الأنواع → بناء → الاختبارات → تقرير |

### 4.1) سياسة حل المزودات — `Provider Resolution Policy` ⭐

سياسة موثّقة ومُطبّقة في `lib/ai/index.ts` (وليس مجرد قاعدة في التوثيق) — أي مزود جديد (OpenRouter/Cerebras/Mistral...) يتبع نفس السلسلة دون تعديلها:

```
ProviderResolutionPolicy

1. المزود/النموذج المطلوب صراحةً (modelId "provider:model")
2. اعتماد مفتاح بيئة الخادم (Vercel) للطلب المباشر
3. اعتماد مفتاح المتصفح BYOK (يتقدّم على البيئة في الجلسة — مقطوع 300 حرف)
4. تراجع تلقائي حسب الأولوية العامة: Groq → Gemini → HF
5. demo fallback (آخر خطوة — لا يفشل الطلب ضمن الظروف المدعومة)
6. إصدار بيانات المزود فعليًا للعميل: حدث SSE {provider} دائمًا
7. تدقيق داخلي آمن للأسباب: [nawah][provider-fallback] (لا مفاتيح، لا محتوى مستخدم)
```

> **استثناءان مقصودان:** `demo` لا يتراجع (يُختار عمدًا) · `search` لا يتراجع إلى demo (يبث خلاصة أو خطأً واضحًا — لا تضليل).

### 4.2) سياسة مفتاح المتصفح — `BYOK Client Key Policy` 🔐

يصل `apiKey` من المتصفح إلى طبقة المزود فقط، والصيغة الرسمية المطبّقة:

```
client apiKey
→ تحقق الصيغة (إزالة الفراغات + قص 300 + رفض محارف التحكم → 400)
→ لا يُخزَّن خادميًا إطلاقًا (لا DB، لا ملف)
→ لا يُسجَّل في السجلات (لا console يمرره؛ سجل التدقيق يعرض السبب فقط)
→ لا يظهر في رسائل الخطأ (تعقيم إجباري sanitizeError: يستبدل أي أثر بـ ***)
→ لا يمر عبر أحداث SSE (الأحداث: provider / chunk / sources / done / error المعقّم فقط)
→ يُمرَّر لنداء المزود حصرًا
```

> **الإثبات في الكود:** `sanitizeError(err, resolved.apiKey, outKey)` في `app/api/chat/route.ts` + `console.warn("[nawah][provider-error]", {provider, reason: معقّم})` + استبعاد المحارف التحكمية (منع حقن الترويسات). الاقتطاع (300 حرف) إجراء أمان إضافي — وليس بديلًا عن عدم التسجيل/التسريب.

---

## 5) المهام الوظيفية الرئيسية

| # | المهمة | كيف تعمل | الحالة الحية |
|---|---|---|---|
| 1 | **محادثة ذكية عربية** | `POST /api/chat` → بث SSE؛ يدعم Markdown + تظليل كود | ✅ تعمل |
| 2 | **تراجع تلقائي** | يحاول النظام تزويد الرد عبر fallback إلى `demo` عند فشل المزود أو غياب المفتاح، ضمن نطاق الأخطاء المدعومة (وفق سياسة 4.1) | ✅ تعمل |
| 3 | **4 مزودات + بحث** | Gemini · Groq · HuggingFace · Tavily(بحث بمصادر) · demo | ✅ **كلها مفعّلة حيًا** `{gemini,hf,groq,search:true}` |
| 4 | **حسابات وأجهزة** | Auth.js v5؛ دخول بريد/كلمة مرور + Google (مفعّل حيًا) + GitHub (اختياري)؛ مزامنة عبر `user:<id>` | ✅ بريد/كلمة مرور + Google OAuth؛ GitHub بانتظار مفاتيحك |
| 5 | **مزامنة عبر الأجهزة** | `nahwa_sync` في Neon؛ الزائر → `device:<id>`، المسجّل → `user:<id>` | ✅ مثبتة (جهازان قرآ نفس المحادثة) |
| 6 | **حماية الحدود** | 20 رسالة/دقيقة + 60 مزامنة/دقيقة، `429` + ترويسات `X-RateLimit-*`؛ Upstash اختياري لمشاركة الحدود | ✅ `memory` فعّال (Upstash اختياري) |
| 7 | **لوحة مفاتيح BYOK** | من ⚙️ الإعدادات: أي زائر يلصق مفتاحه في المتصفح → تفعيل فوري دون لمس Vercel | ✅ مثبتة حيًا |
| 8 | **واجهة RTL مصقولة** | عربية بالكامل + داكن + اقتراحات + اختيار نماذج | ✅ تعمل |

---

## 6) التدفقات الرئيسية

### تدفق رسالة محادثة
```
المستخدم يكتب → page.tsx يبني body {messages, modelId, apiKey?}
  → POST /api/chat (+ ترويسة x-ratelimit-source)
  → rate-limit (20/دقيقة) → 429 إن تجاوز، وإلا:
  → resolveProvider: search؟ → Tavily (خلاصة+مصادر)
                : غير ذلك → مفتاح البيئة أو مفتاح المتصفح (مقطوع 300 حرف)
  → streamReply → SSE أحداث: {provider} → {delta}×N → {sources?} → {done}
  → الواجهة تعرض النص + المصادر (للبحث) + تظليل الكود
```

### تدفق الدخول بالبريد/كلمة المرور
```
AuthModal (تبويب دخول/تسجيل) → POST /api/auth/register (تسجيل: scrypt + DB)
  → /api/auth/callback/credentials → جلسة JWT (Auth.js v5) → cookie آمن
  → المزامنة تنتقل تلقائيًا من device:<id> إلى user:<id>
```

### تدفق الدخول بـ Google (مفعّل حيًا)
```
زر «المتابعة عبر Google» → POST /api/auth/signin/google + CSRF
  → 302 إلى accounts.google.com (client_id + redirect_uri مسجّلا + PKCE)
  → موافقة المستخدم → /api/auth/callback/google
  → تبادل الكود → upsert في nahwa_users → جلسة
مُلاحظة دقة: اختبار الكود الوهمي (invalid_grant) يُثبت "تكوين سليم" (Configuration PASS)
           وليس نجاح end-to-end — الإثبات الحاسم تسجيل دخول حقيقي من متصفح المستخدم.
```

### تدفق المزامنة
```
الواجهة تحفظ محليًا دائمًا (LocalStore) ثم PUT /api/conversations (حسب نطاق الجهاز/الحساب)
  → فالقراءة GET → دمج → العرض. أي فشل شبكي لا يمس التجربة المحلية.
```

---

## 7) مرجع API

| الطريقة والمسار | المدخلات | المخرجات |
|---|---|---|
| `POST /api/chat` | `{messages, modelId, apiKey?}` | SSE: `provider`, `delta`, `sources`, `done` |
| `GET /api/models` | — | قائمة النماذج |
| `GET /api/status` | — | `{gemini, huggingface, groq, search}` |
| `GET /api/conversations` | النطاق من الجلسة/الجهاز | `{conversations, settings}` |
| `PUT /api/conversations` | نفس الشكل | `{ok}` |
| `DELETE /api/conversations` | — | `{ok}` |
| `GET /api/auth/status` | — | `{enabled, user, providers:{github, google}}` |
| `POST /api/auth/register` | `{email, name, password}` | `{ok}` أو 400/429 |
| `* /api/auth/*` | Auth.js | مصادقة كاملة |

---

## 8) نموذج البيانات (Neon Postgres)

```sql
nahwa_sync(
  device_id   TEXT PRIMARY KEY,   -- device:<id> أو user:<id>
  data        TEXT,               -- JSON: {v, conversations[], settings{}}
  updated_at  TIMESTAMPTZ DEFAULT now()
)

nahwa_users(
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  password_hash TEXT,             -- scrypt (قد يكون NULL لمستخدمي OAuth)
  created_at    TIMESTAMPTZ DEFAULT now()
)
```

---

## 9) المتغيرات البيئية (Vercel → Production)

| المتغير | الوظيفة | الحالة الحية |
|---|---|---|
| `GEMINI_API_KEY` | مزود Gemini | ✅ في Vercel |
| `GROQ_API_KEY` | مزود Groq | ✅ في Vercel |
| `HF_TOKEN` | Hugging Face | ✅ في Vercel |
| `TAVILY_API_KEY` | البحث في الويب | ✅ في Vercel |
| `DATABASE_URL` | Neon | ✅ في Vercel |
| `AUTH_SECRET` | توقيع الجلسات | ✅ في Vercel |
| `AUTH_URL` / `AUTH_TRUST_HOST` | أساس Auth.js | ✅ في Vercel |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth | ✅ **في Vercel + مقبول من Google** |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth | ⏳ بانتظار بياناتك (اختياري) |
| `MAX_TOKENS` | حد الإنتاج (1024 افتراضيًا) | ✅ في Vercel |
| `RATE_LIMIT_PER_MIN` / `RATE_LIMIT_SYNC_PER_MIN` | الحدود | افتراضيات 20/60 |
| `RATE_LIMIT_DISABLED=1` | تعطيل الحماية | للاختبارات المحلية فقط |
| `UPSTASH_REDIS_REST_URL` / `...TOKEN` | حماية مشتركة (اختياري) | ⏳ بانتظار حساب Upstash |

> 🔒 **القاعدة:** لا مفتاح في GitHub أبدًا. **الاستثناءات المشروعة** (تحتاج حسابك): Tavily/Upstash/OAuth + لوحة BYOK كمسار بديل للزائر.

---

## 10) الأمان

- كلمات المرور: **scrypt + مقارنة آمنة** (`timingSafeEqual`) — لا تخزين نصي.
- الجلسات: JWT موقّع بـ `AUTH_SECRET` + Cookies آمنة.
- عدم كشف المفاتيح: `/api/status` يعيد قيمًا منطقية فقط.
- الحماية من الإساءة: 20/دقيقة محادثة، 60/دقيقة مزامنة، 10 محاولات دخول/دقيقة، تحقق من المدخلات (رسائل فارغة/ترتيب/طول).
- الترويسات: `429` + `X-RateLimit-Limit/Remaining/Reset` + `x-ratelimit-source`.
- سر OAuth: لا يُخزَّن في أي ملف بالمستودع (مُتحقق منه عبر Git). المفاتيح في Vercel مشفّرة.

---

## 11) الاختبارات والجودة

```
npm run typecheck   → tsc --noEmit
npm run build       → next build
npm test            → 24/24 اختبارًا (API، بث، تراجع، حماية، مزامنة، BYOK، بحث، حالة)
npm run check:keys  → تشخيص المزودات
```

- **CI (GitHub Actions):** على كل push — تثبيت → أنواع → بناء → اختبارات → تقرير. `success` على آخر رفع.
- منهجية العمل: **اختبر قبل التطوير، وفعّل قبل التوثيق** — لا تُكتَب حالة «مكتمل» قبل إثبات حي.

---

## 12) التشغيل محليًا

```bash
cd nahwa-ai
npm install
# انسخ .env.example → .env.local وأضف مفاتيحك (أو اعمل بلا مفاتيح: demo يعمل)
npm run dev        # → http://localhost:3000
npm test           # الاختبارات
```

> ملاحظة: إن بقي المنفذ مشغولًا: `fuser -k 3000/tcp`

---

## 13) النشر (GitHub → Vercel)

```
git push origin main → GitHub (CI: يبني ويختبر) → Vercel (نشر تلقائي)
→ https://new-pro-kohl.vercel.app (~60 ثانية)
```

- **المتغيرات** تُضاف من Vercel → Settings → Environment Variables → Production (ولا ترفع إلى GitHub).
- **تحديث مفتاح موجود:** ابحث عن `ENVID` عبر `/env` ثم PATCH (POST يعيد 400 للموجود).

---

## 14) التوسع — كيف تضيف؟

**مزودًا جديدًا:** ملف في `lib/ai/providers/` + سطر case في `streamReply` + سطر في `lib/models.ts` — فقط.
**مفتاحًا في اللوحة:** سطر في `lib/keys.ts` (PROVIDER_TO_KEY) + صف في `SettingsModal` — فقط.
**حدًّا جديدًا:** سطر في `lib/rate-limit.ts`.
**ميزة كاملة:** وحدة مستقلة + اختبار + إثبات حي + توثيق — بنفس نمط الجولات السابقة.

---

## 15) الحالة الراهنة — `RELEASE STATUS` (2026-08-29)

```
NAWAH AI — RELEASE STATUS
────────────────────────────────────────
Core Chat                  PASS
SSE Streaming              PASS
Demo Provider              PASS
Gemini                     PASS
Groq                       PASS
HuggingFace                PASS
Web Search / Tavily        PASS
BYOK                       PASS
LocalStore                 PASS
Neon Sync                  PASS
Credentials Auth           PASS
Google OAuth Config        PASS   ← الإعداد مُثبت (المزود ظاهر + السر مقبول من Google)
Google OAuth E2E           PENDING USER TEST   ← يتطلب تسجيل دخول حقيقي من المتصفح
GitHub OAuth               OPTIONAL / NOT CONFIGURED
Rate Limit                 PASS
CI                         PASS
Secrets Hygiene            PASS
Production Deployment      PASS
Documentation              PASS
────────────────────────────────────────
OVERALL                   READY / E2E AUTH PENDING
```

**الفرق الجوهري في الصياغة (يُحترم دائمًا):**

| المصطلح | المعنى | ما لا يثبته |
|---|---|---|
| **Configuration PASS** | المزود مفعّل + بيان Google «invalid_grant» (عميل/سر/redirect مقبولة) + التدفق يصل accounts.google.com | لا يثبت callback → upsert → جلسة |
| **E2E PASS** | تسجيل دخول حقيقي من متصفح → callback → جلسة → حساب في `nahwa_users` → مزامنة `user:<id>` | — (يُعلن فقط بعد الاختبار الفعلي) |

**متبقٍ للتحويل:**
- `Google OAuth E2E` → **PASS** بعد نجاح تسجيل الدخول من المتصفح (خطوة بيد المستخدم — تتطلب حساب Google).
- `GitHub OAuth` → اختياري: `AUTH_GITHUB_ID/SECRET` ثم إثبات بنفس النمط.
- `Upstash` → اختياري: `UPSTASH_REDIS_REST_URL/TOKEN` (حماية مشتركة متعددة الخوادم).
- الاختبارات: 24/24 · CI: success · المستودع نظيف بلا أسرار (فحص كامل تاريخ Git).

---

*نُشر هذا الدليل مع آخر push؛ أُنشئ من واقع الكود والتحققات الحية — أي تحديث للميزات يُتبَع بتحديثه.*
