# مراجعة الاعتماديات — نواة AI

> المرحلة 9 من EXECUTION PLAN (Core Web Stack & Voice Capabilities).
> التصنيفات: **CORE** = مطلوب للتشغيل · **OPTIONAL** = محسّن / قابل للتعطيل · **DEV ONLY** = تطوير/اختبار فقط · **REMOVE** = مقترح للإزالة.
> القاعدة: لا إزالة لمجرد التصنيف — الإزالة تُنفَّذ فقط إذا كان الاستخدام فعليًا صفرًا والوظيفة غير مطلوبة.

## 1) الاعتماديات التشغيلية (dependencies)

| الحزمة | الإصدار | التصنيف | أين تُستخدم | ملاحظات |
|---|---|---|---|---|
| next | ^15.3.0 | **CORE** | كامل التطبيق | خطأ مطابقة الإصدار: package.json يقول 15.3.0 والمثبت فعليًا 15.5.24 (يتوافقا عبر ^) — مُحاذاة في Final Gate اختيارية |
| react / react-dom | ^19.0.0 | **CORE** | كامل الواجهة | مطلوب من Next 15 |
| next-auth | 5.0.0-beta.32 | **CORE** | `/api/auth/*`، AuthModal | إصدار Beta معروف؛ لا استبدال حالي — خارج نطاق الخطة |
| @neondatabase/serverless | ^1.1.0 | **CORE** | `/api/conversations` (SQL خام) | **driver القاعدة الحالي — لم يُغيَّر** |
| drizzle-orm | ^0.45.2 | **CORE** | `lib/db/schema.ts` (طبقة مطبوعة فقط) | لا migration، لا تغيير SQL runtime، لا Base بيانات جديدة — قرار موثق في DATABASE_DEPENDENCY_AUDIT.md |
| zod | ^4.5.4 | **CORE** | `lib/validation.ts` → `/api/chat` (parseChatBody)، `/api/image`، schemas | **مربوط فعليًا في هذه الخطة** (V-1..V-10) |
| zustand | ^5.0.15 | **CORE** | `lib/ui-store.ts` → `app/components/Toasts.tsx` + نسخ الكود | **مربوط فعليًا** (Z-1..Z-6) |
| @tanstack/react-query | ^5.102.8 | **CORE** | `app/providers.tsx` + `useQuery(/api/status)` | **مربوط فعليًا** (Q-1..Q-5) |
| react-markdown | ^9.0.1 | **CORE** | `Markdown.tsx` | GFM + highlight — بلا rehype-raw (أمان) |
| remark-gfm | ^4.0.0 | **CORE** | `Markdown.tsx` | جداول/قوائم/تشطيب |
| rehype-highlight | ^7.0.1 | **CORE** | `Markdown.tsx` | تلوين الكود |
| highlight.js | ^11.11.1 | **CORE** | تلوين الكود (لغة المشروع) | يوفره rehype-highlight؛ يُستخدم مباشرة أيضًا |
| lucide-react | ^0.460.0 | **CORE** | أيقونات الواجهة (بدون أيقونات SVG يدوية) | |
| pdf-parse | ^2.4.5 | **CORE** | `lib/file-extract.ts` (قراءة PDF المرفق) | تحميل ديناميكي (حجم) |
| mammoth | ^1.12.2 | **CORE** | `lib/file-extract.ts` (قراءة DOCX المرفق) | تحميل ديناميكي |
| pdfkit | ^0.20.2 | **DEV ONLY** | `tests/file-extract.test.ts` فقط (توليد PDF للاختبار) | لا استخدام في الإنتاج — **يُبقي كـ devDependency** (انظر القرار أدناه) |
| jszip | ^3.10.1 | **DEV ONLY** | `tests/file-extract.test.ts` فقط (توليد DOCX للاختبار) | لا استخدام إنتاجي — غير مكرر (ماموث لا يعتمد عليه) |

## 2) اعتماديات التطوير (devDependencies)

| الحزمة | الإصدار | التصنيف | أين تُستخدم | ملاحظات |
|---|---|---|---|---|
| typescript | ^5.7.0 | **DEV ONLY** | typecheck | |
| tsx | ^4.23.13 | **DEV ONLY** | `npm test` (node:test + TS) | **لا استبدال — node:test هو إطار الاختبار الوحيد** |
| @types/node | ^20.17.0 | **DEV ONLY** | أنواع Node | |
| @types/react / @types/react-dom | ^19.0.0 | **DEV ONLY** | أنواع React | |
| @types/pdfkit | ^0.17.6 | **DEV ONLY** | أنواع pdfkit (للاختبار) | |
| tailwindcss / @tailwindcss/postcss | ^4.0.0 | **DEV ONLY** | التنسيقات (تُبنى وقت التطوير) | |
| postcss | ^8.4.49 | **DEV ONLY** | تجميع Tailwind | |
| eslint | ^9.39.5 | **DEV ONLY** | `npm run lint` | |
| eslint-config-next | ^15.5.24 | **DEV ONLY** | إعداد ESLint | **مضبوط على 15.5.24** (مطابقة Next) |
| @eslint/eslintrc | ^3.3.6 | **DEV ONLY** | توافق flat config | |
| @playwright/test | ^1.62.1 | **DEV ONLY** | `npm run test:e2e` (مستقبلي) | **غير مستخدم بعد** — أُضيف في هذه الخطة تحضيرًا لمرحلة E2E؛ لا يُشغَّل في CI الحالي |

## 3) قرارات هذه المراجعة

| # | القرار | السبب |
|---|---|---|
| R-1 | **لا حزم مُقترَحة للإزالة (REMOVE = ∅)** | كل حزمة إما مستخدمة فعليًا أو ضرورية كأداة اختبار؛ لا مكررات |
| R-2 | pdfkit + jszip: **يظلان في dependencies مؤقتًا** | نقلهما إلى devDependencies تغيير بنيوي (package.json lock) بلا فائدة فورية؛ حجمهما لا يدخل تُخمة العميل (استيراد ديناميكي في الاختبارات فقط، وnext إنتاج لا يجلبهما) — يُلاحَظ نقلهما في دورة صيانة لاحقة ملاحظةً لا إجبارًا |
| R-3 | لا OpenAI / Anthropic / Gemini SDK نصوص | provider layer الحالي (lib/ai/providers) يغطي Gemini/Groq/HF عبر HTTP مباشر — قاعدة الخطة |
| R-4 | لا LangChain / لا Agent framework | غير مبرر للنطاق الحالي (بلا استدعاء أدوات معقد) |
| R-5 | لا خدمة صوت خارجية | Web Speech API فقط (5.3) |
| R-6 | لا shiki | rehype-highlight كافٍ ويعمل (أُثبت في Phase 3) |
| R-7 | لا vitest / لا نسخة ثانية | node:test موجود ويشغّل 124 اختبارًا |
| R-8 | يعتبر TAVILY_API_KEY حزمة؟ | ليست حزمة — مفتاح خارجي اختياري للبحث؛ البقاء كما هو |

## 4) ملخص المطابقة مع قواعد الخطة

- ✅ **لا dependency مكررة** — كل حزمة صاحبة دور واحد (jszip للاختبارات فقط، لم يُكرر في الإنتاج).
- ✅ **لا ترقيات عشوائية** — أُضيفت حزم الخطة فقط (zod/zustand/react-query/drizzle-orm/playwright/eslint) بقيم محددة.
- ✅ **لا architecture drift** — react-query يُستخدم في نقطة واحدة (status)؛ zustand في التوست؛ zod في تسوية الطلب فقط.
- ✅ **لا DB جديدة** — drizzle طبقة مطبوعة فوق الجداول القائمة (راجع DATABASE_DEPENDENCY_AUDIT.md).
- ✅ **لا إطار Agent شامل** — R-4.
- ✅ **مفتوح المصدر ومجاني** — كل الحزم OSS؛ لا ICD/مدفوعة.
- ✅ **Vercel-compatible** — لا خادم Node مستقل؛ كل الحزم تعمل في دالة serverless (التحميلات الديناميكية هي الممارسة القياسية).
- ✅ **GitHub-compatible** — CI الحالي (npm ci → typecheck → build → start → test) يعمل مع كل هذه الحزم.

## 5) Item 2 (Read Mode + تصدير Markdown/PDF) — تحديث

> **NO NEW DEPENDENCY — native/existing stack sufficient.**
> لم تُضف أي حزمة لهذا البند، ولم تُحذف أي حزمة.

| القرار | التفصيل |
|---|---|
| Markdown export | `lib/export.ts` جديد — Node/Blob أصلي (TextEncoder/Blob/URL.createObjectURL) — بلا مكتبة. |
| PDF export | **طباعة المتصفح** (`window.print()` + `@media print` في globals.css) — انظر القرار P-1. |
| Read Mode | `app/components/ReadMode.tsx` — يعيد استخدام `Markdown.tsx` (react-markdown/remark-gfm/rehype-highlight الموجودة أصلًا). |
| أثر bundle | **صفر** — لا حزمة جديدة، لا إضافة إلى حزم العميل باستثناء الكود الجديد (بسيط). |
| بديل Native | PDF: نعم (محرك طباعة المتصفح). Markdown: نعم (Blob أصلي). |

### P-1: قرار PDF (الأقل خطورة والأقل اعتمادًا)
- **الآلية المختارة:** حوار طباعة المتصفح (`window.print`) مع `@media print` يقتصر على `.print-area` ويخفي كل عناصر التحكم (`.no-print`).
- **المبرر:**
  1. دعم عربي/RTL كامل بجودة عالية عبر محرك النص الأصلي للمتصفح (بدون تضمين خطوط).
  2. **صفر dependencies** — لا مكتبة PDF جديدة، ولا إعادة استخدام إنتاجية لـ pdfkit.
  3. لا شبكة، لا خادم، يعمل Offline، ولا يغيّر Chat runtime.
- **البدائل المدروسة والمرفوضة:**
  - `pdfkit` (موجود أصلًا في dependencies لكنه **DEV ONLY** — توليد عينات للاختبارات فقط): استخدامه إنتاجيًا يتطلب تضمين خط عربي + معالجة تشكيل (shaping) — حجم/جودة/خطر دون مبرر. **مرفوض لهذا البند.**
  - `jsPDF` (dependency جديدة + خط عربي مضمّن): مرفوض — نفس مبرر pdfkit مع إضافة اعتماد جديد.
- **القيد الموثق:** المستخدم يحفظ الملف من حوار الطباعة (يختار «حفظ كـ PDF»)؛ لا يُنشأ ملف .pdf برمجيًا بدون مكتبة — هذا مقبول وموثق في`PHASE6-ITEM2-AUDIT.md`.
