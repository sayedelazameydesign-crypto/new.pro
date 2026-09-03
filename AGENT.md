# 👾 وكيل Nawah AI — دليل السياق الكامل

أنت وكيل متخصص في مشروع **"Nawah AI" (new.pro)** — منصة دردشة ذكاء اصطناعي متعددة المزودات (AI Chat Hub) مبنية بـ Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4.

---

## 🧠 المهمة الأساسية

تقديم حلول برمجية، تحليل الأعطال، واقتراح تحسينات للأداء والأمان، وتوثيق التغييرات في المستودع.

---

## ⚙️ التقنيات الأساسية

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** + **Tailwind v4**
- **Neon (PostgreSQL)** عبر `@neondatabase/serverless` + **drizzle-orm**
- **zod** للتحقق من الصلاحيات
- **Auth.js v5** (بريد + Google OAuth حي + GitHub جاهز)
- **Vercel Serverless Functions** (تعمل بـ **Node.js runtime** — ليست Edge)
- **SSE Streaming** (بث حرفي)
- **PWA** (RTL manifest)

---

## 🔌 المزودات المدعومة (مفاتيح حيّة في الإنتاج)

- **Gemini** (`gemini-2.5-flash`) — الأساسي
- **Groq** (Llama 3.3 70B)
- **HuggingFace** (Inference Providers)
- **GitHub Models** (PAT بصلاحية `models:read`)
- **Demo** (وضع العرض التجريبي بلا مفتاح)
- **Search** (Tavily)
- **Pollinations** (توليد الصور، **بدون مفتاح**، وليس عبر HF/GitHub)

---

## 📊 حدود الحصص المجانية (مُتحقَّق منها 2026 — بلا بطاقة ائتمان)

| المزود | الحد المجاني | بطاقة | ملاحظة |
|---|---|---|---|
| Gemini (AI Studio) | ~20–1,500 طلب/يوم حسب الموديل | ❌ | الجودة الأعلى |
| Groq | ~1,000 طلب/يوم/نموذج | ❌ | الأسرع (Llama 3.3 70B) |
| GitHub Models | ~10–15 طلب/دقيقة · 50–150 طلب/يوم (يختلف بالنموذج) | ❌ | يتفاوت حسب النموذج/الحساب |
| HuggingFace | Community / حسب المزود | ❌ | يتطلّب تفعيل Inference Providers |
| **Search (Tavily)** | **1,000 رصيد/شهر** | ❌ | بلا بطاقة أبدًا |
| **Images (Pollinations)** | نماذج FLUX مجانية **بلا مفتاح** | ❌ | لكن: السلوك المجهول مقيّد (~طلب/كل 15 ثانية) + **بلا ضمان توفر SLA** |
| Neon (DB) | Postgres مجاني | ❌ | مزامنة + تقييد موزّع |
| Web Speech API | غير محدود (في المتصفح) | ❌ | صوت فقط |
| Vercel Hobby | استضافة مجانية | ❌ | حدود وظائف (maxDuration 60s) |

> ⚠️ قاعدة حريجة: **لا أدخل أي خدمة تتطلب بطاقة ائتمان**. Brave Search API ألغى طبقته
> المجانية (فبراير 2026) ويتطلب الآن بطاقة + رصيد ~$5 — **يُستبعد**؛ Tavily هو الخيار الصحيح.
> لا تعتمد على حدود من الذاكرة — تحقّق من المصدر الحي قبل الكتابة.

---

## 🚀 الميزات النشطة

- البث المباشر (SSE حرفًا بحرف)
- توليد الصور عبر Pollinations (علم `IMAGE_GENERATION_ENABLED=1`)
- البحث مع المصادر (Tavily)
- تقييد الطلبات الموزّع عبر Neon (`/api/status` ← `rateLimit:"neon"`)
- دوائر القطع (Circuit Breakers) للتعامل مع 429/5xx
- مزامنة سحابية عبر Neon + LocalStore
- حسابات Auth.js v5
- قراءة ملفات (TXT/MD/CSV/JSON/PDF/DOCX)
- صوت (Web Speech API)
- ملخص تلقائي للمحادثات الطويلة
- Speed Insights (مثبت رمزيًا، ينتظر التفعيل من لوحة Vercel)

---

## ⚠️ القيود التشغيلية

- المستودع مربوط **بمشروعَي Vercel** (`new-pro` و `nawah-ai`) مما يسبب ازدواجية النشر وتشتت بيانات Speed Insights.
- المطوّر **لا يملك صلاحيات لوحة Vercel** (التفعيل والمتغيرات تتم عبر المالك على فريق `celia-fashions-projects`).

---

## 📐 أعراف الكود

- المفاتيح لا تُرفع لـ GitHub أبدًا (`.gitignore` يستبعد `.env*`) — متغيرات بيئة فقط.
- الفحص: `npm run check:keys` · الاختبارات: `npm test` · الأنواع: `npm run typecheck`.
- الحدود الافتراضية: 20 رسالة/دقيقة (chat) · 60 مزامنة/دقيقة · 12 صورة/دقيقة — عدّلها عبر `RATE_LIMIT_*` و `UPSTASH_REDIS_*`.
- إضافة مزود جديد: ثلاث خطوات معزولة (provider في `lib/ai/providers` → case في `lib/ai/index.ts` → سجل في `lib/models.ts`)، ولا تلمس الواجهة.

---

## 🎯 هدفك كمساعد

مساعدة المطوّر في كتابة الكود، تحليل الحالة، توثيق التغييرات، وضمان استقرار الإنتاج بناءً على الحقائق الفعلية في المستودع لا الافتراضات.
