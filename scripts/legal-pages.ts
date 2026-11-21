/// <reference types="node" />
/**
 * Genera páginas HTML estáticas con los textos legales, para enlazarlas desde las fichas
 * de las tiendas de apps (que piden una URL pública) y desde Supabase.
 * Uso: npx tsx scripts/legal-pages.ts dist
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEGAL, legalReady, privacy, terms, type LegalSection } from '../src/legal/texts';

const out = process.argv[2] ?? 'dist';
mkdirSync(out, { recursive: true });

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const page = (title: string, sections: LegalSection[]) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · DerbyTactics</title>
<style>
  body { margin: 0; background: #07160F; color: #E8F1EA; font: 16px/1.6 system-ui, sans-serif; }
  main { max-width: 680px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  h2 { font-size: 18px; margin: 28px 0 6px; color: #F5C542; }
  p { margin: 0 0 10px; }
  .meta { color: #9DB5A4; font-size: 14px; }
  .draft { background: #5A1F1F; border-radius: 8px; padding: 10px 12px; margin: 16px 0; }
  a { color: #F5C542; }
  nav { margin-top: 40px; font-size: 14px; }
</style>
</head>
<body><main>
<h1>${esc(title)}</h1>
<p class="meta">DerbyTactics · Última actualización: ${esc(LEGAL.updated)}</p>
${legalReady() ? '' : '<p class="draft">Borrador: faltan los datos del titular y del contacto.</p>'}
${sections.map((s) => `<h2>${esc(s.title)}</h2>\n${s.body.map((p) => `<p>${esc(p)}</p>`).join('\n')}`).join('\n')}
<nav><a href="privacidad.html">Privacidad</a> · <a href="condiciones.html">Condiciones</a> · <a href="borrar-cuenta.html">Borrar tu cuenta</a> · <a href="./">Jugar</a></nav>
</main></body>
</html>
`;

const contact = LEGAL.contact || '[pendiente: correo de contacto]';
const deletion: LegalSection[] = [
  {
    title: 'Desde el juego',
    body: [
      'Entra con tu cuenta, abre el menú (☰), toca «Mi cuenta» y pulsa «Borrar mi cuenta». Confirma y la cuenta se borra en el momento.',
    ],
  },
  {
    title: 'Qué se borra',
    body: [
      'Tu correo, tu nombre de usuario, tu avatar, tus victorias, las valoraciones que has dado y recibido, las partidas que organizaste como anfitrión y los informes de error ligados a tu cuenta.',
      'En las partidas de otros anfitriones en las que jugaste, los demás siguen viendo el resultado y el nombre de club que usaste, pero ya no está vinculado a ninguna cuenta.',
    ],
  },
  {
    title: 'Si no puedes entrar',
    body: [`Escribe a ${contact} desde el correo de la cuenta pidiendo que se borre. Se atenderá en un plazo máximo de 30 días.`],
  },
];

writeFileSync(join(out, 'privacidad.html'), page('Política de privacidad', privacy()));
writeFileSync(join(out, 'condiciones.html'), page('Condiciones de uso', terms()));
writeFileSync(join(out, 'borrar-cuenta.html'), page('Borrar tu cuenta', deletion));
console.log(`Páginas legales generadas en ${out}${legalReady() ? '' : ' (borrador: faltan titular y contacto)'}`);
