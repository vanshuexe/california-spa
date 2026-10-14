import type { PageId } from '../types';
import { EXPRESS_PRICING_DATA, PRICING_DATA, SERVICES_DATA, SPA_PHONE } from '../data/siteData';
import { AREAS, areaBySlug } from './areas';
import { FAQS } from './faqs';
import { pathForPage, serviceBySlug, urlForPage, INDEXABLE_PAGES } from './routes';
import { BUSINESS, DEFAULT_OG_IMAGE, SITE_URL } from './site';

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  robots: string; // e.g. "index,follow,max-image-preview:large" or "noindex,nofollow"
  indexable: boolean;
  ogType: 'website' | 'article';
  ogImage: typeof DEFAULT_OG_IMAGE;
  jsonLd: object[];
}

const INDEX = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const NOINDEX = 'noindex,nofollow';

const businessId = `${SITE_URL}/#business`;

// schema.org DaySpa: a service-area business (no street address published).
function businessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['DaySpa', 'HealthAndBeautyBusiness'],
    '@id': businessId,
    name: BUSINESS.name,
    description:
      'Doorstep Royale Spa brings professional massage and spa therapy to your home or hotel room in Bangalore, every day from 9 AM to 10 PM.',
    url: `${SITE_URL}/`,
    logo: BUSINESS.logo,
    image: [BUSINESS.image],
    telephone: BUSINESS.phones,
    priceRange: BUSINESS.priceRange,
    currenciesAccepted: 'INR',
    paymentAccepted: 'UPI, Credit Card, Debit Card, Net Banking',
    address: {
      '@type': 'PostalAddress',
      addressLocality: BUSINESS.city,
      addressRegion: BUSINESS.region,
      addressCountry: BUSINESS.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: BUSINESS.geo.latitude, longitude: BUSINESS.geo.longitude },
    areaServed: [
      { '@type': 'City', name: BUSINESS.city },
      ...AREAS.map((a) => ({ '@type': 'AdministrativeArea', name: `${a.name}, ${BUSINESS.city}` })),
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: BUSINESS.opens,
        closes: BUSINESS.closes,
      },
    ],
    contactPoint: BUSINESS.phones.map((t) => ({
      '@type': 'ContactPoint',
      telephone: t,
      contactType: 'customer service',
      areaServed: BUSINESS.country,
      availableLanguage: ['English', 'Hindi', 'Kannada'],
    })),
    ...(BUSINESS.sameAs.length ? { sameAs: BUSINESS.sameAs } : {}),
  };
}

function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: BUSINESS.name,
    inLanguage: 'en-IN',
    publisher: { '@id': businessId },
  };
}

function breadcrumbSchema(page: PageId, name: string) {
  const items: { name: string; url: string }[] = [{ name: 'Home', url: `${SITE_URL}/` }];
  if (page.startsWith('service:')) items.push({ name: 'Services & Pricing', url: urlForPage('services') });
  items.push({ name, url: urlForPage(page) });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}

function offers(tiers: { duration: string; price: number }[]) {
  return tiers.map((t) => ({
    '@type': 'Offer',
    name: t.duration,
    price: t.price,
    priceCurrency: 'INR',
    availability: 'https://schema.org/InStock',
    url: urlForPage('booking'),
  }));
}

const allTiers = [...EXPRESS_PRICING_DATA, ...PRICING_DATA];
const longTiers = PRICING_DATA;
const minPrice = (t: { price: number }[]) => Math.min(...t.map((x) => x.price));

function serviceSchema(name: string, description: string, tiers: { duration: string; price: number }[], url: string, area?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    url,
    serviceType: 'Massage therapy',
    provider: { '@id': businessId },
    areaServed: area
      ? { '@type': 'AdministrativeArea', name: `${area}, ${BUSINESS.city}` }
      : { '@type': 'City', name: BUSINESS.city },
    offers: offers(tiers),
  };
}

// First variant that fits in ~60 characters (search results cut titles longer than that).
const fit = (...variants: string[]) => variants.find((v) => v.length <= 60) ?? variants[variants.length - 1];

interface Raw {
  title: string;
  description: string;
  name: string; // breadcrumb label
  extra?: object[];
  noindex?: boolean;
  canonicalPage?: PageId;
  webPageType?: string;
}

function raw(page: PageId): Raw {
  if (page.startsWith('service:')) {
    const svc = serviceBySlug(page.slice(8));
    if (svc) {
      const tiers = /30 \//.test(svc.duration) ? EXPRESS_PRICING_DATA.concat(PRICING_DATA.slice(0, 1)) : longTiers;
      return {
        title: fit(
          `${svc.name} at Home in Bangalore | Doorstep Royale Spa`,
          `${svc.name} at Home in Bangalore | Royale Spa`,
          `${svc.name} in Bangalore | Royale Spa`,
          `${svc.name} at Home | Royale Spa`
        ),
        description: `${svc.name} at home or hotel in Bangalore by trained therapists. Fresh linen, open 9 AM to 10 PM daily. From ₹${minPrice(tiers).toLocaleString('en-IN')}. Book online.`,
        name: svc.name,
        extra: [serviceSchema(`${svc.name} at home in Bangalore`, `${svc.description} ${svc.recommendedFor ?? ''}`.trim(), tiers, urlForPage(page))],
      };
    }
  }
  if (page.startsWith('area:')) {
    const area = areaBySlug(page.slice(5));
    if (area) {
      return {
        title: fit(
          `Home Massage in ${area.short}, Bangalore | Doorstep Royale Spa`,
          `Home Massage in ${area.short}, Bangalore | Royale Spa`,
          `Home Massage in ${area.short} | Royale Spa`
        ),
        description: `Book a professional massage at home or hotel in ${area.short}, Bangalore. Trained therapists come to you, 9 AM to 10 PM daily. From ₹999.`,
        name: `Home Massage in ${area.name}`,
        extra: [
          serviceSchema(
            `Home massage in ${area.name}, Bangalore`,
            `Doorstep massage and spa therapy in ${area.name}, ${area.zone}.`,
            allTiers,
            urlForPage(page),
            area.name
          ),
        ],
      };
    }
  }

  switch (page) {
    case 'home':
      return {
        title: 'Massage at Home in Bangalore | Doorstep Royale Spa',
        description:
          'Professional home and hotel massage in Bangalore. Trained therapists come to your doorstep 9 AM to 10 PM daily. Swedish, deep tissue, aroma and more. Book online.',
        name: 'Home',
      };
    case 'aboutus':
      return {
        title: 'About Doorstep Royale Spa | Home Massage Service Bangalore',
        description:
          'Learn about Doorstep Royale Spa: trained therapists, hygienic sessions and luxury wellness delivered to your home or hotel room across Bangalore.',
        name: 'About Us',
        webPageType: 'AboutPage',
      };
    case 'services':
    case 'massage-style':
      return {
        title: 'Massage Services & Prices in Bangalore | From ₹999',
        description:
          'Massage prices in Bangalore: 30 min ₹999, 60 min ₹1,799, 90 min ₹2,100, 120 min ₹3,400, 3 hours ₹4,099. Swedish, deep tissue, Thai and more at home.',
        name: 'Services & Pricing',
        canonicalPage: 'services',
        extra: [
          {
            '@context': 'https://schema.org',
            '@type': 'OfferCatalog',
            name: 'Doorstep massage services and prices',
            itemListElement: [
              ...SERVICES_DATA.map((s) => ({
                '@type': 'Offer',
                itemOffered: { '@type': 'Service', name: s.name, description: s.description },
              })),
              ...offers(allTiers),
            ],
          },
        ],
      };
    case 'female-massage':
      return {
        title: 'Female Massage Therapists in Bangalore | Home Spa',
        description:
          'Trained female massage therapists at your doorstep in Bangalore. Comfortable, professional home and hotel sessions, 9 AM to 10 PM. View therapists and book online.',
        name: 'Female Massage Therapists',
      };
    case 'home-massage':
      return {
        title: 'Home Spa & Doorstep Massage in Bangalore | Royale Spa',
        description:
          'Skip the traffic: a trained therapist brings the spa to your home or hotel room in Bangalore, with fresh linen and oils. Book your doorstep massage online.',
        name: 'Home Spa Massage',
      };
    case 'testimonials':
      return {
        title: 'Customer Reviews & Testimonials | Doorstep Royale Spa',
        description:
          'Read what customers say about Doorstep Royale Spa home massage in Bangalore: professional therapists, punctual service and relaxing sessions at home.',
        name: 'Testimonials',
      };
    case 'jobs':
      return {
        title: 'Spa Therapist Jobs in Bangalore | Doorstep Royale Spa',
        description:
          'Spa therapist and staff vacancies in Bangalore. Apply to join the Doorstep Royale Spa team: flexible schedules, training and good earnings.',
        name: 'Jobs',
      };
    case 'contact':
      return {
        title: `Contact Doorstep Royale Spa | Call ${SPA_PHONE} Bangalore`,
        description: `Call or WhatsApp Doorstep Royale Spa on ${SPA_PHONE} or send an enquiry. Home and hotel massage in Bangalore, open daily 9 AM to 10 PM.`,
        name: 'Contact',
        webPageType: 'ContactPage',
      };
    case 'booking':
      return {
        title: 'Book a Home Massage in Bangalore Online | Royale Spa',
        description:
          'Book a home or hotel massage in Bangalore in minutes. Choose duration, therapist, date and time, pay a ₹500 or ₹1,000 advance online and get instant confirmation.',
        name: 'Book Appointment',
      };
    case 'faq':
      return {
        title: 'FAQs: Home Massage in Bangalore | Doorstep Royale Spa',
        description:
          'Answers about home massage in Bangalore: prices, travel charges, timings, areas served, booking, payment, therapists and cancellations.',
        name: 'FAQs',
        extra: [
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          },
        ],
      };
    case 'guest':
      return {
        title: 'Chat with Doorstep Royale Spa',
        description: 'Chat with the Doorstep Royale Spa team about bookings, prices and availability.',
        name: 'Chat with Us',
        noindex: true,
      };
    case 'login':
    case 'register':
      return {
        title: 'Sign in or Register | Doorstep Royale Spa',
        description: 'Sign in or create your Doorstep Royale Spa account to manage bookings.',
        name: 'Account',
        noindex: true,
        canonicalPage: 'booking',
      };
    case 'admin':
      return { title: 'Admin | Doorstep Royale Spa', description: 'Staff area.', name: 'Admin', noindex: true };
    case 'therapist':
      return { title: 'Therapist Panel | Doorstep Royale Spa', description: 'Therapist area.', name: 'Therapist', noindex: true };
    default:
      return {
        title: 'Page not found | Doorstep Royale Spa',
        description: 'This page could not be found. Visit the Doorstep Royale Spa home page.',
        name: 'Not found',
        noindex: true,
      };
  }
}

export function getSeo(page: PageId): SeoMeta {
  const r = raw(page);
  const canonicalPage = r.canonicalPage ?? page;
  const indexable = !r.noindex && INDEXABLE_PAGES.includes(canonicalPage);

  const jsonLd: object[] = [];
  if (indexable) {
    jsonLd.push(businessSchema(), websiteSchema());
    if (r.webPageType) {
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': r.webPageType,
        name: r.title,
        description: r.description,
        url: urlForPage(page),
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': businessId },
      });
    }
    if (page !== 'home') jsonLd.push(breadcrumbSchema(page, r.name));
    if (r.extra) jsonLd.push(...r.extra);
  }

  return {
    title: r.title,
    description: r.description,
    canonical: page === 'not-found' ? `${SITE_URL}/` : `${SITE_URL}${pathForPage(canonicalPage)}`,
    robots: indexable ? INDEX : NOINDEX,
    indexable,
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd,
  };
}
