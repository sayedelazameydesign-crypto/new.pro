# 🛠️ خطة توسيع الأدوات — Nawah AI (خطة تنفيذية)

> الهدف: إضافة أدوات/مزودات جديدة **بما يحافظ على صفر تكلفة وبلا بطاقة ائتمان**،
> عبر النمط المعماري القائم (طبقات مزودات منعزلة) — دون هدم أي بنية.
> كل الحقائق (حدود/بطاقة/توافق) تحقّقت من مصادر حيّة في أغسطس–سبتمبر 2026.

## ⚡ القرار النهائي (2026-09-03)

نُفِّذ **الخيار (أ)**: تصحيح التوثيق فقط (AGENT.md) — **بدون أي تغيير في الكود**، لأن
المشروع يعمل فعلًا بأدوات مجانية كاملة. الخياران (ب) و (ج) يبقيان **اختياريين**
للتوسّع مستقبلًا (لا يُنفَّذان الآن).

| الخيار | الوصف | الحالة |
|---|---|---|
| (أ) | تصحيح التوثيق فقط (AGENT.md) | ✅ **نُفِّذ** |
| (ب) | إضافة Firecrawl/Exa كمزود بحث ثانٍ (اختياري) | 🔜 جاهز للتطبيق |
| (ج) | إضافة مزود صور احتياطي (Cloudflare/أخرى) | 🔜 مؤجّل |

---

## 0) قواعد صارمة قبل أي تنفيذ

1. **صفر بطاقة ائتمان** — أي أداة تتطلب بطاقة (مثل Brave Search API) **تُستبعد**.
2. **لا هدم معمارية** — أي مزود جديد يمر عبر 3–5 نقاط ثابتة فقط (انظر §4).
3. **التدهور الرشيق** — غياب مفتاح/حصة = رسالة واضحة أو تراجع، لا فشل.
4. **تُضاف كخيارات/تراجع**، لا تستبدل المزودات الحالية العاملة.

---

## 1) ما المغطّى بالفعل (لا حاجة لإعادة إضافته)

| الميزة | الأداة | ملاحظة |
|---|---|---|
| نماذج لغوية | Gemini · Groq · HF · GitHub Models · Demo | كلها مفعّلة حيًا |
| توليد صور | Pollinations | مفعّل حيًا (`IMAGE_GENERATION_ENABLED=1`) |
| بحث | Tavily | مفعّل حيًا (1000/شهر، **بلا بطاقة**) |
| DB | Neon | مفعّل حيًا (`rateLimit:"neon"`) |
| صوت | Web Speech API | مفعّل |
| استضافة | Vercel · Auth.js · Drizzle · Zod · Tailwind | مدمجة |

---

## 2) ما يجب إضافته فعليًا (بترتيب الأولوية)

### 🥇 المرحلة 1 — مزودا نماذج لغوية (أعلى قيمة / أقل مجهود)

كلاهما **متوافق مع OpenAI** ⇒ نعيد استخدام نمط `lib/ai/providers/groq.ts` حرفيًا تقريبًا.

| المزود | الحد المجاني | بطاقة | التوافق | الأثر |
|---|---|---|---|---|
| **Cerebras** | 1M رمز/يوم · 14,400 طلب/نموذج · ~30 RPM | ❌ لا | OpenAI | زيادة ضخمة في الحصة اليومية (حاليًا Groq ~1k/يوم) |
| **OpenRouter** | 28+ نموذج `:free` · 50 طلب/يوم (→ 1000 بعد $10) | ❌ لا | OpenAI | 28+ نموذج مفتوح عبر مفتاح واحد |

> لماذا هذان تحديدًا: **Cerebras** يرفع السقف اليومي (الأكبر في السوق)، و**OpenRouter** يفتح
> تنوّع النماذج بمفتاح واحد بلا بطاقة. كلاهما يعزز `PROVIDER_CHAIN` للتراجع ولا يكسر شيئًا.

### 🥈 المرحلة 2 — تراجع البحث (حماية حصة Tavily الشهرية)

| المزود | الحد المجاني | بطاقة | ملاحظة |
|---|---|---|---|
| **Firecrawl** | 1,000 رصيد/شهر (بحث = 2 رصيد/10 نتائج) | ❌ لا | خيار تراجع قوي، بلا بطاقة |
| **Exa** | ~1,000 طلب/شهر | ❌ لا | بديل إضافي اختياري |

> التوصية: **تُضاف كسلسلة تراجع في `lib/ai/providers/search.ts`** (Tavily أساسًا → Firecrawl →
> Exa). **لا تُستبدل Tavily** أبدًا (هي بالفعل بلا بطاقة، وBrave يتطلب بطاقة — انظر §5).

### 🥉 المرحلة 3 — (اختيارية / تأجيل) تحسينات إضافية

- **توليد صور احتياطي:** إضافة مصدر HF Inference / Gemini (Imagen) كتراجع لـ Pollinations عند 429.
- **RAG/متجهات (مستقبلية):** pgvector على Neon — يتطلب إضافات تضمين (embeddings) + تدفق
  استرجاع. **ميزة جديدة كاملة** وليست «أداة»؛ تُؤجّل حتى تُقرر إضافة RAG فعليًا.

---

## 3) خطة العمل التفصيلية — المرحلة 1 (Cerebras + OpenRouter)

### 3.1) إنشاء الملفين
- `lib/ai/providers/cerebras.ts` — نسخ `groq.ts` وتغيير:
  ```ts
  const url = "https://api.cerebras.ai/v1/chat/completions";
  // موديل مثل: "llama3.1-8b" أو "gpt-oss-120b" أو "qwen-3-235b-a22b-instruct-2507"
  ```
- `lib/ai/providers/openrouter.ts` — نسخ `groq.ts` وتغيير:
  ```ts
  const url = "https://openrouter.ai/api/v1/chat/completions";
  // موديل مثل: "meta-llama/llama-3.3-70b-instruct:free" أو "deepseek/deepseek-r1:free"
  ```

### 3.2) `lib/models.ts`
- وسّع `ProviderKind`:
  ```ts
  export type ProviderKind = "gemini" | "huggingface" | "groq" | "github" | "search" | "demo"
    | "cerebras" | "openrouter";
  ```
- أضف مدخلات `MODELS` (مثال):
  ```ts
  { id: "cerebras:llama3.1-8b", name: "Llama 3.1 8B (Cerebras)", provider: "cerebras",
    description: "حصّة يومية ضخمة 1M رمز/يوم", free: true },
  { id: "openrouter:meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (OpenRouter)",
    provider: "openrouter", description: "نماذج :free متعددة عبر مفتاح واحد", free: true },
  ```

### 3.3) `lib/ai/index.ts` (نقطة الدمج الوحيدة للتشتيت)
- استورد `cerebrasStream` و `openrouterStream`.
- أضف `export const hasCerebras = () => !!process.env.CEREBRAS_API_KEY;`
  و `export const hasOpenrouter = () => !!process.env.OPENROUTER_API_KEY;`.
- أضف إلى `FALLBACKS` و `PROVIDER_CHAIN`:
  ```ts
  PROvider_CHAIN = ["cerebras", "openrouter", "groq", "github", "gemini", "huggingface"] as const;
  ```
- أضف `case "cerebras":` و `case "openrouter":` في `dispatch` (نفس شكل `groq`).
- أضف الاسمين إلى قائمة `splitModelIdSafe` المسموح بها (وإلا تُحال لـ demo).

### 3.4) `lib/keys.ts` (لوحة BYOK)
- أضف `| "CEREBRAS_API_KEY" | "OPENROUTER_API_KEY"` إلى `KeyName`.
- أضف إلى `PROVIDER_TO_KEY`:
  ```ts
  cerebras: "CEREBRAS_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  ```

### 3.5) `app/api/status/route.ts`
- أضف `cerebras: hasCerebras(), openrouter: hasOpenrouter(),` إلى الاستجابة.

### 3.6) `.env.example` + واجهة الإعدادات
- أضف:
  ```
  CEREBRAS_API_KEY=
  OPENROUTER_API_KEY=
  ```
- أسطر `KeyRow` في `app/components/SettingsModal.tsx` (اختياري).
- تسميات في `lib/i18n.ts` (عربي/إنجليزي).

### 3.7) اختبارات
- `tests/provider-system.test.ts` — أضف حالات لمزودي cerebras/openrouter (دالة `splitModelIdSafe`,
  `resolveProvider`, خطأ مفتاح/429).

---

## 4) خطة العمل — المرحلة 2 (تراجع البحث)

### `lib/ai/providers/search.ts`
- اجعل `webSearchStream` تقبل مصفوفة مفاتيح/mزودات، وسلسلة تراجع:
  ```ts
  const CHAIN = [
    { name: "tavily", url: "https://api.tavily.com/search", env: "TAVILY_API_KEY" },
    { name: "firecrawl", url: "https://api.firecrawl.dev/v1/search", env: "FIRECRAWL_API_KEY" },
    { name: "exa", url: "https://api.exa.ai/search", env: "EXA_API_KEY" },
  ];
  ```
- عند 429/401 لمزوّد، جرّب التالي بلا إفشال.
- `lib/keys.ts` + `.env.example` + `KeyRow` للمفاتيح الجديدة.

---

## 5) ما يُستبعد من الخطة (ولماذا)

| الأداة | السبب |
|---|---|
| **Brave Search API** | أُلغيت طبقته المجانية (فبراير 2026)؛ يتطلب الآن بطاقة + رصيد ~$5 + نسبة إسناد. **أسوأ** من Tavily الحالي. |
| **Ollama** | تشغيل محلي يتطلب خادمًا دائمًا — غير ملائم لوظائف Vercel Serverless. |
| **Cloudflare Workers AI / NexaAPI** | كلاهما يضيف حصصًا، لكن OpenRouter يمنح تنوّعًا أكبر بمفتاح واحد بلا بطاقة؛ تُؤجّل للبنية السحابية المستقلة. |
| **Mistral** | الطبقة المجانية متقلّبة ومحدودة — تُؤجّل حتى تثبت جدواها. |
| **pgvector (RAG)** | ميزة جديدة كاملة (تضمين + استرجاع) وليست أداة — تُخطَّط منفصلة. |

---

## 6) الحماية/الضوابط

- احتفظ بالحدود الحالية: `RATE_LIMIT_PER_MIN` (chat 20) و `RATE_LIMIT_IMAGE_PER_MIN` (12).
- حصص المزود الجديد تُدار عبر `lib/ai/breaker.ts` (دوائر القطع) — تلقائيًا.
- لا تكشف مفاتيح عبر `/api/status` (يُظهر `true/false` فقط). 
- أبقِ `maxDuration: 60` على `/api/chat` في `vercel.json`.

---

## 7) ملخص الجهد

| المرحلة | الملفات | الجهد | أولوية |
|---|---|---|---|
| 1 | providers ×2 + models + index + keys + status + env + i18n + tests | 1–2 ساعات | ⭐ عالية |
| 2 | providers/search + keys + env + tests | ~1 ساعة | ⭐ متوسطة |
| 3 | مؤجّلة | — | منخفضة |

---

## ✅ حقيقة معتمدة (لكتابة AGENT.md/README لاحقًا)

> المزودات المجانية الحالية + الموضحة: Gemini · Groq · GitHub Models · HuggingFace ·
> **Cerebras** · **OpenRouter** · Search (Tavily + **Firecrawl**) · Pollinations (صور) ·
> Web Speech API (صوت) · Neon (DB) · Vercel. **جميعها بلا بطاقة ائتمان.**
