# How to Set Up Smart Expense Tracker

Follow these steps to configure Supabase, run the Expo app locally, customize branding, and build Android/iOS binaries with EAS.

---

## 1. Prerequisites

- **Node.js 20+** and **npm**
- **Expo Go** on iOS or Android (for instant device testing), or Xcode / Android Studio for local simulators
- A **Supabase** account and project ([supabase.com/dashboard](https://supabase.com/dashboard))
- Optional for store builds: **EAS CLI** (`npm install -g eas-cli`)

---

## 2. Configure Supabase Database & Auth

1. Create a new project in the Supabase Dashboard.
2. Open **SQL Editor → New Query**, paste the full contents of `database/schema.sql`, and click **Run**.
3. *(Optional Demo Data)* Create a user in **Authentication → Users → Add user** (e.g., `demo@smartexpensetracker.app`), check **Auto Confirm User**, then run `database/seed.sql` in the SQL Editor.
4. Go to **Authentication → Providers** and confirm **Email** is enabled. Adjust **Confirm email** depending on whether you want instant login during development.
5. Go to **Project Settings → API** and copy:
   - **Project URL** (`https://YOUR_PROJECT.supabase.co`)
   - **`anon` / publishable key**

> **Security rule:** Never embed a `service_role` key inside `Expo APP/`. Only use the `anon` key; PostgreSQL Row Level Security protects all user rows.

---

## 3. Run the Expo App Locally

```bash
cd "Expo APP"
npm install
cp .env.example .env
```

Edit `Expo APP/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Start the Expo development server:

```bash
npx expo start
```

- Scan the QR code with **Expo Go** on Android or iOS.
- Press `a` for Android emulator, `i` for iOS simulator (macOS), or `w` for web preview.
- Run `npm run typecheck` anytime to verify TypeScript (`tsc --noEmit`).

---

## 4. Branding & Bundle Identifier Changes

Before publishing to Google Play or the Apple App Store, update `Expo APP/app.json`:

1. **`expo.name`** and **`expo.slug`**: Replace `"Smart Expense Tracker"` and `"smart-expense-tracker"` with your brand name.
2. **`expo.scheme`**: Update `"smartexpense"` to your custom URL scheme.
3. **`expo.ios.bundleIdentifier`**: Replace `"com.yourcompany.smartexpensetracker"` with your reverse-DNS identifier.
4. **`expo.android.package`**: Replace `"com.yourcompany.smartexpensetracker"` with your Android application ID.
5. **App Icons & Splash Screen**: Place `icon.png` (1024×1024), `adaptive-icon.png`, and `splash.png` under `Expo APP/assets/` and wire them in `app.json`.
6. **Color Palette**: Primary surfaces and accent tokens live in `Expo APP/src/components/UI.tsx` (`colors`).

---

## 5. Build Android & iOS Binaries with EAS

```bash
cd "Expo APP"
npm install -g eas-cli
eas login
eas build:configure
```

Update `expo.extra.eas.projectId` in `Expo APP/app.json` with your generated EAS Project ID, then run:

```bash
# Android APK / AAB
eas build --platform android

# iOS IPA (requires Apple Developer account)
eas build --platform ios

# Both platforms
eas build --platform all
```
