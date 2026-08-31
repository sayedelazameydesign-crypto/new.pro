# Deployment Handoff — nawah-ai (new.pro)

**English summary:** This repository deploys to Vercel team `celia-fashions-projects`
(projects: `new-pro`, `nawah-ai`). Pull request #13 adds three new capabilities that
require **three Production environment variables** before their features go live.
The repo owner does **not** hold Vercel dashboard access — whoever can open
`vercel.com/celia-fashions-projects` on that team is asked to add them.

---

## 1) ما المطلوب بالضبط (Production scope فقط)

| المتغير | القيمة | الغرض |
|---|---|---|
| `GITHUB_MODELS_TOKEN` | PAT جديد (`models:read` فقط) | مزود GitHub Models (دفعة D) |
| `IMAGE_GENERATION_ENABLED` | `1` | تفعيل مسار الصور (دفعة E) |
| `DATABASE_URL` | موجودة؟ يلزم التأكد أنها على **Production** وليس Preview فقط | عداد الحدود الموزع عبر Neon (دفعة F) |

**فحص سريع بعد الضبط:** `GET /api/status` يجب أن يضيف `github`, `breakers`,
`rateLimit` إلى الرد الحالي (`groq/gemini/huggingface/search`).

## 2) إنشاء PAT أقل صلاحية (دقيقتان)

1. GitHub → Settings → Developer settings → **Fine-grained personal access tokens**
2. Generate new → Repository access: اختيار مستودع `new.pro` **فقط**
3. الصلاحية: **Models → Read** (`models:read`) — لا `repo`، لا `workflow`، لا غيرهما
4. انتهاء صلاحية: 90 يومًا (قابلة للتجديد)
5. أنشئ التوكن في بيئة آمنة، وأدخله مباشرة في حقل `GITHUB_MODELS_TOKEN`

> **قاعدة صارمة:** التوكن يعرَض مرة واحدة عند الإنشاء — لا يُرسل في شات/بريد/تذكرة.

## 3) بروتوكول النشر (الترتيب مهم)

```
1. أضف المتغيرات على Production  ←  قبل أي دمج
2. قل «ادمج» للمالك هنا:
   https://github.com/sayedelazameydesign-crypto/new.pro/pull/13
3. الدمج يطلق نشرًا تلقائيًا يحمل الكود + المتغيرات معًا
4. افتح https://new-pro-kohl.vercel.app/api/status — تحقق من الحقول الجديدة
5. شغّل التحقق الآلي (Actions → Verify Live → Run workflow → mode=full)
```

- دمج PR آمن دائمًا (تدهور رشيق: بلا توكن يُتخطى مزود GitHub، والعلم 0 يخفي زر
  الصور، وفشل Neon يهبط للذاكرة) — لكن **V-1 لا تكتمل** إلا بالمتغيرات الثلاثة.
- إن أُضيفت المتغيرات بعد الدمج: Vercel → new-pro → Deployments → ⋯ → **Redeploy**.

## 4) ملاحظة تشغيلية

المستودع مربوط بمشروعين على نفس الفريق: `new-pro` و `nawah-ai` ⇒ كل push يطلق
نشرين. يُنصح بفصل أو حذف المشروع الزائد بعد التثبيت.

## 5) ملحق — دليل الحالة قبل التسليم (لأجل الشفافية)

- الإنتاج الحي (قبل الدمج): `main@429df9c`، و`/api/status` يعيد المزودين الأصليين فقط
- `vercel whoami` في بيئة مالك المستودع: logged out (قناة النشر عبر الويب فقط)
- هذا الملف جزء من فرع PR #13 — يُدمج معه تلقائيًا
