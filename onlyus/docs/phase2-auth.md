# Phase 2: Auth setup
1. Dashboard > Authentication > Providers: keep Email on, turn OFF "Allow new users to sign up".
2. Authentication > URL Configuration: Site URL = your Vercel URL; add `<your-url>/reset` and `http://localhost:5173/reset` to Redirect URLs.
3. Authentication > Password: minimum length 12; enable leaked-password protection if your plan offers it.
4. Run migrations (`supabase db push`), seed approved_users, create both users, then run `supabase/tests/rls_test.sql`.
5. SMTP: the built-in mailer is heavily rate limited; add your own SMTP (Resend/Brevo) for reliable reset emails.
