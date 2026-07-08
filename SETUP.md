# DocManager — Setup Guide

## Prerequisites
- Node.js 20.9+
- A Supabase account (free tier works)
- An OpenAI API key (optional — system works with mock extraction if not provided)

---

## Step 1: Supabase Project Setup

1. Go to https://supabase.com and create a new project.
2. Wait for the project to be ready.
3. Navigate to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Step 2: Database Schema

1. In your Supabase project, go to **SQL Editor**.
2. Paste the contents of `supabase/schema.sql` and run it.
3. This creates: `profiles`, `documents`, `approval_steps` tables + all RLS policies + triggers.

---

## Step 3: Storage Bucket

1. Go to **Storage** in Supabase.
2. Click **New bucket**, name it `documents`.
3. Set it as **Private** (not public).
4. The storage RLS policies are already created by the schema SQL.

---

## Step 4: Environment Variables

Edit `.env.local` with your actual values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: for real AI extraction
OPENAI_API_KEY=sk-...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 5: Email Confirmation (for local testing)

To bypass email confirmation during testing:
1. Go to Supabase Dashboard → **Authentication → Providers → Email**.
2. Disable "Confirm email" (for development only).

---

## Step 6: Run the Application

```bash
npm run dev
```

Visit http://localhost:3000

---

## Step 7: Create the First Admin

1. Register a new account at `/register`.
2. In Supabase → **Table Editor → profiles**, find your user.
3. Change the `role` field to `admin`.
4. The admin can now manage all other users' roles from the Admin panel.

---

## Deploying to Production (Vercel)

1. Push this project to GitHub.
2. Import the repo on https://vercel.com.
3. Set all environment variables in Vercel project settings.
4. Update `NEXT_PUBLIC_APP_URL` to your production URL.
5. In Supabase → **Authentication → URL Configuration**, add your Vercel URL to **Redirect URLs**.

---

## Features Overview

| Feature | Description |
|---------|-------------|
| Authentication | Email/password with Supabase Auth, forgot password |
| Role-based access | Admin, Approver, Uploader, Viewer |
| Document upload | PDF, CSV, JPG, PNG, WebP — up to 20MB |
| AI extraction | Auto-extracts vendor, date, amount, VAT, invoice number |
| Duplicate detection | Invoice number + vendor/amount matching |
| 3-step workflow | Reviewer → Manager → Finance/Admin |
| Reports | Charts, vendor analysis, monthly trend, status breakdown |
| AI insights | Spending trends, anomalies, duplicate risk |
| Export | PDF and Excel report downloads |
