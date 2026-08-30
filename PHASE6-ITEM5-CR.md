# CR-005 — تحسينات الواجهة: اختصارات لوحة المفاتيح + سحب الملفات + ملء الشاشة

> مستند مطابق لـ **Celia.Pro Operating Protocol v1.0** (بوابات CR → Baseline Verification → Scope & Impact → Execution Plan → **Human Approval** → …) مع قالب CHANGE_REQUEST_TEMPLATE.
> **الحالة الحالية: PLAN ONLY — AWAITING HUMAN APPROVAL. لا كود، لا commit، لا push.**

---

## 1) تعريف الطلب

| الحقل | القيمة |
|---|---|
| CR-ID | `CR-005` |
| المستودع | `nawah-ai` (لا يُخلط مع CR-003 الخاص بـCelia.Pro) |
| العنوان | تحسينات الواجهة — اختصارات لوحة مفاتيح، سحب الملفات للإدخال، وضع ملء الشاشة (ROADMAP المرحلة 6 · Item 5) |
| المالك | Owner / Architect / Approver |
| الحالة | **Approved — In Progress** (خطة معتمدة بمصفوفة §6 النهائية) |
| Baseline ID | `NAWAH-AUTH-BASELINE` (`289c7f5` — غير قابل للانزياح) |
| Reference Commit | `38d9bb3` (HEAD = origin/main، شجرة عمل نظيفة) |
| الفرع المقترح للتنفيذ | `cr/item-5-improvements` |

## 2) Baseline Verification (تسجيل فعلي بتاريخ 2026-08-30)

| البند | النتيجة |
|---|---|
| `git status --short` | فارغ (لا تغييرات محلية غير مقصودة) |
| HEAD | `38d9bb3` — "test: add playwright e2e coverage for core flows" |
| أصل HEAD | origin/main مطابق |
| حالة الاختبارات عند التسجيل | Unit/Integration **148/148** · E2E **15/15** · lint 0/0 · typecheck نظيف · build ✓ 6/6 |
| CI آخر تشغيل | Success (شامل E2E) |
| مناطق الحماية | `main`، عقد `/api/chat` (lib/validation.ts)، مخطط قاعدة البيانات (lib/db + drizzle)، المصادقة/الجلسات (auth + next-auth)، الأسرار/المفاتيح، سلوكا **وضع القراءة (Item 2)** و**المشاركة `?c=id` (Item 3)** القائمان |
| التغييرات المسموح بها | الملفات المذكورة في جدول النطاق فقط |S

## 3) الهدف (قابل للتحقق)

1. **اختصارات لوحة مفاتيح** تُضاف **دون تغيير** السلوك القائم (Enter يُرسل، Shift+Enter سطر جديد — محمي باختبار E2E-4 القائم).
2. **سحب الملفات وإفلاتها** في صندوق الإدخال يضيف مرفقات **بنفس قواعد الاختيار القائم بالضبط** (الامتدادات، 1MB، 3 ملفات، نفس رسائل الخطأ، نفس مسار `FileReader → base64 → files: attachments` — **لا مسار شبكة جديد ولا endpoint جديد**).
3. **وضع ملء الشاشة** عبر Fullscreen API القياسي: زر يبدّل الدخول/الخروج، الحالة تتزامن مع `Esc` الأصلي والخروج البرمجي، الزر يختفي حيث لا تدعمه المنصة.
4. **صفر dependencies جديدة** (كلها Web APIs قياسية: KeyboardEvent، DragEvent/DataTransfer، Fullscreen API).

## 4) النطاق

### 4.1 الملفات/المكونات المسموح تعديلها

| الملف | السبب |
|---|---|
| `lib/shortcuts.ts` **(جديد)** | منطق اختصارات **نقي** قابل للاختبار بدون DOM (يستقبل `{key, ctrl, meta, shift}` ويرجع قرارًا) |
| `lib/attach-utils.ts` **(جديد)** | منطق تصنيف الملفات المسحوبة **نقي** (allowlist / حد الحجم / العدد / التكرار) قابل للاختبار في node |
| `app/page.tsx` | ربط: مستمع keydown عام (useEffect + refs لتفادي closure قديم)، معالجات drag/drop على صندوق الإدخال + حالة `dragging` للتمييز البصري، زر ملء الشاشة في الهيدر + مستمع `fullscreenchange` + `data-fs` على `documentElement` |
| `lib/i18n.ts` | مفاتيح جديدة ar/en فقط (لا تغيير لمفاتيح قائمة) |
| `app/globals.css` | قاعدة `:fullscreen [data-fs]` اختيارية لتعديل بسيط (مسافات/خلو الهيدر) — **دون مساس بـ`@media print`** |
| `tests/shortcuts.test.ts` **(جديد)** | node:test |
| `tests/attach-utils.test.ts` **(جديد)** | node:test |
| `tests/e2e/improvements.spec.ts` **(جديد)** | Playwright |
| `package.json` | إضافة مساري الاختبارين الجديدين إلى سكربت `test` فقط (سكربت القائمة الصريحة) |
| وثائق | `DEPENDENCY-REVIEW.md` §8 · `TEST-REPORT.md` جولة 19 · `PHASE6-ITEM5-AUDIT.md` · `DEVELOPMENT-STATE.md` |

### 4.2 السلوك المطلوب تغييره

- إضافة الاختصار المعتمد الوحيد `Ctrl/⌘+Enter` → إرسال (§6).
- إضافة مسار إدخال ملفات ثانٍ (سحب) يصل **نفس** نقاط القرار التي يمر بها المسار القائم — **لا يتجاوز أي فحص منها**.
- إضافة زر ملء شاشة + مزامنة حالة.

### 4.3 خارج النطاق (لا يُعدل)

- ❌ لصق ملفات (Ctrl+V) — مؤجل (يتطلب معالجة صور الإدخال).
- ❌ استقبال السحب خارج صندوق الإدخال (الردود/الترويسة/الشريط الجانبي).
- ❌ أي إعادة تصميم تخطيط داخل ملء الشاشة (طيّ الشريط الجانبي تلقائيًا، إخفاء العناصر…).
- ❌ اختصارات إضافية غير الواردة في §6 (أسهم لتبديل المحادثات، بحث سريع، تحرير رسائل…).
- ❌ أي تغيير في `lib/validation.ts` أو `/api/chat` أو مخطط DB أو المصادقة أو وضعي القراءة/المشاركة.
- ❌ أي dependency جديدة أو ترقية.
- ❌ حذف/تغيير أي سلوك قائم (Enter/Shift+Enter، حد المرفقات، مُولّد الصور، الإملاء).

## 5) تحليل الأثر

| المجال | الأثر | الإجراء أو التحقق |
|---|---|---|
| Architecture | 3 معالجات UI محلية فقط؛ لا طبقة جديدة؛ منطق نقي مفصول للاختبار | مراجعة أن `page.tsx` لا يستقبل منطق قرار جديد غير مختبَر؛ libs جديدة بلا حالة |
| Public Contracts / APIs | **لا تغيير** — المرفقات تخرج من نفس `files: attachments` ونفس schema؛ لا endpoint جديد | إثبات: مجموع `diff` على `lib/validation.ts` و`app/api/**` = صفر |
| Database / Migrations | **لا تغيير** (قواعد البيانات المحلية/Neon unused لهذا البند) | Migration Safety Review: N/A |
| Security / Auth | **إيجابي لا تمديد**: مسار السحب يمر إجباريًا بنفس allowlist (الـ`drop` يتجاوز `accept` في المتصفح) → فحص امتداد صريح في `attach-utils.ts`؛ لا قراءة `text/plain` المسحوبة؛ تجاهل المجلدات | فحص امتداد + حجم قبل `FileReader`؛ اختبار وحدة لامتداد خبيث (`.exe`, `.html`) + E2E؛ no secrets in diff |
| Tests | + وحدة (اختصارات، تصنيف سحوبات) + E2E (6 حالات §7)؛ **لا يتغير أي اختبار قائم** (E2E-4 ضامن عدم كسر Enter) | npm test 148+جديد · E2E 15+جديد · lint · typecheck · build |
| Integrations | لا شيء خارجي جديد؛ Fullscreen API قياسي؛ لا أثر على Vercel | استمرار /api/status كما هو؛ CI بلا تعديل (خطوات E2E موجودة من Item 4) |
| UX / i18n | مفاتيح جديدة لا ترجمة قائمة | ar/en كاملتان؛ composerHint يُحدَّث لذكر Ctrl+Enter |

## 6) مصفوفة الاختصارات — **النهائية المعتمدة (قرار المالك بتاريخ 2026-08-30)**

| # | الاختصار | الوظيفة | القرار |
|---|---|---|---|
| 1 | `Ctrl/⌘ + Enter` | إرسال الرسالة | ✅ **اعتماد** |
| 2 | `Ctrl/⌘ + K` | محادثة جديدة | ❌ حذف |
| 3 | `Esc` | إزالة المرفقات | ❌ حذف |
| 4 | `Ctrl/⌘ + Shift + F` | تبديل ملء الشاشة | ❌ حذف |

```text
Keyboard Shortcuts
├── Ctrl/⌘ + Enter → Send        ✅
├── Ctrl/⌘ + K     → New Chat    ❌
├── Esc            → Attachments ❌
└── Ctrl/⌘+Shift+F → Fullscreen  ❌
```

**قرار صريح:** ملء الشاشة يبقى **زر UI مستقل** مع Fullscreen API و`fullscreenchange` — **بدون اختصار لوحة مفاتيح**.

قواعد عامة: الاختصار الوحيد `Ctrl/⌘+Enter` يعمل داخل صندوق الإدخال، فارغ لا يُرسل، أثناء `streaming` لا يُرسل (نفس حراسة `sendMessage` القائمة)؛ دعم macOS عبر `metaKey` وWindows/Linux عبر `ctrlKey`؛ لا تغيير على Enter/Shift+Enter القائمين.
## 7) خطة التنفيذ (بالترتيب، كل خطوة تنتهي ببوابة)

1. **تأكيد Baseline** مرة ثانية عند البدء + إنشاء `cr/item-5-improvements` من `38d9bb3` (بروتوكول §7: فرع مستقل، لا دفع إلى main مباشرة).
2. `lib/shortcuts.ts` + `tests/shortcuts.test.ts` → نقي، أحمر/أخضر.
3. `lib/attach-utils.ts` + `tests/attach-utils.test.ts` → allowlist مطابقة لـ`accept` القائم + حدود.
4. ربط `app/page.tsx`:
   - مستمع keydown على document داخل `useEffect` مع **refs** تحديثية (`inputRef`/`filesRef`/`streamingRef`) لمنع closure قديم — مثبت خطرًا مُتوقعًا.
   - `handlePickFiles` يُعاد هيكلته إلى `acceptPicked(files)` مشترك بين input وdrop (نفس الرسائل: `fileMax`, `fileTooBig`, خطأ صيغة).
   - معالجات `onDragOver` (preventDefault + حالة بصرية) / `onDragLeave` / `onDrop` (filter → classify → limits → خطأ أو إضافة)؛ تعطيل أثناء `streaming`؛ قالب `dragging` بحدود مؤقتة (نفس لون border النشط).
   - زر ملء الشاشة بجوار `الإعدادات` (icon `Maximize/Minimize`) + `fullscreenchange` + `data-fs` منزوعًا عند الخروج + إخفاء الزر عند غياب `documentElement.requestFullscreen` (iOS iPhone).
5. `lib/i18n.ts`: `fullscreen`, `fullscreenExit`, `dropUnsupported`, `dropHint`, تحديث `composerHint` (ذكر Ctrl+Enter) — ar/en.
6. **بوابة Tests**: `npm test` (148 + جدد) → `lint` → `typecheck` → `build`.
7. `tests/e2e/improvements.spec.ts` (على port 3100 كما هو، بلا تغيير config):
   - I-1 `Ctrl+Enter` يرسل رسالة (و`Shift+Ctrl+Enter` لا يرسل).
   - I-2 سحب ملف valid (`DataTransfer` عبر `evaluateHandle`) → شريحة تظهر وتبقى (لا شبكة).
   - I-3 سحب امتداد ممنوع (`.exe`) → رسالة خطأ، بلا شريحة.
   - I-4 ملء الشاشة: نقر الزر → (`document.fullscreenElement` **أو** `data-fs` على html كإثبات احتياطي موثق — قيد headless مثل قيد اسم الملف في Item 2) → نقر مجدد → خروج.
8. **Security & Contract Review** (بروتوكول §9): git grep أسرار، diff صفري على العقود/API، لا أذونات، لا بيانات حقيقية في الاختبارات.
9. وثائق: `DEPENDENCY-REVIEW.md` §8 (NO NEW DEPENDENCY) · `TEST-REPORT.md` جولة 19 · `PHASE6-ITEM5-AUDIT.md` (يتضمن **قرار التوافر: التحقق بالأدلة لا بالزعم**) · `DEVELOPMENT-STATE.md`.
10. **Evidence Report** بالقوالب + **Checkpoint** (CP-___) ثم **Pull Request** `cr/item-5-improvements → main` مربوط بـCR-005 + Evidence — **الدمج لا يتم إلا بموافقة بشرية نهائية** (بروتوكول: قاعدة الدمج؛ وهذا فارق مقصود عن الدفع المباشر في البنود السابقة).
11. بعد الدمج: متابعة CI + smoke حي (Vercel) + إثبات أن الحزم تحتوي Item 5.

## 8) معايير القبول (كلها قابلة للتحقق)

- [ ] E2E-4 القائم (Enter/Shift+Enter) يظل أخضر بلا تعديل.
- [ ] الاختصار المعتمد الوحيد `Ctrl/⌘+Enter` له اختبار وحدة + E2E، وShift+Enter/Enter القائمان بلا تغيير (E2E-4 أخضر بلا تعديل).
- [ ] السحب لا يضيف **أي** نوع ملف خارج allowlist؛ ولا يتجاوز 1MB/3 ملفات؛ ويتجاهل المجلدات؛ ويُرفض أثناء البث؛ بلا طلب شبكة إضافي.
- [ ] ملء الشاشة يفتح/يغلق، يتزامن مع Esc، والزر مختفٍ على غير المدعوم، ولا أثر على RTL/print/readMode.
- [ ] `npm test` = 148 + جدد كلها خضراء؛ E2E = 15 + جدد؛ lint 0/0؛ typecheck نظيف؛ build ✓ 6/6.
- [ ] Security: لا أسرار/مفاتيح في diff؛ Contract: لا تغيير في `/api/*` ولا `lib/validation.ts` ولا `db/*`.
- [ ] Dependency Review: **لا إضافة ولا ترقية**.
- [ ] Commit واحد نهائي منسوب للبنة (حسب أسلوب البنود السابقة) + Evidence + Checkpoint + PR.

## 9) المخاطر والقيود (معلنة مسبقًا)

| الخطر | التخفيف |
|---|---|
| Ctrl+K حجب من متصفح ما | preventDefault مُختبر E2E؛ بديل معتمد §6؛ الزر القائم يبقى |
| closure قديم في المستمع العام | refs محدثة؛ يغطيه E2E الإرسال أثناء البث |
| headless Chromium لا يبلّغ fullscreenElement | إثبات `data-fs` بديل موثق (نفس نمط قيد download في Item 2) |
| iOS iPhone لا Fullscreen API للعناصر | الزر مخفي؛ القيد موثق في AUDIT |
| Playwright وdrop | DataTransfer عبر `evaluateHandle`؛ لا اختبار للبصريات (dragging overlay) — اختيار مقصود بلا nth |
| توسع نطاق مقترح (paste، تخطيط ملء الشاشة…) | مسجل خارج النطاق §4.3؛ أي إضافة تتطلب CR منفصلًا |

## 10) Emergency Stop (بروتوكول §10)

يتوقف التنفيذ فورًا ويُطلب اعتماد بشري عند: توسع غير معتمد في النطاق، خطر فقدان بيانات، تغيير عقد عام، فشل أمني، فشل اختبارات غير قابل للتفسير، أو غياب Baseline نظيف.

## 11) بوابة الموافقة قبل التنفيذ — **توقف هنا**

- [x] تم التحقق من الـBaseline (شجرة نظيفة، HEAD `38d9bb3`، 148/148 + 15/15).
- [x] تم إعداد تحليل النطاق والأثر (§4–§5).
- [x] **تمت الموافقة البشرية على خطة التنفيذ** — اسم الموافق: المالك (المستخدم) — التاريخ: 2026-08-30 — **مع مصفوفة §6 النهائية: اعتماد `Ctrl/⌘+Enter` فقط**.

> **الوضع الحالي: APPROVED — التنفيذ مسموح على `cr/item-5-improvements`. البوابة المتبقية: PR + موافقة بشرية نهائية قبل الدمج (بروتوكول §7 وقاعدة الدمج).**
