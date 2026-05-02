# حسابات المبنى — Hisabat

نظام بسيط لإدارة مدفوعات الجيران ومصروفات المبنى الشهرية، مع تقارير PDF بالعربي.

## المزايا

- إدارة قائمة الجيران (مع مبلغ شهري مختلف لكل جار)
- تسجيل المدفوعات الشهرية مع إمكانية إرفاق إيصال (صورة/PDF)
- تسجيل المصروفات بتصنيفات مع إيصالات
- لوحة رئيسية بنظرة شاملة + رسم بياني آخر 6 أشهر
- تصدير تقرير PDF شهري كامل بالعربي (RTL)
- تسجيل دخول بمستخدم واحد (admin)
- تصميم متجاوب يعمل على الجوال والكمبيوتر

## التقنيات

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** + خط Cairo العربي
- **Drizzle ORM** + **Neon Postgres** (Serverless)
- **Vercel Blob** للإيصالات (مع fallback محلي للتطوير)
- **@react-pdf/renderer** للتقارير PDF
- **Recharts** للرسوم البيانية

---

## الإعداد محلياً

### 1. أنشئ مشروع Neon

1. اذهب إلى [neon.tech](https://neon.tech) وسجّل دخول.
2. **Create project** → اختر اسم وregion (مثلاً `us-east-1`).
3. من الـ Dashboard اضغط **Connect**.
4. تأكد إن **Connection pooling** مُفعّل (للأداء على Vercel).
5. اضغط **Show password** ثم انسخ الـ Connection string.

### 2. عدّل `.env.local`

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Vercel Blob (للإيصالات) — اتركه فاضي للتطوير المحلي
BLOB_READ_WRITE_TOKEN=

# Auth — أنشئ واحد عشوائي
AUTH_SECRET=<openssl rand -base64 32>
```

### 3. ثبّت الحزم وأنشئ الجداول

```bash
npm install
npm run db:push      # ينشئ كل الجداول في Neon
npm run db:seed      # ينشئ المستخدم admin
npm run db:seed-demo # (اختياري) بيانات تجريبية
```

### 4. شغّل

```bash
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000) → سجّل دخول بـ `admin / admin` → غيّر كلمة السر فوراً من **الإعدادات**.

---

## النشر على Vercel

### 1. (اختياري) أنشئ Vercel Blob للإيصالات

من Vercel Dashboard → اختر مشروعك (أو أنشئ جديد) → **Storage** → **Create** → **Blob** → **Connect**. انسخ الـ `BLOB_READ_WRITE_TOKEN`.

> بدون Vercel Blob، رفع الإيصالات لن يعمل في الإنتاج (الـ filesystem على Vercel مؤقت).

### 2. ارفع المشروع على GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/hisabat.git
git push -u origin main
```

### 3. على [vercel.com/new](https://vercel.com/new)

- اختر المستودع
- أضف متغيرات البيئة:

| المتغير | القيمة |
|---------|--------|
| `DATABASE_URL` | سلسلة Neon (نفس اللي في `.env.local`) |
| `BLOB_READ_WRITE_TOKEN` | توكن Vercel Blob |
| `AUTH_SECRET` | سلسلة عشوائية طويلة (32+ حرف) — `openssl rand -base64 32` |

اضغط **Deploy**.

> **مهم**: استخدم سلسلة Neon اللي تحتوي `-pooler` في الـ hostname (Connection pooling) — هذا اللي يشتغل بكفاءة مع Vercel serverless.

---

## أوامر مفيدة

```bash
npm run dev              # تشغيل التطوير
npm run build            # بناء للإنتاج
npm run start            # تشغيل البناء الإنتاجي محلياً
npm run db:push          # تطبيق schema على Neon
npm run db:studio        # واجهة لاستعراض القاعدة (Drizzle Studio)
npm run db:generate      # إنشاء ملفات migration
npm run db:seed          # إنشاء مستخدم admin افتراضي
npm run db:seed-demo     # إضافة بيانات تجريبية
```

---

## الهيكل

```
hisabat/
├── app/
│   ├── (app)/                ← الصفحات المحمية (تتطلب دخول)
│   │   ├── layout.tsx
│   │   ├── page.tsx           ← الداشبورد
│   │   ├── neighbors/
│   │   ├── payments/
│   │   ├── expenses/
│   │   ├── reports/
│   │   └── settings/
│   ├── login/page.tsx
│   ├── api/                   ← API routes
│   └── layout.tsx             ← Root layout (RTL + Cairo)
├── components/
│   ├── ui/                    ← مكونات الواجهة
│   ├── app-shell.tsx          ← الـ Sidebar والـ Header
│   └── month-picker.tsx
├── lib/
│   ├── db/                    ← Drizzle schema + Postgres client
│   ├── pdf/                   ← مولّد PDF + خط Cairo
│   ├── auth.ts                ← JWT + bcrypt
│   ├── storage.ts             ← Vercel Blob (مع fallback محلي)
│   └── utils.ts
├── proxy.ts                   ← حماية المسارات
└── scripts/
    ├── seed.ts                ← إنشاء admin
    └── seed-demo.ts           ← بيانات تجريبية
```

---

## ملاحظات

- **Next.js 16**: نستخدم `proxy.ts` بدل `middleware.ts` (الأخير deprecated)
- **PDF بالعربي**: نستخدم خط Cairo TTF محلياً من `lib/pdf/fonts/` لضمان عمل التشكيل العربي على Vercel
- **النسخ الاحتياطي**: Neon يعمل نسخ احتياطية تلقائية (Point-in-time recovery) لمدة 24 ساعة في الفري تير
- **Storage Fallback**: لو لم تعيّن `BLOB_READ_WRITE_TOKEN`، النظام يخزّن الإيصالات محلياً في `public/uploads/` (للتطوير فقط — لا يعمل على Vercel)
