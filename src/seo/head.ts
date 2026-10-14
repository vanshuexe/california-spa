import type { SeoMeta } from './meta';
import { BUSINESS, SITE_URL } from './site';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// JSON-LD must not contain "</script>"; "<" is escaped to be safe.
const jsonScript = (data: object[]) =>
  JSON.stringify(data.length === 1 ? data[0] : data).replace(/</g, '\\u003c');

// Static <head> tags for the pre-rendered HTML (build time). The client keeps them in sync
// with applySeo() below when the visitor navigates.
export function buildHeadTags(seo: SeoMeta): string {
  const t: string[] = [];
  t.push(`<title>${esc(seo.title)}</title>`);
  t.push(`<meta name="description" content="${esc(seo.description)}" />`);
  t.push(`<meta name="robots" content="${seo.robots}" />`);
  t.push(`<link rel="canonical" href="${seo.canonical}" />`);
  if (seo.indexable) {
    t.push(`<link rel="alternate" hreflang="en-IN" href="${seo.canonical}" />`);
    t.push(`<link rel="alternate" hreflang="x-default" href="${seo.canonical}" />`);
  }
  t.push(`<meta property="og:site_name" content="${esc(BUSINESS.name)}" />`);
  t.push(`<meta property="og:locale" content="en_IN" />`);
  t.push(`<meta property="og:type" content="${seo.ogType}" />`);
  t.push(`<meta property="og:title" content="${esc(seo.title)}" />`);
  t.push(`<meta property="og:description" content="${esc(seo.description)}" />`);
  t.push(`<meta property="og:url" content="${seo.canonical}" />`);
  t.push(`<meta property="og:image" content="${seo.ogImage.url}" />`);
  t.push(`<meta property="og:image:width" content="${seo.ogImage.width}" />`);
  t.push(`<meta property="og:image:height" content="${seo.ogImage.height}" />`);
  t.push(`<meta property="og:image:alt" content="${esc(seo.ogImage.alt)}" />`);
  t.push(`<meta name="twitter:card" content="summary_large_image" />`);
  t.push(`<meta name="twitter:title" content="${esc(seo.title)}" />`);
  t.push(`<meta name="twitter:description" content="${esc(seo.description)}" />`);
  t.push(`<meta name="twitter:image" content="${seo.ogImage.url}" />`);
  t.push(`<meta name="twitter:image:alt" content="${esc(seo.ogImage.alt)}" />`);
  if (seo.jsonLd.length) {
    t.push(`<script type="application/ld+json" id="jsonld-seo">${jsonScript(seo.jsonLd)}</script>`);
  }
  return t.join('\n    ');
}

// Client side: update the head when the route changes (browser only).
export function applySeo(seo: SeoMeta) {
  if (typeof document === 'undefined') return;
  const head = document.head;

  const meta = (attr: 'name' | 'property', key: string, content: string) => {
    let el = head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      head.appendChild(el);
    }
    el.setAttribute('content', content);
  };
  const link = (rel: string, href: string, extra?: Record<string, string>) => {
    const sel = `link[rel="${rel}"]${extra?.hreflang ? `[hreflang="${extra.hreflang}"]` : ''}`;
    let el = head.querySelector<HTMLLinkElement>(sel);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      if (extra) Object.entries(extra).forEach(([k, v]) => el!.setAttribute(k, v));
      head.appendChild(el);
    }
    el.setAttribute('href', href);
  };

  document.title = seo.title;
  meta('name', 'description', seo.description);
  meta('name', 'robots', seo.robots);
  link('canonical', seo.canonical);
  if (seo.indexable) {
    link('alternate', seo.canonical, { hreflang: 'en-IN' });
    link('alternate', seo.canonical, { hreflang: 'x-default' });
  } else {
    head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((e) => e.remove());
  }
  meta('property', 'og:type', seo.ogType);
  meta('property', 'og:title', seo.title);
  meta('property', 'og:description', seo.description);
  meta('property', 'og:url', seo.canonical);
  meta('property', 'og:image', seo.ogImage.url);
  meta('name', 'twitter:title', seo.title);
  meta('name', 'twitter:description', seo.description);
  meta('name', 'twitter:image', seo.ogImage.url);

  let ld = head.querySelector<HTMLScriptElement>('script#jsonld-seo');
  if (seo.jsonLd.length) {
    if (!ld) {
      ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.id = 'jsonld-seo';
      head.appendChild(ld);
    }
    ld.textContent = jsonScript(seo.jsonLd);
  } else if (ld) {
    ld.remove();
  }
}

export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;
