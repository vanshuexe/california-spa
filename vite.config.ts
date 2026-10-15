import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';

// After the normal (client) build, also pre-render every page to real HTML and write sitemap.xml.
// This makes a plain `vite build` produce a complete, search-engine-ready `dist/` folder, so the
// hosting platform does not need a special build command. (`npm run build` does the same steps.)
function prerenderAfterBuild(): Plugin {
  let isSsr = false;
  let isBuild = false;
  return {
    name: 'prerender-after-build',
    apply: 'build',
    configResolved(config) {
      isSsr = Boolean(config.build.ssr);
      isBuild = config.command === 'build';
    },
    closeBundle: {
      order: 'post',
      handler() {
        // the nested server-side build below must not trigger this again
        if (!isBuild || isSsr || process.env.SEO_PRERENDER_CHILD === '1') return;
        if (process.env.SKIP_PRERENDER === '1') return;
        const env = { ...process.env, SEO_PRERENDER_CHILD: '1' };
        const run = (cmd: string) => execSync(cmd, { stdio: 'inherit', env });
        run('npx vite build --ssr src/entry-server.tsx --outDir dist-ssr');
        run('node scripts/prerender.mjs');
      },
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), prerenderAfterBuild()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var. Do not modify.
      // File watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Never let the browser cache dev modules, so a normal refresh always shows the latest code.
      headers: { 'Cache-Control': 'no-store' },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
