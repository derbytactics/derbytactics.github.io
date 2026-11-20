/** Escudos de club: silueta, dibujo de fondo, emblema y dos colores. */
import React from 'react';
import { Platform, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { CREST_COLORS, CREST_EMBLEMS, CREST_PATTERNS, CREST_SHAPES, CrestDesign } from '../engine';
import { darken, hash, lighten, lumaOf } from './portrait';

const SANS = Platform.OS === 'web' ? 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' : undefined;

export const SHAPE_PATHS = [
  'M50 4 L89 14 V46 C89 72 71 88 50 96 C29 88 11 72 11 46 V14 Z',
  'M50 5 A45 45 0 1 1 50 95 A45 45 0 1 1 50 5 Z',
  'M11 7 H89 V44 C89 70 71 86 50 96 C29 86 11 70 11 44 Z',
  'M18 6 H82 Q90 6 90 14 V54 C90 76 70 90 50 96 C30 90 10 76 10 54 V14 Q10 6 18 6 Z',
  'M11 12 Q31 19 50 5 Q69 19 89 12 V50 C89 74 71 88 50 96 C29 88 11 74 11 50 Z',
  'M14 6 H86 V60 C86 82 70 95 50 95 C30 95 14 82 14 60 Z',
];
export const SHAPE_NAMES = ['Clásico', 'Redondo', 'Recto', 'Moderno', 'Corona', 'Ibérico'];
export const PATTERN_NAMES = ['Liso', 'Rayas', 'Mitades', 'Franja', 'Banda', 'Cuartos', 'Galón', 'Aros', 'Cruz'];
export const EMBLEM_NAMES = ['Estrella', 'Balón', 'Corona', 'Torre', 'Ancla', 'Rayo', 'Alas', 'Árbol', 'Toro', 'Olas', 'Sol', 'Iniciales'];

function Pattern({ kind, color }: { kind: number; color: string }) {
  switch (kind) {
    case 1:
      return <G>{[-2, -1, 0, 1, 2].map((i) => <Rect key={i} x={50 + i * 16 - 4.5} y="0" width="9" height="100" fill={color} />)}</G>;
    case 2:
      return <Rect x="50" y="0" width="50" height="100" fill={color} />;
    case 3:
      return <Rect x="0" y="36" width="100" height="26" fill={color} />;
    case 4:
      return <Path d="M0 18 L18 0 L100 82 L82 100 Z" fill={color} />;
    case 5:
      return (
        <G>
          <Rect x="50" y="0" width="50" height="50" fill={color} />
          <Rect x="0" y="50" width="50" height="50" fill={color} />
        </G>
      );
    case 6:
      return <Path d="M0 38 L50 66 L100 38 V58 L50 86 L0 58 Z" fill={color} />;
    case 7:
      return <G>{[0, 1, 2, 3, 4, 5].map((i) => <Rect key={i} x="0" y={10 + i * 16} width="100" height="8" fill={color} />)}</G>;
    case 8:
      return (
        <G>
          <Rect x="41" y="0" width="18" height="100" fill={color} />
          <Rect x="0" y="38" width="100" height="18" fill={color} />
        </G>
      );
    default:
      return null;
  }
}

type Part = { d: string; stroke?: number };
function star(cx: number, cy: number, r1: number, r2: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? r2 : r1;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}
const EMBLEMS: Part[][] = [
  [{ d: star(50, 52, 17, 7) }],
  [],
  [{ d: 'M33 63 L31 40 L41 49 L50 35 L59 49 L69 40 L67 63 Z' }, { d: 'M33 66 H67 V71 H33 Z' }],
  [{ d: 'M35 70 V46 H39 V40 H44 V46 H47.5 V40 H52.5 V46 H56 V40 H61 V46 H65 V70 Z' }],
  [
    { d: 'M50 41 V68', stroke: 4 },
    { d: 'M42 47 H58', stroke: 4 },
    { d: 'M35 56 Q36 68 50 68 Q64 68 65 56', stroke: 4 },
    { d: 'M50 33 A4.5 4.5 0 1 1 49.99 33 Z', stroke: 3.2 },
  ],
  [{ d: 'M55 32 L38 56 H49 L44 73 L63 47 H52 L58 32 Z' }],
  [
    { d: 'M47 50 C40 39 29 38 24 43 C29 44 31 46 32 48 C27 48 25 50 24 53 C29 53 33 54 35 56 C31 57 30 59 29 62 C37 61 43 59 47 56 Z' },
    { d: 'M53 50 C60 39 71 38 76 43 C71 44 69 46 68 48 C73 48 75 50 76 53 C71 53 67 54 65 56 C69 57 70 59 71 62 C63 61 57 59 53 56 Z' },
    { d: 'M50 40 C53 40 54 44 54 50 C54 58 52 64 50 66 C48 64 46 58 46 50 C46 44 47 40 50 40 Z' },
  ],
  [
    { d: 'M47 56 H53 V71 H47 Z' },
    { d: 'M50 33 C58 33 62 38 62 44 C67 45 69 50 66 55 C64 59 58 60 50 59 C42 60 36 59 34 55 C31 50 33 45 38 44 C38 38 42 33 50 33 Z' },
  ],
  [
    { d: 'M41 47 Q50 43 59 47 L57 62 Q50 70 43 62 Z' },
    { d: 'M42 49 C35 48 31 42 33 35 C36 41 39 44 44 45 Z' },
    { d: 'M58 49 C65 48 69 42 67 35 C64 41 61 44 56 45 Z' },
  ],
  [
    { d: 'M31 44 q4.75 -5 9.5 0 t9.5 0 t9.5 0 t9.5 0', stroke: 3.6 },
    { d: 'M31 53 q4.75 -5 9.5 0 t9.5 0 t9.5 0 t9.5 0', stroke: 3.6 },
    { d: 'M31 62 q4.75 -5 9.5 0 t9.5 0 t9.5 0 t9.5 0', stroke: 3.6 },
  ],
  [
    { d: 'M50 43 A9 9 0 1 1 49.99 43 Z' },
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return { d: `M${(50 + 12.5 * Math.cos(a)).toFixed(2)} ${(52 + 12.5 * Math.sin(a)).toFixed(2)} L${(50 + 18 * Math.cos(a)).toFixed(2)} ${(52 + 18 * Math.sin(a)).toFixed(2)}`, stroke: 3.4 };
    }),
  ],
  [],
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚ]{2}$/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || name.slice(0, 2).toUpperCase();

function Emblem({ kind, ink, outline, name }: { kind: number; ink: string; outline: string; name: string }) {
  if (kind === 1) {
    return (
      <G>
        <Circle cx="50" cy="52" r="15.5" fill={outline} opacity="0.55" />
        <Circle cx="50" cy="52" r="14" fill="#FFFFFF" stroke="#14261B" strokeWidth="1.4" />
        <Path d="M50 45.5 L56 49.8 L53.8 56.8 H46.2 L44 49.8 Z" fill="#14261B" />
        <Path d="M50 45.5 V38.5 M56 49.8 L62.8 47.5 M53.8 56.8 L58 62.8 M46.2 56.8 L42 62.8 M44 49.8 L37.2 47.5" stroke="#14261B" strokeWidth="1.5" />
      </G>
    );
  }
  if (kind === 11) {
    const txt = initials(name);
    return (
      <G>
        <SvgText x="50" y="62" fontSize={txt.length > 1 ? 27 : 32} fontWeight="900" fill={outline} stroke={outline} strokeWidth="4" textAnchor="middle" fontFamily={SANS} opacity="0.55">
          {txt}
        </SvgText>
        <SvgText x="50" y="62" fontSize={txt.length > 1 ? 27 : 32} fontWeight="900" fill={ink} textAnchor="middle" fontFamily={SANS}>
          {txt}
        </SvgText>
      </G>
    );
  }
  const parts = EMBLEMS[kind] ?? EMBLEMS[0];
  return (
    <G>
      {parts.map((p, i) =>
        p.stroke ? (
          <Path key={`o${i}`} d={p.d} stroke={outline} strokeWidth={p.stroke + 3} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        ) : (
          <Path key={`o${i}`} d={p.d} fill={outline} stroke={outline} strokeWidth="3" strokeLinejoin="round" opacity="0.55" />
        ),
      )}
      {parts.map((p, i) =>
        p.stroke ? (
          <Path key={i} d={p.d} stroke={ink} strokeWidth={p.stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <Path key={i} d={p.d} fill={ink} />
        ),
      )}
      {kind === 3 ? <Path d="M46 70 V61 Q50 55 54 61 V70 Z" fill={outline} opacity="0.75" /> : null}
    </G>
  );
}

/** Escudo por defecto (partidas antiguas o sin elegir): estable para cada nombre. */
export function defaultCrest(name: string, color: string): CrestDesign {
  const h = hash(name);
  const others = CREST_COLORS.filter((c) => Math.abs(lumaOf(c) - lumaOf(color)) > 0.3);
  return {
    shape: h % CREST_SHAPES,
    pattern: (h >>> 4) % CREST_PATTERNS,
    emblem: (h >>> 9) % CREST_EMBLEMS,
    primary: color,
    secondary: others[(h >>> 14) % others.length] ?? '#FFFFFF',
  };
}

/** Escudo del club. Sin `design`, se dibuja uno estable a partir del nombre y el color. */
export function Crest({ name, color, size = 32, design }: { name: string; color: string; size?: number; design?: CrestDesign }) {
  const d = design ?? defaultCrest(name, color);
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const shape = SHAPE_PATHS[d.shape] ?? SHAPE_PATHS[0];
  // El emblema va en el color que más contraste con el fondo.
  const light = lumaOf(d.primary) * 0.6 + lumaOf(d.pattern ? d.secondary : d.primary) * 0.4 > 0.62;
  const ink = light ? '#14261B' : '#FFFFFF';
  const outline = light ? '#FFFFFF' : '#0A1610';
  const border = lumaOf(d.primary) > 0.8 ? darken(d.secondary, 0.1) : '#FFFFFF';
  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id={`${uid}s`}>
            <Path d={shape} />
          </ClipPath>
          <LinearGradient id={`${uid}g`} x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.38" />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.06" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.22" />
          </LinearGradient>
        </Defs>
        <Path d={shape} fill="#06110B" stroke="#06110B" strokeWidth="7" strokeLinejoin="round" opacity="0.6" />
        <G clipPath={`url(#${uid}s)`}>
          <Rect x="0" y="0" width="100" height="100" fill={d.primary} />
          <Pattern kind={d.pattern} color={d.secondary} />
          <Rect x="0" y="0" width="100" height="100" fill={`url(#${uid}g)`} />
        </G>
        <G transform="translate(50 50) scale(0.86) translate(-50 -50)">
          <Path d={shape} fill="none" stroke={lighten(border, 0.1)} strokeWidth="2.2" opacity="0.7" strokeLinejoin="round" />
        </G>
        <Emblem kind={d.emblem} ink={ink} outline={outline} name={name} />
        <Path d={shape} fill="none" stroke={border} strokeWidth="3.4" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
