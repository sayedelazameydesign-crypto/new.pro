# 🎨 FRONTEND-SPEC — نواة AI (Frontend Source of Truth)

> **الحالة:** ✅ **APPROVED & MERGED v1.1** — مرجع معتمد في `main`
> **المرجع:** `main` @ `301f768` — سلسلة: `8918512` (المرجع البرمجي للمستند — لا تغيير كود بعده، دُمجت توثيقات فقط) → `301f768` (إدراج v1.1) → `v1.1.1` (تصحيح المرجع الذاتي، PR #5)
> **سجل الاعتماد:** v1.0 (PR #3 `51a6519`) → مراجعة المالك → v1.1 (PR #4 `301f768` — §14/15/16) → **v1.1.1** (PR #5 — تحديث المرجع الذاتي إلى `301f768`)
> **قاعدة الحوكمة:** *اختبر قبل التطوير، وفعّل قبل التوثيق.* — لا تُسجَّل حالة «حي» إلا مع **Evidence** (فهرس §13، E-007 للدمج).
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

### 5.7 المزامنة + PWA (تفاصيل تنفيذ فعلية)
- **Manifest:** من `app/manifest.ts` (MetadataRoute → `/manifest.webmanifest`) — `lang:"ar"`, `dir:"rtl"`, `display:"standalone"`, `theme_color #6366f1`, أيقونات 192/512 (maskable)، بلا Workbox (SW مكتوب يدويًا).
- **Service Worker:** `public/sw.js` — كاش `nawah-v1`؛ precache: `/`, أيقونات 192/512, `/manifest.webmanifest`.
  - **شبكة أولًا** لصفحة HTML (`mode==="navigate"` أو `/`) مع سقوط إلى الكاش عند عدم الاتصال.
  - **كاش أولًا** للأصول الثابتة `/_next/static/` و`/icons/`.
  - **تجاهل صارم**: كل `/api/*`, `/auth/*`, وأي طلب غير GET — لا نكاش لبيانات المستخدم.
  - `skipWaiting` + `clients.claim` + تنظيف الكاشات القديمة في `activate`.
- **iOS:** `apple-mobile-web-app-capable` + `statusBarStyle: black-translucent` + `apple-touch-icon` (`/icons/icon-180.png`).
- **المزامنة:** `syncState` (off/syncing/synced) + أيقونة Cloud نابضة؛ LocalStore (`localStorage`: `nawah:convs`, `nawah:settings`) للجهاز، وNeon (`lib/storage-neon.ts` → جدول `nahwa_sync`) للمستخدم المسجَّل عبر `/api/conversations`.

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

### Backend Contract (يُحرَّر ويُعتمد في CR-006)
| البند | المواصفة المقترحة (قابلة للنقض في CR) | قيد |
|---|---|---|
| Endpoint | `POST /api/conversation-intel` (جديد) — أو داخل `/api/chat` كإشارة؛ يُحدَّد في CR | لا تنفيذ قبل الاعتماد |
| Schema | طلب: `{ conversationId, kind: "title" \| "completion", draft? }` · رد: `{ kind, value, provider, generatedAt }` | zod (نفس نمط lib/validation) |
| Provider/Model resolution | إعادة استخدام `lib/ai` الحالي (المطلوب → Groq → Gemini → HF → demo) — **لا مزود جديد** | قيد المزودات القائم |
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
| **E-007** | MERGE-EVIDENCE | طلب سحب مدمج في main بموافقة بشرية | PR #3 (`51a6519`) + PR #2 (`8918512`) + PR #4 — كلها CI ✓ |

### أمثلة تطبيق (Base الشفافية)
```text
Google OAuth Config   PASS     [E-001, E-004, E-005]
Google OAuth E2E      PENDING  [E-006]        ← خارج الكود (Consent External)
GitHub OAuth          OPTIONAL [E-001]        ← بلا env منشورة
الصور 5.2             DEFERRED [عائق خارجي: HF بلا مزود صور]
Item 6                NOT STARTED (لا Evidence)
FRONTEND-SPEC v1.0    APPROVED [E-001..E-005, E-007 (PR #3 51a6519)]
FRONTEND-SPEC v1.1    APPROVED [E-001 (8918512), E-002..E-007 (PR #4)]
FRONTEND-SPEC v1.1.1  APPROVED [E-001 (301f768), E-002..E-007 (PR #4/PR #5)]  ← الحالي
```

### قواعد الفهرس
1. `PASS` يتطلب **نوعين على الأقل** من الأدلة (غالبًا E-002/E-003 + E-004 أو E-005) — لا PASS بدليل واحد.
2. `CONFIG PASS` = الإعدادات سليمة (E-001/E-004/E-005) — **لا تعني** أن التدفق يعمل (يُسجَّل E2E منفصل).
3. `DEFERRED` يُوثَّق **سبب** العائق (لا يُحذف السطر — يبقى مرئيًا).
4. عند تجدد أي Evidence: يُحدَّث السطر + فهرس `tests/` الجولة + DEVELOPMENT-STATE في نفس الدورة.
5. لا يُشطب سجل Evidence سابق — يُستبدل الحالة ويُترك المرجع (سجل تاريخي، كما في BASELINE_REGISTRY).

## 14) المكدس التقني (من `package.json` — مرجع حي)

| المجال | التقنية | النسخة (package.json) |
|---|---|---|
| الإطار | Next.js (App Router) | `^15.3.0` |
| اللغة | TypeScript | `^5.7.0` |
| مكتبة الواجهة | React / React DOM | `^19.0.0` |
| الأنماط | Tailwind CSS + `@tailwindcss/postcss` | `^4.0.0` |
| الأيقونات | lucide-react | `^0.460.0` |
| المصادقة | next-auth (Auth.js v5) | `^5.0.0-beta.32` |
| قاعدة البيانات | @neondatabase/serverless + drizzle-orm | `^1.1.0` / `^0.45.2` |
| التحقق | zod (**v4**) | `^4.5.4` |
| ماركداون | react-markdown + remark-gfm + rehype-highlight | `^9.0.1` / `^4.0.0` / `^7.0.1` |
| تلوين الكود | highlight.js | `^11.11.1` |
| استخراج الملفات | pdf-parse + mammoth (+ jszip/pdfkit dev) | `^2.4.5` / `^1.12.2` |
| состояние/استعلام | zustand + @tanstack/react-query | `^5.0.15` / `^5.102.8` |
| اختبار الوحدات | node:test (مدمج) + tsx | `^4.23.13` |
| اختبار المتصفح | @playwright/test (**DEV ONLY**) | `^1.62.1` |
| PWA | بلا مكتبة — SW يدوي (`public/sw.js`) + manifest عبر `app/manifest.ts` | — |

## 15) المعمارية وتدفق البيانات (Data Flow)

```text
[UI] Composer (نص/ملفات/إملاء) — app/page.tsx
   │  sendMessage() → validate → summary (5.4) → run()
   ▼
[API] app/api/chat/route.ts
   │  parseChatBody (lib/validation.ts, zod v4) → rate-limit (20/دقيقة/IP)
   │  → بناء السياق (history + files نصًا مستخرجًا + system)
   ▼
[AI] lib/ai/index.ts → resolveProvider(modelId, overrideKey)
   │    fallback chain (lib/ai/index.ts): المزود المطلوب → Groq → Gemini → HF → demo
   │    (search مستقل — بلا تراجع، خطأ واضح بلا مفتاح؛ demo حتمي عند غياب كل المفاتيح)
   │    lib/ai/providers/{gemini,groq,huggingface,search,demo}.ts
   │    lib/ai/sse.ts → تحويل التدفق إلى SSE (أسطر `data:` / `done`)
   ▼
[Stream] SSE → الواجهة (type-cursor + providerUsed → شريط demo)
```

**التخزين (محوران):**
- **محلي — LocalStorage** (وليس IndexedDB): `lib/storage.ts` (LocalStore) مفاتيح `nawah:convs` و`nawah:settings` — يعمل فورًا بلا حساب.
- **سحابي — Neon**: `lib/storage-neon.ts` (جدول `nahwa_sync`، مفتاح `device_id`) عبر `/api/conversations` (مزامنة 60/دقيقة) — للمستخدم المسجَّل فقط؛ `SyncPayload { v:1, conversations, settings }`.

**المصادقة:** AuthModal → `next-auth` (Credentials scrypt في `lib/auth-db.ts` + OAuth Google/GitHub إن وُجد env) → provisioning في `jwt` callback (`lib/identity.ts` → `ensureApplicationUser`) → `session.user.id` تطبيقي (INVARIANT-01: لا جلسة بلا مستخدم تطبيقي).

**الواجهة/الخادم:** كل الطلبات عبر `/api/*` (chat, status, models, conversations, image, auth) — لا استدعاء مباشر من العميل لأي مزود.

## 16) متغيرات البيئة وأثرها على الواجهة (Feature Flags)

المصدر: `.env.example` + `lib/keys.ts` + `lib/auth.ts` — **لا تُنشر أي قيمة**، فقط الأسماء والأثر.

| المتغير | الأثر على الواجهة | إلزامي؟ |
|---|---|---|
| `AUTH_SECRET` | يفعّل نظام الحسابات (مع `AUTH_URL`/`AUTH_TRUST_HOST`) ويُظهر زر الدخول | إلزامي للمصادقة (بلا جلسات OAuth) |
| `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` | يُظهر زر «المتابعة بحساب Google» في AuthModal | اختياري (يشترط Consent External + Test user — معلّق [E-006]) |
| `AUTH_GITHUB_ID` + `AUTH_GITHUB_SECRET` | يُظهر زر GitHub في AuthModal | اختياري (غير منشور حاليًا → OPTIONAL) |
| `GEMINI_API_KEY` / `GROQ_API_KEY` / `HF_TOKEN` | يُفعّل المزود في ModelPicker (بلا المفتاح → demo حتمي) | اختياري (واحدة تكفي للتشغيل) |
| `TAVILY_API_KEY` | يُفعّل البحث في الويب (مزود `search`) | اختياري |
| `DATABASE_URL` | يفعّل المزامنة السحابية (Neon) والمصادقة البرنامجية | اختياري (بدونه: محلي فقط) |
| `MAX_TOKENS` | سقف رموز الرد (افتراضي 1024) | اختياري |
| `RATE_LIMIT_PER_MIN` / `RATE_LIMIT_SYNC_PER_MIN` | حدود chat/sync (افتراضي 20/60) | اختياري (يعمل تلقائيًا بلا إعداد) |
| `RATE_LIMIT_DISABLED` | `1` = تعطيل الحماية — **للاختبارات المحلية فقط** | لا (في بيئة الاختبار وwebServer فقط) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | تقييد موزّع عبر خوادم Vercel (اختياري) | اختياري |

> **قاعدة:** أي زر يظهر/يختفي بناءً على هذه المتغيرات يُوثَّق هنا — لا سلوك «يظهر صدفة».

---

> **ملاحظة الحوكمة:** أي خلاف مستقبلي بين الكود وهذا المستند يُحل بتحديث المستند في نفس الـPR الذي يغيّر الكود (لا مستند منفصل عن الواقع). تحديث v1.1 عبر PR #4 (توثيق فقط).
