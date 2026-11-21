/** Utilidades de color sin dependencias de React Native (se pueden probar en Node). */
import { CrestDesign } from '../engine';

/** Colores de club por orden de asiento (cuando no hay escudo del que sacarlo). */
export const CLUB_COLORS = ['#E5484D', '#3E8BFF', '#F5C542', '#35C98A', '#A07CF5', '#FF8A3D', '#2CC7D8', '#F06CA8'];

/** Mezcla dos colores #RRGGBB (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
export const darken = (c: string, t: number) => mix(c, '#000000', t);
export const lighten = (c: string, t: number) => mix(c, '#FFFFFF', t);
export function lumaOf(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function distance(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}
/** Visible sobre el fondo verde oscuro: ni casi negro ni casi blanco, y con algo de luz. */
function readable(c: string): string | null {
  const l = lumaOf(c);
  if (l < 0.1 || l > 0.86) return null;
  let out = c;
  for (let i = 0; i < 6 && lumaOf(out) < 0.24; i++) out = lighten(out, 0.15);
  return out;
}

/**
 * Color de cada club en la partida: sale de su escudo, para que camiseta, marcador y escudo casen.
 * Si el escudo es casi negro o casi blanco se usa el otro color, se aclara lo que no se vería sobre
 * el fondo oscuro y, si dos clubes quedan demasiado parecidos, el segundo toma otro color.
 */
export function clubPalette(crests: (CrestDesign | undefined)[]): string[] {
  const chosen: string[] = [];
  crests.forEach((crest, i) => {
    const candidates = [crest?.primary, crest?.secondary, CLUB_COLORS[i % CLUB_COLORS.length], ...CLUB_COLORS]
      .filter((c): c is string => !!c)
      .map(readable)
      .filter((c): c is string => !!c);
    const pick = candidates.find((c) => chosen.every((o) => distance(o, c) > 90)) ?? CLUB_COLORS[i % CLUB_COLORS.length];
    chosen.push(pick);
  });
  return chosen;
}

