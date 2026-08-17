# جمعية جسور — النقل المدرسي

نسخة أولى MVP لمنصة تسجيل وتدبير المستفيدين.

## 1) المتطلبات
- Node.js 20+
- مشروع Supabase
- حساب Admin داخل Supabase Authentication

## 2) تثبيت
```bash
npm install
cp .env.example .env.local
```

ضع داخل `.env.local`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## 3) قاعدة البيانات
في Supabase → SQL Editor:
1. افتح `supabase/schema.sql`
2. شغّل الكود كاملاً.

بعدها أنشئ مستخدم الإدارة من:
Authentication → Users → Add user

ثم خذ UUID ديالو وشغل:
```sql
insert into public.admin_users(user_id)
values ('UUID-DIAL-ADMIN');
```

## 4) التشغيل
```bash
npm run dev
```

ثم:
- التسجيل: `/inscription`
- الإدارة: `/admin/login`

## 5) الطبع
الملفات:
- `public/templates/guardian-commitment.jpg`
- `public/templates/beneficiary-registration.jpg`

النظام يستعمل الورقتين كخلفية A4 ويضع البيانات فوقهما.

**مهم:** أول طباعة تجريبية على ورقة حقيقية قد تحتاج تعديل إحداثيات النص في:
`src/lib/pdf.ts`

القسم:
```ts
/* Calibration zone */
```

يمكن تعديل `right` و`top` لكل حقل حتى تتطابق الكتابة 100% مع الخانات.

## 6) ملاحظة أمنية
الـ MVP يستعمل RPC آمن للتسجيل حتى لا يحتاج الزائر إلى صلاحية قراءة قاعدة البيانات. الإدارة فقط تقرأ وتعدل وتحذف بعد تسجيل الدخول وإضافتها إلى `admin_users`.

قبل الإطلاق العمومي، يُنصح بإضافة:
- CAPTCHA / Turnstile
- rate limiting
- audit log
- سياسة احتفاظ بالبيانات
- صفحة الخصوصية والموافقة
- منع التكرار بقواعد أكثر صرامة حسب سياسة الجمعية.
