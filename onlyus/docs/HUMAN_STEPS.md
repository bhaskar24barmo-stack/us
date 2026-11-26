# ONLYUS — Human Setup Steps (Click-by-Click Guide)

Everything in this file requires your own accounts, secrets, or manual clicks. Follow these steps in order.

---

## 1. Supabase Project & Database Setup
*(Already linked to project `kxnmyfikfozlnlurdmgu`, kept here for reference or fresh setup)*
1. Go to https://supabase.com/dashboard and open your **ONLYUS** project.
2. Copy **Project URL** and **anon public key** from **Settings → API** into `onlyus/.env` (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
3. Enable extensions in **Database → Extensions**: search and enable `pg_cron` and `pg_net`.
4. Confirm the `private-media` bucket exists in **Storage** with **Public bucket = OFF**.
5. Set Edge Function secrets via CLI or Dashboard (**Edge Functions → Manage Secrets**):
   - `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (e.g. `mailto:you@example.com`)
   - `FCM_SERVICE_ACCOUNT_JSON` (from Step 4 below)
   - `TURN_URLS` and `TURN_SHARED_SECRET` (from Step 5 below)

---

## 2. Supabase Auth Settings
1. In Supabase Dashboard → **Authentication → Providers → Email**:
   - Ensure **Confirm email** matches your preference and **Allow new users to sign up** is **OFF** (invite-only).
2. Go to **Authentication → URL Configuration**:
   - **Site URL:** `https://onlyus-nu.vercel.app`
   - **Redirect URLs:** add `https://onlyus-nu.vercel.app/**` and `http://localhost:5173/**`.
3. Go to **Authentication → Policies / Password**: set minimum password length to **12**.
4. *(Recommended)* Configure **Custom SMTP** (e.g. Resend or Brevo) under **Authentication → SMTP Settings** so password-reset emails deliver reliably.

---

## 3. Provisioning the Two Approved Partners
1. Open **SQL Editor** in Supabase and ensure both partner emails are in `approved_users` (at most 2 rows):
   ```sql
   insert into public.approved_users (email) values
     ('gnbhaskar636@gmail.com'),
     ('mamathakp9481@gmail.com')
   on conflict (email) do nothing;
   ```
2. Go to **Authentication → Users → Add user → Create new user** for both emails with strong passwords (12+ chars).

---

## 4. Web Push (VAPID Keys) & Firebase (Android FCM)
1. **Generate VAPID keys** (run once in any terminal):
   ```bash
   npx web-push generate-vapid-keys
   ```
   Save `Public Key` as `VITE_VAPID_PUBLIC_KEY` (Vercel + `.env`) and both keys as `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in Supabase Secrets.
2. **Create Firebase Project (for Android Push Notifications):**
   - Go to https://console.firebase.google.com → **Add project** → name it `ONLYUS`.
   - Click the **Android** icon (`Add app`):
     - Android package name: `com.onlyus.app`
     - App nickname: `ONLYUS`
   - Download `google-services.json` and place it in `onlyus/android/app/google-services.json` (do NOT commit it to git).
   - In Firebase Console → **Project Settings → Service Accounts** → click **Generate new private key**.
   - Paste the downloaded JSON as the `FCM_SERVICE_ACCOUNT_JSON` secret in Supabase.

---

## 5. TURN Server Setup (for Calls over Mobile Data)
1. Create a free account on **Metered.ca** (or Cloudflare Calls TURN / self-hosted `coturn`).
2. Copy your TURN URLs (e.g. `turn:global.turn.metered.ca:80,turns:global.turn.metered.ca:443`) into `TURN_URLS` and your secret into `TURN_SHARED_SECRET` in Supabase Edge Function Secrets.

---

## 6. Vercel Deployment & Environment Variables
1. Open https://vercel.com → your `onlyus` project → **Settings → Environment Variables**.
2. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY`
   - *(Optional)* `VITE_LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
3. Redeploy Production (`vercel deploy --prod --yes`).

---

## 7. Android Build Tools & Release Keystore (for Signed APK)
1. **If building locally on Windows:**
   - Install **JDK 17** (Eclipse Temurin 17) and **Android Studio** (with Android SDK Platform 34/35 + Build Tools), then set `ANDROID_HOME` and `JAVA_HOME`.
2. **Create your Release Keystore** (run once, back it up safely — losing it prevents future APK updates over existing installs):
   ```bash
   keytool -genkey -v -keystore release.keystore -alias onlyus -keyalg RSA -keysize 2048 -validity 10000
   ```
3. **For GitHub Actions Automated APK Builds:**
   In your GitHub repository → **Settings → Secrets and variables → Actions**, add:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`
   - `ONLYUS_KEYSTORE_BASE64` (base64 of `release.keystore`)
   - `ONLYUS_KEYSTORE_PASSWORD`, `ONLYUS_KEY_ALIAS`, `ONLYUS_KEY_PASSWORD`
   - `GOOGLE_SERVICES_JSON_BASE64` (base64 of `google-services.json`)

---

## 8. Building & Sharing the APK
1. Push a version tag (`git tag v1.0.0 && git push origin v1.0.0`) to trigger `.github/workflows/android-apk.yml`.
2. Open **GitHub → Releases → v1.0.0** and share the `ONLYUS-v1.0.0.apk` download link with your partner (see `docs/INSTALL_ANDROID.md`).

---

## Phase Gates Checklist
- **Before Phase 6 live TURN test:** Complete Step 5 (`TURN_URLS` / `TURN_SHARED_SECRET`).
- **Before Phase 7 live push test:** Complete Step 4 (VAPID keys + Firebase `FCM_SERVICE_ACCOUNT_JSON`).
- **Before Phase 11 signed APK release:** Complete Steps 7 & 8 (Keystore + `google-services.json` + GitHub Secrets).
