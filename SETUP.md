# Setup — full-login version

This branch adds real sign-in (magic link, no passwords) and per-user progress
that follows someone across days and devices, plus an email sent automatically
when they finish all 11 modules. Everything below is free at this scale.

Stack: **GitHub Pages** (hosting, already set up) + **Supabase** (auth + database +
edge function, free tier) + **Resend** (transactional email, free tier).

## 1. Create a Supabase project
1. Go to supabase.com and create a free account and a new project.
2. In the project dashboard, go to **Project Settings → API**. Copy the
   **Project URL** and the **anon public** key (not the service_role key).
3. Open `copilot-course.html` in this repo and replace the two placeholder
   constants near the top of the `<script>` block:
   ```js
   const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
   const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
   ```
   Both are safe to expose in client-side code — the anon key only grants what
   your row-level security policies allow (see step 2).

## 2. Create the database table
1. In Supabase, open the **SQL Editor**.
2. Paste in the contents of `supabase/schema.sql` and run it. This creates
   the `progress` table and locks it down so each signed-in user can only
   read and write their own row.

## 3. Turn on email sign-in
1. Go to **Authentication → Providers** and confirm **Email** is enabled.
2. Go to **Authentication → URL Configuration** and add your GitHub Pages
   URL (e.g. `https://michaelkmorrison.github.io/Copilot-Premium-Executive-Playbook/copilot-course.html`)
   to **Redirect URLs**. Without this, the magic link won't return people to
   the right page.
3. Optional: under **Authentication → Email Templates**, customize the
   "Magic Link" template to match your voice.

## 4. Set up the thank-you email (Resend)
1. Create a free account at resend.com and verify a sending domain (or use
   their shared test domain to start).
2. Copy your Resend **API key**.
3. Install the Supabase CLI locally, then from this repo folder:
   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase secrets set RESEND_API_KEY=your_resend_key
   supabase secrets set THANK_YOU_FROM_EMAIL="you@yourdomain.com"
   supabase functions deploy send-thank-you
   ```
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically
   to edge functions — you don't need to set those yourself.

## 5. Publish
Commit and push your edited `copilot-course.html`, then confirm GitHub Pages
is serving this branch (or merge into whichever branch Pages is configured
to deploy from).

## How it works
- Sign-in is passwordless: someone enters their email, gets a one-time link,
  and Supabase creates their account automatically on first use.
- Progress is stored per user in the `progress` table and reloaded on every
  visit, so finishing the course over several days — even from a different
  device — works out of the box.
- When someone completes all 11 modules, the page calls the `send-thank-you`
  edge function, which checks they haven't already been thanked, sends the
  email via Resend, and marks them as thanked so it only ever sends once.

## Costs at this scale
- Supabase free tier: 50,000 monthly active users, 500MB database — far more
  than a single course needs.
- Resend free tier: 3,000 emails/month, 100/day — plenty for completions.
- GitHub Pages: free.

## A note on security
The edge function checks a real Supabase auth token before sending anything,
so it can't be triggered by just anyone hitting the URL — only a signed-in
user who has actually completed the course. Row-level security on the
`progress` table means no user can read or edit another user's row, even
though the anon key is public.
