// Checks the built site (dist/) the way a crawler sees it. Run after `npm run build`:
//   node scripts/seo-audit.mjs
import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const SITE = 'https://doorsteproyalespa.com';

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (f.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const strip = (h) =>
  h
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const problems = [];
const titles = new Map();
const descs = new Map();
const rows = [];
let jsonLdCount = 0;

for (const file of walk(dist)) {
  const rel = path.relative(dist, file).replace(/\\/g, '/');
  const html = fs.readFileSync(file, 'utf8');
  const get = (re) => (html.match(re) || [])[1];
  const dec = (x) => (x === undefined ? x : x.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  const title = dec(get(/<title>([^<]*)<\/title>/));
  const desc = dec(get(/<meta name="description" content="([^"]*)"/));
  const canonical = get(/<link rel="canonical" href="([^"]*)"/);
  const robots = get(/<meta name="robots" content="([^"]*)"/);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  const words = strip(html.replace(/<head>[\s\S]*<\/head>/, '')).split(' ').length;
  const links = (html.match(/<a [^>]*href="\/[^"]*"/g) || []).length;
  const imgNoAlt = (html.match(/<img(?![^>]*\balt=)[^>]*>/g) || []).length;
  const noindex = /noindex/.test(robots || '');

  const bad = [];
  if (!title) bad.push('no title');
  else {
    if (title.length > 65) bad.push(`title ${title.length} chars`);
    if (!noindex) titles.set(title, [...(titles.get(title) || []), rel]);
  }
  if (!desc) bad.push('no description');
  else {
    if (desc.length > 165) bad.push(`description ${desc.length} chars`);
    if (desc.length < 70 && !noindex) bad.push(`description short (${desc.length})`);
    if (!noindex) descs.set(desc, [...(descs.get(desc) || []), rel]);
  }
  if (!canonical) bad.push('no canonical');
  if (!robots) bad.push('no robots meta');
  if (h1 !== 1 && !noindex) bad.push(`${h1} <h1>`);
  if (imgNoAlt) bad.push(`${imgNoAlt} img without alt`);
  if (!noindex && words < 150) bad.push(`thin content (${words} words)`);
  if (/californiamassage|\bCalifornia Spa\b/i.test(html)) bad.push('mentions another brand');

  // structured data must parse
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
      jsonLdCount++;
    } catch {
      bad.push('invalid JSON-LD');
    }
  }
  if (!noindex && !/application\/ld\+json/.test(html)) bad.push('no structured data');

  rows.push({ rel, title, noindex, h1, words, links });
  if (bad.length) problems.push(`${rel}: ${bad.join('; ')}`);
}

for (const [t, files] of titles) if (files.length > 1) problems.push(`duplicate title "${t}": ${files.join(', ')}`);
for (const [d, files] of descs) if (files.length > 1) problems.push(`duplicate description: ${files.join(', ')}`);

// sitemap <-> files
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const loc of locs) {
  if (!loc.startsWith(SITE)) problems.push(`sitemap URL on wrong host: ${loc}`);
  const p = loc.replace(SITE, '');
  const f = p === '/' ? 'index.html' : path.join(p.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(path.join(dist, f))) problems.push(`sitemap URL has no page: ${loc}`);
  const html = fs.existsSync(path.join(dist, f)) ? fs.readFileSync(path.join(dist, f), 'utf8') : '';
  if (/noindex/.test(html)) problems.push(`sitemap lists a noindex page: ${loc}`);
  if (html && !html.includes(`<link rel="canonical" href="${loc}"`)) problems.push(`canonical differs from sitemap URL: ${loc}`);
}
if (new Set(locs).size !== locs.length) problems.push('duplicate URLs in sitemap');

for (const f of ['robots.txt', 'sitemap.xml', 'llms.txt', 'site.webmanifest', 'favicon.ico', 'og-image.jpg', '404.html']) {
  if (!fs.existsSync(path.join(dist, f))) problems.push(`missing dist/${f}`);
}

console.table(
  rows
    .sort((a, b) => a.rel.localeCompare(b.rel))
    .map((r) => ({ page: r.rel, index: r.noindex ? 'noindex' : 'index', h1: r.h1, words: r.words, 'internal links': r.links, title: (r.title || '').slice(0, 52) }))
);
console.log(`\nSitemap URLs: ${locs.length} | JSON-LD blocks parsed: ${jsonLdCount} | pages: ${rows.length}`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(' -', p);
  process.exitCode = 1;
} else {
  console.log('\nNo SEO problems found.');
}
