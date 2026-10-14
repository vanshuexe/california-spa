import { renderToString } from 'react-dom/server';
import App from './App.tsx';
import type { PageId } from './types';

export { buildHeadTags } from './seo/head';
export { getSeo } from './seo/meta';
export { INDEXABLE_PAGES, PRERENDER_PAGES, pathForPage } from './seo/routes';
export { SITE_URL } from './seo/site';

// Used only by scripts/prerender.mjs at build time.
export function renderPage(page: PageId): string {
  return renderToString(<App initialPage={page} />);
}
