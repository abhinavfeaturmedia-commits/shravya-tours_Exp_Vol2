# Directive: Deploy to Hostinger

**Goal:** Create a production-ready package of Shravya Tours and deploy it to a Hostinger Node.js environment.

## Context
Shravya Tours is a monolithic deployment where the Express backend serves the React frontend statically out of the `public/` directory.

## Prerequisites
- Node.js environment on Hostinger properly configured.
- Environment (.env) variables already securely stored on the Hostinger server.

## Step 1: Create the Deployment ZIP
Instead of manually building and copying files, ALWAYS use the deterministic execution script logic:

1. Open a terminal in the project root.
2. Run the deployment script:
   ```bash
   node execution/create_deployment_zip.cjs
   ```
3. Wait for the script to finish. It automatically:
   - Cleans old build directories.
   - Runs `npm run build` to compile the Vite React frontend.
   - Moves the compiled `dist/` into `backend/public/`.
   - Zips the `backend/` folder into `shravya-deploy.zip` (excluding `node_modules` to save bandwidth).

## Step 2: Upload to Hostinger
1. Log into your Hostinger control panel.
2. Go to **File Manager**.
3. Navigate to the root folder of your Node.js application (e.g., `/domains/yourdomain.com/public_html` or the specific Node map).
4. Upload `shravya-deploy.zip`.
5. Extract the ZIP archive in the directory. Overwrite any existing files except `.env`.

## Step 3: Install Dependencies
1. Open Hostinger's **Node.js Config/Terminal** or SSH into the server.
2. Navigate into the folder where `package.json` was extracted.
3. Run the following command to securely install backend dependencies:
   ```bash
   npm install --production
   ```
*(Note: Exclude dev dependencies to save space and improve performance)*

## Step 4: Restart the Server
1. In the Hostinger Node.js control panel, click **Restart** (or stop and start the process).
2. Ensure the application spins up cleanly and properly serves traffic and APIs.

## Troubleshooting
- If changes aren't showing, clear your browser cache (or manually purge Hostinger caching).
- If the script fails locally to build the ZIP, verify PowerShell permissions (used for `Compress-Archive`).
- For API connection errors, verify your Hostinger database strings match your `.env` configuration.
