import type { PageId } from '../types';
import { SERVICES_DATA } from '../data/siteData';
import { AREAS, areaBySlug } from './areas';
import { SITE_URL } from './site';

// Real, crawlable URLs. Every path ends with "/" because the static build writes
// <path>/index.html, which every static host serves without redirects.
const STATIC_PATHS: Partial<Record<PageId, string>> = {
  home: '/',
  aboutus: '/about-us/',
  services: '/services-pricing/',
  'massage-style': '/services-pricing/',
  'female-massage': '/female-massage-bangalore/',
  'home-massage': '/home-spa-massage-bangalore/',
  testimonials: '/testimonials/',
  jobs: '/jobs/',
  contact: '/contact/',
  guest: '/chat-with-us/',
  booking: '/book-appointment/',
  login: '/login/',
  register: '/register/',
  admin: '/admin/',
  therapist: '/therapist/',
  faq: '/faq/',
  'not-found': '/404/',
};

// Service detail pages: /services/<slug>/
export const SERVICE_SLUGS: Record<string, string> = {
  swedish: 'swedish-massage',
  'deep-tissue': 'deep-tissue-massage',
  aromatherapy: 'aromatherapy-massage',
  relaxation: 'relaxation-massage',
  'head-neck-shoulder': 'head-neck-shoulder-massage',
  foot: 'foot-massage',
  balinese: 'balinese-massage',
  thai: 'thai-massage',
};

export const serviceBySlug = (slug: string) => {
  const id = Object.keys(SERVICE_SLUGS).find((k) => SERVICE_SLUGS[k] === slug);
  return id ? SERVICES_DATA.find((s) => s.id === id) : undefined;
};
export const serviceSlug = (id: string) => SERVICE_SLUGS[id];

export function pathForPage(page: PageId): string {
  if (page.startsWith('service:')) return `/services/${page.slice(8)}/`;
  if (page.startsWith('area:')) return `/home-massage-in-${page.slice(5)}/`;
  return STATIC_PATHS[page] ?? '/';
}

export const urlForPage = (page: PageId) => `${SITE_URL}${pathForPage(page)}`;

export function pageForPath(pathname: string): PageId {
  let p = pathname.split('?')[0].split('#')[0];
  if (!p.startsWith('/')) p = `/${p}`;
  if (!p.endsWith('/')) p += '/';
  p = p.replace(/\/{2,}/g, '/');
  if (p === '/index.html/') return 'home';

  const sMatch = p.match(/^\/services\/([^/]+)\/$/);
  if (sMatch) return serviceBySlug(sMatch[1]) ? (`service:${sMatch[1]}` as PageId) : 'not-found';
  const aMatch = p.match(/^\/home-massage-in-([^/]+)\/$/);
  if (aMatch) return areaBySlug(aMatch[1]) ? (`area:${aMatch[1]}` as PageId) : 'not-found';

  for (const [page, path] of Object.entries(STATIC_PATHS)) {
    if (path === p && page !== 'massage-style') return page as PageId;
  }
  return 'not-found';
}

// Old hash links (#aboutus, #booking...) from before the site had real URLs.
const LEGACY_HASH: Record<string, PageId> = {
  home: 'home',
  aboutus: 'aboutus',
  services: 'services',
  'massage-style': 'services',
  'female-massage': 'female-massage',
  'home-massage': 'home-massage',
  testimonials: 'testimonials',
  jobs: 'jobs',
  contact: 'contact',
  guest: 'guest',
  booking: 'booking',
  login: 'login',
  register: 'register',
  admin: 'admin',
  therapist: 'therapist',
};
export const pageForLegacyHash = (hash: string): PageId | null =>
  LEGACY_HASH[hash.replace(/^#\/?/, '').trim()] ?? null;

// Pages that search engines should index (and that go in the sitemap).
export const INDEXABLE_PAGES: PageId[] = [
  'home',
  'services',
  'female-massage',
  'home-massage',
  'booking',
  'aboutus',
  'faq',
  'testimonials',
  'contact',
  'jobs',
  ...Object.values(SERVICE_SLUGS).map((s) => `service:${s}` as PageId),
  ...AREAS.map((a) => `area:${a.slug}` as PageId),
];

// Everything that gets a pre-rendered HTML file at build time.
export const PRERENDER_PAGES: PageId[] = [
  ...INDEXABLE_PAGES,
  'guest',
  'login',
  'register',
  'admin',
  'therapist',
  'not-found',
];
