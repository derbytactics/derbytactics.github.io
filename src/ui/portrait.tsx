/**
 * Retratos de futbolista dibujados por código, con estilo de ilustración deportiva:
 * proporciones realistas, sombreado por planos con la luz desde arriba a la izquierda,
 * y rasgos y peinados de todas las procedencias. Los rasgos salen de la identidad (etnia + entero `face`).
 */
import React from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { ETHNICITIES, Ethnicity, makeRand } from '../engine';
import { darken, lighten, lumaOf, mix } from './palette';

export { darken, lighten, lumaOf, mix };

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Diez tonos de piel, de muy claro a muy oscuro. */
const SKINS = ['#F2D6C4', '#E8C3A9', '#DBAF92', '#C99C7E', '#B48566', '#9A6D50', '#81573D', '#68442F', '#513423', '#3C261A'];

type EyeShape = 'almond' | 'round' | 'mono';
interface Spec {
  skin: number[];
  hair: string[];
  /** Peinados posibles; repetir uno lo hace más frecuente. */
  styles: number[];
  eyes: EyeShape[];
  eyeColor: string[];
  nose: [number, number];
  lips: [number, number];
  beard: number;
  /** Peinados para las futbolistas. */
  womenStyles: number[];
}
const SPEC: Record<Ethnicity, Spec> = {
  europeo: {
    skin: [0, 1, 1, 2],
    hair: ['#2A1D15', '#3D2A1D', '#5C3F28', '#86613D', '#B28A58', '#D2B07A', '#8E4426'],
    styles: [1, 1, 2, 2, 3, 4, 4, 12, 0, 0, 13, 9, 10, 11],
    eyes: ['round', 'almond'],
    eyeColor: ['#5A3B25', '#3F6E93', '#4E7B4C', '#6F7F8C', '#7B5A3A'],
    nose: [0.95, 1.1],
    lips: [0.75, 0.95],
    beard: 0.45,
    womenStyles: [20, 20, 21, 22, 23, 26, 27],
  },
  mediterraneo: {
    skin: [2, 3, 3, 4],
    hair: ['#17110D', '#22170F', '#33241A', '#4B3322'],
    styles: [1, 1, 2, 3, 4, 4, 5, 0, 0, 13, 12, 10],
    eyes: ['almond', 'round'],
    eyeColor: ['#3B2416', '#5A3B25', '#4E5B3A'],
    nose: [1.0, 1.2],
    lips: [0.85, 1.05],
    beard: 0.55,
    womenStyles: [20, 20, 21, 22, 27, 26],
  },
  africano: {
    skin: [6, 7, 7, 8, 9],
    hair: ['#0F0C0B', '#18120F'],
    styles: [0, 0, 0, 5, 5, 6, 7, 8, 11, 14, 13],
    eyes: ['almond', 'round'],
    eyeColor: ['#24160E', '#2F1D12'],
    nose: [1.25, 1.45],
    lips: [1.15, 1.4],
    beard: 0.4,
    womenStyles: [24, 24, 25, 25, 22, 23, 20, 21],
  },
  magrebi: {
    skin: [3, 4, 5],
    hair: ['#120E0C', '#1E150E', '#2E2016'],
    styles: [5, 5, 1, 2, 0, 0, 13, 4, 3],
    eyes: ['almond'],
    eyeColor: ['#2F1D12', '#4A3020', '#4E5B3A'],
    nose: [1.05, 1.25],
    lips: [0.9, 1.1],
    beard: 0.6,
    womenStyles: [20, 21, 27, 22, 26],
  },
  asiaEste: {
    skin: [1, 2, 2, 3],
    hair: ['#0C0C10', '#17141A', '#231B1B', '#7A4E2E'],
    styles: [12, 12, 2, 1, 0, 3, 4],
    eyes: ['mono'],
    eyeColor: ['#1E140F', '#2A1C14'],
    nose: [0.95, 1.1],
    lips: [0.85, 1.0],
    beard: 0.08,
    womenStyles: [20, 23, 26, 27],
  },
  asiaSur: {
    skin: [4, 5, 6],
    hair: ['#0D0B0B', '#1A1412'],
    styles: [2, 1, 3, 4, 5, 0],
    eyes: ['almond', 'round'],
    eyeColor: ['#1E140F', '#2F1D12'],
    nose: [1.05, 1.25],
    lips: [0.9, 1.1],
    beard: 0.5,
    womenStyles: [20, 21, 27, 22],
  },
  mestizo: {
    skin: [3, 4, 5, 6],
    hair: ['#120E0C', '#1E150E', '#2E2016', '#46301F'],
    styles: [5, 5, 1, 3, 0, 0, 13, 14, 6, 2],
    eyes: ['almond', 'round'],
    eyeColor: ['#2F1D12', '#4A3020'],
    nose: [1.1, 1.3],
    lips: [1.0, 1.2],
    beard: 0.45,
    womenStyles: [20, 24, 25, 22, 21, 27],
  },
};

export interface Face {
  eth: Ethnicity;
  face: number;
  /** Futbolista (o avatar) mujer. */
  fem?: boolean;
}

interface Features {
  skin: string;
  hair: string;
  style: number;
  eyes: EyeShape;
  eyeColor: string;
  nose: number;
  lips: number;
  /** 0 nada · 1 sombra de barba · 2 barba · 3 perilla · 4 bigote y perilla */
  beard: number;
  W: number;
  jaw: number;
  chin: number;
  brow: number;
  browTilt: number;
  collar: number;
  fem: boolean;
}

function features({ eth, face, fem = false }: Face): Features {
  const r = makeRand(face);
  const spec = SPEC[eth] ?? SPEC.europeo;
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length) % a.length];
  const lerp = ([a, b]: [number, number]) => a + (b - a) * r();
  if (fem) {
    return {
      skin: SKINS[pick(spec.skin)],
      hair: pick(spec.hair),
      style: pick(spec.womenStyles),
      eyes: pick(spec.eyes),
      eyeColor: pick(spec.eyeColor),
      nose: lerp(spec.nose) * 0.88,
      lips: lerp(spec.lips) + 0.12,
      beard: 0,
      W: 16.9 + r() * 1.2,
      jaw: 12 + r() * 1.5,
      chin: 4 + r() * 1,
      brow: 0.62 + r() * 0.2,
      browTilt: -0.3 - r() * 0.6,
      collar: Math.floor(r() * 3),
      fem: true,
    };
  }
  return {
    skin: SKINS[pick(spec.skin)],
    hair: pick(spec.hair),
    style: pick(spec.styles),
    eyes: pick(spec.eyes),
    eyeColor: pick(spec.eyeColor),
    nose: lerp(spec.nose),
    lips: lerp(spec.lips),
    beard: r() < spec.beard ? pick([1, 1, 1, 2, 3, 4]) : 0,
    W: 17.6 + r() * 1.8,
    jaw: 13.2 + r() * 2.6,
    chin: 4.6 + r() * 1.8,
    brow: 1 + r() * 0.45,
    browTilt: (r() - 0.5) * 1.4,
    collar: Math.floor(r() * 3),
    fem: false,
  };
}

// Medidas de la cabeza (viewBox 100 × 100).
const TOP = 15;
const EYE_Y = 45;
const MOUTH_Y = 62.2;
const CHIN_Y = 72;

function facePath(f: Features): string {
  const { W, jaw, chin } = f;
  const R = (d: number) => 50 + d;
  const L = (d: number) => 50 - d;
  return (
    `M50 ${TOP} C${R(W * 0.75)} ${TOP} ${R(W)} ${TOP + 5} ${R(W)} 33 L${R(W)} 44 ` +
    `C${R(W)} 52 ${R(jaw + 1.6)} 58 ${R(jaw)} 62 C${R(jaw - 1.6)} 66.5 ${R(chin + 2.6)} 71 ${R(chin)} ${CHIN_Y} ` +
    `Q50 ${CHIN_Y + 1.6} ${L(chin)} ${CHIN_Y} ` +
    `C${L(chin + 2.6)} 71 ${L(jaw - 1.6)} 66.5 ${L(jaw)} 62 C${L(jaw + 1.6)} 58 ${L(W)} 52 ${L(W)} 44 ` +
    `L${L(W)} 33 C${L(W)} ${TOP + 5} ${L(W * 0.75)} ${TOP} 50 ${TOP} Z`
  );
}

/** Casquete de pelo: `c` controla el volumen (más bajo, más alto), `line` el nacimiento del pelo y `side` hasta dónde bajan las patillas. */
function cap(W: number, c: number, line: number, side: number, ex: number): string {
  const L = 50 - W;
  const R = 50 + W;
  return (
    `M${L - ex} ${side} C${L - ex - 1} ${c} ${R + ex + 1} ${c} ${R + ex} ${side} ` +
    `L${R - 1.4} ${side} C${R - 1.8} ${line + 3} ${R - 3.5} ${line - 1.6} ${50 + W * 0.42} ${line - 0.8} ` +
    `Q50 ${line + 0.8} ${50 - W * 0.42} ${line - 0.8} C${L + 3.5} ${line - 1.6} ${L + 1.8} ${line + 3} ${L + 1.4} ${side} Z`
  );
}

function HairBack({ f, fill }: { f: Features; fill: string }) {
  const { W, hair, style } = f;
  const L = 50 - W;
  const R = 50 + W;
  const lo = darken(hair, 0.3);
  if (style === 6) {
    return (
      <G>
        <Ellipse cx="50" cy="31" rx={W + 9.5} ry="21.5" fill={lo} />
        <Ellipse cx="50" cy="29.5" rx={W + 8.5} ry="20" fill={fill} />
      </G>
    );
  }
  if (style === 8) {
    const xs = [-1.08, -0.86, -0.6, 0.6, 0.86, 1.08];
    return (
      <G>
        {xs.map((k, i) => (
          <Path key={i} d={`M${50 + k * W} 28 C${50 + k * (W + 2.5)} 44 ${50 + k * (W + 3.5)} 58 ${50 + k * (W + 4.5)} 72`} stroke={i % 2 ? hair : lo} strokeWidth="4.4" strokeLinecap="round" fill="none" />
        ))}
      </G>
    );
  }
  if (style === 9) return <Path d={`M${L - 2.5} 30 C${L - 5} 50 ${L - 3} 64 ${L + 3} 70 L${R - 3} 70 C${R + 3} 64 ${R + 5} 50 ${R + 2.5} 30 Z`} fill={lo} />;
  if (style === 20) {
    // Coleta: asoma por detrás, a la derecha.
    return (
      <G>
        <Path d={`M${R - 3} 28 C${R + 7} 31 ${R + 8.5} 50 ${R + 4} 68 C${R + 1.5} 60 ${R + 1} 46 ${R - 4} 36 Z`} fill={fill} />
        <Path d={`M${R + 1} 37 C${R + 4} 46 ${R + 4.5} 55 ${R + 3} 63`} stroke={lighten(hair, 0.2)} strokeWidth="0.8" fill="none" opacity="0.4" />
      </G>
    );
  }
  if (style === 27) {
    return <Path d={`M${L + 3} 30 C${L - 6} 34 ${L - 7.5} 52 ${L - 3} 70 C${L - 0.5} 62 ${L} 47 ${L + 4} 37 Z`} fill={fill} />;
  }
  if (style === 21 || style === 24) {
    const big = style === 24;
    return (
      <G>
        <Circle cx="50" cy={big ? 11 : 9} r={big ? 8 : 6} fill={fill} />
        {big
          ? [-5, 0, 5, -2.5, 2.5].map((dx, i) => <Circle key={i} cx={50 + dx * 0.8} cy={i < 3 ? 8 : 13} r="2.1" fill={lo} opacity="0.35" />)
          : <Path d="M45.5 9.5 Q50 4.5 54.5 9.5" stroke={lighten(hair, 0.22)} strokeWidth="0.8" fill="none" opacity="0.6" />}
      </G>
    );
  }
  if (style === 22) {
    return (
      <G>
        {[-1, 1].map((k) => (
          <G key={k}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Ellipse key={i} cx={50 + k * (W + 1.5 + i * 0.25)} cy={50 + i * 5.2} rx="2.8" ry="3.2" fill={i % 2 ? fill : lo} />
            ))}
          </G>
        ))}
      </G>
    );
  }
  if (style === 25) {
    const xs = [-1.12, -1, -0.86, -0.7, 0.7, 0.86, 1, 1.12];
    return (
      <G>
        {xs.map((k, i) => (
          <Path key={i} d={`M${50 + k * W} 30 C${50 + k * (W + 2)} 46 ${50 + k * (W + 3)} 60 ${50 + k * (W + 4)} 78`} stroke={i % 2 ? hair : lo} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        ))}
      </G>
    );
  }
  if (style === 26) {
    return <Path d={`M${L - 3} 30 C${L - 5.5} 48 ${L - 4.5} 60 ${L - 1} 65 L${R + 1} 65 C${R + 4.5} 60 ${R + 5.5} 48 ${R + 3} 30 Z`} fill={lo} />;
  }
  if (style === 10) {
    return (
      <G>
        <Circle cx="50" cy="9.5" r="5.2" fill={fill} />
        <Path d="M46 9.5 Q50 5.4 54 9.5" stroke={lighten(hair, 0.22)} strokeWidth="0.8" fill="none" opacity="0.6" />
      </G>
    );
  }
  return null;
}

function HairFront({ f, fill }: { f: Features; fill: string }) {
  const { W, hair, style, skin } = f;
  const L = 50 - W;
  const R = 50 + W;
  const hi = lighten(hair, hair === '#0F0C0B' || lumaOf(hair) < 0.1 ? 0.3 : 0.25);
  const lo = darken(hair, 0.35);
  const fade = <Path d={cap(W, 6.5, 26.5, 42, 0.3)} fill={hair} opacity="0.55" />;
  const shine = (d: string, o = 0.45) => <Path d={d} stroke={hi} strokeWidth="1" fill="none" opacity={o} strokeLinecap="round" />;
  switch (style) {
    case 0: // rapado al uno
      return (
        <G>
          <Path d={cap(W, 6.5, 26.5, 41, 0.4)} fill={hair} opacity="0.8" />
          {shine(`M${50 - W * 0.5} 19 Q50 16 ${50 + W * 0.3} 18.5`, 0.25)}
        </G>
      );
    case 1: // corto clásico
      return (
        <G>
          <Path d={cap(W, 3.5, 27.5, 42, 1.3)} fill={fill} />
          {[-0.55, -0.25, 0.05, 0.35, 0.6].map((k, i) => (
            <Path key={i} d={`M${50 + k * W} 28 l1.4 -3.6`} stroke={fill} strokeWidth="1.8" strokeLinecap="round" />
          ))}
          {shine(`M${50 - W * 0.55} 19.5 Q${50 - W * 0.1} 15 ${50 + W * 0.45} 18`)}
        </G>
      );
    case 2: // raya al lado
      return (
        <G>
          <Path d={cap(W, 3, 28.5, 43, 1.6)} fill={fill} />
          <Path d={`M${L - 1} 31 C${L} 13 ${50 + W * 0.6} 9 ${R + 1.6} 28 C${R - 4} 20 50 19 ${50 - W * 0.4} 22 Z`} fill={fill} />
          <Path d={`M${50 - W * 0.4} 16.5 L${50 - W * 0.4} 23`} stroke={lo} strokeWidth="0.9" strokeLinecap="round" />
          {shine(`M${50 - W * 0.15} 18.5 Q${50 + W * 0.35} 13 ${R - 1.5} 23`, 0.5)}
        </G>
      );
    case 3: // tupé
      return (
        <G>
          <Path d={cap(W, 4, 27.5, 42, 1.3)} fill={fill} />
          <Path d={`M${50 - W * 0.8} 25 C${50 - W * 0.85} 8 ${50 + W * 0.55} 3 ${50 + W * 0.95} 19 C${50 + W * 0.4} 15 ${50 - W * 0.3} 18 ${50 - W * 0.8} 25 Z`} fill={fill} />
          {shine(`M${50 - W * 0.5} 17 C${50 - W * 0.35} 9 ${50 + W * 0.35} 7 ${50 + W * 0.7} 15`, 0.55)}
        </G>
      );
    case 4: // peinado hacia atrás
      return (
        <G>
          <Path d={cap(W, 4, 26.5, 42, 1.1)} fill={fill} />
          {[-0.45, -0.05, 0.35].map((k, i) => (
            <Path key={i} d={`M${50 + k * W} 26 Q${50 + k * W * 1.15} 20 ${50 + k * W * 1.05} 15.5`} stroke={hi} strokeWidth="0.8" fill="none" opacity="0.35" strokeLinecap="round" />
          ))}
        </G>
      );
    case 5: // rizos arriba, laterales degradados
      return (
        <G>
          {fade}
          <Path d={`M${L + 2} 27 C${L + 1} 10 ${R - 1} 10 ${R - 2} 27 Q50 24 ${L + 2} 27 Z`} fill={hair} />
          {[
            ...[-0.36, -0.12, 0.12, 0.36].map((k) => [k, 11.5, 2.7]),
            ...[-0.62, -0.38, -0.13, 0.13, 0.38, 0.62].map((k) => [k, 15.5, 2.8]),
            ...[-0.82, -0.6, -0.36, -0.12, 0.12, 0.36, 0.6, 0.82].map((k) => [k, 20 + Math.abs(k) * 2, 2.6]),
            ...[-0.5, -0.17, 0.17, 0.5].map((k) => [k, 24, 2.4]),
          ].map(([k, y, rr], i) => (
            <G key={i}>
              <Circle cx={50 + k * W} cy={y} r={rr} fill={i % 3 ? hair : darken(hair, 0.18)} />
              <Path d={`M${50 + k * W - rr * 0.6} ${y} a${rr * 0.6} ${rr * 0.6} 0 0 1 ${rr * 1.1} -${rr * 0.45}`} stroke={hi} strokeWidth="0.55" fill="none" opacity="0.45" />
            </G>
          ))}
        </G>
      );
    case 6: // afro (frente)
      return (
        <G>
          <Path d={cap(W, 0, 27, 45, 3.5)} fill={fill} />
          {[-0.8, -0.4, 0, 0.4, 0.8].map((k, i) => (
            <Circle key={i} cx={50 + k * W} cy={27.2 - Math.abs(k) * 1.6} r="1.7" fill={fill} />
          ))}
        </G>
      );
    case 7: // trenzas pegadas
      return (
        <G>
          <Path d={cap(W, 6, 26.5, 41, 0.6)} fill={fill} />
          {[-0.75, -0.45, -0.15, 0.15, 0.45, 0.75].map((k, i) => (
            <Path key={i} d={`M${50 + k * W * 1.05} 27 Q${50 + k * W * 1.2} 19 ${50 + k * W * 1.3} 13`} stroke={darken(skin, 0.1)} strokeWidth="0.8" fill="none" opacity="0.75" />
          ))}
        </G>
      );
    case 8: // rastas (frente)
      return (
        <G>
          <Path d={cap(W, 2, 28, 43, 2)} fill={fill} />
          {[-0.6, -0.2, 0.2, 0.6].map((k, i) => (
            <Path key={i} d={`M${50 + k * W} 28 Q${50 + k * W * 1.1} 20 ${50 + k * W * 1.3} 14`} stroke={lo} strokeWidth="1.3" fill="none" />
          ))}
        </G>
      );
    case 9: // melena con cinta
      return (
        <G>
          <Path d={cap(W, 3, 29, 48, 2.5)} fill={fill} />
          <Path d={`M${L - 1.5} 27 Q50 20 ${R + 1.5} 27 L${R + 1.2} 30.5 Q50 23.5 ${L - 1.2} 30.5 Z`} fill="#F4F1E8" />
          {shine(`M${50 - W * 0.4} 18.5 Q50 15 ${50 + W * 0.5} 18.5`)}
        </G>
      );
    case 10: // moño
      return (
        <G>
          <Path d={cap(W, 5, 26.5, 41, 1)} fill={fill} />
          {shine(`M${50 - W * 0.5} 22 Q${50 - W * 0.2} 15 50 13.5`, 0.35)}
        </G>
      );
    case 11: // calvo
      return (
        <G>
          <Path d={`M${L + 0.2} 46 C${L} 38 ${L + 0.6} 34 ${L + 2} 32 L${L + 3} 42 Z`} fill={hair} opacity="0.35" />
          <Path d={`M${R - 0.2} 46 C${R} 38 ${R - 0.6} 34 ${R - 2} 32 L${R - 3} 42 Z`} fill={hair} opacity="0.35" />
          <Ellipse cx="44" cy="20" rx="7" ry="3" fill="#FFFFFF" opacity="0.2" />
        </G>
      );
    case 13: // cresta
    case 14: // twists
      return (
        <G>
          {fade}
          {style === 13 ? (
            <G>
              <Path d={`M43.5 27 C42.5 15 46.5 9 51 8.5 C55 9.5 57.5 15 56.5 27 Z`} fill={fill} />
              {shine('M48 22 C48 16 49.5 12 51.5 10.5', 0.5)}
            </G>
          ) : (
            [-0.72, -0.48, -0.24, 0, 0.24, 0.48, 0.72].map((k, i) => (
              <G key={i}>
                <Path d={`M${50 + k * W} 26 L${50 + k * W + 0.6} ${13 + Math.abs(k) * 6}`} stroke={lo} strokeWidth="3.8" strokeLinecap="round" />
                <Path d={`M${50 + k * W} 25.5 L${50 + k * W + 0.6} ${13.5 + Math.abs(k) * 6}`} stroke={hair} strokeWidth="2.5" strokeLinecap="round" />
              </G>
            ))
          )}
        </G>
      );
    case 20: // coleta, pelo recogido hacia atrás
    case 21: // moño alto
      return (
        <G>
          <Path d={cap(W, 3.5, 27, 44, 1.3)} fill={fill} />
          {[-0.5, -0.1, 0.3].map((k, i) => (
            <Path key={i} d={`M${50 + k * W} 26.5 Q${50 + k * W * 1.1} 20 ${50 + k * W * 0.7 + (style === 21 ? 0 : 3)} 14`} stroke={hi} strokeWidth="0.8" fill="none" opacity="0.4" strokeLinecap="round" />
          ))}
          {style === 20 ? <Path d={`M${R - 1} 30 l3 1.5`} stroke="#E5484D" strokeWidth="2" strokeLinecap="round" /> : null}
        </G>
      );
    case 22: // dos trenzas pegadas
    case 25: // trenzas africanas
      return (
        <G>
          <Path d={cap(W, 3, 27.5, 45, 1.5)} fill={fill} />
          <Path d="M50 14 L50 27" stroke={darken(skin, 0.15)} strokeWidth="0.8" opacity="0.8" />
          {(style === 22 ? [-0.55, 0.55] : [-0.75, -0.45, -0.18, 0.18, 0.45, 0.75]).map((k, i) => (
            <Path key={i} d={`M${50 + k * W} 27.5 Q${50 + k * W * 1.15} 20 ${50 + k * W * 1.05} 14`} stroke={style === 22 ? hi : lo} strokeWidth={style === 22 ? 1 : 0.9} fill="none" opacity={style === 22 ? 0.5 : 0.8} strokeDasharray={style === 22 ? '1.6 1.2' : undefined} />
          ))}
        </G>
      );
    case 23: // pixie con flequillo de lado
      return (
        <G>
          <Path d={cap(W, 2.5, 28, 43, 1.5)} fill={fill} />
          <Path d={`M${L - 1} 30 C${L} 14 ${50 + W * 0.5} 11 ${R + 1.5} 27 C${R - 3} 25 ${50 + W * 0.2} 28 ${50 - W * 0.2} 32 C${L + 4} 33 ${L + 1} 32 ${L - 1} 30 Z`} fill={fill} />
          {shine(`M${50 - W * 0.4} 20 Q${50 + W * 0.2} 14 ${R - 2} 22`, 0.5)}
        </G>
      );
    case 24: // afro puff: laterales recogidos
      return (
        <G>
          <Path d={cap(W, 5, 26.5, 42, 0.8)} fill={fill} />
          {shine(`M${50 - W * 0.45} 21 Q50 17 ${50 + W * 0.45} 21`, 0.3)}
        </G>
      );
    case 26: // media melena con cinta
      return (
        <G>
          <Path d={cap(W, 2.5, 28.5, 54, 2.8)} fill={fill} />
          <Path d={`M${L - 1.5} 26 Q50 19 ${R + 1.5} 26 L${R + 1.2} 29 Q50 22.2 ${L - 1.2} 29 Z`} fill="#F4F1E8" />
          {shine(`M${50 - W * 0.4} 18 Q50 14.5 ${50 + W * 0.5} 18`)}
        </G>
      );
    case 27: // recogido bajo con raya y flequillo de lado
      return (
        <G>
          <Path d={cap(W, 3, 28.5, 46, 1.6)} fill={fill} />
          <Path d={`M${R + 1} 31 C${R} 14 ${50 - W * 0.4} 11 ${L - 1.2} 27 C${L + 4} 24 ${50 - W * 0.1} 28 ${50 + W * 0.25} 32 C${R - 4} 32.5 ${R - 1} 32 ${R + 1} 31 Z`} fill={fill} />
          {shine(`M${50 + W * 0.4} 19 Q${50 - W * 0.2} 14 ${L + 2} 22`, 0.5)}
        </G>
      );
    case 12: // flequillo
    default: {
      const pts: string[] = [];
      const n = 10;
      for (let i = 0; i <= n; i++) {
        const x = L + 0.5 + ((W * 2 - 1) * i) / n;
        pts.push(`${x.toFixed(2)} ${(i % 2 ? 29 : 31.5) - Math.abs(i - n / 2) * 0.45}`);
      }
      return (
        <G>
          <Path d={cap(W, 2.5, 29, 43, 1.6)} fill={fill} />
          <Path d={`M${L - 1} 27 L${pts.join(' L')} L${R + 1} 27 C${R} 17 ${L} 17 ${L - 1} 27 Z`} fill={fill} />
          {shine(`M${50 - W * 0.55} 19 Q50 14.5 ${50 + W * 0.55} 19`)}
        </G>
      );
    }
  }
}

function Beard({ f }: { f: Features }) {
  const { W, jaw, hair, beard } = f;
  if (!beard) return null;
  const L = 50 - W;
  const R = 50 + W;
  // Zona de la barba: desde las patillas, por la mandíbula, hasta la barbilla; deja libre la boca.
  const lower = `M${L + 0.2} 46 C${L + 0.5} 56 ${50 - jaw + 1} 64 44 70 Q50 75.5 56 70 C${50 + jaw - 1} 64 ${R - 0.5} 56 ${R - 0.2} 46 C${R - 3} 53 ${R - 6} 58 56 59.3 Q50 58.2 44 59.3 C${L + 6} 58 ${L + 3} 53 ${L + 0.2} 46 Z`;
  const stache = `M43.8 60.4 Q46.5 57.8 50 58.6 Q53.5 57.8 56.2 60.4 Q53 59.8 50 60.2 Q47 59.8 43.8 60.4 Z`;
  if (beard === 1)
    return (
      <G>
        <Path d={lower} fill={hair} opacity="0.2" />
        <Path d={stache} fill={hair} opacity="0.2" />
      </G>
    );
  if (beard === 2)
    return (
      <G>
        <Path d={lower} fill={hair} opacity="0.9" />
        <Path d={stache} fill={hair} />
      </G>
    );
  const goatee = 'M45 60.5 Q50 59 55 60.5 L55.6 66 Q55.6 73.4 50 73.6 Q44.4 73.4 44.4 66 Z';
  return (
    <G>
      {beard === 4 ? <Path d={lower} fill={hair} opacity="0.15" /> : null}
      <Path d={goatee} fill={hair} opacity="0.88" />
      <Path d={stache} fill={hair} />
    </G>
  );
}

function Eye({ x, side, f, clip }: { x: number; side: 1 | -1; f: Features; clip: string }) {
  const mono = f.eyes === 'mono';
  const round = f.eyes === 'round';
  const white = mono
    ? 'M-3.9 0.3 C-2 -1.3 1.6 -1.6 3.9 -0.4 C1.8 0.9 -1.8 1.1 -3.9 0.3 Z'
    : round
      ? 'M-3.8 0.2 C-2 -2.3 1.7 -2.5 3.8 -0.2 C1.8 1.4 -1.8 1.5 -3.8 0.2 Z'
      : 'M-3.9 0.2 C-2 -1.9 1.6 -2.2 3.9 -0.35 C1.8 1.1 -1.8 1.3 -3.9 0.2 Z';
  const lash = mono ? 'M-4 0.3 C-2 -1.5 1.6 -1.8 4 -0.45' : round ? 'M-3.9 0.2 C-2 -2.5 1.7 -2.7 3.9 -0.2' : 'M-4 0.2 C-2 -2.1 1.6 -2.4 4 -0.4';
  const shadow = darken(f.skin, 0.3);
  return (
    <G transform={`translate(${x} ${EYE_Y}) scale(${side} 1)`}>
      <Defs>
        <ClipPath id={clip}>
          <Path d={white} />
        </ClipPath>
      </Defs>
      <Path d={white} fill="#E6DED4" />
      <G clipPath={`url(#${clip})`}>
        <Circle cx="-0.15" cy={mono ? 0 : -0.2} r={mono ? 1.55 : 1.75} fill={f.eyeColor} />
        <Circle cx="-0.15" cy={mono ? 0 : -0.2} r="0.75" fill="#0B0807" />
        <Circle cx="0.45" cy="-0.75" r="0.38" fill="#FFFFFF" opacity="0.9" />
        <Path d="M-4.5 -3 H4.5 V-0.6 Q0 -1.7 -4.5 -0.6 Z" fill={shadow} opacity="0.4" />
      </G>
      <Path d={lash} stroke="#1C130E" strokeWidth={f.fem ? 1.15 : mono ? 1 : 0.8} fill="none" strokeLinecap="round" />
      {f.fem ? <Path d={mono ? 'M3.9 -0.45 l1.2 -0.7' : 'M3.8 -0.35 l1.3 -0.9'} stroke="#1C130E" strokeWidth="0.8" strokeLinecap="round" /> : null}
      {!mono ? <Path d="M-3.4 -2 C-1.5 -3.6 1.8 -3.7 3.8 -2.1" stroke={shadow} strokeWidth="0.6" fill="none" opacity="0.65" strokeLinecap="round" /> : null}
      {mono ? <Path d="M-4 0.3 Q-3.3 -0.5 -2.5 -0.9" stroke={shadow} strokeWidth="0.6" fill="none" opacity="0.7" /> : null}
      <Path d="M-3 1 C-1 1.7 1.6 1.5 3.4 0.4" stroke={shadow} strokeWidth="0.5" fill="none" opacity="0.45" strokeLinecap="round" />
    </G>
  );
}

function Brow({ x, side, f }: { x: number; side: 1 | -1; f: Features }) {
  const color = lumaOf(f.hair) > 0.4 ? darken(f.hair, 0.3) : f.hair;
  const t = f.brow;
  return (
    <G transform={`translate(${x} ${EYE_Y - 4.6}) scale(${side} 1) rotate(${f.browTilt * 4})`}>
      <Path d={`M-5 ${1.3 * t} C-3 ${-0.4 * t} 1 ${-1.2 * t} 5.2 -0.1 L5.3 0.7 C1.4 ${0.2 * t} -2.5 ${0.8 * t} -4.8 ${2.5 * t} Z`} fill={color} />
    </G>
  );
}

function Nose({ f, sh, hl }: { f: Features; sh: string; hl: string }) {
  const k = f.nose;
  return (
    <G>
      <Path d="M48.6 45.5 C48.3 49 48.2 51.5 48.4 53.5" stroke={hl} strokeWidth="1.3" fill="none" opacity="0.5" strokeLinecap="round" />
      <Path d={`M51.4 45 C52.2 49.5 53 52.2 ${50 + 3.5 * k} 55.2 L${50 + 2.3 * k} 56.8 C52 55.4 51.2 50 51.1 45 Z`} fill={sh} opacity={f.fem ? 0.45 : 0.75} />
      <Path d={`M${50 - 3.6 * k} 55 Q${50 - 4.7 * k} 57.5 ${50 - 1.8 * k} 57.7`} stroke={sh} strokeWidth="1" fill="none" strokeLinecap="round" />
      <Path d={`M${50 + 3.6 * k} 55 Q${50 + 4.7 * k} 57.5 ${50 + 1.8 * k} 57.7`} stroke={sh} strokeWidth="1" fill="none" strokeLinecap="round" />
      <Ellipse cx="50" cy="58.2" rx={3.3 * k} ry="0.8" fill={sh} opacity="0.55" />
      <Ellipse cx={50 - 1.6 * k} cy="57.3" rx="0.85" ry="0.42" fill={darken(f.skin, 0.55)} opacity="0.7" />
      <Ellipse cx={50 + 1.6 * k} cy="57.3" rx="0.85" ry="0.42" fill={darken(f.skin, 0.55)} opacity="0.7" />
      <Ellipse cx="49.4" cy="55" rx={1.2 * k} ry="0.8" fill={hl} opacity="0.45" />
    </G>
  );
}

function Mouth({ f, sh }: { f: Features; sh: string }) {
  const lf = f.lips;
  const mw = (f.fem ? 4.2 : 4.6) + lf * 0.9;
  const Y = MOUTH_Y;
  const dark = lumaOf(f.skin) < 0.45;
  const upper = mix(f.skin, f.fem ? '#7A2E36' : '#5E2622', dark ? 0.24 : 0.3);
  const lower = mix(f.skin, f.fem ? '#A44F58' : '#8A4540', dark ? 0.18 : 0.26);
  return (
    <G>
      <Path d="M49.2 58.6 L49.3 60.6 M50.8 58.6 L50.7 60.6" stroke={sh} strokeWidth="0.5" opacity="0.4" />
      <Path
        d={`M${50 - mw} ${Y + 0.2} C${50 - mw * 0.6} ${Y - 1.1 * lf} 48.9 ${Y - 1.5 * lf} 50 ${Y - 1 * lf} C51.1 ${Y - 1.5 * lf} ${50 + mw * 0.6} ${Y - 1.1 * lf} ${50 + mw} ${Y + 0.2} Q50 ${Y + 0.6} ${50 - mw} ${Y + 0.2} Z`}
        fill={upper}
      />
      <Path d={`M${50 - mw + 0.6} ${Y + 0.4} Q50 ${Y + 2.7 * lf} ${50 + mw - 0.6} ${Y + 0.4} Q50 ${Y + 0.9} ${50 - mw + 0.6} ${Y + 0.4} Z`} fill={lower} />
      <Path d={`M${50 - mw - 0.2} ${Y + 0.1} Q50 ${Y + 0.9} ${50 + mw + 0.2} ${Y + 0.1}`} stroke={darken(f.skin, 0.6)} strokeWidth="0.75" fill="none" strokeLinecap="round" />
      <Ellipse cx="50.4" cy={Y + 1.5 * lf} rx={mw * 0.3} ry="0.4" fill="#FFFFFF" opacity="0.14" />
      <Ellipse cx="50" cy={Y + 3.6} rx={mw * 0.55} ry="0.9" fill={sh} opacity="0.4" />
    </G>
  );
}

function Jersey({ f, jersey }: { f: Features; jersey: string }) {
  const trim = lumaOf(jersey) > 0.7 ? '#1B2A22' : '#FFFFFF';
  const dark = darken(jersey, 0.32);
  return (
    <G>
      <Path d="M0 100 L0 94 C6 87 19 83 35 81 Q50 87.5 65 81 C81 83 94 87 100 94 L100 100 Z" fill={jersey} />
      <Path d="M100 100 L100 94 C94 87 83 84 72 82.5 C74 88 75 94 74 100 Z" fill={dark} opacity="0.55" />
      <Path d="M0 100 L0 94 C4 89 10 86 17 84.5 C18 90 18.5 95 18 100 Z" fill={dark} opacity="0.3" />
      {f.collar === 0 ? <Path d="M37.5 81.3 Q50 89.5 62.5 81.3" stroke={trim} strokeWidth="2.8" fill="none" strokeLinecap="round" /> : null}
      {f.collar === 1 ? (
        <G>
          <Path d="M40 81 L50 92 L60 81 Z" fill={f.skin} />
          <Path d="M40 81 L50 92 L60 81 Z" fill="#000000" opacity="0.18" />
          <Path d="M39 80.8 L50 93 L61 80.8" stroke={trim} strokeWidth="2.4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </G>
      ) : null}
      {f.collar === 2 ? (
        <G>
          <Path d="M42.5 82 L50 88.5 L57.5 82 Z" fill={f.skin} />
          <Path d="M37 80.3 L44.5 91 L50 85.8 L43.5 81.4 Z" fill={trim} />
          <Path d="M63 80.3 L55.5 91 L50 85.8 L56.5 81.4 Z" fill={trim} />
          <Path d="M50 87 V98" stroke={dark} strokeWidth="1" />
        </G>
      ) : null}
      <Path d="M64 92 h8 v2.6 q-4 3.4 -8 0 Z" fill={trim} opacity="0.85" />
    </G>
  );
}

export function Portrait({ who, size, jersey, ring }: { who: Face; size: number; jersey: string; ring: string }) {
  const f = features(who);
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const L = 50 - f.W;
  const R = 50 + f.W;
  const sh = darken(f.skin, 0.2);
  const sh2 = darken(f.skin, 0.34);
  const hl = lighten(f.skin, lumaOf(f.skin) < 0.4 ? 0.2 : 0.16);
  const face = facePath(f);
  /** Medio ancho del cuello. */
  const nk = f.fem ? 8.4 : 10.5;
  const hairFill = `url(#${uid}h)`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`${uid}bg`} cx="50%" cy="38%" r="68%">
          <Stop offset="0" stopColor={mix(jersey, '#1A3A2A', 0.62)} />
          <Stop offset="1" stopColor="#06120C" />
        </RadialGradient>
        <LinearGradient id={`${uid}h`} x1="0" y1="0" x2="0.3" y2="1">
          <Stop offset="0" stopColor={lighten(f.hair, 0.1)} />
          <Stop offset="1" stopColor={darken(f.hair, 0.25)} />
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
        <G transform="translate(50 50) scale(1.1) translate(-50 -46.5)">
        <HairBack f={f} fill={hairFill} />
        {/* Cuello y trapecios */}
        <Path d={`M${50 - nk} 64 L${50 - nk - 0.9} 80 C33 82 25 83 18 85 L82 85 C75 83 67 82 ${50 + nk + 0.9} 80 L${50 + nk} 64 Z`} fill={f.skin} />
        <Path d={`M53 66 L54.5 82 L${50 + nk + 0.9} 80 L${50 + nk} 64 Z`} fill={sh} opacity="0.7" />
        <Path d={`M${50 - nk} 64 Q50 79 ${50 + nk} 64 L${50 + nk + 0.1} 70 Q50 84 ${50 - nk - 0.1} 70 Z`} fill={sh2} opacity="0.55" />
        <Path d="M44 75 Q50 79 56 75" stroke={sh} strokeWidth="0.8" fill="none" opacity="0.6" />
        <Jersey f={f} jersey={jersey} />
        {/* Orejas */}
        <Path d={`M${L + 1} 44 C${L - 3} 41.5 ${L - 4.5} 45 ${L - 3.6} 49 C${L - 3} 52.5 ${L - 1} 54.5 ${L + 1.2} 53.5 Z`} fill={f.skin} />
        <Path d={`M${L - 0.2} 45.5 C${L - 2.4} 45 ${L - 2.8} 48 ${L - 1.6} 50.5`} stroke={sh2} strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <Path d={`M${R - 1} 44 C${R + 3} 41.5 ${R + 4.5} 45 ${R + 3.6} 49 C${R + 3} 52.5 ${R + 1} 54.5 ${R - 1.2} 53.5 Z`} fill={sh} />
        <Path d={`M${R + 0.2} 45.5 C${R + 2.4} 45 ${R + 2.8} 48 ${R + 1.6} 50.5`} stroke={sh2} strokeWidth="0.8" fill="none" strokeLinecap="round" />
        {/* Cara: tono base, sombra por planos y brillos */}
        <Path d={face} fill={f.skin} />
        <G clipPath={`url(#${uid}f)`}>
          <Path d={`M${50 + f.W * 0.4} 10 C${50 + f.W * 0.8} 24 ${50 + f.W * 0.62} 38 ${50 + f.W * 0.74} 46 C${50 + f.W * 0.86} 54 ${50 + f.jaw * 0.6} 63 51.5 76 L100 76 L100 0 Z`} fill={sh} />
          <Path d={`M${R - 2.5} 10 C${R - 1} 30 ${R - 1.2} 46 ${50 + f.jaw - 1.5} 62 C${50 + f.jaw - 4} 68 ${50 + f.chin + 1} 72 51 76 L100 76 L100 0 Z`} fill={sh2} opacity="0.55" />
          <Path d={`M${L} 60 C${50 - f.jaw + 3} 66 ${50 - f.chin - 1} 70.5 50 71 C${50 + f.chin + 1} 70.5 ${50 + f.jaw - 3} 66 ${R} 60 L${R} 80 L${L} 80 Z`} fill={sh} opacity={f.fem ? 0.2 : 0.45} />
          <Ellipse cx="41.4" cy={EYE_Y - 0.6} rx="6" ry="3.4" fill={sh} opacity="0.55" />
          <Ellipse cx="58.6" cy={EYE_Y - 0.6} rx="6" ry="3.4" fill={sh2} opacity="0.45" />
          <Ellipse cx="44" cy="25" rx="9" ry="4.5" fill={hl} opacity="0.55" />
          <Ellipse cx="39.5" cy="51" rx="4.2" ry="2.2" fill={hl} opacity="0.45" />
          <Ellipse cx="48.6" cy="69.6" rx="2.6" ry="1.1" fill={hl} opacity="0.4" />
          {!f.fem ? <Path d={`M${50 - 4.3 * f.nose} 57 Q43.5 60 43.6 63.5`} stroke={sh2} strokeWidth="0.6" fill="none" opacity="0.35" /> : null}
          {!f.fem ? <Path d={`M${50 + 4.3 * f.nose} 57 Q56.5 60 56.4 63.5`} stroke={sh2} strokeWidth="0.6" fill="none" opacity="0.45" /> : null}
          {f.fem ? <Ellipse cx="40" cy="53" rx="4" ry="2.2" fill="#E07A6A" opacity="0.13" /> : null}
          {f.fem ? <Ellipse cx="60" cy="53" rx="4" ry="2.2" fill="#E07A6A" opacity="0.1" /> : null}
          <Beard f={f} />
        </G>
        <Mouth f={f} sh={sh2} />
        <Nose f={f} sh={sh2} hl={hl} />
        <Eye x={41.4} side={-1} f={f} clip={`${uid}el`} />
        <Eye x={58.6} side={1} f={f} clip={`${uid}er`} />
        <Brow x={41.2} side={-1} f={f} />
        <Brow x={58.8} side={1} f={f} />
        <HairFront f={f} fill={hairFill} />
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
