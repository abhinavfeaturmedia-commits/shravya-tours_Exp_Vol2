const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_please_change';
const PORT = process.env.PORT || 3001;

async function run() {
    console.log('=== STARTING LEAD-BOOKING SYNC INTEGRATION TEST ===');
    
    // Connect to DB directly to find test data
    const pool = mysql.createPool({ 
        host: process.env.DB_HOST, 
        user: process.env.DB_USER, 
        password: process.env.DB_PASSWORD, 
        database: process.env.DB_NAME
    });

    try {
        // Find a converted lead and its linked booking
        console.log('Finding a converted lead with a linked booking...');
        const [bookings] = await pool.query('SELECT id, lead_id, assigned_to FROM bookings WHERE lead_id IS NOT NULL LIMIT 1');
        if (bookings.length === 0) {
            console.log('❌ No bookings found with lead_id. Ensure migration ran and backfilled successfully.');
            process.exit(1);
        }

        const booking = bookings[0];
        const leadId = booking.lead_id;

        const [[lead]] = await pool.query('SELECT id, assigned_to FROM leads WHERE id = ?', [leadId]);
        if (!lead) {
            console.log(`❌ Lead with ID ${leadId} not found in database.`);
            process.exit(1);
        }

        console.log(`Found Lead ID: ${leadId} (assigned_to: ${lead.assigned_to})`);
        console.log(`Linked Booking ID: ${booking.id} (assigned_to: ${booking.assigned_to})`);

        // Find a staff member to assign to (different from the current assignee if possible)
        const [staffMembers] = await pool.query('SELECT id, name FROM staff_members LIMIT 2');
        if (staffMembers.length === 0) {
            console.log('❌ No staff members found.');
            process.exit(1);
        }

        let newStaff = staffMembers[0];
        if (String(lead.assigned_to) === String(newStaff.id) && staffMembers[1]) {
            newStaff = staffMembers[1];
        }

        console.log(`Target Staff for reassignment: ID ${newStaff.id} (${newStaff.name})`);

        // Generate Admin JWT Token
        const adminToken = jwt.sign(
            { id: 999, email: 'admin@shravyatours.com', role: 'Admin' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Put request to update lead
        console.log(`Sending PUT request to reassign lead ${leadId} to staff member ${newStaff.id}...`);
        const res = await fetch(`http://localhost:${PORT}/api/crud/leads/${leadId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                assigned_to: newStaff.id
            })
        });

        const data = await res.json();
        console.log('PUT Response Status:', res.status, data);

        if (res.status !== 200) {
            console.error('❌ Reassignment failed!');
            process.exit(1);
        }

        // Verify changes in database
        const [[updatedLead]] = await pool.query('SELECT assigned_to FROM leads WHERE id = ?', [leadId]);
        const [[updatedBooking]] = await pool.query('SELECT assigned_to FROM bookings WHERE id = ?', [booking.id]);

        console.log('\n--- VERIFICATION RESULTS ---');
        console.log(`Updated Lead assignee in DB: ${updatedLead.assigned_to} (Expected: ${newStaff.id})`);
        console.log(`Updated Booking assignee in DB: ${updatedBooking.assigned_to} (Expected: ${newStaff.id})`);

        if (String(updatedLead.assigned_to) === String(newStaff.id) && String(updatedBooking.assigned_to) === String(newStaff.id)) {
            console.log('\n✅ SUCCESS: Lead and Booking assignee synchronized successfully!');
        } else {
            console.error('\n❌ FAILURE: Assignee mismatch detected!');
            process.exit(1);
        }

        // Restore original assignees to preserve data integrity
        console.log('\nRestoring original assignees...');
        await pool.query('UPDATE leads SET assigned_to = ? WHERE id = ?', [lead.assigned_to, leadId]);
        await pool.query('UPDATE bookings SET assigned_to = ? WHERE id = ?', [booking.assigned_to, booking.id]);
        console.log('Data successfully restored.');

    } catch (e) {
        console.error('Test error occurred:', e);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
