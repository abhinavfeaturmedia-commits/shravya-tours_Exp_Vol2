export interface ContactProfile {
  slug: string;
  name: string;
  firstName: string;
  lastName: string;
  initials: string;
  title: string;
  company: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  note: string;
  tagline: string;
  services: string[];
  stats: { label: string; value: string }[];
}

export const ROHIT_PROFILE: ContactProfile = {
  slug: 'rohit',
  name: 'Rohit Sankpal',
  firstName: 'Rohit',
  lastName: 'Sankpal',
  initials: 'RS',
  title: 'Founder & Travel Director',
  company: 'Shrawello Travel Hub',
  phone: '+919922503357',
  whatsapp: '+919922503357',
  email: 'rohit.sankpal@shrawello.com',
  website: 'https://www.shrawello.com',
  address: 'A508, Wisteria, Patil Nagar, Chikhali, PCMC',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411062',
  country: 'India',
  tagline: 'Your Travel. Streamlined.',
  note: 'Founder & Travel Specialist at Shrawello Travel Hub. Specialized in Curated Domestic & International Holidays, Corporate MICE, Honeymoon Getaways & Custom Itineraries.',
  services: [
    'Domestic & International Holidays',
    'Customized & Group Tour Packages',
    'Corporate Travel & MICE Events',
    'Honeymoon & Luxury Escapes',
    'Flight, Hotel & Visa Assistance',
    '24/7 Dedicated Concierge Support'
  ],
  stats: [
    { label: 'Happy Travelers', value: '25,000+' },
    { label: 'Destinations', value: '45+ Countries' },
    { label: 'Client Rating', value: '4.9 ★' },
    { label: 'Experience', value: '8+ Years' }
  ]
};

export const MANALI_PROFILE: ContactProfile = {
  slug: 'manali',
  name: 'Manali Sankpal',
  firstName: 'Manali',
  lastName: 'Sankpal',
  initials: 'MS',
  title: 'Founder & Travel Director',
  company: 'Shrawello Travel Hub',
  phone: '+918010955675',
  whatsapp: '+918010955675',
  email: 'hello@shrawello.com',
  website: 'https://www.shrawello.com',
  address: 'A508, Wisteria, Patil Nagar, Chikhali, PCMC',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411062',
  country: 'India',
  tagline: 'Your Travel. Streamlined.',
  note: 'Founder & Travel Specialist at Shrawello Travel Hub. Specialized in Curated Domestic & International Holidays, Corporate MICE, Honeymoon Getaways & Custom Itineraries.',
  services: [
    'Domestic & International Holidays',
    'Customized & Group Tour Packages',
    'Corporate Travel & MICE Events',
    'Honeymoon & Luxury Escapes',
    'Flight, Hotel & Visa Assistance',
    '24/7 Dedicated Concierge Support'
  ],
  stats: [
    { label: 'Happy Travelers', value: '25,000+' },
    { label: 'Destinations', value: '45+ Countries' },
    { label: 'Client Rating', value: '4.9 ★' },
    { label: 'Experience', value: '8+ Years' }
  ]
};

export const PROFILES: Record<string, ContactProfile> = {
  rohit: ROHIT_PROFILE,
  manali: MANALI_PROFILE,
  monali: MANALI_PROFILE
};

/**
 * Resolves the profile based on the slug or path string.
 */
export function getProfile(slugOrPath?: string): ContactProfile {
  if (!slugOrPath) return ROHIT_PROFILE;
  const clean = slugOrPath.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.includes('manali') || clean.includes('monali')) {
    return MANALI_PROFILE;
  }
  return ROHIT_PROFILE;
}

/**
 * Generates an RFC-compliant vCard 3.0 string.
 */
export function generateVCardString(profile: ContactProfile = ROHIT_PROFILE): string {
  const cleanPhone = profile.phone.replace(/[^0-9+]/g, '');
  const cleanWhatsApp = profile.whatsapp.replace(/[^0-9+]/g, '');

  const vCard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${profile.lastName};${profile.firstName};;;`,
    `FN:${profile.name}`,
    `ORG:${profile.company};`,
    `TITLE:${profile.title}`,
    `TEL;TYPE=CELL,VOICE,PREF:${cleanPhone}`,
    `TEL;TYPE=WORK,VOICE:${cleanPhone}`,
    `TEL;TYPE=WHATSAPP:${cleanWhatsApp}`,
    `EMAIL;TYPE=WORK,INTERNET:${profile.email}`,
    `URL;TYPE=WORK:${profile.website}`,
    `ADR;TYPE=WORK:;;${profile.address};${profile.city};${profile.state};${profile.pincode};${profile.country}`,
    `LABEL;TYPE=WORK:${profile.address}, ${profile.city}, ${profile.state} - ${profile.pincode}, ${profile.country}`,
    `NOTE:${profile.note.replace(/\n/g, '\\n')}`,
    'X-SOCIALPROFILE;type=whatsapp:https://wa.me/' + cleanWhatsApp.replace('+', ''),
    'REV:' + new Date().toISOString(),
    'END:VCARD'
  ].join('\r\n');

  return vCard;
}

/**
 * Triggers a direct download of the .vcf contact file in the browser.
 * Compatible with iOS Safari, Android Chrome, and Desktop browsers.
 */
export function downloadVCard(profile: ContactProfile = ROHIT_PROFILE): boolean {
  try {
    const vCardData = generateVCardString(profile);
    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${profile.firstName}_${profile.lastName}_Shrawello.vcf`);
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 250);

    return true;
  } catch (error) {
    console.error('Failed to download vCard:', error);
    return false;
  }
}

/**
 * Generates the direct WhatsApp chat link with an optional pre-filled message.
 */
export function getWhatsAppLink(phone: string = ROHIT_PROFILE.whatsapp, message?: string, profileName?: string): string {
  const cleanNumber = phone.replace(/[^0-9]/g, '');
  const greetingName = profileName ? profileName.split(' ')[0] : 'there';
  const defaultMsg = `Hello ${greetingName}, I connected via your Shrawello Digital Visiting Card and would like to inquire about tour packages / travel services.`;
  const text = encodeURIComponent(message || defaultMsg);
  return `https://wa.me/${cleanNumber}?text=${text}`;
}

/**
 * Generates the QR Code Image URL for a given payload (URL or vCard text).
 */
export function getQrCodeImageUrl(data: string, size: number = 500): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&margin=12&color=09-17-12`;
}
