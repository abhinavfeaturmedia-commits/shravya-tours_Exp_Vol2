const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 30000
    });

    try {
        console.log("Starting Database Migration for Customer Portal Features...");

        // 1. booking_itineraries
        console.log("Creating booking_itineraries table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS booking_itineraries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id VARCHAR(64) NOT NULL,
                day_number INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                latitude DECIMAL(9,6) NULL,
                longitude DECIMAL(9,6) NULL,
                zoom_level INT DEFAULT 12,
                route_polyline TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_booking_day (booking_id, day_number)
            )
        `);

        // 2. booking_itinerary_markers
        console.log("Creating booking_itinerary_markers table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS booking_itinerary_markers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                itinerary_id INT NOT NULL,
                label VARCHAR(255) NOT NULL,
                marker_type VARCHAR(50) DEFAULT 'attraction',
                latitude DECIMAL(9,6) NOT NULL,
                longitude DECIMAL(9,6) NOT NULL,
                description TEXT NULL,
                FOREIGN KEY (itinerary_id) REFERENCES booking_itineraries(id) ON DELETE CASCADE
            )
        `);

        // 3. payment_receipts
        console.log("Creating payment_receipts table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_receipts (
                id VARCHAR(255) PRIMARY KEY,
                booking_id VARCHAR(255) NOT NULL,
                transaction_id VARCHAR(255) NOT NULL,
                receipt_number VARCHAR(100) UNIQUE NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payment_method VARCHAR(100) NOT NULL,
                received_date DATE NOT NULL,
                receipt_pdf_url VARCHAR(500) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. destination_visa_requirements
        console.log("Creating destination_visa_requirements table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS destination_visa_requirements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                country VARCHAR(100) NOT NULL UNIQUE,
                required_documents TEXT,
                template_links TEXT,
                notes TEXT
            )
        `);

        // 5. visa_applications
        console.log("Creating visa_applications table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS visa_applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id VARCHAR(64) NOT NULL,
                customer_id VARCHAR(255) NOT NULL,
                country VARCHAR(100) NOT NULL,
                status VARCHAR(50) DEFAULT 'Not Started',
                submission_date DATE NULL,
                approval_date DATE NULL,
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_booking_visa (booking_id)
            )
        `);

        // 6. visa_application_documents
        console.log("Creating visa_application_documents table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS visa_application_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                visa_application_id INT NOT NULL,
                document_name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending Upload',
                file_url VARCHAR(500) NULL,
                rejection_reason TEXT,
                uploaded_at TIMESTAMP NULL,
                FOREIGN KEY (visa_application_id) REFERENCES visa_applications(id) ON DELETE CASCADE,
                UNIQUE KEY uq_app_doc (visa_application_id, document_name)
            )
        `);

        // 7. booking_driver_allocations
        console.log("Creating booking_driver_allocations table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS booking_driver_allocations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id VARCHAR(64) NOT NULL,
                day_number INT NOT NULL,
                driver_name VARCHAR(255) NOT NULL,
                driver_phone VARCHAR(50) NOT NULL,
                vehicle_name VARCHAR(100) NOT NULL,
                vehicle_number VARCHAR(50) NOT NULL,
                guide_name VARCHAR(255) NULL,
                guide_phone VARCHAR(50) NULL,
                live_tracking_enabled TINYINT(1) DEFAULT 0,
                tracking_token VARCHAR(255) NULL,
                UNIQUE KEY uq_booking_driver_day (booking_id, day_number)
            )
        `);

        // 8. driver_live_locations
        console.log("Creating driver_live_locations table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS driver_live_locations (
                allocation_id INT PRIMARY KEY,
                latitude DECIMAL(9,6) NOT NULL,
                longitude DECIMAL(9,6) NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (allocation_id) REFERENCES booking_driver_allocations(id) ON DELETE CASCADE
            )
        `);

        console.log("Tables created successfully!");

        // --- Seed Default Visa Requirements ---
        console.log("Seeding default destination visa requirements...");
        const defaultVisas = [
            {
                country: 'Switzerland',
                required_documents: JSON.stringify([
                    'Passport Scan (valid 6+ months)',
                    'Schengen Visa Application Form',
                    'Passport-size Photo',
                    'Confirmed Return Flight Ticket',
                    'Proof of Accommodation',
                    'Travel Medical Insurance',
                    '3 Months Bank Statement'
                ]),
                template_links: JSON.stringify({
                    'Schengen Visa Application Form': '/templates/schengen_visa_form.pdf',
                    'Covering Letter Draft': '/templates/cover_letter_switzerland.docx'
                }),
                notes: 'Switzerland Schengen visa processing takes 15 calendar days. Ensure passport has at least 2 blank pages.'
            },
            {
                country: 'Thailand',
                required_documents: JSON.stringify([
                    'Passport Scan (valid 6+ months)',
                    'Thai Visa Application Form',
                    'Photo (4x6 cm)',
                    'Confirmed Return Flight Ticket',
                    'Proof of Accommodation',
                    'Proof of Funds (minimum $700 equivalent)'
                ]),
                template_links: JSON.stringify({
                    'Thai Visa Application Form': '/templates/thai_visa_form.pdf'
                }),
                notes: 'Visa on Arrival (VoA) is available for many nationalities. Check if eligible for E-VoA before travel.'
            }
        ];

        for (const visa of defaultVisas) {
            await pool.query(`
                INSERT INTO destination_visa_requirements (country, required_documents, template_links, notes)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE required_documents = VALUES(required_documents), template_links = VALUES(template_links), notes = VALUES(notes)
            `, [visa.country, visa.required_documents, visa.template_links, visa.notes]);
        }

        // --- Seed Sample Data for Existing Bookings to demonstrate features ---
        const [bookings] = await pool.query('SELECT id, customer_id, title FROM bookings LIMIT 5');
        if (bookings.length > 0) {
            console.log(`Found ${bookings.length} existing bookings. Seeding sample itinerary maps, visa trackers, and driver tracking data...`);
            for (const b of bookings) {
                // 1. Seed Itinerary Maps
                const lat = 46.0207; // Zermatt base coordinates
                const lng = 7.7491;

                await pool.query(`
                    INSERT INTO booking_itineraries (booking_id, day_number, title, description, latitude, longitude, zoom_level, route_polyline)
                    VALUES (?, 1, 'Arrival & Transfer', 'Private SUV transfer to Zermatt. Check-in at National Hotel and enjoy a Swiss dinner.', ?, ?, 12, '[[46.2044, 6.1432], [46.0207, 7.7491]]')
                    ON DUPLICATE KEY UPDATE title=VALUES(title)
                `, [b.id, lat, lng]);

                await pool.query(`
                    INSERT INTO booking_itineraries (booking_id, day_number, title, description, latitude, longitude, zoom_level, route_polyline)
                    VALUES (?, 2, 'Peak Exploration', 'Ride the cable car to Matterhorn Glacier Paradise. Scenic photo shoot and high-altitude lunch.', ?, ?, 13, '[[46.0207, 7.7491], [45.9383, 7.7289]]')
                    ON DUPLICATE KEY UPDATE title=VALUES(title)
                `, [b.id, lat + 0.01, lng - 0.01]);

                // Seed Markers for Day 1
                const [it1] = await pool.query('SELECT id FROM booking_itineraries WHERE booking_id = ? AND day_number = 1', [b.id]);
                if (it1.length > 0) {
                    const itinId = it1[0].id;
                    await pool.query('DELETE FROM booking_itinerary_markers WHERE itinerary_id = ?', [itinId]);
                    await pool.query(`
                        INSERT INTO booking_itinerary_markers (itinerary_id, label, marker_type, latitude, longitude, description)
                        VALUES (?, 'Zermatt Station Pickup', 'transit', 46.0244, 7.7485, 'Our driver will greet you at the station exit.')
                    `, [itinId]);
                    await pool.query(`
                        INSERT INTO booking_itinerary_markers (itinerary_id, label, marker_type, latitude, longitude, description)
                        VALUES (?, 'Hotel National Zermatt', 'hotel', 46.0207, 7.7491, 'Luxury alpine boutique stay.')
                    `, [itinId]);
                }

                // Seed Markers for Day 2
                const [it2] = await pool.query('SELECT id FROM booking_itineraries WHERE booking_id = ? AND day_number = 2', [b.id]);
                if (it2.length > 0) {
                    const itinId = it2[0].id;
                    await pool.query('DELETE FROM booking_itinerary_markers WHERE itinerary_id = ?', [itinId]);
                    await pool.query(`
                        INSERT INTO booking_itinerary_markers (itinerary_id, label, marker_type, latitude, longitude, description)
                        VALUES (?, 'Matterhorn Cable Car Station', 'transit', 46.0150, 7.7450, 'Board the Matterhorn Express Cable Car.')
                    `, [itinId]);
                    await pool.query(`
                        INSERT INTO booking_itinerary_markers (itinerary_id, label, marker_type, latitude, longitude, description)
                        VALUES (?, 'Peak Viewing Platform', 'attraction', 45.9383, 7.7289, 'Stunning 360-degree panorama of the Alps.')
                    `, [itinId]);
                }

                // 2. Seed Visa Tracker for International Bookings
                if (b.customer_id) {
                    const country = b.title && b.title.toLowerCase().includes('thailand') ? 'Thailand' : 'Switzerland';
                    await pool.query(`
                        INSERT INTO visa_applications (booking_id, customer_id, country, status, remarks)
                        VALUES (?, ?, ?, 'In Progress', 'Document checklist generated. Awaiting customer uploads.')
                        ON DUPLICATE KEY UPDATE country=VALUES(country)
                    `, [b.id, b.customer_id, country]);

                    const [app] = await pool.query('SELECT id FROM visa_applications WHERE booking_id = ?', [b.id]);
                    if (app.length > 0) {
                        const appId = app[0].id;
                        await pool.query(`
                            INSERT INTO visa_application_documents (visa_application_id, document_name, status, file_url)
                            VALUES (?, 'Passport Scan (valid 6+ months)', 'Verified', 'https://shrawellotours.s3.amazonaws.com/documents/passport_sample.pdf')
                            ON DUPLICATE KEY UPDATE status=VALUES(status)
                        `, [appId]);
                        await pool.query(`
                            INSERT INTO visa_application_documents (visa_application_id, document_name, status)
                            VALUES (?, 'Travel Medical Insurance', 'Pending Upload')
                            ON DUPLICATE KEY UPDATE status=VALUES(status)
                        `, [appId]);
                        await pool.query(`
                            INSERT INTO visa_application_documents (visa_application_id, document_name, status)
                            VALUES (?, '3 Months Bank Statement', 'Pending Upload')
                            ON DUPLICATE KEY UPDATE status=VALUES(status)
                        `, [appId]);
                    }
                }

                // 3. Seed Driver & Guide Allocation for Day 1
                await pool.query(`
                    INSERT INTO booking_driver_allocations (booking_id, day_number, driver_name, driver_phone, vehicle_name, vehicle_number, guide_name, guide_phone, live_tracking_enabled, tracking_token)
                    VALUES (?, 1, 'Marco Rossi', '+41 79 123 4567', 'Mercedes V-Class Premium SUV', 'VS 882 101', 'Sophia Dupont', '+41 79 987 6543', 1, 'token-sample-123')
                    ON DUPLICATE KEY UPDATE driver_name=VALUES(driver_name)
                `, [b.id]);

                const [alloc] = await pool.query('SELECT id FROM booking_driver_allocations WHERE booking_id = ? AND day_number = 1', [b.id]);
                if (alloc.length > 0) {
                    const allocId = alloc[0].id;
                    await pool.query(`
                        INSERT INTO driver_live_locations (allocation_id, latitude, longitude)
                        VALUES (?, 46.0220, 7.7470)
                        ON DUPLICATE KEY UPDATE latitude=VALUES(latitude), longitude=VALUES(longitude)
                    `, [allocId]);
                }
            }
        }

        console.log("Migration complete!");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:");
        console.error(e);
        process.exit(1);
    }
}

migrate();
