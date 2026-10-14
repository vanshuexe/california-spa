// Build step: turn every route into a real, static HTML file (so search engines and social
// networks see the full page, title, description, canonical and structured data without running
// JavaScript), then write sitemap.xml.
//
//   npm run build   ->   vite build  ->  vite build --ssr  ->  node scripts/prerender.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const dist = path.join(root, 'dist');
const ssrDir = path.join(root, 'dist-ssr');

// Minimal .env loader (the build script itself is plain Node, not Vite).
for (const f of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
for (const marker of ['<!--seo-head-->', '<!--app-html-->']) {
  if (!template.includes(marker)) throw new Error(`index.html is missing ${marker}`);
}

const server = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);
const { renderPage, buildHeadTags, getSeo, INDEXABLE_PAGES, PRERENDER_PAGES, pathForPage, SITE_URL } = server;

// Optional: Search Console / Bing verification and Google Analytics, from environment variables.
const verification = [];
if (process.env.VITE_GSC_VERIFICATION)
  verification.push(`<meta name="google-site-verification" content="${process.env.VITE_GSC_VERIFICATION}" />`);
if (process.env.VITE_BING_VERIFICATION)
  verification.push(`<meta name="msvalidate.01" content="${process.env.VITE_BING_VERIFICATION}" />`);
const gaId = process.env.VITE_GA_ID;
const analytics = gaId
  ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}',{send_page_view:false});gtag('event','page_view',{page_path:location.pathname});</script>`
  : '';

const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

let count = 0;
for (const page of PRERENDER_PAGES) {
  const seo = getSeo(page);
  const appHtml = renderPage(page);
  const html = template
    .replace('<!--seo-head-->', buildHeadTags(seo))
    .replace('<!--seo-verification-->', verification.join('\n    '))
    .replace('<!--seo-analytics-->', analytics)
    .replace('<!--app-html-->', appHtml);

  const p = pathForPage(page); // "/", "/about-us/", "/404/"
  if (page === 'not-found') {
    write(path.join(dist, '404.html'), html);
  } else if (p === '/') {
    write(path.join(dist, 'index.html'), html);
  } else {
    write(path.join(dist, p.replace(/^\//, ''), 'index.html'), html);
  }
  count++;
}

// ---- sitemap.xml ----
const today = new Date().toISOString().slice(0, 10);
const priority = (page) => {
  if (page === 'home') return ['weekly', '1.0'];
  if (['services', 'booking', 'female-massage', 'home-massage'].includes(page)) return ['weekly', '0.9'];
  if (page.startsWith('service:') || page.startsWith('area:')) return ['monthly', '0.8'];
  if (['aboutus', 'faq'].includes(page)) return ['monthly', '0.7'];
  if (['testimonials', 'contact'].includes(page)) return ['monthly', '0.6'];
  return ['monthly', '0.5'];
};
const urls = INDEXABLE_PAGES.map((page) => {
  const [freq, prio] = priority(page);
  return `  <url>
    <loc>${SITE_URL}${pathForPage(page)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${prio}</priority>
  </url>`;
});
write(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
);

// The SSR bundle is only needed during the build.
fs.rmSync(ssrDir, { recursive: true, force: true });

console.log(`Pre-rendered ${count} pages and sitemap.xml with ${INDEXABLE_PAGES.length} URLs -> dist/`);
