# Phase 6 / Item 3 — Audit (قبل التعديل)

> سُجِّل قبل أي تعديل — وفق أمر التنفيذ (قسم 1). المرجع: Item 2 مغلق عند `53384b3`.

## 1) كيف تُحدد المحادثة الحالية
- `app/page.tsx`: `const [activeId, setActiveId] = useState<string | null>(null)` (سطر 58)؛
  `const active = conversations.find((c) => c.id === activeId) ?? null` (سطر 97).
- التحميل: `loadAll()` → `store.load()` (localStorage) + `pullRemote()` (سحابة عبر deviceId/account) ثم `setConversations`.

## 2) هل يوجد `conversation.id` حقيقي؟
- نعم: `newConversation()` يولّد `id: uid()` = **crypto.randomUUID()** (أو `id-<base36>` fallback) —
  أحرف `[A-Za-z0-9-]`، طول ~36. لا علاقة لا بالعنوان ولا بالمحتوى.

## 3) هل البيانات قابلة لإعادة البناء من `?c=id`؟
- نعم محليًا: `loadAll()` يجلب كل المحادثات (localStorage + سحابة) ثم `setActiveId(id)` يفتحها — **بلا أي طلب جديد**.
- `id` وحده **لا يكفي للجلب من الخادم**: `/api/conversations` يتطلب `deviceId` (نطاق جهاز/حساب) — لا endpoint بالمعرف وحده.

## 4) persistence المتاحة
- محلية: `LocalStore` (مفاتيح `nawah:convs` / `nawah:settings`).
- خادمية: `/api/conversations` (مزامنة جهاز/حساب عبر PUT/PULL) — تتضمن المعرّفات نفسها التي تُحفظ محليًا.
- **ممنوع افتراض غير هذا.**

## 5) هل المشاركة تعني إرسال المحادثة أم فتح محادثة محددة؟
- **فتح محادثة محددة** (لا رفع، لا إرسال، لا نسخ للخادم).
- بدون endpoint عام بالمعرف، الرابط يعمل حيث البيانات متاحة محليًا (نفس الجهاز/الجلسة) —
  وهذا يحدد **Privacy Model: Local-only identifier** (انظر §8).

## 6) ما الذي يجب ألا يصبح عامًا
- `apiKey` / BYOK (في `Settings` — **لا يُقرأ أبدًا** في مسار المشاركة؛ الرابط = id فقط).
- محتوى الرسائل (لا يدخل URL — عقد §2).
- أي ترويسات/كوكيز/بيانات حساب.

## 7) القرارات المعتمدة
| القرار | البديل المرفوض |
|---|---|
| `/?c=<id>` على **المسار الحالي نفسه** (app/page.tsx) | اختراع route جديد (لا حاجة؛ app router بلا dynamic segment للمحادثة) |
| Resolution بعد `loadAll()` في نفس useEffect | أي fetch إضافي |
| فحص صارم للمعرف regex `[A-Za-z0-9_-]{8,80}` + URLSearchParams | تمرير c خامًا لأي مكان |
| Unknown/malformed → حالة not-found واضحة + لا تغيير، ولا conversation عشوائية | عرض محادثة أولى/عشوائية |
| زر مشاركة في الرأس (بجوار 📖) + Toast عبر **zustand الموجود** (Item 1) | واجهة مشاركة جديدة |
| Clipboard: `navigator.clipboard.writeText` + fallback `execCommand("copy")` | مكتبة clipboard |
| **بلا أي dependency** | — |

## 8) Privacy Model (موثق — يُثبت في التقرير)
> **Local-only identifier.** لا يُنشأ أي مسار جلب عام بالمعرف؛ الرابط يفتح المحادثة من المخزن المحلي
> على الجهاز حيث البيانات موجودة أصلًا. لا مصادقة جديدة، لا كشف عبر الشبكة، لا تجاوز حدود قائمة.
> (مشاركة محادثة بين أجهزة مختلفة تتطلب endpoint عامًا/مصادقة — خارج نطاق هذا البند ومرفوض دون أمر.)
