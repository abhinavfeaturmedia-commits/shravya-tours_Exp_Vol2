---
name: ZIP for Hostinger
description: Builds the React/Vite frontend, integrates it into backend/public/, and packages a monolithic deployment ZIP file (shravya-deploy.zip) for Hostinger Node.js hosting. Trigger when the user requests creating a deployment ZIP for Hostinger.
---

# ZIP for Hostinger

This skill provides step-by-step instructions and deterministic script invocation for packaging monolithic Node.js web applications (Express backend + React/Vite static frontend) into a Hostinger deployment ZIP.

## Triggering Condition
Activate this skill whenever the user explicitly requests to:
- "create zip for deployment for hostinger"
- "build deployment zip"
- "package app for hostinger"

> ⚠️ **CRITICAL RULE**: Only create deployment ZIPs when the user explicitly requests them.

---

## Monolithic Deployment Architecture

Hostinger Node.js applications expect `package.json` and `index.js` to sit directly at the root level of the uploaded ZIP file.

1. **Frontend Assets (`dist/`)**: Vite builds frontend files into `dist/`.
2. **Static Server Location**: The `dist/` directory is copied into `backend/public/` so Express serves static frontend pages at the root domain (`/`).
3. **Archive Root**: The contents of `backend/` are compressed into `shravya-deploy.zip` at the workspace root, omitting `node_modules`.

---

## Step-by-Step Execution Procedure

### Option A: Standard Execution Script (Recommended)

Run the deterministic execution script located in the workspace:

```bash
node execution/create_deployment_zip.cjs
```

The script automatically executes the following:
1. Cleans old `dist/`, `backend/public/`, `.tmp/deploy_staging/`, and `shravya-deploy.zip`.
2. Runs `npm run build` from project root.
3. Copies `dist/` to `backend/public/`.
4. Stages `backend/` contents into `.tmp/deploy_staging/` (excluding `node_modules` and `.zip` files).
5. Compresses `.tmp/deploy_staging/*` into `shravya-deploy.zip`.
6. Cleans up `.tmp/deploy_staging/`.

---

### Option B: Manual Terminal Procedure

If the script is unavailable, execute the process via PowerShell commands:

```powershell
# 1. Clean previous build directories
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force backend\public -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .tmp\deploy_staging -ErrorAction SilentlyContinue
Remove-Item -Force shravya-deploy.zip -ErrorAction SilentlyContinue

# 2. Build Vite Frontend
npm run build

# 3. Move dist to backend/public
New-Item -ItemType Directory -Path backend\public -Force
Copy-Item -Recurse -Force dist\* backend\public\

# 4. Stage backend contents (excluding node_modules)
$staging = ".tmp\deploy_staging"
New-Item -ItemType Directory -Path $staging -Force
Get-ChildItem -Path backend -Exclude "node_modules", "*.zip" | Copy-Item -Destination $staging -Recurse -Force

# 5. Compress to shravya-deploy.zip
Compress-Archive -Path "$staging\*" -DestinationPath "shravya-deploy.zip" -Force

# 6. Cleanup staging
Remove-Item -Recurse -Force $staging
```

---

## Post-Deployment Hostinger Instructions

After creating `shravya-deploy.zip`, instruct the user to complete deployment on Hostinger:

1. Upload `shravya-deploy.zip` to the Node.js application directory on Hostinger via **File Manager**.
2. Extract the ZIP contents directly into the app root (overwriting existing files except `.env`).
3. In Hostinger Terminal/SSH, navigate to the app root and run:
   ```bash
   npm install --production
   ```
4. Restart the Node.js application in the Hostinger control panel.
