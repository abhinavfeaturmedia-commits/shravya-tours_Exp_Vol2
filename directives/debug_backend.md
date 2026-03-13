# Debug Backend Issues

Troubleshoot and fix errors in the Express/MySQL backend.

## Goal
Systematically diagnose and resolve backend errors (500s, auth failures, DB issues).

## Standard Diagnostic Flow

### 1. Identify the error
- Check the browser console / Network tab for status codes and response bodies.
- Check backend logs (terminal output or Hostinger error logs).

### 2. Common root causes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 500 on staff/create | Missing DB column | `ALTER TABLE` to add column |
| 401 Unauthorized | JWT expired or missing | Check token flow in `AuthContext.tsx` |
| Login shows success but no redirect | Race condition in `loadUserProfile` | Check `setCurrentUser` vs `navigate()` timing |
| CORS error | `FRONTEND_URL` mismatch in backend `.env` | Update `FRONTEND_URL` to match actual frontend origin |
| "Duplicate entry" on insert | Unique constraint violation (e.g., email) | Add frontend validation or backend `ON DUPLICATE KEY` handling |

### 3. Debugging tools
- **`execution/check_db.cjs`** — Verify DB connectivity and table structure
- **`backend/check_db.cjs`** — Same, from backend directory
- **`backend/sync-users.js`** — Sync staff_members ↔ users table

### 4. Self-anneal
After fixing:
1. Test the fix locally
2. Update this directive with the new edge case
3. If a script was created/modified, ensure it's in `execution/`

## Learned
- `staff_members` table must have a `phone` column — was missing, caused 500s.
- `users` table must be created alongside `staff_members` entries for login to work.
- Always expose detailed MySQL error messages during debugging (remove in production).
