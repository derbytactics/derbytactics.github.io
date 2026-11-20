/// <reference types="node" />
/**
 * Convierte la web exportada en una app instalable (PWA): manifiesto, iconos y etiquetas
 * para iPhone y Android. Se ejecuta tras `expo export --platform web`.
 * Uso: npx tsx scripts/pwa.ts dist
 * Todas las rutas son relativas, así que funciona con cualquier ruta base (p. ej. /DerbyTactics/).
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'dist';
const app = JSON.parse(readFileSync('app.json', 'utf8')).expo;

for (const f of ['pwa-192.png', 'pwa-512.png', 'apple-touch-icon.png']) copyFileSync(join('assets', f), join(out, f));

writeFileSync(
  join(out, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: app.name,
      short_name: app.web.shortName,
      description: app.description,
      lang: 'es',
      start_url: './',
      scope: './',
      display: 'standalone',
      orientation: 'portrait',
      background_color: app.web.backgroundColor,
      theme_color: app.web.themeColor,
      icons: [
        { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ),
);

const tags = [
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  `<meta name="apple-mobile-web-app-title" content="${app.name}">`,
  `<meta name="description" content="${app.description}">`,
].join('\n');

const indexPath = join(out, 'index.html');
const html = readFileSync(indexPath, 'utf8');
if (!html.includes('rel="manifest"')) writeFileSync(indexPath, html.replace('</head>', `${tags}\n</head>`));
console.log(`App instalable preparada en ${out}`);
