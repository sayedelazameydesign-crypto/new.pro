# CR-005 — Evidence Report (على قالب EVIDENCE_REPORT_TEMPLATE)

## تعريف التنفيذ

| الحقل | القيمة |
|---|---|
| CR-ID | CR-005 — تحسينات الواجهة (Item 5) |
| Baseline | `NAWAH-AUTH-BASELINE` (`289c7f5`) |
| Reference Commit | `38d9bb3` |
| Execution Branch | `cr/item-5-improvements` |
| Executor | Controlled Engineering Executor (Arena Agent Mode) |
| Date | 2026-08-30 |

## الأدلة

| البند | الحالة | المرجع أو التفاصيل |
|---|---|---|
| Baseline Evidence | **Pass** | شجرة نظيفة عند البدء؛ HEAD = origin/main = `38d9bb3`؛ 148/148 + 15/15 قبل التعديل |
| Impact Analysis | **Pass** | PHASE6-ITEM5-CR.md §4–§5 (Scope/Out-of-scope/Impact) |
| Changed Files | **Pass** | 5 ملفات جديدة + 3 معدلة (انظر الأسفل) — صفر على المناطق المحمية |
| Tests Added | **Pass** | K-1..K-6 (shortcuts) · A-1..A-9 (attach-utils) · I-1..I-4 (E2E) |
| Tests Executed | **Pass** | `npm test` (خادم 3000 طبيعي، rate-limit مفعّل) · `npx playwright test` (webServer 3100) · lint · typecheck · build |
| Test Results | **Pass** | Unit/Integration **163/163** · E2E **19/19** · lint **0/0** · typecheck نظيف · build ✓ |
| Migration Verification | **N/A** | لا مخطط/ترحيل — إثبات: لا تغيير في `lib/db/*` أو `db/` |
| Security Review | **Pass** | git grep بلا أسرار؛ لا بيانات حقيقية في الاختبارات؛ تعزيز allowlist قبل FileReader؛ لا auth/صلاحيات جديدة |
| Contract Review | **Pass** | لا تغيير في `/api/*`، `lib/validation.ts`، `lib/share.ts`، `lib/export.ts` — النطاق UI/منطق نقي فقط |
| Git Commit | **Pass** | commit واحد على الفرع (انظر السجل) |
| Pull Request | **Pass** | PR #1 — دُمج في `d8d0d9e` بعد موافقة المالك (2026-08-30) |
| Final Approval | **Pass** | موافقة المالك الصريحة («التأكد من نشر أحدث الأكواد») — الدمج تم + CI success + تحقق حي 4/4 |

## الملفات والتغييرات

- `lib/shortcuts.ts` **(جديد)** — الاختصار المعتمد الوحيد (نقي).
- `lib/attach-utils.ts` **(جديد)** — تصنيف المرفقات (نقي؛ allowlist/1MB/3 ملفات).
- `tests/shortcuts.test.ts` **(جديد)** — K-1..K-6.
- `tests/attach-utils.test.ts` **(جديد)** — A-1..A-9.
- `tests/e2e/improvements.spec.ts` **(جديد)** — I-1..I-4.
- `app/page.tsx` — موحّد مسار المرفقات + drag/drop + اختصار + زر ملء الشاشة + `fullscreenchange` + `data-fs` (hydration-safe).
- `lib/i18n.ts` — 4 مفاتيح جديدة × لغتين + تحديث `composerHint` (إضافة بند).
- `package.json` — سكربت `test` فقط (لا dependency: package-lock.json بلا تغيير).
- `PHASE6-ITEM5-CR.md` / `PHASE6-ITEM5-AUDIT.md` / `PHASE6-ITEM5-EVIDENCE.md` / `PHASE6-ITEM5-CHECKPOINT.md` — حوكمة.

## الاختبارات

```text
الأمر:   npm test                      (خادم محلي next start على 3000 — بلا RATE_LIMIT_DISABLED؛
                                       عدّاد 429 ضمن النافذة — الاختبار العالمي يفحص 429 نفسه)
النتيجة: 163/163 ✅  (148 سابقة + K 6 + A 9)
الأمر:   npx playwright test           (webServer 3100 مع RATE_LIMIT_DISABLED=1 — بيئة اختبار فقط)
النتيجة: 19/19 ✅  (15 سابقة + I-1..I-4)
الأمر:   npm run lint                  → 0/0 ✅
الأمر:   npx tsc --noEmit              → نظيف ✅
الأمر:   npm run build                 → ✓ (6/6 نمط المجموعات)
```

## المخاطر والقيود

- منصات بلا Fullscreen API (iPhone iOS) → الزر مختفٍ (موثق).
- الإفلات خارج الصندوق: سلوك المتصفح الافتراضي (خارج النطاق المعتمد).
- لا اختبار للبصريات (overlay أثناء السحب) — قرار مقصود لتفادي flaky؛ السلوك مغطى بالفعل الوظيفي I-2/I-3.

## قرار التنفيذ

- [x] جاهز للمراجعة.
- [ ] يحتاج إصلاحًا إضافيًا.
- [ ] متوقف بانتظار موافقة بشرية.
- [ ] مرفوض.

**قرار نهائي: COMPLETED — دُمج (`d8d0d9e`) · CI success · Vercel يُخدم Item 5 (4/4 علامات) · رابط: https://new-pro-kohl.vercel.app**
