const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

const parseJsonFieldSafe = (field, defaultValue) => {
    if (typeof field === 'string') {
        try { return JSON.parse(field); } catch { return defaultValue; }
    }
    return field || defaultValue;
};

const mapPackage = (row) => {
    // Extract itinerary: prefer dedicated itinerary JSON column, then extract from builder_data.days
    let itinerary = [];
    const rawItinerary = parseJsonFieldSafe(row.itinerary, null);
    if (rawItinerary && Array.isArray(rawItinerary) && rawItinerary.length > 0) {
        itinerary = rawItinerary;
    } else {
        // Fall back: extract from builder_data.days (each day has title + activities)
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
        } else if (builderData?.items && Array.isArray(builderData.items)) {
            // Reconstruct itinerary from new V2 builderData items array
            const daysCount = builderData.tripDetails?.days || row.days || 4;
            const days = Array.from({ length: daysCount }, (_, i) => i + 1);
            itinerary = days.map(day => {
                const dayItems = builderData.items.filter((i) => i.day === day);
                const desc = dayItems.length === 0
                    ? 'Leisure day for personal exploration.'
                    : dayItems
                        .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                        .map((item) => `• ${item.time ? item.time + ': ' : ''}${item.title}${item.description ? ' - ' + item.description : ''}`)
                        .join('\n');
                
                const dayTheme = (builderData.dayMeta?.[day])?.theme
                    || dayItems.find((i) => i.type === 'activity')?.title
                    || (day === 1 ? 'Arrival & Welcome' : `Day ${day} Itinerary`);
                
                return { day, title: dayTheme, desc, items: dayItems };
            });
        }
    }

    // Extract highlights: prefer stored highlights JSON (with icons), fall back to features string[]
    let highlights = [];
    const rawHighlights = parseJsonFieldSafe(row.highlights, null);
    if (rawHighlights && Array.isArray(rawHighlights) && rawHighlights.length > 0) {
        // Stored as {icon, label} objects
        highlights = rawHighlights.map((h) => ({
            icon: h.icon || 'star',
            label: h.label || String(h)
        }));
    } else {
        // Legacy: features stored as plain string[]
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
        offerEndTime: row.offer_end_time,
        included: parseJsonFieldSafe(row.included, []),
        notIncluded: parseJsonFieldSafe(row.not_included, []),
        gallery: parseJsonFieldSafe(row.gallery, []),
        addons: parseJsonFieldSafe(row.addons, undefined),
        builderData: parseJsonFieldSafe(row.builder_data, null),
        itinerary_status: row.itinerary_status,
        client_name: row.client_name,
        client_id: row.client_id,
        validity_date: row.validity_date,
        terms_and_conditions: row.terms_and_conditions
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
    
    const [rows] = await pool.query('SELECT * FROM packages');
    console.log(`Fetched ${rows.length} packages from DB`);
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            const mapped = mapPackage(row);
            console.log(`✓ Package ${i+1}/${rows.length} mapped successfully: "${row.title}"`);
        } catch (e) {
            console.error(`❌ Package ${i+1}/${rows.length} failed to map: "${row.title}" (id: ${row.id})`);
            console.error(e.stack);
        }
    }
    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
check();
