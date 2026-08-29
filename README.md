<div align="center">

# نواة AI — Nawah AI

**منصة محادثة ذكية كاملة** تعمل بالمجان حتى النشر — بدون بطاقة، بدون تكلفة.

🔗 **الموقع الحي:** [https://nawah-ai-alpha.vercel.app](https://nawah-ai-alpha.vercel.app) · 📦 **الكود:** [GitHub](https://github.com/sayedelazameydesign-crypto/new.pro)

`Next.js 15 (App Router)` · `Gemini API` · `Hugging Face` · `Vercel` · `TypeScript` · `Tailwind v4`

[![CI — فحص النواة](https://github.com/sayedelazameydesign-crypto/new.pro/actions/workflows/ci.yml/badge.svg)](https://github.com/sayedelazameydesign-crypto/new.pro/actions) · 10/10 اختبارات ✅

[واجهة عربية/إنجليزية RTL/LTR] · [بث مباشر (Streaming)] · [مفاتيح مجانية فقط] · [قابلة للتوسع دون هدم المعمارية]

</div>

---

## ✨ ماذا يوجد في الصندوق؟

| الميزة | التفاصيل |
|---|---|
| 🤖 **مزودان مجانيان** | Gemini (AI Studio) + Hugging Face Inference — بتراجع تلقائي (fallback) |
| ⚡ **بث فوري** | الرد يظهر حرفًا بحرف عبر SSE (بدون انتظار الرد الكامل) |
| 🎨 **واجهة عصرية** | وضع ليلي/نهاري، جداول ورموز ملونة (highlight.js)، نسخ الكود، RTL/LTR |
| 💬 **إدارة محادثات كاملة** | إنشاء/إعادة تسمية/حذف/بحث/تصدير/استيراد (JSON) |
| ⚙️ **إعدادات غنية** | تعليمات النظام (System Prompt)، الإبداعية (Temperature)، اختيار الموديل |
| 🧱 **معمارية قابلة للتوسع** | طبقات منفصلة: `lib/ai` (مزودات) → `lib/storage` (تخزين) → `app/api` → الواجهة |
| 🌍 **ثنائي اللغة** | عربي 🇪🇬 / إنجليزي — بدون إعادة بناء |

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
- [x] نواة كاملة: واجهة + خلفية + مزودان مجانيان + نشر بلا تكلفة
- [ ] مزامنة سحابية عبر Neon (3 ملفات)
- [ ] محادثات مجهولة بدون تسجيل (عبء صفري) → ثم تسجيل اختياري عبر Auth.js
- [ ] إضافة مزودين: OpenRouter المجاني، Groq، DeepSeek
- [ ] أدوات: بحث ويب (SearXNG)، قراءة PDF، توليد صور بالمجان (FLUX.1-schnell)
- [ ] مشاركة المحادثات برابط عام + تصدير Markdown/PDF

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

<div align="center">

**نواة AI** — بُنيت لتكبر، لا لتهدم. 🚀

MIT License · اشتق، عدّل، انشر بحرية

</div>
