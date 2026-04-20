import express from 'express';
import authMiddleware from '../middlewares/auth.js';

export default function createBookingRoutes(pool) {
    const router = express.Router();

    // Get all bookings (Admin Only)
    router.get('/', authMiddleware, async (req, res) => {
        try {
            const query = `
        SELECT b.*, t.name as tour_name 
        FROM bookings b 
        JOIN tours t ON b.tour_id = t.id 
        ORDER BY b.created_at DESC
      `;
            const [rows] = await pool.query(query);
            res.json({ data: rows });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: 'error', message: 'Failed to fetch bookings' });
        }
    });

    // Create a new booking (Public)
    router.post('/', async (req, res) => {
        const { tour_id, customer_name, customer_email, customer_phone, booking_date, number_of_people, total_price, notes } = req.body;

        try {
            const query = `
        INSERT INTO bookings (tour_id, customer_name, customer_email, customer_phone, booking_date, number_of_people, total_price, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

            const [result] = await pool.query(query, [
                tour_id, customer_name, customer_email, customer_phone, booking_date, number_of_people, total_price, notes || ''
            ]);

            res.status(201).json({ status: 'success', id: result.insertId });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: 'error', message: 'Failed to create booking' });
        }
    });

    return router;
}
