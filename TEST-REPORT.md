# تقرير الاختبارات — نواة AI

> آخر تحديث: جولة 17 (Phase 6/Item 3 — مشاركة المحادثة ?c=id)
> النتيجة الكاملة: **148/148 ✅** — lint 0/0 · typecheck نظيف · build ✓ · تحقق حي 16/16

---

## الجولة 14 — خطة EXECUTION: كل البوابات الموحدة (120/120)

| الملف | الاختبارات | النتيجة |
|---|---|---|
| tests/api.test.mjs | 30 (API شامل) | ✅ |
| tests/identity.test.ts | 12 | ✅ |
| tests/identity-race.test.ts | 2 | ✅ |
| tests/file-extract.test.ts | 10 | ✅ |
| tests/image.test.ts | 9 | ✅ |
| tests/speech.test.ts | 15 (S-1..S-13) | ✅ |
| tests/summary.test.ts | 8 | ✅ |
| tests/provider-system.test.ts | 5 | ✅ |
| tests/validation.test.ts | 6 (V-1..V-6) | ✅ |
| tests/ui-store.test.ts | 6 (Z-1..Z-6) | ✅ |
| tests/query-client.test.ts | 5 (Q-1..Q-5) | ✅ |
| tests/streaming.test.ts | 5 (W-1..W-5) | ✅ |
| tests/db-schema.test.ts | 4 (D-1..D-4) | ✅ |
| **المجموع** | **120** | **120/120 ✅** |

### ما أُصلح في هذه الجولة
1. **التحذيرات الثلاث** (c غير مستهلك) في `tests/provider-system.test.ts` — استهلكت بـ `{ void c; break; }`.
2. **exhaustive-deps** في `app/page.tsx` (useEffect إيقاف القراءة) — تعليق نية + eslint-disable (السلوك مقصود: يعمل عند تغيير activeId فقط).
3. **typecheck 3 أخطاء**:
   - `tableShape` كانت تأخذ `getTableConfig["table"]` — أصبحت `Parameters<typeof getTableConfig>[0]`.
   - الفهرس: `index.name` غير موجود في drizzle-orm@0.45.2 — الاسم في `index.config.name` (بينما uniqueConstraints لها `.name` مباشرة).
   - `fetchQuery` في query-client.test.ts — أصبحت عامة `<{ ok: boolean }>`.
4. **اختبارات حقيقية 3 فشلات**:
   - **D-4**: قراءة اسم الفهرس من `config.name`.
   - **W-3**: الاختبار القديم بنى التدفق في `start()` (enqueue ثم error) — حسب مواصفة ReadableStream تُفرَّغ الطابور عند الخطأ؛ أُعيد بناؤه بـ`pull()` (يسلّم سطرًا كاملًا أولًا ثم ينقطع) — محاكاة واقعية لقطع mid-stream.
   - **W-4**: إصلاح حقيقي في `lib/ai/sse.ts` — `chunkLines` تتجاهل الآن أسطر التعليقات `:` (مواصفة SSE).

### ملاحظة تشغيل مهمة
- `npm test` يتطلب خادمًا جديدًا (fresh) على المنفذ 3000: عدّاد rate-limit في الذاكرة يتراكم على الخادم القديم فيعطي **429s كاذبة** (كانت السبب الجذري لفشل 12 اختبارًا في أول تشغيل). `RATE_LIMIT_DISABLED=1` متاح للاختبارات المحلية لكن لم يُستخدم.
- أمر التشغيل: `node --import tsx --test tests/api.test.mjs tests/identity.test.ts tests/identity-race.test.ts tests/file-extract.test.ts tests/image.test.ts tests/speech.test.ts tests/summary.test.ts tests/provider-system.test.ts tests/validation.test.ts tests/ui-store.test.ts tests/query-client.test.ts tests/streaming.test.ts tests/db-schema.test.ts`

### أوامر التحقق
```bash
npm run lint      # 0 problems (eslint.config.mjs flat)
npm run typecheck # نظيف
npm run build     # ✓ Compiled successfully (6/6 صفحات)
npm test          # 120/120 ✅
```

---

## الجولة 17 — Phase 6/Item 3: مشاركة المحادثة عبر ?c=id

| البند | النتيجة |
|---|---|
| Query Resolution (S-1..S-12) | ✅ 12/12 |
| فتح مباشر + Refresh (حي) | ✅ |
| مشاركة/نسخ الرابط (Clipboard حقيقي + Toast zustand) | ✅ |
| Malformed/Unknown (لا crash، لا عشوائية) | ✅ (حي) |
| لا محتوى رسائل/أسرار في الرابط | ✅ (فحص) |
| Security Gate | ✅ (لا innerHTML/لا أسرار/لا شبكة/لا endpoint عام) |
| npm test (14 ملفات، خادم جديد) | ✅ **148/148** |
| lint / typecheck / build | ✅ 0/0 · نظيف · ✓ |
| تحقق حي (verify-item3.mjs — متصفح) | ✅ **16/16** |

### ما أُنجز
- `lib/share.ts` (جديد): `isValidShareId` (regex صارم) · `buildShareUrl` (id فقط) · `parseShareId` · `resolveShareId` (none/ok/unknown) · `copyShareLink` (Clipboard API + fallback execCommand).
- `app/page.tsx`: resolution مرة واحدة عند أول تحميل بعد loadAll (لا طلب جديد)؛ زر Share2 في الرأس → Toast نجاح/فشل (zustand)؛ حالة not-found (banner + إخفاء يمسح c من التاريخ).
- `lib/i18n.ts`: share/shareCopied/shareCopyFailed/shareMissing/shareMissingClose (ar/en).
- مؤكد حيًا: clipboard حقيقي (قرأنا الرابط من الحافظة)، 0 شبكة أثناء النسخ، جهاز نظيف = لا كشف (privacy local-only).

---

## الجولة 16 — Phase 6/Item 2: وضع القراءة + تصدير Markdown/PDF

| البند | النتيجة |
|---|---|
| Read Mode (دخول/خروج/عرض/بلا شبكة/بلا تغيير بيانات) | ✅ (حي 17/17) |
| Markdown export (E-1..E-12) | ✅ 12/12 |
| PDF export (طباعة المتصفح + CSS) | ✅ (حي) |
| npm test (13+1 ملفات، خادم جديد) | ✅ **136/136** |
| lint / typecheck / build | ✅ 0/0 · نظيف · ✓ |
| تحقق حي (verify-item2.mjs — متصفح حقيقي) | ✅ **17/17** |
| Security/Privacy Gate | ✅ (لا شبكة/لا تسجيل/لا أسرار في مسار التصدير) |
| Dependency Review | ✅ **NO NEW DEPENDENCY** |

### ما أُنجز
- `lib/export.ts` (جديد): `conversationToMarkdown` (ترتيب + أدوار عربية + محتوى حرفي) · `sanitizeFileName`/`exportFileName` · `downloadMarkdown` (Blob محلي) · `printConversation` (window.print) — كلها بلا شبكة/أسرار.
- `app/components/ReadMode.tsx` (جديد): يعيد استخدام `Markdown` الموجود؛ رأس بعنوان + أزرار Markdown/PDF/عودة؛ حاوية `print-area` للطباعة.
- `app/page.tsx`: زر 📖 في الرأس (ظاهر عند محادثة نشطة) + استبدال منطقة الرسائل بصريًا + إخفاء الإدخال + خروج تلقائي عند تبديل المحادثة.
- `app/globals.css`: `@media print` (فاتح/داكن واضح؛ يخفي `.no-print`؛ يبرز `.print-area`).
- `lib/i18n.ts`: `readMode` (ar/en).
- إصلاح: تأخير `a.remove()` في التنزيل لتسجيل اسم الملف.

---

## الجولة 15 — ربط Phase 1 (Zod → React Query → Zustand) + Final Gate

| البند | النتيجة |
|---|---|
| Zod في `/api/chat` (parseChatBody متساهلة) | ✅ V-7..V-10 (10/10) |
| React Query (providers.tsx + useQuery /api/status) | ✅ Q-1..Q-5 |
| Zustand Toasts (Toasts.tsx + نسخ الكود) | ✅ Z-1..Z-6 |
| npm test (13 ملفًا، خادم جديد) | ✅ **124/124** |
| lint / typecheck / build | ✅ 0/0 · نظيف · ✓ 6/6 |
| تحقق حي (verify-gate.mjs) | ✅ **8/8** (صفحة/status/chat SSE/تسامح zod/400/PBYOK) |
| DEPENDENCY-REVIEW.md | ✅ أُنشئ (تصنيفات CORE/OPT/DEV/REMOVE) |

### ما أُنجز في الربط
- `parseChatBody` في `lib/validation.ts`: تسوية zod متساهلة تحافظ على السلوك القديم حرفيًا
  (30 رسالة تمر، temp=99 يمر للتثبيت، رسائل شاذة تُفلتر فرديًا، files تُترك لـ mergeAttachments).
- `app/api/chat/route.ts`: لا refactor — الفحوصات القائمة (413/400/mergeAttachments/محارف التحكم/slice(-12)) لم تُلمس.
- `app/providers.tsx` (جديد) يلفّ التطبيق في `layout.tsx`؛ `useQuery` لـ /api/status ببديل initialData (نفس سلوك catch القديم).
- `app/components/Toasts.tsx` (جديد) مقرا من `useUiStore`؛ `pushToast` عند نسخ الكود ونجاح/فشل النسخ.

---

## الجولة 13 — PWA (المرحلة 6/1)

| الإصدار | قبل | بعد |
|---|---|---|
| `npm test` | 85/85 | **88/88** |

- `app/manifest.webmanifest`: RTL، ألوان، `display:standalone`، أيقونات 192/512 + maskable.
- `public/sw.js` (nawah-v1): caching للصفحة/الأصول، skipWaiting، offline fallback.
- `app/layout.tsx`: تسجيل SW + وسوم iOS (apple-touch-icon/status-bar).
- أيقونات RGBA مولّدة (شعار نواة ذرّة) بأحجام 180/192/512.
- 3 اختبارات API جديدة (manifest/sw/أيقونات) — كلها ✅.

---

## الجولات السابقة (ملخص)

| الجولة | النتيجة | أبرز ما حُقق |
|---|---|---|
| 12 | 85/85 | تذكّر المحادثة (يولّد ملخصات) + اختبارات summary |
| 11 | — | إصلاح نظام رفع الصور + اختبارات image (HTMX) |
| 10 | 80/85 | كود يحاكي 5.4 |
| 9 | 80/85 | قاعدة تكامل الملفات (غير مستخدمة) |
| 6 | 80/85 | ملخصات + تثبيت أخطاء نوعية |
| 7 | 74/85 | نظام التصعيد |
| 6 | 64/85 | نظام توحيد خطأ |
| 5 | 55/85 | المؤثرات |
| 4 | 42/85 | الأنواع |
| 3 | 42/85 | النوع الحرفي |
| 2 | 10/85 | كود أساسي |
| 1 | 15/85 | اختبار API |
