# PHASE 6 / ITEM 5 — CR-005 AUDIT (تحسينات: اختصار إرسال + سحب ملفات + ملء شاشة)

> الحالة: PASS — Reference Commit `38d9bb3` — الفرع `cr/item-5-improvements`
> الحوكمة: CR-005 (Approved بمصفوفة §6 النهائية) → Baseline Verification ✓ → Scope/Impact ✓ → تنفيذ → اختبارات → Security/Contract ✓ → Evidence + Checkpoint → PR (بموافقة بشرية للدمج).

## القرارات المعتمدة (من المالك)

| القرار | التفصيل |
|---|---|
| الاختصار الوحيد | `Ctrl/⌘ + Enter` → إرسال. **رُفضت**: Ctrl/⌘+K (محادثة جديدة)، Esc (مرفقات)، Ctrl/⌘+Shift+F (ملء الشاشة) — مصفوفة §6 نهائية |
| ملء الشاشة | **زر UI فقط** (icon Maximize/Minimize في الهيدر بجوار الإعدادات) — Fullscreen API + `fullscreenchange` — بلا اختصار لوحة مفاتيح |
| سحب الملفات | مسار موحّد مع الاختيار: `acceptPicked()` → `classifyAttach()` — **نفس** القواعد قبل أي FileReader/شبكة |
| الحتمية والاختبار | بلا LLM خارجي (demo المحلي)، بلا أسرار، بلا بيانات حقيقية، selectors وصولية |

## ما نُفِّذ

| الملف | التغيير |
|---|---|
| `lib/shortcuts.ts` (جديد) | `isSendShortcut()` — نقي، لا يدّعي غير Ctrl/⌘+Enter (حماية Enter/Shift+Enter القائمين) |
| `lib/attach-utils.ts` (جديد) | `classifyAttach()` عام — allowlist (مطابقة accept وfile-extract حرفيًا) + 1MB + 3 ملفات + `extOf`/`isAllowedExt` |
| `app/page.tsx` | acceptPicked/handlePickFiles/handleDropFiles؛ معالجات drag على صندوق الإدخال (depth-counter ضد وميض onDragLeave، حالة `dragging` بصرية، حراسة `streaming`)؛ اختصار في onKeyDown قبل فرع Enter القائم؛ زر ملء شاشة + `fullscreenchange` + `data-fs`؛ **hydration-safe** (fsSupported في useEffect) |
| `lib/i18n.ts` | ar/en: `fullscreen`, `fullscreenExit`, `fileUnsupported`, `composerAria`, `composerHint` (ذكر Ctrl+Enter) — لا مفتاح قائم تغيّر نصّه المسجل إلا composerHint (إضافة بند، لا تغيير قائم) |
| `package.json` | سكربت test فقط (+ ملفا الاختبارات الجديدان) — لا dependency |

## الأمان / العقود

- **التقوية الأمنية الموثقة**: `drop` يتجاوز سمة `accept` في المتصفحات → الفحص بالامتداد الآن **إجباري قبل FileReader** على المسارين (اختيار + سحب)؛ بلا أثر على lib/file-extract.ts (يبقى حارس الخادم).
- **لا تغيير**: `/api/*`، `lib/validation.ts`، `lib/db/*`، المصادقة، مخطط DB، وضعا القراءة/المشاركة — إثبات: `git diff --name-only` على المناطق المحمية = **0 ملف**.
- لا secrets في diff (git grep قبل/بعد)؛ لا بيانات إنتاجية؛ لا حفظ على قرص (بلا تغيير — FileReader محلي فقط).
- لا ادعاء بصدد الـbackup/الأذونات: لا صلة (لا auth/permissions جديدة).

## حدود موثقة (قرارات مقصودة)

1. **الإفلات خارج صندوق الإدخال** (خلال البث أو خارجه) يبقى على السلوك الافتراضي للمتصفح — النطاق المصرَّح هو الصندوق فقط (§4.3).
2. **iOS iPhone**: بلا Fullscreen API للعناصر → الزر يختفي تلقائيًا (`requestFullscreen` غير موجود)؛ الوظيفة متاحة على سطح المكتب/iPad.
3. **headless إثبات ملء الشاشة**: E2E يتحقق من `document.fullscreenElement` أو `data-fs` (مثل قيد اسم الملف في Item 2).
4. **بلا لصق ملفات (Ctrl+V)** ولا سحب إلى مناطق أخرى — خارج النطاق (§4.3)؛ إعادة النظر في CR منفصل.
5. السحب لأكثر من 3 ملفات/أكبر من 1MB/امتداد ممنوع → نفس رسائل المسار القائم (`fileMax`/`fileTooBig`/`fileUnsupported`).

## التوافق مع البنية

- لا طبقة جديدة؛ logicals نقية (`lib/shortcuts`, `lib/attach-utils`) قابلة للاختبار بلا DOM وبدون حالة.
- لا أثر على RTL/print/readMode: زر ملء الشاشة في الهيدر (يظهر في readMode أيضًا كميزة)، الإدخال مخفي في readMode فلا سحب هناك.
- `data-fs` خطاف توثيقي/مستقبلي — بلا تغيير تخطيط في هذه البند (لا CSS جديد).
