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
/** Dirección pública de la web. */
const SITE = process.env.SITE_URL ?? 'https://derbytactics.github.io/';
const PREVIEW = {
  title: 'DerbyTactics · Fútbol, cartas y dados',
  description: 'Ficha, elige a tus titulares en secreto y gana la liga a golpe de dado. Gratis, en el móvil.',
};
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
  // Vista previa al compartir el enlace (WhatsApp, Telegram, redes): título y texto cortos que se
  // leen enteros, e imagen con dirección completa (las previas no aceptan rutas relativas).
  '<meta property="og:type" content="website">',
  `<meta property="og:site_name" content="${app.name}">`,
  `<meta property="og:title" content="${PREVIEW.title}">`,
  `<meta property="og:description" content="${PREVIEW.description}">`,
  `<meta property="og:url" content="${SITE}">`,
  `<meta property="og:image" content="${SITE}pwa-512.png">`,
  '<meta name="twitter:card" content="summary">',
].join('\n');

const indexPath = join(out, 'index.html');
const html = readFileSync(indexPath, 'utf8');
if (!html.includes('rel="manifest"')) writeFileSync(indexPath, html.replace('</head>', `${tags}\n</head>`));
console.log(`App instalable preparada en ${out}`);
