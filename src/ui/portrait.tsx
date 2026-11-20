/**
 * Retratos de futbolista dibujados por código: cara con volumen, rasgos y peinados
 * de todas las procedencias. Los rasgos salen de la identidad (etnia + entero `face`).
 */
import React from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { ETHNICITIES, Ethnicity, makeRand } from '../engine';

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

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

/** Diez tonos de piel, de muy claro a muy oscuro. */
const SKINS = ['#FBE3D1', '#F4CFB3', '#EAB995', '#DCA37B', '#C88B61', '#AE7249', '#925E38', '#764A2B', '#5B381F', '#422815'];

type EyeShape = 'almond' | 'round' | 'mono';
interface Spec {
  skin: number[];
  hair: string[];
  styles: number[];
  eyes: EyeShape[];
  eyeColor: string[];
  nose: [number, number];
  lips: [number, number];
  beard: number;
}
const SPEC: Record<Ethnicity, Spec> = {
  europeo: {
    skin: [0, 1, 1, 2],
    hair: ['#2A1D15', '#4B3121', '#6E4A2E', '#9C7044', '#C9A266', '#E0C590', '#9A4A26'],
    styles: [1, 2, 3, 4, 9, 10, 12, 0, 13, 5, 11],
    eyes: ['round', 'almond'],
    eyeColor: ['#5A3B25', '#3F6E93', '#4E7B4C', '#6F7F8C', '#7B5A3A'],
    nose: [0.9, 1.05],
    lips: [0.75, 1.0],
    beard: 0.35,
  },
  mediterraneo: {
    skin: [2, 3, 3, 4],
    hair: ['#17110D', '#2A1D15', '#3E2A1C', '#5A3D27'],
    styles: [1, 2, 3, 4, 5, 10, 12, 0, 13, 9],
    eyes: ['almond', 'round'],
    eyeColor: ['#3B2416', '#5A3B25', '#4E5B3A'],
    nose: [1.0, 1.15],
    lips: [0.9, 1.1],
    beard: 0.45,
  },
  africano: {
    skin: [6, 7, 8, 9],
    hair: ['#0F0C0B', '#1A1411'],
    styles: [0, 5, 6, 7, 8, 11, 14, 13, 0],
    eyes: ['almond', 'round'],
    eyeColor: ['#24160E', '#2F1D12'],
    nose: [1.25, 1.45],
    lips: [1.2, 1.45],
    beard: 0.35,
  },
  magrebi: {
    skin: [3, 4, 5],
    hair: ['#120E0C', '#24190F', '#3A2718'],
    styles: [5, 1, 2, 0, 13, 4, 3],
    eyes: ['almond'],
    eyeColor: ['#2F1D12', '#4A3020', '#4E5B3A'],
    nose: [1.05, 1.25],
    lips: [0.95, 1.15],
    beard: 0.5,
  },
  asiaEste: {
    skin: [1, 2, 2, 3],
    hair: ['#0C0C10', '#17141A', '#2A2020', '#8A5A34'],
    styles: [12, 2, 1, 0, 3, 4, 10, 12],
    eyes: ['mono'],
    eyeColor: ['#1E140F', '#2A1C14'],
    nose: [0.9, 1.05],
    lips: [0.85, 1.0],
    beard: 0.08,
  },
  asiaSur: {
    skin: [4, 5, 6],
    hair: ['#0D0B0B', '#1A1412'],
    styles: [2, 1, 3, 4, 5, 0, 10],
    eyes: ['almond', 'round'],
    eyeColor: ['#1E140F', '#2F1D12'],
    nose: [1.05, 1.25],
    lips: [0.95, 1.15],
    beard: 0.45,
  },
  mestizo: {
    skin: [3, 4, 5, 6],
    hair: ['#120E0C', '#24190F', '#3A2718', '#5A3D27'],
    styles: [5, 1, 3, 6, 0, 14, 13, 7],
    eyes: ['almond', 'round'],
    eyeColor: ['#2F1D12', '#4A3020'],
    nose: [1.1, 1.3],
    lips: [1.0, 1.25],
    beard: 0.35,
  },
};

export interface Face {
  eth: Ethnicity;
  face: number;
}

interface Features {
  skin: string;
  hair: string;
  style: number;
  eyes: EyeShape;
  eyeColor: string;
  nose: number;
  lips: number;
  beard: number;
  W: number;
  jaw: number;
  chin: number;
  browTilt: number;
  browThick: number;
  collar: number;
  smile: number;
}

function features({ eth, face }: Face): Features {
  const r = makeRand(face);
  const spec = SPEC[eth] ?? SPEC.europeo;
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length) % a.length];
  const lerp = ([a, b]: [number, number]) => a + (b - a) * r();
  const skin = SKINS[pick(spec.skin)];
  const hair = pick(spec.hair);
  const style = pick(spec.styles);
  return {
    skin,
    hair,
    style,
    eyes: pick(spec.eyes),
    eyeColor: pick(spec.eyeColor),
    nose: lerp(spec.nose),
    lips: lerp(spec.lips),
    beard: r() < spec.beard ? pick([1, 1, 2, 3, 4]) : 0,
    W: 15.6 + r() * 1.8,
    jaw: r(),
    chin: 4.5 + r() * 2.5,
    browTilt: (r() - 0.5) * 1.6,
    browThick: 0.85 + r() * 0.55,
    collar: Math.floor(r() * 3),
    smile: 0.2 + r() * 0.9,
  };
}

const T = 21; // parte alta de la frente
const EYE_Y = 44.5;

function facePath(W: number, jaw: number, chin: number): string {
  const L = 50 - W;
  const R = 50 + W;
  const j = (1 - jaw) * 2.4;
  return (
    `M50 ${T} C${50 + W * 0.62} ${T} ${R} ${T + 6} ${R} ${T + 18} ` +
    `C${R} ${T + 28} ${R - 1 - j} ${T + 35} ${50 + chin + 2} ${T + 40} ` +
    `Q50 ${T + 45} ${50 - chin - 2} ${T + 40} ` +
    `C${L + 1 + j} ${T + 35} ${L} ${T + 28} ${L} ${T + 18} ` +
    `C${L} ${T + 6} ${50 - W * 0.62} ${T} 50 ${T} Z`
  );
}

/** Casquete de pelo: `c` controla el volumen, `line` la altura del nacimiento del pelo y `side` hasta dónde bajan las patillas. */
function cap(W: number, c: number, line: number, side: number, ex: number): string {
  const L = 50 - W;
  const R = 50 + W;
  return (
    `M${L - ex} ${side} C${L - ex - 1} ${c} ${R + ex + 1} ${c} ${R + ex} ${side} ` +
    `L${R - 1.2} ${side} C${R - 1.6} ${line + 2} ${R - 3} ${line - 1.5} ${50 + W * 0.45} ${line - 0.6} ` +
    `Q50 ${line + 1} ${50 - W * 0.45} ${line - 0.6} C${L + 3} ${line - 1.5} ${L + 1.6} ${line + 2} ${L + 1.2} ${side} Z`
  );
}

/** Pelo que queda por detrás de la cabeza (melenas, afro, rastas, moño). */
function HairBack({ f }: { f: Features }) {
  const { W, hair, style } = f;
  const L = 50 - W;
  const R = 50 + W;
  const lo = darken(hair, 0.25);
  if (style === 6) {
    return (
      <G>
        <Ellipse cx="50" cy={T + 13} rx={W + 10} ry="21" fill={lo} />
        <Ellipse cx="50" cy={T + 11} rx={W + 9} ry="19.5" fill={hair} />
      </G>
    );
  }
  if (style === 8) {
    const xs = [-1.05, -0.8, -0.5, 0.5, 0.8, 1.05];
    return (
      <G>
        {xs.map((k, i) => (
          <Path
            key={i}
            d={`M${50 + k * W} ${T + 8} C${50 + k * (W + 3)} ${T + 22} ${50 + k * (W + 4)} ${T + 34} ${50 + k * (W + 5)} ${T + 47}`}
            stroke={i % 2 ? hair : lo}
            strokeWidth="4.2"
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </G>
    );
  }
  if (style === 9) {
    return <Path d={`M${L - 2.5} ${T + 12} C${L - 5} ${T + 30} ${L - 3} ${T + 44} ${L + 2} ${T + 48} L${R - 2} ${T + 48} C${R + 3} ${T + 44} ${R + 5} ${T + 30} ${R + 2.5} ${T + 12} Z`} fill={lo} />;
  }
  if (style === 10) {
    return (
      <G>
        <Circle cx="50" cy={T - 3} r="4.6" fill={hair} />
        <Path d={`M46.5 ${T - 3} Q50 ${T - 6.5} 53.5 ${T - 3}`} stroke={lighten(hair, 0.2)} strokeWidth="0.8" fill="none" opacity="0.6" />
      </G>
    );
  }
  return null;
}

/** Pelo por delante: casquete, flequillos, crestas… */
function HairFront({ f }: { f: Features }) {
  const { W, hair, style, skin } = f;
  const L = 50 - W;
  const R = 50 + W;
  const hi = lighten(hair, 0.28);
  const lo = darken(hair, 0.3);
  const fade = <Path d={cap(W, 16, T + 8, 41, 0.2)} fill={hair} opacity="0.5" />;
  switch (style) {
    case 0: // rapado
      return (
        <G>
          <Path d={cap(W, 16.5, T + 8, 41, 0.3)} fill={hair} opacity="0.85" />
          <Path d={cap(W, 16.5, T + 8, 41, 0.3)} fill="none" stroke={lo} strokeWidth="0.5" opacity="0.4" />
        </G>
      );
    case 1: // corto
      return (
        <G>
          <Path d={cap(W, 12.5, T + 10.5, 42, 1.2)} fill={hair} />
          <Path d={`M${50 - W * 0.5} ${T + 2} Q50 ${T - 1} ${50 + W * 0.55} ${T + 1.5}`} stroke={hi} strokeWidth="1" fill="none" opacity="0.5" strokeLinecap="round" />
          {[-0.5, -0.15, 0.2, 0.5].map((k, i) => (
            <Path key={i} d={`M${50 + k * W} ${T + 9.5} l1.6 -3.2`} stroke={hair} strokeWidth="1.6" strokeLinecap="round" />
          ))}
        </G>
      );
    case 2: // raya al lado
      return (
        <G>
          <Path d={cap(W, 12, T + 11, 42, 1.5)} fill={hair} />
          <Path d={`M${L - 1} ${T + 11} C${L} ${T - 4} ${50 + W * 0.6} ${T - 6} ${R + 1.5} ${T + 9} C${R - 4} ${T + 2} ${50} ${T + 1} ${50 - W * 0.42} ${T + 4} Z`} fill={hair} />
          <Path d={`M${50 - W * 0.42} ${T + 0.5} L${50 - W * 0.42} ${T + 5.5}`} stroke={lo} strokeWidth="0.9" strokeLinecap="round" />
          <Path d={`M${50 - W * 0.2} ${T + 1} Q${50 + W * 0.3} ${T - 3} ${R - 1} ${T + 5}`} stroke={hi} strokeWidth="1.1" fill="none" opacity="0.55" strokeLinecap="round" />
        </G>
      );
    case 3: // tupé
      return (
        <G>
          <Path d={cap(W, 13, T + 9, 41, 1.2)} fill={hair} />
          <Path d={`M${50 - W * 0.85} ${T + 7} C${50 - W * 0.8} ${T - 9} ${50 + W * 0.6} ${T - 12} ${50 + W * 0.95} ${T + 2} C${50 + W * 0.4} ${T - 2} ${50 - W * 0.3} ${T + 1} ${50 - W * 0.85} ${T + 7} Z`} fill={hair} />
          <Path d={`M${50 - W * 0.55} ${T + 1} C${50 - W * 0.4} ${T - 7} ${50 + W * 0.4} ${T - 9} ${50 + W * 0.75} ${T - 1}`} stroke={hi} strokeWidth="1.2" fill="none" opacity="0.6" strokeLinecap="round" />
        </G>
      );
    case 4: // engominado hacia atrás
      return (
        <G>
          <Path d={cap(W, 12.5, T + 9.5, 41, 1)} fill={hair} />
          {[-0.45, 0, 0.45].map((k, i) => (
            <Path key={i} d={`M${50 + k * W} ${T + 8} Q${50 + k * W * 1.15} ${T + 3} ${50 + k * W * 1.05} ${T}`} stroke={hi} strokeWidth="0.8" fill="none" opacity="0.3" strokeLinecap="round" />
          ))}
        </G>
      );
    case 5: // rizos arriba y laterales degradados
    case 14: // twists
    case 13: // cresta
      return (
        <G>
          {fade}
          {style === 5
            ? [
                ...[-0.36, -0.12, 0.12, 0.36].map((k) => [k, T - 1.5, 2.6]),
                ...[-0.6, -0.36, -0.12, 0.12, 0.36, 0.6].map((k) => [k, T + 2, 2.7]),
                ...[-0.82, -0.6, -0.36, -0.12, 0.12, 0.36, 0.6, 0.82].map((k) => [k, T + 5.6 + Math.abs(k) * 1.5, 2.5]),
              ].map(([k, y, rr], i) => (
                <G key={i}>
                  <Circle cx={50 + k * W} cy={y} r={rr} fill={i % 3 ? hair : lo} />
                  <Path d={`M${50 + k * W - rr * 0.6} ${y - rr * 0.1} a${rr * 0.6} ${rr * 0.6} 0 0 1 ${rr * 1.1} -${rr * 0.4}`} stroke={hi} strokeWidth="0.6" fill="none" opacity="0.5" />
                </G>
              ))
            : null}
          {style === 14
            ? [-0.7, -0.45, -0.2, 0.05, 0.3, 0.55, 0.78].map((k, i) => (
                <G key={i}>
                  <Path d={`M${50 + k * W} ${T + 8.5} L${50 + k * W + 0.6} ${T - 0.5 + Math.abs(k) * 5}`} stroke={lo} strokeWidth="3.6" strokeLinecap="round" />
                  <Path d={`M${50 + k * W} ${T + 8} L${50 + k * W + 0.6} ${T + Math.abs(k) * 5}`} stroke={hair} strokeWidth="2.4" strokeLinecap="round" />
                </G>
              ))
            : null}
          {style === 13 ? (
            <G>
              <Path d={`M44 ${T + 9} C43 ${T - 1} 47 ${T - 5} 51 ${T - 5.5} C54 ${T - 4} 57 ${T} 56 ${T + 9} Z`} fill={hair} />
              <Path d={`M48 ${T + 4} C48 ${T} 49.5 ${T - 3} 51 ${T - 4}`} stroke={hi} strokeWidth="1" fill="none" opacity="0.5" strokeLinecap="round" />
            </G>
          ) : null}
        </G>
      );
    case 6: // afro (frente)
      return (
        <G>
          <Path d={cap(W, 9, T + 8.5, 44, 3.5)} fill={hair} />
          {[-0.8, -0.4, 0, 0.4, 0.8].map((k, i) => (
            <Circle key={i} cx={50 + k * W} cy={T + 8.6 - Math.abs(k) * 1.5} r="1.6" fill={hair} />
          ))}
        </G>
      );
    case 7: // trenzas pegadas
      return (
        <G>
          <Path d={cap(W, 15, T + 8, 41, 0.6)} fill={hair} />
          {[-0.75, -0.45, -0.15, 0.15, 0.45, 0.75].map((k, i) => (
            <Path key={i} d={`M${50 + k * W * 1.05} ${T + 8.5} Q${50 + k * W * 1.25} ${T + 1} ${50 + k * W * 1.4} ${T - 3}`} stroke={darken(skin, 0.15)} strokeWidth="0.8" fill="none" opacity="0.8" />
          ))}
        </G>
      );
    case 8: // rastas (frente)
      return (
        <G>
          <Path d={cap(W, 11, T + 9, 42, 2)} fill={hair} />
          {[-0.6, -0.2, 0.2, 0.6].map((k, i) => (
            <Path key={i} d={`M${50 + k * W} ${T + 9} Q${50 + k * W * 1.1} ${T + 2} ${50 + k * W * 1.3} ${T - 2}`} stroke={lo} strokeWidth="1.2" fill="none" />
          ))}
        </G>
      );
    case 9: // melena con cinta
      return (
        <G>
          <Path d={cap(W, 12, T + 10, 46, 2.5)} fill={hair} />
          <Path d={`M${L - 1.5} ${T + 9} Q50 ${T + 3} ${R + 1.5} ${T + 9} L${R + 1.2} ${T + 12} Q50 ${T + 6} ${L - 1.2} ${T + 12} Z`} fill="#F4F1E8" />
          <Path d={`M${50 - W * 0.4} ${T + 1} Q50 ${T - 2} ${50 + W * 0.5} ${T + 1}`} stroke={hi} strokeWidth="1" fill="none" opacity="0.5" />
        </G>
      );
    case 10: // moño
      return <Path d={cap(W, 14, T + 8, 40, 1)} fill={hair} />;
    case 11: // calvo
      return (
        <G>
          <Path d={`M${L + 0.2} ${T + 22} C${L} ${T + 14} ${L + 1} ${T + 12} ${L + 2} ${T + 11} L${L + 2.6} ${T + 19} Z`} fill={hair} opacity="0.35" />
          <Path d={`M${R - 0.2} ${T + 22} C${R} ${T + 14} ${R - 1} ${T + 12} ${R - 2} ${T + 11} L${R - 2.6} ${T + 19} Z`} fill={hair} opacity="0.35" />
          <Ellipse cx="45" cy={T + 4} rx="6" ry="2.6" fill="#FFFFFF" opacity="0.22" />
        </G>
      );
    case 12: // flequillo recto
    default: {
      const pts: string[] = [];
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const x = L - 0.5 + ((W * 2 + 1) * i) / n;
        pts.push(`${x} ${T + (i % 2 ? 11 : 13) - Math.abs(i - n / 2) * 0.35}`);
      }
      return (
        <G>
          <Path d={cap(W, 11.5, T + 10, 42, 1.6)} fill={hair} />
          <Path d={`M${L - 1} ${T + 9} L${pts.join(' L')} L${R + 1} ${T + 9} C${R} ${T + 2} ${L} ${T + 2} ${L - 1} ${T + 9} Z`} fill={hair} />
          <Path d={`M${50 - W * 0.55} ${T + 1.5} Q50 ${T - 1.5} ${50 + W * 0.55} ${T + 1.5}`} stroke={hi} strokeWidth="1" fill="none" opacity="0.5" />
        </G>
      );
    }
  }
}

function Beard({ f }: { f: Features }) {
  const { W, hair, beard } = f;
  if (!beard) return null;
  const L = 50 - W;
  const R = 50 + W;
  const lower = `M${L + 0.3} 45 C${L + 1} 55 44 65.5 50 65.5 C56 65.5 ${R - 1} 55 ${R - 0.3} 45 C${R - 2.5} 51 ${R - 5} 54.5 56.5 56 Q50 54.4 43.5 56 C${L + 5} 54.5 ${L + 2.5} 51 ${L + 0.3} 45 Z`;
  const stache = `M43.6 57 Q46 54.6 50 55.4 Q54 54.6 56.4 57 Q53 56.4 50 56.8 Q47 56.4 43.6 57 Z`;
  if (beard === 1) return <Path d={lower} fill={hair} opacity="0.26" />;
  if (beard === 2)
    return (
      <G>
        <Path d={lower} fill={hair} opacity="0.92" />
        <Path d={stache} fill={hair} />
      </G>
    );
  if (beard === 3)
    return (
      <G>
        <Path d="M45 56.6 Q50 55 55 56.6 L55.4 61 Q55.5 65.4 50 65.6 Q44.5 65.4 44.6 61 Z" fill={hair} opacity="0.9" />
        <Path d={stache} fill={hair} />
      </G>
    );
  return (
    <G>
      <Path d={lower} fill={hair} opacity="0.18" />
      <Path d={stache} fill={hair} />
    </G>
  );
}

function Eye({ x, side, f, clip }: { x: number; side: 1 | -1; f: Features; clip: string }) {
  const shape = f.eyes;
  const white = shape === 'mono' ? 'M-4.2 0.5 Q-0.2 -2.1 4.4 -0.6 Q0.6 1.8 -4.2 0.5 Z' : shape === 'round' ? 'M-4 0.4 Q-0.2 -3.8 4.2 0 Q0.4 3 -4 0.4 Z' : 'M-4.2 0.3 Q-0.5 -3.2 4.4 -0.4 Q0.8 2.3 -4.2 0.3 Z';
  const lid = shape === 'mono' ? 'M-4.4 0.5 Q-0.2 -2.4 4.6 -0.7' : shape === 'round' ? 'M-4.2 0.4 Q-0.2 -4.1 4.4 0' : 'M-4.4 0.2 Q-0.5 -3.6 4.6 -0.5';
  const ir = shape === 'mono' ? 2.1 : 2.45;
  const shadow = darken(f.skin, 0.28);
  return (
    <G transform={`translate(${x} ${EYE_Y}) scale(${side} 1)`}>
      <Defs>
        <ClipPath id={clip}>
          <Path d={white} />
        </ClipPath>
      </Defs>
      <Ellipse cx="0" cy="-0.6" rx="5.2" ry="3.4" fill={shadow} opacity="0.18" />
      <Path d={white} fill="#EFE9E1" />
      <G clipPath={`url(#${clip})`}>
        <Circle cx="-0.2" cy={shape === 'mono' ? 0 : -0.3} r={ir} fill={f.eyeColor} />
        <Circle cx="-0.2" cy={shape === 'mono' ? 0 : -0.3} r={ir * 0.5} fill="#0B0807" />
        <Circle cx="0.6" cy="-1.1" r="0.6" fill="#FFFFFF" />
        <Path d="M-5 -3 H5 V-1.2 Q0 -2.2 -5 -1.2 Z" fill={shadow} opacity="0.25" />
      </G>
      <Path d={lid} stroke="#1A120D" strokeWidth={shape === 'mono' ? 1.35 : 1.1} fill="none" strokeLinecap="round" />
      {shape !== 'mono' ? <Path d="M-3.4 -2.4 Q0 -4.9 3.8 -2.6" stroke={shadow} strokeWidth="0.7" fill="none" opacity="0.55" strokeLinecap="round" /> : null}
    </G>
  );
}

function Brow({ x, side, f }: { x: number; side: 1 | -1; f: Features }) {
  const color = lumaOf(f.hair) > 0.45 ? darken(f.hair, 0.35) : darken(f.hair, 0.1);
  const t = f.browThick;
  return (
    <G transform={`translate(${x} ${EYE_Y - 5.4}) scale(${side} 1) rotate(${f.browTilt * 4})`}>
      <Path d={`M-5 ${1 * t} C-3 ${-1.2 * t} 1.5 ${-1.7 * t} 5.2 ${-0.2} C1.5 ${-0.3 * t} -2.5 ${0.2 * t} -5 ${2.1 * t} Z`} fill={color} />
    </G>
  );
}

function Nose({ f }: { f: Features }) {
  const k = f.nose;
  const sh = darken(f.skin, 0.32);
  return (
    <G>
      <Path d={`M48.6 46 C48.2 49 ${50 - 2.6 * k} 51 ${50 - 3 * k} 52.6`} stroke={sh} strokeWidth="0.8" fill="none" opacity="0.45" strokeLinecap="round" />
      <Path d={`M${50 - 3.5 * k} 52.6 Q${50 - 4.4 * k} 54.8 ${50 - 1.7 * k} 54.9`} stroke={sh} strokeWidth="1" fill="none" strokeLinecap="round" />
      <Path d={`M${50 + 3.5 * k} 52.6 Q${50 + 4.4 * k} 54.8 ${50 + 1.7 * k} 54.9`} stroke={sh} strokeWidth="1" fill="none" strokeLinecap="round" />
      <Path d={`M${50 - 1.5 * k} 55.2 Q50 56 ${50 + 1.5 * k} 55.2`} stroke={sh} strokeWidth="0.8" fill="none" opacity="0.7" strokeLinecap="round" />
      <Ellipse cx="50.7" cy="52.8" rx={1.3 * k} ry="0.9" fill="#FFFFFF" opacity="0.2" />
    </G>
  );
}

function Mouth({ f }: { f: Features }) {
  const lf = f.lips;
  const mw = 4.1 + lf * 1.1;
  const Y = 59;
  const lip = mix(f.skin, '#8A3A38', lumaOf(f.skin) > 0.55 ? 0.35 : 0.22);
  const lipDark = darken(lip, 0.22);
  const sm = f.smile;
  return (
    <G>
      <Path
        d={`M${50 - mw} ${Y - sm * 0.4} C${50 - mw * 0.6} ${Y - 1.3 * lf} ${48.8} ${Y - 1.7 * lf} 50 ${Y - 1.1 * lf} C51.2 ${Y - 1.7 * lf} ${50 + mw * 0.6} ${Y - 1.3 * lf} ${50 + mw} ${Y - sm * 0.4} Q50 ${Y + 0.5} ${50 - mw} ${Y - sm * 0.4} Z`}
        fill={lipDark}
      />
      <Path d={`M${50 - mw + 0.5} ${Y - sm * 0.2} Q50 ${Y + 2.9 * lf} ${50 + mw - 0.5} ${Y - sm * 0.2} Q50 ${Y + 0.7} ${50 - mw + 0.5} ${Y - sm * 0.2} Z`} fill={lip} />
      <Path d={`M${50 - mw - 0.3} ${Y - sm * 0.6} Q50 ${Y + 0.9} ${50 + mw + 0.3} ${Y - sm * 0.6}`} stroke="#2A1612" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <Ellipse cx="50.6" cy={Y + 1.4 * lf} rx={mw * 0.32} ry="0.5" fill="#FFFFFF" opacity="0.18" />
    </G>
  );
}

function Jersey({ f, jersey }: { f: Features; jersey: string }) {
  const trim = lumaOf(jersey) > 0.7 ? '#1B2A22' : '#FFFFFF';
  const dark = darken(jersey, 0.3);
  return (
    <G transform="translate(0 -2.5)">
      <Path d="M4 100 C6 84 19 76.5 36 73.5 Q50 71 64 73.5 C81 76.5 94 84 96 100 Z" fill={jersey} />
      <Path d="M4 100 C6 86 14 79 24 76 C26 84 27 92 26 100 Z" fill={dark} opacity="0.45" />
      <Path d="M96 100 C94 86 86 79 76 76 C74 84 73 92 74 100 Z" fill={dark} opacity="0.6" />
      <Path d="M24 76.5 C26 84 27 92 26 100 M76 76.5 C74 84 73 92 74 100" stroke={trim} strokeWidth="1.2" opacity="0.5" fill="none" />
      {f.collar === 0 ? <Path d="M38 73.6 Q50 81.5 62 73.6" stroke={trim} strokeWidth="3" fill="none" strokeLinecap="round" /> : null}
      {f.collar === 1 ? (
        <G>
          <Path d="M40.5 73.4 L50 83 L59.5 73.4 Z" fill={f.skin} />
          <Path d="M40.5 73.4 L50 83 L59.5 73.4 Z" fill="#000000" opacity="0.15" />
          <Path d="M39.5 73.2 L50 84 L60.5 73.2" stroke={trim} strokeWidth="2.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </G>
      ) : null}
      {f.collar === 2 ? (
        <G>
          <Path d="M43 74 L50 80 L57 74 Z" fill={f.skin} />
          <Path d="M37.5 72.6 L45 82.5 L50 77.5 L44 73.6 Z" fill={trim} />
          <Path d="M62.5 72.6 L55 82.5 L50 77.5 L56 73.6 Z" fill={trim} />
          <Path d="M50 79 V90" stroke={dark} strokeWidth="1" />
          <Circle cx="50" cy="83.5" r="0.8" fill={trim} />
          <Circle cx="50" cy="87" r="0.8" fill={trim} />
        </G>
      ) : null}
      <Path d="M62 88 h9 v3 q-4.5 4 -9 0 Z" fill={trim} opacity="0.85" />
    </G>
  );
}

export function Portrait({ who, size, jersey, ring }: { who: Face; size: number; jersey: string; ring: string }) {
  const f = features(who);
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const L = 50 - f.W;
  const R = 50 + f.W;
  const sh = darken(f.skin, 0.3);
  const face = facePath(f.W, f.jaw, f.chin);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`${uid}bg`} cx="50%" cy="32%" r="70%">
          <Stop offset="0" stopColor="#2F7A52" />
          <Stop offset="0.6" stopColor="#14412A" />
          <Stop offset="1" stopColor="#081C11" />
        </RadialGradient>
        <LinearGradient id={`${uid}sk`} x1="0" y1="0" x2="1" y2="0.3">
          <Stop offset="0" stopColor={lighten(f.skin, 0.08)} />
          <Stop offset="0.55" stopColor={f.skin} />
          <Stop offset="1" stopColor={darken(f.skin, 0.16)} />
        </LinearGradient>
        <ClipPath id={`${uid}c`}>
          <Circle cx="50" cy="50" r="47" />
        </ClipPath>
        <ClipPath id={`${uid}f`}>
          <Path d={face} />
        </ClipPath>
      </Defs>
      <Circle cx="50" cy="50" r="48" fill={`url(#${uid}bg)`} />
      <G clipPath={`url(#${uid}c)`}>
        <Path d="M10 30 L40 0 H48 Z M90 30 L60 0 H52 Z" fill="#FFFFFF" opacity="0.05" />
        <G transform="translate(50 50) scale(1.24) translate(-50 -47)">
        <HairBack f={f} />
        {/* Cuello */}
        <Path d="M43.4 57 L42.8 72 Q50 76 57.2 72 L56.6 57 Z" fill={f.skin} />
        <Path d="M43 60 Q50 69 57 60 L57.2 66 Q50 72.5 42.8 66 Z" fill={sh} opacity="0.5" />
        <Jersey f={f} jersey={jersey} />
        {/* Orejas */}
        {[
          [L + 0.6, -1],
          [R - 0.6, 1],
        ].map(([x, d]) => (
          <G key={d}>
            <Ellipse cx={x} cy="46" rx="3.3" ry="5.3" fill={d < 0 ? f.skin : darken(f.skin, 0.08)} />
            <Path d={`M${x} 43 Q${x + d * 2} 46 ${x - d * 0.2} 49.6`} stroke={sh} strokeWidth="0.9" fill="none" strokeLinecap="round" />
          </G>
        ))}
        {/* Cara con volumen */}
        <Path d={face} fill={`url(#${uid}sk)`} />
        <G clipPath={`url(#${uid}f)`}>
          <Ellipse cx={R + 3} cy="47" rx="7.5" ry="24" fill={sh} opacity="0.32" />
          <Ellipse cx="50" cy={T + 44} rx="16" ry="5" fill={sh} opacity="0.22" />
          <Ellipse cx="44" cy={T + 8} rx="8" ry="4.2" fill="#FFFFFF" opacity="0.12" />
          <Ellipse cx="41" cy="51.5" rx="4" ry="2.6" fill="#E26D5A" opacity="0.08" />
          <Ellipse cx="59" cy="51.5" rx="4" ry="2.6" fill="#E26D5A" opacity="0.06" />
          <Beard f={f} />
        </G>
        <Mouth f={f} />
        <Nose f={f} />
        <Eye x={43} side={-1} f={f} clip={`${uid}el`} />
        <Eye x={57} side={1} f={f} clip={`${uid}er`} />
        <Brow x={43} side={-1} f={f} />
        <Brow x={57} side={1} f={f} />
        <HairFront f={f} />
        </G>
      </G>
      <Circle cx="50" cy="50" r="48" fill="none" stroke={ring} strokeWidth="3" />
    </Svg>
  );
}

/** Rasgos estables a partir de un texto (para retratos sin identidad guardada). */
export function faceFromSeed(seed: string): Face {
  const h = hash(seed);
  return { eth: ETHNICITIES[h % ETHNICITIES.length], face: h };
}
