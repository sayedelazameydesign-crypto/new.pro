# 🎨 FRONTEND-SPEC — نواة AI (Frontend Source of Truth)

> **الحالة:** PROPOSED — بانتظار المراجعة والاعتماد (docs/frontend-spec → PR → CI → Review → Merge)
> **المرجع:** كود main `d8d0d9e` (بعد Item 5) — مواصفة «كما هي» مربوطة بالكود، لا وثيقة تصميم منفصلة.
> **قاعدة الحوكمة:** *اختبر قبل التطوير، وفعّل قبل التوثيق.* — لا تُسجَّل حالة «حي» إلا مع **Evidence** (فهرس §13).
> **لا كود يُعدل بهذا المستند** — أي تغيير كود لاحق يمر عبر `Capability → UI → Evidence → DoD → CI → PR`.

---

## 01) المبادئ الحاكمة (قرارات ثابتة لا تناقش)

| # | المبدأ | الإثبات في الكود |
|---|---|---|
| 1 | **عربي أولًا + RTL أصيل** | `<html lang="ar" dir="rtl">` + تبديل `dir/lang` ديناميكيًا عند تغيير اللغة |
| 2 | **صفر مكتبات UI** | Tailwind v4 + CSS vars؛ icons من `lucide-react` فقط |
| 3 | **الثيم عبر متغيرات CSS** | `--bg/--card/--border/--muted` + `[data-theme="dark"|"light"]` (افتراضي داكن) |
| 4 | **الوصولية إلزامية** | أزرار `title`+`aria-label`؛ composer دور وآرية؛ أي إصلاح `aria-label` موثق سببه |
| 5 | **بلا تبعية عرض خارجية** | لا CDN/خطوط خارجية |
| 6 | **حتمية الاختبار** | قابل للاختبار بلا LLM خارجي (demo) وبلا أسرار؛ selectors وصولية لا data-testid |
| 7 | **لا إضافات UI لمجرد الاختبار** | كل `role/aria-label` وصولية بحق (موثق في AUDIT Item 4/5) |
| 8 | **الطباعة معزولة** | `.print-area` / `.no-print` + `@media print` |
| 9 | **الواجهة لا تسبق الـ API** | أي ميزة لها Backend Contract معتمد أولًا (§10) — لا واجهة بلا عقد |

## 02) النظام التصميمي

### التوكنات (`app/globals.css`)
| المتغير | داكن (افتراضي) | فاتح | الاستخدام |
|---|---|---|---|
| `--bg` | `#0b0d12` | `#f8fafc` | خلفية/هيدر |
| `--card` | `#11141d` | `#ffffff` | بطاقات/صندوق الإدخال |
| `--border` | `#1e2433` | `#e2e8f0` | حدود |
| `--muted` | `#94a3b8` | `#64748b` | نصوص ثانوية |

- حالة نشطة: `border-indigo-500` (focus-within) · سحب: `border-dashed !border-indigo-400 + ring-2 ring-indigo-500/40` · إرسال: `bg-gradient-to-br from-indigo-500 to-purple-600`.
- **الثيم/اللغة:** `data-theme` + `lang`/`dir` على `<html>` من `settings`؛ قاموس `makeT` (fallback عربي) — **كل مفتاح جديد باللغتين**.

### المكونات المتكررة
أزرار هيدر `p-2 rounded-xl hover:bg-[var(--bg)]` · رسالة مستخدم `rounded-2xl bg-indigo-500/10` داخل `.msg-in` · شرائح مرفقات `rounded-full bg-indigo-500/10` + X + `truncate max-w-52` · توست (أقصى 4) عبر `pushToast`.

## 03) بنية الشاشة (`app/page.tsx`)

```
┌─────────────┬──────────────────────────────────────────────┐
│  Sidebar    │  Header (دخول/خروج، 📖، مشاركة، ملء شاشة،     │
│  (بحث+مجموعات)│         الإعدادات، مؤشر مزامنة)              │
│             ├──────────────────────────────────────────────┤
│             │  منطقة المحادثة (بث / وضع قراءة)              │
│             │  شريط demo (providerUsed=demo)                │
│             ├──────────────────────────────────────────────┤
│             │  ModelPicker (مكتب فقط) · Composer + تلميح    │
└─────────────┴──────────────────────────────────────────────┘
```
حالات التخطيط: ترحيب (بلا نشطة) · قراءة (composer مخفي) · جوال (sidebar قابل للفتح) · ملء شاشة (`data-fs`).

## 04) جرد المكونات

| المكوّن | المسؤولية | الحالات | وصولية | اختبار |
|---|---|---|---|---|
| `Sidebar` | قائمة/بحث/مجموعات/إعادة تسمية/حذف | بحث، لا نتائج، نشطة، جوال | أزرار+title | E2E-1,7..10 |
| `Welcome` | شاشة البداية | — | h1 | E2E-8 |
| `Markdown` | md + تلوين + نسخ | copied | — | E2E-2 |
| `Composer` | نص auto-size، إرسال، سحب، اختصار، إملاء، مرفقات، توليد | فارغ/بث/سحب/إملاء | role+aria-label، زر معطل | E2E-2..6,15, I-1..3 |
| `ModelPicker` | مزود/موديل | حسب status | — | — |
| `SettingsModal` | ٧ أقسام + BYOK + تصدير/استيراد | حفظ يغلق تلقائيًا | aria-label إغلاق | E2E-11..14 |
| `AuthModal` | بريد/كلمة + اجتماعي | providers | — | — |
| `ReadMode` | قراءة + Markdown/PDF | Markdown/PDF/عودة | .print-area | E-1..12 وحدة |
| `Toasts` | إشعارات | info/error/success | — | — |
| `SyncIndicator` | مزامنة | off/syncing/synced | — | — |

## 05) التدفقات (Flow Specs)

### 5.1 الإرسال مع ملفات
`نص/ملفات → Enter|Shift+Enter|Ctrl/⌘+Enter|زر → sendMessage()` — فارغ/بث يعود؛ إنشاء محادثة عند أول إرسال؛ `titleFromMessages` (٣٤ حرف + …)؛ تذكّر عند ٢٤+؛ `providerUsed` → شريط demo.
حالات بث: `.type-cursor` + `.animate-bounce` + زر إيقاف + منع تكرار/تغيير أثناء البث.

### 5.2 المرفقات (موحّد: انتخاب + سحب)
زر 📎 (`accept` قائمة بيضاء) **و** إفلات داخل composer — كلاهما عبر `classifyAttach` (allowlist `txt/md/markdown/csv/json/pdf/docx`، ≤1MB، ≤3) **قبل** FileReader (drop يتجاوز `accept`). رسائل: `fileMax/fileTooBig/fileUnsupported` (بانر)؛ النص المستخرج (≤30,000) يُدمج بالرسالة — **بلا مسار شبكة إضافي**.

### 5.3 وضع القراءة والتصدير
📖 → ReadMode → `downloadMarkdown` (Blob محلي، اسم آمن) أو `printConversation` (`window.print` + `@media print` → حفظ PDF عبر حوار المتصفح — قيد موثق: أفضل جودة عربية بلا dependency).

### 5.4 المشاركة `?c=id` — **تعريف دلالي دقيق (Local Share ≠ Public Share)**
> **Privacy Model موثق: LOCAL-ONLY IDENTIFIER** (مرجع: PHASE6-ITEM3-AUDIT.md) — المعرف فقط في الـURL، بلا محتوى/أسرار؛ يُحلّ من **المخزن المحلي** بعد `loadAll` بلا طلب جديد؛ malformed/unknown → `shareMissing` banner آمن.

| النوع | الحالة | التعريف الدقيق | القيد |
|---|---|---|---|
| **Local Share** | ✅ النمط المعتمد | معرف `[A-Za-z0-9_-]{8,80}` في `?c=` يُفتح من مخزن **الجهاز نفسه** فقط؛ نسخ عبر Clipboard + fallback + toast | على جهاز نظيف → **not-found مقصود** (الخصوصية محلية — مثبت حيًا 7/7) |
| **Storage-backed** | جزئي (مستخدم نفسه) | المزامنة عبر Neon للمستخدم المسجَّل؛ لا تجعل المعرف «رابط عام» | لا يصلح للنشر العام |
| **Public Link** | ❌ **خارج النطاق** | مشاركة لطرف ثالث بدون مصادقة | يتطلب **نموذج صلاحيات** + CR مستقل — **لا يُضاف إلى Item 6** |
| **Temporary/Expiring** | ❌ **خارج النطاق** | روابط مؤقتة/منتهية | خارج نطاق هذا المستند حتى CR مخصص |

**النتيجة:** وجود زر Share2 **لا يعني** مشاركة عامة/آمنة — الوثيقة تفصل ذلك صراحة، وكل ادعاء «مشاركة» يُقرأ ضمن LOCAL-ONLY.

### 5.5 الإعدادات / BYOK
٧ أقسام؛ الحفظ يغلق النافذة تلقائيًا (سلوك موثق)؛ حالة المفاتيح من `/api/status` بلا كشف القيم.

### 5.6 المصادقة
بريد/كلمة (scrypt في Neon) + Google/GitHub عند env؛ OAuth → `/api/auth/callback/google` → provisioning داخل `jwt` callback → **لا جلسة بلا مستخدم تطبيقي (INVARIANT-01)».
- **معلومة حالة:** Google OAuth **Config = سليم** (client/origin/redirect مطابقة — مثبت حيًا)، لكن **E2E معلّق** على OAuth Consent → External + Test user (خارج الكود) — راجع `GOOGLE-OAUTH-EXTERNAL-GATE.md`.

### 5.7 المزامنة + PWA
`syncState` (off/syncing/synced + أيقونة Cloud نابضة)؛ manifest RTL + `sw.js` (cache `nawah-v1`) + أيقونات iOS.

### 5.8 ملء الشاشة (زر فقط — بلا اختصار، قرار المالك §6)
`requestFullscreen` بعد mount (تفادي hydration)؛ `fullscreenchange` → `isFullscreen` + `data-fs`؛ زر يظهر فقط إن مدعوم.

### 5.9 الاختصارات (المعتمد الوحيد)
| المفتاح | الفعل | ملاحظة |
|---|---|---|
| `Enter` | إرسال | سلوك أصيل |
| `Shift+Enter` | سطر جديد | محمي (E2E-4) |
| `Ctrl/⌘+Enter` | إرسال | Item 5 — `isSendShortcut` (لا Alt/Shift) |
| ~~Ctrl+K / Esc / Ctrl+Shift+F~~ | — | **مرفوضة** (مصفوفة §6 نهائية) |

## 06) Capability ↔ UI Matrix — **مع فهرس الأدلة (§13)**

| القدرة | Frontend Surface | الحالة | Evidence |
|---|---|---|---|
| مزودات + بحث + demo fallback | ModelPicker + شريط demo + بث | **PASS** | E-001, E-002, E-003, E-004, E-005 |
| Auth بريد/كلمة مرور | AuthModal + هيدر مستخدم | **PASS** | E-001, E-002, E-004 |
| **Google OAuth Config** | زر «المتابعة بحساب Google» | **CONFIG PASS** | E-001, E-004, E-005 |
| **Google OAuth E2E** | تدفق كامل (زر → Google → عودة) | **PENDING** | E-006 — خارج الكود (Consent External + Test user) |
| GitHub OAuth | زر (يظهر عند env فقط) | **OPTIONAL** | E-001 فقط — لا env منشورة |
| ملفات 5.1 | 📎 + سحب + شرائح | **PASS** | E-001, E-002, E-003, E-004 |
| صور 5.2 | زر 🎨 (معطل بلا نص) | **DEFERRED** | إثبات العائق: حساب HF بلا مزود صور (لا E-005) |
| صوت 5.3 | 🎤 إملاء + 🔊 قراءة | **PASS** | E-001, E-002, E-005 (المايك نفسه = E-006 يدوي) |
| تذكّر 5.4 | ملخصات تلقائية + حقن system | **PASS** | E-001, E-002, E-004, E-005 (9/9) |
| مزامنة Neon | SyncIndicator | **PASS** | E-002, E-005 |
| PWA (6.1) | manifest + SW + أيقونات | **PASS** | E-002, E-004, E-005 |
| وضع القراءة (Item 2) | 📖 + Markdown/PDF | **PASS** | E-002, E-004, E-005 (17/17 — حفظ PDF نفسه E-006) |
| مشاركة (Item 3) | Share2 + `?c=id` + toast | **PASS (LOCAL-ONLY)** | E-002, E-004, E-005 (7/7) |
| E2E infra (Item 4) | spec ×2 | **PASS** | E-003, E-004 |
| Item 5 | Ctrl+⌘Enter · drop · ملء شاشة | **PASS** | E-002, E-003, E-004, E-005 (4/4) |
| **Item 6** | اقتراح إكمال + عنوان | **NOT STARTED** | لا Evidence — يتطلب CR مع Backend Contract (§10) |

## 07) حالات النظام (Runtime States) — ما تحتاجه الواجهة

| الحالة | سلوك الواجهة الحالي | ملاحظة |
|---|---|---|
| لا مفتاح / أسوأ الحالات | demo محلي + شريط توعية | أساس الحتمية |
| 429 (20/دقيقة) | بانر `error` + منع إرسال الفارغ | — |
| بلا اتصال | PWA cache + مزامنة معلّقة | ضمن المعمارية الحالية |
| فشل مزود | fallback صامت + `[nawah]` log | لا سطح يضلل |
| ملء شاشة غير مدعوم | زر مخفي | iOS iPhone |
| وضع القراءة | composer مخفي + أزرار تصدير | — |

> **قاعدة:** كل حالة **قابلة للرصد** (بانر/شريط/توست/زر معطل) — لا صمت عن فشل.

## 08) الوصولية + i18n — الإلزامات

- كل زر `title` + (icon-only) `aria-label`؛ نوافذ زر إغلاق معنون؛ composer `role=group` + `aria-label` (موثق Item 4/5).
- تباين `--muted` ≥ 4.5:1؛ أزرار معطلة `opacity-30 + cursor-not-allowed`؛ لا اعتراض مفاتيح داخل الحقول (إلا isSendShortcut).
- طباعة: `.no-print` / `.print-area`؛ i18n: لا نص صلب — مفتاح ثنائي لكل نص مرئي.

## 09) Test Contract

- **Unit (node:test):** 163 — تشمل ui-store Z-1..6، export E-1..12، share S-1..12، shortcuts K-1..6، attach-utils A-1..9.
- **E2E (Playwright):** 19 — E2E-1..15 (Item 4) + I-1..4 (Item 5).
- **قواعد:** عزل تام لكل اختبار · بلا LLM خارجي (demo) · selectors وصولية · بلا sleep (locators/state) · trace retain-on-failure · webServer 3100 + `RATE_LIMIT_DISABLED=1` (بيئة اختبار فقط).
- **قاعدة الحوكمة:** أي ميزة واجهية = + اختبارات؛ **لا يُنقص/يُعدل اختبار قائم بلا CR** (خصوصًا E2E-4، E2E-7).

## 10) Item 6 — Conversation Intelligence (**Frontend + Backend Contract**)

> **مبدأ:** لا واجهة بلا عقد. يُعتمد الـ Backend Contract **أولًا** في CR مستقل، ثم تُبنى الواجهة عليه. (لا Public Share هنا — خارج النطاق حتى تحديد نموذج الصلاحيات.)

### Backend Contract (يُحبَّر ويُعتمد في CR-006)
| البند | المواصفة المقترحة (قابلة للنقض في CR) | قيد |
|---|---|---|
| Endpoint | `POST /api/conversation-intel` (جديد) — أو داخل `/api/chat` كإشارة؛ يُحدَّد في CR | لا تنفيذ قبل الاعتماد |
| Schema | طلب: `{ conversationId, kind: "title" \| "completion", draft? }` · رد: `{ kind, value, provider, generatedAt }` | zod (نفس نمط lib/validation) |
| Provider/Model resolution | إعادة استخدام `lib/ai` الحالي (Gemini→HF→Groq→demo) — **لا مزود جديد** | قيد المزودات القائم |
| Fallback | فشل/لا مفتاح → **لا اقتراح ولا عنوان** (لا كتلة، لا رسالة خاطئة)؛ يبقى `titleFromMessages` | حتمية |
| Rate limit | حد خاص مستقل (داخل نافذة 20/دقيقة الحالية أو حده الخاص) — يُقرَّر في CR | لا إساءة |
| Privacy boundary | هل تُرسل الرسائل لمزود خارجي لتوليد العنوان؟ — **قرار خصوصية صريح** يُعتمد قبل أي تنفيذ | بلا إرسال بلا موافقة |

### Frontend (يُبنى بعد العقد)
| السطح | الحالة | تفاعل |
|---|---|---|
| اقتراح إكمال | فقاعة بعد توقف الكتابة | نقر/`Tab` = تطبيق · رفض = تجاهل · لا إرسال تلقائي |
| توليد عنوان | بعد أول رسالة | يُحدَّث sidebar + هيدر تلقائيًا؛ **إعادة التسمية اليدوية تبقى بلا مساس** |
| حالات UI | **pending** (مؤشر توليد) · **retry** (فشل) · **reject** (رفض اقتراح) · **undo** (استرجاع عنوان سابق/يدوي) | كل حالة ظاهرة للمستخدم |

### DoD خاص بـItem 6
- CR معتمد + Backend Contract موثق · اختبارات وحدة للعقد (نفس النمط) + E2E للتدفق · لا كسر لعناوين سابقة/إعادة تسمية يدوية · Evidence E-001..E-005 قبل «PASS» · بلا Public Share.

## 11) Definition of Done (أي ميزة واجهية)
- [ ] سلوك + حالات (نجاح/فشل/فارغ/تحميل) ظاهرة.
- [ ] i18n ثنائي كامل (ar/en) بلا نص صلب.
- [ ] وصولية (عنوان/أدوار/تباين) — أي `aria-label` جديد مبرر.
- [ ] لا dependency جديدة إلا بCR + مراجعة DEPENDENCY-REVIEW.
- [ ] اختبارات: وحدة (منطق نقي) + E2E (تدفق) بلا أسرار/بيانات حقيقية.
- [ ] لا كسر لاختبار قائم (E2E-4، E2E-7 خصوصًا).
- [ ] توثيق: AUDIT/Evidence (حسب الحوكمة) + DEVELOPMENT-STATE.
- [ ] بعد الدمج: smoke حي (200 + علامات في الحزم) — ثم فقط يُسجَّل PASS.

## 12) File Map (مرجع)
```
app/page.tsx            ← تنسيق مركزي + hooks/flows
app/components/         ← Sidebar · Welcome · Markdown · ModelPicker · SettingsModal ·
                           AuthModal · ReadMode · Toasts
app/api/*               ← chat / status / models / conversations / image / auth
lib/                    ← i18n · ui-store · types · validation · export · share ·
                           shortcuts · attach-utils · speech · summary · keys ·
                           models · storage(+neon) · rate-limit · auth(+db) · identity
globals.css             ← tokens + data-theme + print + .type-cursor/.msg-in
public/                 ← manifest + sw.js + icons
tests/                  ← 163 وحدة/تكامل + 19 E2E (2 specs)
```

## 13) Evidence Index — **مرجع الأدلة الإلزامي**

> **القاعدة الحاكمة:** لا يُسجَّل PASS/«حي» إلا بإشارة E-XXX قابلة للتتبع. كل ميزة تمر:
> `Capability → UI → Evidence → DoD → CI → PR`.

| الكود | النوع | التعريف | كيف يُنْتَج (مرجع) |
|---|---|---|---|
| **E-001** | CODE-EVIDENCE | الكود موجود ومطابق للمواصفة | مسار الملف في §12 + commit المرجعي |
| **E-002** | UNIT | اختبار وحدة/تكامل ناجح | `npm test` → 163/163 |
| **E-003** | E2E | اختبار متصفح ناجح | `npx playwright test` → 19/19 |
| **E-004** | CI | تشغيل GitHub Actions أخضر | `gh run list --branch main` (مثل d8d0d9e success) |
| **E-005** | PRODUCTION | تحقق حي على Vercel | 200 + `/api/status` + علامات في الحزم (verify-item5-live.mjs 4/4، verify-item3 7/7…) |
| **E-006** | USER-ACCEPTANCE | تحقق يدوي من المالك | سيناريوهات: Google OAuth E2E، المايك، حفظ PDF، ملء الشاشة على OS حقيقي |

### أمثلة تطبيق (Base الشفافية)
```text
Google OAuth Config   PASS     [E-001, E-004, E-005]
Google OAuth E2E      PENDING  [E-006]        ← خارج الكود (Consent External)
GitHub OAuth          OPTIONAL [E-001]        ← بلا env منشورة
الصور 5.2             DEFERRED [عائق خارجي: HF بلا مزود صور]
Item 6                NOT STARTED (لا Evidence)
```

### قواعد الفهرس
1. `PASS` يتطلب **نوعين على الأقل** من الأدلة (غالبًا E-002/E-003 + E-004 أو E-005) — لا PASS بدليل واحد.
2. `CONFIG PASS` = الإعدادات سليمة (E-001/E-004/E-005) — **لا تعني** أن التدفق يعمل (يُسجَّل E2E منفصل).
3. `DEFERRED` يُوثَّق **سبب** العائق (لا يُحذف السطر — يبقى مرئيًا).
4. عند تجدد أي Evidence: يُحدَّث السطر + فهرس `tests/` الجولة + DEVELOPMENT-STATE في نفس الدورة.
5. لا يُشطب سجل Evidence سابق — يُستبدل الحالة ويُترك المرجع (سجل تاريخي، كما في BASELINE_REGISTRY).

---
> **ملاحظة الحوكمة:** اعتماد هذا المستند كـ Frontend Source of Truth يتم عبر **PR (مستقل عن PR #2)** — مراجعة ثم دمج بموافقة بشرية. أي خلاف مع الكود المستقبلي يُحل بتحديث المستند في نفس الـPR الذي يغيّر الكود (لا مستند منفصل عن الواقع).
