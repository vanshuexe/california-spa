import { SPA_NAME, SPA_PHONE, SPA_PHONE_2 } from '../data/siteData';

// Canonical production origin (no trailing slash, no "www"). Change here if the domain changes.
export const SITE_URL = 'https://doorsteproyalespa.com';

export const BUSINESS = {
  name: 'Doorstep Royale Spa',
  displayName: SPA_NAME,
  tagline: 'Luxury Wellness, At Your Doorstep',
  phones: [`+91${SPA_PHONE}`, `+91${SPA_PHONE_2}`],
  city: 'Bangalore',
  cityAlt: 'Bengaluru',
  region: 'Karnataka',
  country: 'IN',
  // Bangalore city centre. This is a service-area business, so no street address is published.
  geo: { latitude: 12.9716, longitude: 77.5946 },
  opens: '09:00',
  closes: '22:00',
  priceRange: '₹999 - ₹4,099',
  logo: `${SITE_URL}/assets/images/royale-spa-logo-512.png`,
  image: `${SITE_URL}/og-image.jpg`,
  // Add public profile URLs here once they exist (Google Business Profile, Instagram, Facebook...).
  // They are emitted as schema.org "sameAs" and help search engines connect the brand.
  sameAs: [] as string[],
};

export const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}/og-image.jpg`,
  width: 1200,
  height: 630,
  alt: 'Doorstep Royale Spa: massage at home in Bangalore, open daily 9 AM to 10 PM',
};
