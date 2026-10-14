# SEO & local-search guide for doorsteproyalespa.com

Everything that can be done **inside the website** is already built. This file lists what changed,
how to publish it correctly, and the **off-site steps only you can do** (these matter as much as the code).

> No one can honestly promise "100% ranking" or a position #1: Google decides that. What the site now
> has is every technical and on-page signal in place, so it can compete. Rankings then come from the
> off-site work below (Google Business Profile, reviews, links) over weeks and months.

---

## 1. Publish it correctly (important)

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Publish / output directory | `dist` |
| Node | 20+ |
| Environment variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (required). Optional: `VITE_GSC_VERIFICATION`, `VITE_BING_VERIFICATION`, `VITE_GA_ID` |

`npm run build` does three things: builds the app, renders every page to real HTML, and writes
`sitemap.xml`. After a build, run `node scripts/seo-audit.mjs` to check every page.

**Host rules** (set these at your host / DNS):
1. **HTTPS everywhere**, and redirect `www.doorsteproyalespa.com` to `https://doorsteproyalespa.com` (one canonical host).
2. **Unknown URLs must return a real HTTP 404** and serve `404.html`. Do **not** rewrite everything to `index.html` with status 200 (Google treats that as a "soft 404").
3. Pages are folders (`/about-us/` serves `/about-us/index.html`). Keep the trailing slash.
4. Ready-made config is included: `public/_headers` + `public/_redirects` (Netlify / Cloudflare Pages), `public/.htaccess` (Apache / cPanel), `vercel.json` (Vercel). For nginx:

```nginx
server {
  server_name doorsteproyalespa.com www.doorsteproyalespa.com;
  root /var/www/doorsteproyalespa/dist;
  index index.html;
  error_page 404 /404.html;
  if ($host = www.doorsteproyalespa.com) { return 301 https://doorsteproyalespa.com$request_uri; }
  location / { try_files $uri $uri/ =404; }
  location /assets/ { add_header Cache-Control "public, max-age=604800"; }
  gzip on; gzip_types text/css application/javascript application/json application/xml image/svg+xml;
}
```

5. In **Supabase → Authentication → URL Configuration** set *Site URL* to `https://doorsteproyalespa.com`.
6. Staff pages moved: admin is now **`/admin/`** and therapists **`/therapist/`** (old `/#admin` links redirect automatically).

---

## 2. What is now built into the site

**Real URLs (this was the biggest problem).** Before, pages were `/#aboutus`: Google cannot index those as separate pages. Now every page has its own URL, its own pre-rendered HTML, and old `#` links redirect.

| Page | URL |
|---|---|
| Home | `/` |
| Services & pricing | `/services-pricing/` |
| Book appointment | `/book-appointment/` |
| Female therapists | `/female-massage-bangalore/` |
| Home spa | `/home-spa-massage-bangalore/` |
| About / Testimonials / Contact / Jobs / FAQ | `/about-us/` `/testimonials/` `/contact/` `/jobs/` `/faq/` |
| 8 service pages | `/services/swedish-massage/` … (deep tissue, aromatherapy, relaxation, head-neck-shoulder, foot, Balinese, Thai) |
| 15 area pages (local SEO) | `/home-massage-in-koramangala/` … (all areas in the booking form) |
| Not indexed on purpose | `/admin/` `/therapist/` `/login/` `/register/` `/chat-with-us/` `/404.html` |

**On every indexable page:** unique `<title>` (under 60 chars) and meta description (under 160), one `<h1>`,
canonical URL, `hreflang="en-IN"`, Open Graph + Twitter cards (1200x630 share image), `robots` meta with
large-image previews, descriptive image `alt`, `width/height`, lazy loading, internal links (the footer links to every service and area page).

**Structured data (JSON-LD):** `DaySpa` / `HealthAndBeautyBusiness` (hours 9 AM to 10 PM, phones, price range,
Bangalore geo + all 15 areas served), `WebSite`, `BreadcrumbList`, `Service` + `Offer` (prices in INR), `OfferCatalog`, `FAQPage`, `AboutPage`, `ContactPage`.

**Local / geo (Bangalore):** geo meta tags (`geo.region`, `geo.placename`, `ICBM`), `areaServed` for each neighbourhood, one landing page per area, area-specific titles.

**Crawl files:** `robots.txt` (allows search + AI crawlers, blocks staff pages, points to the sitemap), `sitemap.xml` (33 URLs, regenerated every build), `llms.txt` (summary for AI assistants such as ChatGPT / Perplexity / Claude so they describe and cite you correctly), `site.webmanifest`, favicons + app icons (made from your real logo).

**Performance:** staff panels load on demand, so the public bundle is smaller; hero image is prioritised, others lazy-load; fonts use `display=swap`.

**Cleaned up:** removed images that were being loaded from another business's website (californiamassage.in), fixed leftover "California Spa" wording, and made the social-share links point at your real domain.

---

## 3. Do these next (off-site: this is where rankings come from)

### Week 1: get indexed
1. **Google Search Console** → add property `https://doorsteproyalespa.com` → verify (HTML tag: put the `content` value in `VITE_GSC_VERIFICATION`, redeploy) → **Sitemaps → submit** `https://doorsteproyalespa.com/sitemap.xml` → use **URL Inspection → Request indexing** for the home page, `/services-pricing/`, `/book-appointment/` and a few area pages.
2. **Bing Webmaster Tools** → import from Search Console (also feeds DuckDuckGo, Yahoo and ChatGPT search).
3. **Google Analytics 4** → set `VITE_GA_ID`.

### Week 1-2: Google Business Profile (the #1 local ranking factor)
1. Create a profile at business.google.com as a **Service-area business** (no public address), area = Bangalore + the 15 neighbourhoods. Category: *Massage therapist* (or *Spa*). Hours 9 AM to 10 PM, both phone numbers, website `https://doorsteproyalespa.com/`, prices, services, photos (real photos of your team and setup).
2. Keep **name, phone, website identical** everywhere (NAP consistency): website, Google, Justdial, Sulekha, IndiaMART, Facebook, Instagram.
3. Add your profile links to `sameAs` in `src/seo/site.ts` (`BUSINESS.sameAs`) once they exist, then rebuild.

### Ongoing
- **Reviews:** ask every happy customer for a Google review (send the review link by WhatsApp after the session). Reply to every review. Reviews are the strongest local signal.
- **Backlinks:** list on Justdial, Sulekha, UrbanPro, Yellow Pages India, local directories; partner with hotels, co-living and apartment communities, wellness bloggers; get press or "best home spa in Bangalore" list mentions.
- **Content:** add a blog (`/blog/`) with genuinely useful posts: "Swedish vs deep tissue massage", "How to prepare for a home massage", "Best massage after a long flight/work week in Bangalore". One good post per week beats many thin ones.
- **Photos & video:** real photos with descriptive file names; a short Instagram Reels / YouTube video of a session setup (with permission).
- **Speed:** keep images small (WebP) and test at https://pagespeed.web.dev after each deploy.

---

## 4. Please check (business decisions I can't make for you)

- **Address:** the site publishes **no street address** (service-area business). If you have a registered office/studio customers can visit, add it to `src/seo/site.ts` and Google Business Profile: it helps local ranking.
- **Reviews markup:** customer testimonials are shown on `/testimonials/` but are **not** marked up as ratings, because Google ignores (and can penalise) self-published star ratings. Real Google reviews will show automatically.
- **Services:** make sure what you describe is exactly what you offer. Pages promise nothing beyond professional massage / spa therapy.
- **Content originality:** pages were rewritten and are only about 3% similar to the old reference site. Keep new text original: copied text will not rank.
- **`sitemap.xml` dates** are the build date. They update each time you deploy.

---

## 5. Files

| File | Purpose |
|---|---|
| `src/seo/site.ts` | Domain, business data (hours, phones, geo, `sameAs`) |
| `src/seo/meta.ts` | Title, description, canonical, schema for every page |
| `src/seo/routes.ts` | URL for every page, and which pages are indexable |
| `src/seo/areas.ts` | The 15 areas (area pages, titles) |
| `src/seo/faqs.ts` | FAQ text (page + FAQ schema) |
| `scripts/prerender.mjs` | Build step: HTML for each page + `sitemap.xml` |
| `scripts/seo-audit.mjs` | Checks every built page (`node scripts/seo-audit.mjs`) |
| `public/robots.txt`, `llms.txt`, `site.webmanifest`, `_headers`, `_redirects`, `.htaccess` | Crawl + hosting config |

To change prices, hours or phone numbers: edit `src/data/siteData.ts` (and `src/seo/site.ts` for hours), then run `npm run build`.
