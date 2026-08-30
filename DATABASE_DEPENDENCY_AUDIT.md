# DATABASE DEPENDENCY AUDIT — نواة AI (2026-08-30)

> **الخلاصة:** النظام **لا يستخدم Drizzle اليوم** — طبقة قاعدة البيانات SQL خام فوق `@neondatabase/serverless` (Driver Neon HTTP الرسمي، مثبت أصلًا). أُضيف `drizzle-orm` **لطبقة schema المطبوعة فقط** — بلا أي تغيير تشغيلي، بلا تغيير schema، بلا تغيير migration strategy.

## الواقع الحالي
| الجدول | الملف | الإنشاء |
|---|---|---|
| `nahwa_sync` | `lib/storage-neon.ts` | `CREATE TABLE IF NOT EXISTS` عند أول استخدام |
| `nahwa_users` | `lib/auth-db.ts` | `CREATE TABLE IF NOT EXISTS` + `ALTER … ADD COLUMN IF NOT EXISTS` idempotent |
| `nahwa_auth_identities` | `lib/auth-db.ts` | `CREATE TABLE IF NOT EXISTS` + فهرس + قيد UNIQUE |

- **Driver:** `@neondatabase/serverless` (HTTP) — هو **السائق المناسب حصريًا** لقاعدة البيانات الحالية (Neon serverless). موجود أصلًا. ✅
- **ORM:** لا يوجد (لا Drizzle، لا Prisma). الاستعلامات موضعية وقابلة للفهم، وفصل `storage.ts` (واجهة) → `storage-neon.ts` (تنفيذ) موجود.

## القرار (موثق)
1. **يُضاف:** `drizzle-orm@0.45` — تعريف schema مطبع (pgTable) **مطابق حرفيًا** للجداول الثلاثة في `lib/db/schema.ts`.
2. **لا يُضاف:** أي سائق جديد (السائق المناسب موجود).
3. **لا يُغيّر:** قاعدة البيانات، المخطط، migration strategy (تبقى `CREATE TABLE IF NOT EXISTS`)، ولا أي استعلام قائم.
4. **القيمة:** مصدر حقيقة مطبع واحد + اختبار تطابق (D-1..D-4) يقبض أي انحراف مستقبلي في تعريف الجداول + أساس جاهز لأي ترحيل Drizzle لاحق.

## لماذا ليس Prisma / Drizzle كطبقة تنفيذ الآن؟
- قاعدة «لا هدم» و«التغييرات التدريجية»: استبدال الطبقة السحابية المثبتة حيًا (مزامنة أجهزة + حسابات) بأداة جديدة = خروج صريح عن نطاق هذه المهمة («عدم تغيير قاعدة البيانات الحالية أو migration strategy إلا إذا كان مطلوبًا صراحة»).
- اختبارات الهوية/السباق مثبتة على SQL الحالي؛ إعادة الكتابة تعيد فتح مخاطر بلا عائد مطلوب.

## الملخص
```text
drizzle-orm        : ADDED (schema layer only, 3 tables, tested D-1..D-4)
driver (Neon)      : ALREADY PRESENT — @neondatabase/serverless (no change)
migration strategy : UNCHANGED (CREATE TABLE IF NOT EXISTS)
runtime queries    : UNCHANGED (raw SQL remains the execution path)
```
