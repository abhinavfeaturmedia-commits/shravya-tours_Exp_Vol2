/**
 * Routes Barrel Export
 * 
 * Re-exports all route registration functions.
 * Each route module exports a factory function that receives (app, pool, ...deps).
 * 
 * Usage in index.js:
 *   import { createAuthRoutes } from './routes/index.js';
 *   createAuthRoutes(app, pool);
 */

export { createAuthRoutes } from './auth.js';
