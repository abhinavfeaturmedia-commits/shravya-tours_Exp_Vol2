const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_please_change';
const PORT = process.env.PORT || 3001;

async function run() {
    console.log('=== STARTING CO-TRAVELER EDIT INTEGRATION TEST ===');
    
    // Connect to DB directly
    const pool = mysql.createPool({ 
        host: process.env.DB_HOST, 
        user: process.env.DB_USER, 
        password: process.env.DB_PASSWORD, 
        database: process.env.DB_NAME
    });

    try {
        // Find or create a test co-traveler
        console.log('Finding a co-traveler for testing...');
        const [coTravelers] = await pool.query('SELECT * FROM customer_co_travelers LIMIT 1');
        
        let traveler;
        if (coTravelers.length === 0) {
            console.log('No co-travelers found in database. Creating a temp traveler...');
            const [customers] = await pool.query('SELECT id FROM customers LIMIT 1');
            if (customers.length === 0) {
                console.log('❌ No customers found in database. Please register a customer first.');
                process.exit(1);
            }
            const customerId = customers[0].id;
            await pool.query(`
                INSERT INTO customer_co_travelers (customer_id, name, relation)
                VALUES (?, 'Temp Companion', 'Friend')
            `, [customerId]);
            
            const [rows] = await pool.query('SELECT * FROM customer_co_travelers WHERE name = ?', ['Temp Companion']);
            traveler = rows[0];
        } else {
            traveler = coTravelers[0];
        }

        console.log(`Using co-traveler ID: ${traveler.id} (Name: ${traveler.name}, Customer ID: ${traveler.customer_id})`);

        // Generate customer JWT token
        const customerToken = jwt.sign(
            { id: traveler.customer_id, role: 'customer' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Send PUT request to update co-traveler
        console.log(`Sending PUT request to update co-traveler ${traveler.id}...`);
        const res = await fetch(`http://localhost:${PORT}/api/customer/co-travelers/${traveler.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${customerToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Test Companion Updated',
                relation: 'Spouse',
                phone: '1234567890',
                passport_no: 'TESTPASSPORT',
                dob: '1995-05-15'
            })
        });

        const data = await res.json();
        console.log('PUT Response Status:', res.status, data);

        if (res.status !== 200) {
            console.error('❌ Update request failed!');
            process.exit(1);
        }

        // Verify database update
        const [[updatedTraveler]] = await pool.query('SELECT * FROM customer_co_travelers WHERE id = ?', [traveler.id]);

        console.log('\n--- VERIFICATION RESULTS ---');
        console.log(`Updated Name in DB: "${updatedTraveler.name}" (Expected: "Test Companion Updated")`);
        console.log(`Updated Relation in DB: "${updatedTraveler.relation}" (Expected: "Spouse")`);
        console.log(`Updated Phone in DB: "${updatedTraveler.phone}" (Expected: "1234567890")`);

        if (updatedTraveler.name === 'Test Companion Updated' && updatedTraveler.relation === 'Spouse') {
            console.log('\n✅ SUCCESS: Co-traveler updated successfully in database via API!');
        } else {
            console.error('\n❌ FAILURE: Co-traveler data update not verified in database!');
            process.exit(1);
        }

        // Restore original data or cleanup temp traveler
        console.log('\nRestoring data integrity...');
        if (traveler.name === 'Temp Companion') {
            await pool.query('DELETE FROM customer_co_travelers WHERE id = ?', [traveler.id]);
            console.log('Temp traveler removed.');
        } else {
            await pool.query(`
                UPDATE customer_co_travelers 
                SET name = ?, relation = ?, phone = ?, passport_no = ?, dob = ?
                WHERE id = ?
            `, [traveler.name, traveler.relation, traveler.phone, traveler.passport_no, traveler.dob ? new Date(traveler.dob).toISOString().split('T')[0] : null, traveler.id]);
            console.log('Original co-traveler details restored.');
        }

    } catch (e) {
        console.error('Test error occurred:', e);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
