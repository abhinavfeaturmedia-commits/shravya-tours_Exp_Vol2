# Local Development

Run the full Shravya Tours stack locally for development.

## Goal
Start both the React frontend (Vite) and Express backend concurrently for local development.

## Steps

### 1. Start both servers
```bash
cd c:\Users\Abhinav\Documents\Antigravity Files\shravya-tours_Exp_Vol2
npm run dev
```
This runs `concurrently` to start:
- **Frontend:** Vite dev server (default port 5173)
- **Backend:** Express server via `cd backend && npm run dev`

### 2. Accessing the app
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`

## Environment
- Frontend env: `.env.local` (Supabase keys, Gemini API key, etc.)
- Backend env: `backend/.env` (MySQL connection, JWT secret, etc.)

## Edge Cases
- If `node_modules/` is missing, run `npm install` at root AND in `backend/`.
- Backend requires a running MySQL database (configured in `backend/.env`).
