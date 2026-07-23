/**
 * Standardizes phone numbers for accurate matching across Leads, Bookings, and Customers.
 * Removes country code (+91/91), spaces, hyphens, and non-numeric characters.
 */
export function normalisePhone(phone?: string | null): string {
    if (!phone) return '';
    // Strip everything non-numeric
    let cleaned = phone.replace(/\D/g, '');
    // If Indian country code 91 is present and number is 12 digits, strip leading 91
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        cleaned = cleaned.slice(2);
    } else if (cleaned.length > 10 && cleaned.startsWith('0')) {
        cleaned = cleaned.replace(/^0+/, '');
    }
    return cleaned;
}
