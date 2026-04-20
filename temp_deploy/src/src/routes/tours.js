import express from 'express';
import authMiddleware from '../middlewares/auth.js';

export default function createTourRoutes(pool) {
    const router = express.Router();

    // Get all active tours (Public)
    router.get('/', async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM tours ORDER BY created_at DESC');
            res.json({ data: rows });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: 'error', message: 'Failed to fetch tours' });
        }
    });

    // Get single tour by ID (Public)
    router.get('/:id', async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM tours WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({ status: 'error', message: 'Tour not found' });
            }
            res.json({ data: rows[0] });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: 'error', message: 'Failed to fetch tour' });
        }
    });

    // Create a new tour (Admin Only)
    router.post('/', authMiddleware, async (req, res) => {
        const { name, description, price, duration, location, image_url, featured, itinerary, inclusions } = req.body;

        try {
            const query = `
        INSERT INTO tours (name, description, price, duration, location, image_url, featured, itinerary, inclusions) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
            // MySQL needs JSON strings for JSON columns
            const itineraryStr = JSON.stringify(itinerary || []);
            const inclusionsStr = JSON.stringify(inclusions || []);

            const [result] = await pool.query(query, [name, description, price, duration, location, image_url, featured ? 1 : 0, itineraryStr, inclusionsStr]);

            res.status(201).json({ status: 'success', id: result.insertId });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: 'error', message: 'Failed to create tour' });
        }
    });

    return router;
}
