# ONLYUS — Release & Deployment Guide

## 1. Web PWA (Vercel)
- Build command: `npm run build`
- Output directory: `dist`
- Deploy command: `vercel deploy --prod --yes`
- Security headers & SPA rewrites: configured in `vercel.json`.

## 2. Android Signed APK (Capacitor 6)
### Keystore Warning
**Back up `release.keystore` in a secure password manager or encrypted drive.**
If you lose `release.keystore`, future versions of ONLYUS cannot be installed as updates over existing installs on your phones.

### Automated Release via GitHub Actions
1. Ensure GitHub Secrets are set (see `docs/HUMAN_STEPS.md`).
2. Tag and push a release:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. `.github/workflows/android-apk.yml` builds the signed APK (`ONLYUS-v1.0.0.apk`), computes its SHA-256 checksum, and attaches both to the GitHub Release.
4. Update `public/version.json` with the new `versionCode` and `apkUrl` so existing installs see the in-app update prompt.
