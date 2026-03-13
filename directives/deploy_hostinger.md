# Deploy to Hostinger

Deploy the Shravya Tours app (frontend + backend) to Hostinger shared hosting.

## Goal
Build the frontend, package it with the backend, and deploy via zip upload to Hostinger.

## Inputs
- Clean, working codebase (all changes committed/tested locally)
- Hostinger panel access (manual step by user)

## Steps

### 1. Build the frontend
```bash
cd c:\Users\Abhinav\Documents\Antigravity Files\shravya-tours_Exp_Vol2
npm run build
```
This generates the `dist/` folder.

### 2. Create deployment zip
> ⚠️ Only when user explicitly says "create deployment zip file"

Package the following into a zip:
- `dist/` — built frontend assets
- `backend/index.js` — Express server
- `backend/package.json` — backend dependencies
- `backend/.env.production` — production env vars
- `backend/public/` — if exists, static assets

**Do NOT include:** `node_modules/`, `.git/`, `.tmp/`, source files, `.env.local`

### 3. User uploads to Hostinger
This is a manual step. The user uploads the zip via Hostinger File Manager.

## Edge Cases
- **Backend env mismatch:** Ensure `backend/.env.production` has the correct MySQL credentials and `FRONTEND_URL` for CORS.
- **API URL in frontend:** Confirm `VITE_API_URL` or equivalent points to the production backend URL before building.
- **File size:** Keep zip under 100MB. Exclude `node_modules/` — Hostinger runs `npm install` on deploy.

## Learned
- Do NOT auto-create deployment zips — user must explicitly request it.
- Always verify the frontend `.env.local` or build-time env vars point to production URLs before building.
