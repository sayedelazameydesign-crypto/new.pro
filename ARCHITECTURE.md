# 🧱 المعمارية الهندسية لنواة AI

> الهدف المعماري: **قابلة للتوسع دون هدم** — كل طبقة معزولة خلف واجهة صريحة.

---

## 1) المبدأ العام

```
Request Flow
───────────
المستخدم → [React UI] → fetch → [API Routes] → [Orchestrator lib/ai] → [Provider]
                 ↑                        ← SSE Stream (data: {...})  ←
```

- **الواجهة لا تعرف شيئًا عن المزودات.** ترسل فقط: `{ messages, modelId, system }`.
- **API لا تعرف شيئًا عن التخزين.** تستقبل وتُبث فقط.
- **المزود لا يعرف شيئًا عن الواجهة.** يستقبل `messages[]` ويعيد `AsyncGenerator<string>`.

## 2) الطبقات بالتفصيل

### طبقة المزودات — `lib/ai/providers/`
| الملف | التعاقد |
|---|---|
| `gemini.ts` | `geminiStream({ model, messages, apiKey, maxTokens }) → AsyncGenerator<string>` |
| `huggingface.ts` | `huggingfaceStream({ model, messages, token, maxTokens }) → AsyncGenerator<string>` |
| `demo.ts` | `demoStream() → AsyncGenerator<string>` (يفك الأخطاء + يعرض الواجهة) |
| `sse.ts` | قارئ SSE مشترك (chunkLines / sseData) — يُعاد استخدامه لأي مزود |

**قاعدة الذهب:** كل مزود يبدأ بتحويل `messages[]` إلى صيغته، وينتهي بـ`yield` نص — لا يجوز لأي مزود التواصل مع الواجهة مباشرة.

### المنسّق — `lib/ai/index.ts`
- `streamReply()`: يوزّع على المزود حسب `provider` في `modelId`
- `resolveProvider()`: قرار المزود + **التراجع التلقائي**:
  1. طُلِب Gemini ووُجد مفتاحه → Gemini
  2. طُلِب HF ووُجد توكنه → HF
  3. طُلِب Gemini بلا مفتاح ووُجد توكن HF → HF (موديل افتراضي)
  4. عكسها → Gemini
  5. لا شيء → وضع العرض التجريبي (لا يفشل الطلب أبدًا)

### سجل الموديلات — `lib/models.ts`
`MODELS[]` هو **المصدر الوحيد للحقيقة** في القائمة. الواجهة والخلفية والـ API كلهم يقرؤون منه.


### 2.5) طبقة المزامنة (Neon) — المرحلة 2
```
العميل (lib/sync.ts)                الخادم (app/api/conversations)        قاعدة البيانات
  getDeviceId() ──┐                                                        (lib/storage-neon.ts)
  pullRemote() ───┼── GET  ?deviceId → [تحقق → سحب] ── pullDevice() ──> nahwa_sync
  pushRemote() ───┼── PUT  {deviceId, ...} → [تعقيم → دفع] ── pushDevice() ──> upsert
  clearRemote() ──┴── DELETE ?deviceId ── deleteDevice()
```
- **مبدأ التطابق التصاعدي:** بدون جلسة ، يُعامل كل جهاز كلا من نفسه — key= `device_id` (UUID في localStorage).
- **الدمج:** لكل محادثة يفوز الأحدث `updatedAt`؛ اتحاد معرفات بين المحلي والسحابي.
- **الأمان:** تعقيم كامل (أدوار/أطوال/حجم ≤3MB/عدد محادثات ≤300) + النتائج تُرفض إن لم تطابق.
- **التوسعة لاحقًا:** استبدال مفتاح الجهاز بـ `userId` (Auth.js) أو جدول أعضاء — نفس الواجهة.

### التخزين — `lib/storage.ts`
واجهة واحدة فقط:
```ts
interface ConversationStore {
  load(): Promise<Conversation[]>
  saveAll(convs: Conversation[]): Promise<void>
  loadSettings(): Promise<Partial<Settings>>
  saveSettings(s: Settings): Promise<void>
}
```
- التنفيذ الحالي: `LocalStore` (بلا خادم بيانات — يعمل حتى على المعاينة بدون خادم)
- التوسع: نفّذ نفس الواجهة فوق Neon/Supabase/Redis → سطر استبدال واحد

### طبقة API — `app/api/`
- `POST /api/chat` — بث: يرسل `data: {chunk}` ثم `data: {done}` أو `data: {error}`
- `GET /api/status` — `{ gemini: boolean, huggingface: boolean }` (بدون كشف القيم)
- `GET /api/models` — القائمة الحية

### الواجهة — `app/`
- `page.tsx` — حالة المحادثات، قارئ البث، التمرير الذكي، إيقاف/إعادة توليد
- `components/Markdown.tsx` — markdown + GFM + تلوين كود + زر نسخ
- `components/Sidebar.tsx` — تجميع اليوم/٧ أيام/الأقدم + بحث + إعادة تسمية + حذف
- `components/SettingsModal.tsx` — كل الإعدادات + حالة المفاتيح + تصدير/استيراد
- `components/ModelPicker.tsx` — اختيار الموديل مع شارة الحالة

## 3) قواعد التوسّع (حتى لا تنهار المعمارية)

1. **لا تُمرر `fetch` داخل المزودات إلى الواجهة** — كل شيء عبر `yield`
2. **أضف الموديلات في `models.ts` فقط** — لا تكرر القوائم في أماكن متعددة
3. **استبدل `LocalStore` ولا تعدّله** — أضف `NeonStore` جديدًا يحقق الواجهة
4. **أبقِ `resolveProvider` منطقًا واحدًا** — أي خيار جديد (مثل: أولوية المستخدم) يُضاف كحالة بدلًا من الفروع المتشابكة
5. **عند الحاجة لأدوات/وكلاء** → `lib/ai/v2.ts` يوازي النسخة الأولى (لا يحل محلها) ثم قم بترحيل تدريجي

## 4) كيف تعمل إضافة "حفظ في السحابة" (مثال كامل)

```ts
// lib/storage/neon.ts
import { neon } from "@neondatabase/serverless";
export class NeonStore implements ConversationStore {
  private sql = neon(process.env.DATABASE_URL!);
  async load() { return await this.sql`SELECT * FROM conversations`; }
  // ... rest of the interface
}

// app/page.tsx (سطر واحد)
const store = process.env.DATABASE_URL ? new NeonStore() : new LocalStore();
```

## 5) خريطة تدفق البث (SSE)

```
عميل                           الخادم
 │  POST /api/chat              │
 │─────────────────────────────▶│ resolveProvider()
 │                              │ for await (chunk of streamReply(...))
 │  data: {"provider":"gemini"} │
 │◀─────────────────────────────│
 │  data: {"chunk":"أهلاً"}     │
 │◀─────────────────────────────│ ... مكرر حتى النهاية
 │  data: {"done":true}         │
 │◀─────────────────────────────│
```

كل `chunk` يُلحق فورًا برسالة المساعد في الواجهة → **تأثير الكتابة الحية**.
يمنح `AbortController` المستخدم زر "إيقاف" حقيقيًا.
