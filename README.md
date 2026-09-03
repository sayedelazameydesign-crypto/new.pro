<div align="center">

# نواة AI — Nawah AI

**منصة محادثة ذكية كاملة** تعمل بالمجان حتى النشر — بدون بطاقة، بدون تكلفة.

🔗 **الموقع الحي (كامل):** [https://new-pro-kohl.vercel.app](https://new-pro-kohl.vercel.app) · 🔗 **نسخة الإعدادات الكاملة:** [nawah-ai-alpha.vercel.app](https://nawah-ai-alpha.vercel.app)
📦 **الكود:** [GitHub](https://github.com/sayedelazameydesign-crypto/new.pro)

`Next.js 16 (App Router)` · `Gemini` · `Groq` · `Hugging Face` · `Vercel` · `TypeScript` · `Tailwind v4`

[![CI — فحص النواة](https://github.com/sayedelazameydesign-crypto/new.pro/actions/workflows/ci.yml/badge.svg)](https://github.com/sayedelazameydesign-crypto/new.pro/actions) · اختبارات وحدة + Playwright E2E على كل دفع

[واجهة عربية/إنجليزية RTL/LTR] · [بث مباشر (Streaming)] · [مفاتيح مجانية فقط] · [قابلة للتوسع دون هدم المعمارية]

</div>

---

## ✨ ماذا يوجد في الصندوق؟

| الميزة | التفاصيل |
|---|---|
| 🤖 **مزودات مجانية** | Groq → GitHub Models → Gemini → HF + بحث Tavily — قاطع دائرة عند 429 |
| ⚡ **بث فوري** | الرد يظهر حرفًا بحرف عبر SSE (بدون انتظار الرد الكامل) |
| 🎨 **واجهة عصرية** | وضع ليلي/نهاري، جداول ورموز ملونة (highlight.js)، نسخ الكود، RTL/LTR |
| 💬 **إدارة محادثات كاملة** | إنشاء/إعادة تسمية/حذف/بحث/تصدير/استيراد (JSON) |
| ⚙️ **إعدادات غنية** | تعليمات النظام (System Prompt)، الإبداعية (Temperature)، اختيار الموديل |
| 🧱 **معمارية قابلة للتوسع** | طبقات منفصلة: `lib/ai` (مزودات) → `lib/storage` (تخزين) → `app/api` → الواجهة |
| 🌍 **ثنائي اللغة** | عربي 🇪🇬 / إنجليزي — بدون إعادة بناء |
| 📱 **تطبيق قابل للتثبيت (PWA)** | `manifest` كامل RTL + أيقونات 192/512/180 + Service Worker (شبكة أولًا للـHTML، كاش للأصول، لا يلمس `/api/*`) |

## 🚀 التشغيل المحلي (3 دقائق)

```bash
git clone <رابط-المستودع>
cd nawah-ai
npm install

# بلا مفتاح؟ يعمل فورًا بوضع العرض التجريبي:
npm run dev        # → http://localhost:3000

# بمفتاح مجاني (موصى به):
cp .env.example .env.local
# ثم ضع: GEMINI_API_KEY=مفتاحك_من_aistudio.google.com/apikey
npm run dev
```

## 🔑 المفاتيح المجانية (كلاهما بدون بطاقة)

1. **Gemini** → [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — أنشئ مفتاحًا، انسخه، ضعه في `GEMINI_API_KEY`
2. **Hugging Face** → [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) — توكن نوع `Read` في `HF_TOKEN`

> بدون أي مفتاح: التطبيق يعمل بوضع العرض التجريبي (يحاكي الرد تمامًا) حتى لا تتعطل التجربة أبدًا.



> ⚠️ **عن مزود Hugging Face:** مفتاح التوكن يكفي للاتصال، لكن يجب تفعيل **Inference Providers** من إعدادات حساب HF (مجاني) حتى تُخدم الموديلات عبر router.huggingface.co. إن لم تُفعّل، ستظهر رسالة واضحة ويستمر النظام بالتراجع لمزود آخر. الموصى به أساسًا: **Gemini + Groq** (كلاهما يعمل فور إضافة المفتاح).




> 🧊 **BASELINE المجمّد:** `auth-baseline` → `289c7f5` (AUTH HARDENED / FINAL) — انظر [BASELINE.md](BASELINE.md)

## 🔑 لوحة إدخال المفاتيح (BYOK — تعمل فورًا من المتصفح)

من **الإعدادات → المفاتيح المجانية** يمكنك لصق مفتاحك الخاص (Gemini / Groq / HF / Tavily):

- يُحفظ **في متصفحك فقط** (`localStorage`) ويُرسل مع كل طلب — تفعيل فوري دون لمس Vercel
- إظهار/إخفاء المفتاح + حالة «بيئة / محلي»
- أولوية التشغيل: متغيرات Vercel البيئية > مفتاح المتصفح
- مفيدة أيضًا لاستقبال مفاتيح من مستخدمين (كل زائر يستخدم مفتاحه المجاني)

> ✅ **مفعّل وحي الآن:** `TAVILY_API_KEY` أُضيف في Vercel → `{"search":true}` على النطاق الحي، وطلب `search:web` أجرى بحثًا حقيقيًا (خلاصة + نتائج بمصادر وروابط).

## 👤 الحسابات (Auth.js v5 — مجاني بالكامل)

حساب واحد → محادثاتك متزامنة عبر كل أجهزتك (لم تعد مقيدة بجهاز واحد).

| الميزة | التفاصيل |
|---|---|
| **الدخول** | بريد + كلمة مرور (تُجزّأ بـ scrypt وتُخزَّن في Neon) — يعمل فورًا |
| **الدخول بـ Google** | ✅ **مفعّل حيًا** — `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` في Vercel، والزر يبدأ التدفق الصحيح (مُثبت: `/api/auth/signin/google` → `accounts.google.com` ببياناتنا) |
| **الدخول بـ GitHub** | ⏳ اختياري — أضف `AUTH_GITHUB_ID` + `AUTH_GITHUB_SECRET` (GitHub → Settings → Developer settings → OAuth Apps) فيظهر الزر تلقائيًا |
| **Provisioning إلزامي** | ✅ `ensureApplicationUser()` في دورة الجلسة: أي دخول (OAuth أو بريد) يضمن مستخدمًا تطبيقيًا canonical في `nahwa_users` + ربط هوية في `nahwa_auth_identities` — لا جلسة بلا مستخدم (12 اختبارًا للهوية) |
| **الترقية الذكية** | مستخدم مسجّل → المزامنة عبر `userId`؛ زائر غير مسجّل → تبقى عبر `deviceId` (سلوك سابق سليم) |
| **الحماية** | 10 محاولات دخول/دقيقة/IP + تسجيل 10/دقيقة/IP |

**تفعيل الحسابات:** `AUTH_SECRET` (عشوائيًا: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) + `DATABASE_URL` — الجدول `nahwa_users` يُنشأ تلقائيًا.

> ✅ **الحالة:** مفعّلة على [new-pro-kohl.vercel.app](https://new-pro-kohl.vercel.app) — مثبتة بجولة حية (تسجيل → دخول → مزامنة من جهازين) + **Google OAuth مفعّل (2026-08-29)** — آخر خطوة: تسجيل دخول من متصفح المستخدم.


## 🛡️ حماية الحدود (Rate Limit — يعمل تلقائيًا بلا إعداد)

كل طلب محادثة يُقيَّد بواسطة IP:

| نقطة | الحد الافتراضي | متغير التخصيص |
|---|---|---|
| محادثة `/api/chat` | 20 رسالة / دقيقة / IP | `RATE_LIMIT_PER_MIN` |
| مزامنة `/api/conversations` | 60 طلب / دقيقة / IP | `RATE_LIMIT_SYNC_PER_MIN` |

- **بدون أي إعداد**: يعمل تقييدًا في ذاكرة الخادم (مثالي للبداية والتطوير).
- **مع Upstash (مجاني)**: يتحول لتقييد موزّع صحيح عبر كل خوادم Vercel. أضف `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` من [console.upstash.com](https://console.upstash.com).
- عند التجاوز: `429` + رسالة عربية واضحة + ترويسة `Retry-After` — لا يحترق أي مفتاح مجاني.
- `RATE_LIMIT_DISABLED=1` لتعطيل الحماية (الاختبارات المحلية فقط).


## 🔄 المزامنة السحابية (مجاني — Neon Postgres)

محادثاتك تتبعك على أي جهاز، وتُحفظ خارج المتصفح (يحل حدود localStorage نهائيًا).

**التفعيل (مرة واحدة):**
1. أنشئ حسابًا على [neon.tech](https://neon.tech) (ادخل بحساب GitHub — مجاني)
2. Create Project → انسخ **Connection String** (يفضَّل نسخة *Pooled*)
3. ضعها في متغير البيئة: `DATABASE_URL` (محليًا `.env.local` / على Vercel: Settings → Environment Variables)
4. **انتهى** — الجدول يُنشأ تلقائيًا عند أول مزامنة، والمؤشر ☁️ في أعلى الواجهة يتحول إلى "متزامن"

> **الحالة الحالية:** `DATABASE_URL` مُفعّل — المزامنة السحابية تعمل الآن على الرابط الحي ✅

**بدون `DATABASE_URL`:** كل شيء يعمل كما كان (تخزين محلي فقط) — لا يكسر شيئًا.

## ☁️ النشر المجاني على Vercel (بدون فيزا — خطوة بخطوة)

### 1) ارفع المشروع إلى GitHub
```bash
cd nawah-ai
git init
git add .
git commit -m "Nawah AI: النواة الأولى"
git branch -M main
git remote add origin https://github.com/<اسمك>/nawah-ai.git
git push -u origin main
```

### 2) استورد المشروع في Vercel (مجاني، بدون بطاقة)
1. افتح [vercel.com/new](https://vercel.com/new) وسجّل بحساب GitHub
2. **Import** → اختر مستودع `nawah-ai` → اضغط **Deploy**
3. سيتعرف Vercel على Next.js تلقائيًا — لا حاجة لأي إعداد

### 3) أضف المفاتيح (بعد أول Deploy)
1. من لوحة المشروع: **Settings → Environment Variables**
2. أضف:
   - `GEMINI_API_KEY` = مفتاحك المجاني
   - `HF_TOKEN` = توكنك (اختياري)
3. **Redeploy** من تبويب **Deployments** → ⋮ → **Redeploy**

> ⏱️ يُنصح بضبط **توقيت الدوال**: `Project Settings → Functions → Max Duration = 60s` (الأقصى على خطة Hobby).

### 4) رابطك المباشر
`https://<اسم-المشروع>.vercel.app` — واجهة كاملة + API يعملان مجانًا 🎉

---

## 🧠 كيف تتوسع دون هدم المعمارية؟

المبدأ: **كل طبقة معزولة خلف واجهة (Interface) — بدّل التنفيذ دون لمس الباقي.**

```
┌─────────────────────────────────────────────────────────┐
│  app/  (الواجهة — React)                                  │
│  ├── page.tsx            ← الشاشة الرئيسية + البث        │
│  └── components/          ← Markdown · Sidebar · إعدادات │
├─────────────────────────────────────────────────────────┤
│  app/api/  (طبقة الخادم — Next.js Route Handlers)         │
│  ├── POST /api/chat       ← بث الردود (SSE)              │
│  ├── GET  /api/status     ← حالة المفاتيح                │
│  └── GET  /api/models     ← قائمة الموديلات              │
├─────────────────────────────────────────────────────────┤
│  lib/ai/  (قلب الذكاء — أضف مزودًا في ٥ دقائق)            │
│  ├── index.ts            ← المنسّق + التراجع التلقائي    │
│  └── providers/           ← gemini.ts · huggingface.ts · demo.ts │
├─────────────────────────────────────────────────────────┤
│  lib/storage.ts          ← التخزين (LocalStorage الآن)   │
│  lib/models.ts           ← سجل الموديلات                 │
│  lib/i18n.ts             ← الترجمات                      │
└─────────────────────────────────────────────────────────┘
```

### ➕ إضافة مزود جديد (Base Model / Anthropic / …)

```ts
// 1) أنشئ الملف: lib/ai/providers/anthropic.ts
export async function* anthropicStream(opts) { /* أعد استخدام sse.ts */ }

// 2) أضف مزودًا لهذا التوكن في lib/ai/index.ts (سطر واحد)
case "anthropic": yield* anthropicStream({...}); break;

// 3) أضف الموديل في lib/models.ts (سطر واحد)
{ id: "anthropic:claude-sonnet-4", name: "Claude Sonnet 4", provider: "anthropic", free: false }

// 4) أضف متغير البيئة في .env.example (سطر واحد)
ANTHROPIC_API_KEY=
```
*انتهى — الواجهة وطبقة API تتعاملان مع المزود الجديد تلقائيًا.*

### 🗄️ تبديل التخزين إلى قاعدة بيانات حقيقية
نفّذ واجهة `ConversationStore` (في `lib/storage.ts`) بأي تخزين تريده:
- **Neon (Postgres مجاني)** — الأنسب مع Vercel: إنشاء دالة `runSQL` عبر `@neondatabase/serverless`
- أو Supabase / Firebase / تفضيلات الخادم

استبدل `new LocalStore()` بسطر واحد — لا شيء آخر يتغير.

### 🔄 الترقية إلى نظام مزودات كامل (AI SDK) عند الحاجة
البنية الحالية تشبه `AI SDK` من حيث التعاقد (`messages[] → AsyncGenerator<string>`).
عندما تحتاج أدوات (Tools) أو تشابك (Agents) أو تعدد أدوار (Roles):
- أضف `lib/ai/v2.ts` يستخدم `ai` + `@ai-sdk/google` خلف نفس الدالة `streamReply`
- الواجهة و API لا تتغيران إطلاقًا

### 📜 خارطة الطريق المقترحة (Roadmap)
- [x] نواة كاملة: واجهة + خلفية + مزودات مجانية + نشر بلا تكلفة
- [x] مزامنة سحابية عبر Neon
- [x] زائر بلا تسجيل + حسابات Auth.js (بريد + Google)
- [x] مزود Groq + بحث ويب (Tavily)
- [x] قراءة ملفات + صوت + ملخص + PWA + تصدير Markdown/PDF + مشاركة محلية `?c=id`
- [x] توليد صور Pollinations (بلا مفتاح، بلا بروكسي) — العلم `IMAGE_GENERATION_ENABLED=1`
- [ ] OpenRouter `:free` / GitHub Models / قاطع دائرة للحصة 429

---

## 🛡️ ملاحظات أمان وحصص

- المفاتيح **لا تُرفع لـ GitHub** أبدًا (في `.gitignore`) — فقط متغيرات بيئة
- `/api/status` يكشف فقط *وجود* المفتاح، لا قيمته
- حدود الحصة المجانية: Gemini ≈ 1500 طلب/يوم (Flash) — كافية لبدايتك
- عند انتهاء الحصة تُشعرك الرسالة برسالة خطأ واضحة (429)
- أضف حماية من الإساءة قبل فتح الرابط للعامة: حد أقصى للمحادثات (جلسة المخزن محلي)
- جرّب مميزات **Bunker** و حماية لمدة 7 أيام... الأسهل: `middleware.ts` + kv

## 📁 بنية المشروع

```
nawah-ai/
├── app/
│   ├── layout.tsx            # RTL + الخطوط
│   ├── page.tsx              # الشاشة الرئيسية (بث مباشر)
│   ├── globals.css           # Tailwind v4 + تلوين الكود
│   ├── icon.svg
│   └── api/
│       ├── chat/route.ts     # POST — بث الردود
│       ├── status/route.ts   # GET — حالة المفاتيح
│       └── models/route.ts   # GET — قائمة الموديلات
├── app/components/           # Markdown · Sidebar · Welcome · ModelPicker · Settings
├── lib/
│   ├── ai/                   # المنسّق + المزودات (gemini/hf/demo) + قارئ SSE
│   ├── models.ts             # سجل الموديلات
│   ├── storage.ts            # واجهة التخزين (LocalStore)
│   ├── i18n.ts               # عربي/إنجليزي
│   ├── types.ts              # الأنواع المشتركة
│   └── utils.ts
├── .env.example
└── package.json
```

## ❓ أسئلة شائعة

**هل أحتاج فاتورة/بطاقة؟** لا. Gemini AI Studio مجاني بلا بطاقة، وVercel Hobby مجاني بلا بطاقة، وGitHub مجاني.

**لماذا يرد النظام بنص "وضع العرض التجريبي"؟** لأنك لم تضف مفتاحًا بعد — أضفه من الإعدادات أو متغيرات البيئة.

**أين تٌحفظ المحادثات؟** في متصفحك (LocalStorage) — خصوصية كاملة. استبدل `LocalStore` بقاعدة بيانات عند الحاجة.

**هل يدعم العربية؟** الواجهة عربية RTL بالكامل + اللغة الإنجليزية، والردود بجودة موديلات Gemini ممتازة بالعربية.

---

## 📚 للمطوّرين والوكلاء

للحصول على سياق المشروع الكامل (التقنيات، المزودات، القيود التشغيلية، وأعراف الكود) دون قراءة كل الملفات، راجع:
- **[AGENT.md](AGENT.md)** — دليل السياق الجاهز لأي وكيل ذكاء اصطناعي أو مطوّر جديد.
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — معمارية الطبقات وترابطها.
- **[SYSTEM-GUIDE.md](SYSTEM-GUIDE.md)** — دليل تشغيل النظام.
- **[DEVELOPMENT-STATE.md](DEVELOPMENT-STATE.md)** — حالة التطوير الحالية (machine-readable).

---

<div align="center">

**نواة AI** — بُنيت لتكبر، لا لتهدم. 🚀

MIT License · اشتق، عدّل، انشر بحرية

</div>
