# PRE-DEPENDENCY AUDIT — نواة AI (2026-08-30)

> فحص أولي إلزامي قبل إضافة أي مكتبة — النتيجة: **لا تعارض جزئي؛ ثلاثة بنود مطلوبة فعلًا، والباقي مغطى أصلًا.**

## Current Stack
| المكوّن | الموجود |
|---|---|
| Framework | Next.js **15.5.24** (`^15.3.0`) — App Router + React 19.2.8 |
| Language | TypeScript **5.9.3** — strict، `noEmit`، `moduleResolution: bundler` |
| Styling | Tailwind CSS 4 (postcss) + globals.css |
| Unit tests | **node:test** عبر `tsx` (أصلي — لا JSX/DOM مطلوب) — 8 ملفات، 88 اختبارًا |
| E2E (حاليًا) | Playwright-core مثبت خارج المشروع (`/home/user/node_modules`) — سكربتات تحقق يدوية |
| Lint/Format | **غير موجود إطلاقًا** (لا eslint، لا prettier، لا سكربت lint) |
| Database | Neon Postgres عبر `@neondatabase/serverless` — SQL خام (لا ORM، لا migrations) |
| Auth | Auth.js v5 beta (بريد + Google/GitHub OAuth) + طبقة هوية AUTH HARDENED |
| CI | GitHub Actions (npm ci → typecheck → build → npm test ضد خادم إنتاج) |
| Vercel | `vercel.json`: framework nextjs + maxDuration 60 لـ`/api/chat` |

## Existing Dependencies (مُدققة واحدة واحدة — لا إعادة تثبيت)
- `next` / `react` / `react-dom` / `typescript` / `tsx` / `tailwindcss` / `postcss`
- `@neondatabase/serverless` — **هو الـ Driver المناسب لقاعدة البيانات الحالية (Neon HTTP)**
- `react-markdown@9` + `remark-gfm@4` + `rehype-highlight@7` — **تغطي Phase 3 كاملة** (GFM + syntax highlighting)
- `highlight.js` (خلف rehype-highlight) / `lucide-react` (أيقونات) / `pdf-parse` + `mammoth` + `jszip` + `pdfkit` (قراءة/كتابة ملفات)
- `next-auth` + `@neondatabase/serverless` (الطبقة السحابية)

## Missing Dependencies (المطلوب فعليًا)
| الحزمة | السبب | Phase |
|---|---|---|
| `zod` | تحقق البيانات (لا يوجد أي تحقق schema-ي اليوم؛ اليدوي قابل للخطأ) | 1 |
| `zustand` | حالة عميل (لا توجد مكتبة حالة مركزيّة اليوم) | 1 |
| `@tanstack/react-query` | حالة خادم/كاش (لا يوجد إطار fetching مركزي) | 1 |
| `drizzle-orm` | طبقة schema مطبوعة فوق Neon الحالي (السائق موجود أصلًا) | 2 |
| `@playwright/test` + `eslint`/`eslint-config-next` | E2E رسمي في المستودع + سدّ غياب Lint (المطلوب في Gate) | 6/7 |

## Version Conflicts
- **لا تعارضات مسجّلة**: React 19.2.8 متوافق مع zustand 5 / react-query 5 / zod 4؛ Next 15.5 متوافق مع eslint-config-next 15.
- القرار: تثبيت `zod@4` و`zustand@5` و`@tanstack/react-query@5` (أحدث مستقرة) — لا ترقية لأي حزمة قائمة (ممنوع).

## Vercel Compatibility Risks
- منخفض. كل الحزم الجديدة تعمل في الحافة (Node 20 runtime). لا خدمات خارجية جديدة إطلاقًا.
- `drizzle-orm` تُستخدم فقط كطبقة تعريف schema (بلا عميل HTTP جديد) — لم تُغيّر قاعدة البيانات ولا migration strategy.

## GitHub/CI Compatibility Risks
- منخفض. `npm ci` يعمل مع lockfile محدث. سيُضاف: سكربت `lint` في CI + وظيفة `e2e` منفصلة (chromium فقط).
- لا تُضاف vitest (سيكون نسخة ثانية من framework الاختبار — ممنوع؛ node:test هو الموجود).

## Proposed Install Plan
```text
npm i zod zustand @tanstack/react-query drizzle-orm
npm i -D @playwright/test eslint eslint-config-next
```
- لا حزم مدفوعة · لا خدمات خارجية · لا SDK لمزود ذكاء اصطناعي جديد (ممنوع) · لا LangChain (ممنوع).

## Security Notes (Phase 3/4)
- لا `rehype-raw` ولا `dangerouslySetInnerHTML` في المشروع كله → **لا حقن HTML مفتوح** (react-markdown يفلتر HTML خام افتراضيًا) ✅
- الصوت: Web Speech API فقط (لا API Key، لا خدمة خارجية، لا افتراض عمل Offline) ✅
