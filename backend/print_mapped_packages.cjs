const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

const parseJsonFieldSafe = (field, defaultValue) => {
    if (typeof field === 'string') {
        try { return JSON.parse(field); } catch { return defaultValue; }
    }
    return field || defaultValue;
};

const mapPackage = (row) => {
    let itinerary = [];
    const rawItinerary = parseJsonFieldSafe(row.itinerary, null);
    if (rawItinerary && Array.isArray(rawItinerary) && rawItinerary.length > 0) {
        itinerary = rawItinerary;
    } else {
        const builderData = parseJsonFieldSafe(row.builder_data, null);
        if (builderData?.days && Array.isArray(builderData.days)) {
            itinerary = builderData.days.map((d, i) => ({
                day: d.day ?? (i + 1),
                title: d.title || `Day ${d.day ?? (i + 1)}`,
                desc: [
                    d.description || '',
                    ...(Array.isArray(d.activities) ? d.activities.map((a) =>
                        typeof a === 'string' ? a : (a.name || a.title || '')
                    ) : [])
                ].filter(Boolean).join('\n') || 'Day details not specified.'
            }));
        }
    }

    let highlights = [];
    const rawHighlights = parseJsonFieldSafe(row.highlights, null);
    if (rawHighlights && Array.isArray(rawHighlights) && rawHighlights.length > 0) {
        highlights = rawHighlights.map((h) => ({
            icon: h.icon || 'star',
            label: h.label || String(h)
        }));
    } else {
        highlights = parseJsonFieldSafe(row.features, []).map((f) => ({
            icon: typeof f === 'object' ? (f.icon || 'star') : 'star',
            label: typeof f === 'object' ? (f.label || String(f)) : String(f)
        }));
    }

    return {
        id: row.id,
        title: row.title,
        days: row.days,
        groupSize: row.group_size || 'Family',
        location: row.location || '',
        description: row.description || '',
        price: row.price,
        originalPrice: row.original_price ? Number(row.original_price) : undefined,
        pricingMode: row.pricing_mode || 'group',
        image: row.image || '',
        tag: row.tag || undefined,
        tagColor: row.tag_color || undefined,
        remainingSeats: row.remaining_seats,
        highlights,
        itinerary,
        theme: row.theme || 'Tour',
        overview: row.overview || row.description || '',
        status: row.status || 'Active',
    };
};

async function check() {
  try {
    const pool = mysql.createPool({ 
      host: process.env.DB_HOST, 
      user: process.env.DB_USER, 
      password: process.env.DB_PASSWORD, 
      database: process.env.DB_NAME,
      connectTimeout: 5000
    });
    
    const [rows] = await pool.query('SELECT * FROM packages WHERE status = "Active"');
    const mapped = rows.map(mapPackage);
    console.log('Number of Active packages:', mapped.length);
    if (mapped.length > 0) {
      console.log('First mapped package properties:', Object.keys(mapped[0]));
      console.log('First mapped package details:', JSON.stringify(mapped[0], null, 2));
    }
    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
check();
