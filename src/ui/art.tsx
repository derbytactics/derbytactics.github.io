/** Ilustraciones vectoriales del juego. Todo se dibuja por código: no hay imágenes que cargar. */
import React from 'react';
import { Platform, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { C } from './theme';

const SANS = Platform.OS === 'web' ? 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' : undefined;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const SKIN = ['#F6D3B3', '#EBBE94', '#D9A273', '#B97C4F', '#8A5A38', '#5E3B24'];
const HAIR = ['#1E1A17', '#3B2A1E', '#6B4423', '#A8742F', '#D9B45A', '#B6452C', '#8D8D8D'];

/** Retrato de futbolista generado a partir de su id: tono de piel, peinado y dorsal estables. */
export function Avatar({ seed, size = 60, jersey = '#7C8F84', ring = C.line }: { seed: string; size?: number; jersey?: string; ring?: string }) {
  const h = hash(seed);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >>> 3) % HAIR.length];
  const style = (h >>> 7) % 6;
  const beard = (h >>> 11) % 5 === 0;
  const id = `g${seed}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1D4A33" />
          <Stop offset="1" stopColor="#0C2417" />
        </LinearGradient>
      </Defs>
      <Circle cx="32" cy="32" r="31" fill={`url(#${id})`} stroke={ring} strokeWidth="2" />
      {/* Camiseta */}
      <Path d="M8 64 C8 50 18 45 26 44 L38 44 C46 45 56 50 56 64 Z" fill={jersey} />
      <Path d="M26 44 L32 51 L38 44 L35 43 L32 46 L29 43 Z" fill="#FFFFFF" opacity="0.9" />
      <Path d="M8 64 C8 56 11 52 15 49 L18 64 Z M56 64 C56 56 53 52 49 49 L46 64 Z" fill="#000000" opacity="0.18" />
      {/* Cuello y cabeza */}
      <Rect x="27.5" y="36" width="9" height="9" rx="3" fill={skin} />
      <Path d="M27.5 41 Q32 45 36.5 41 L36.5 39 L27.5 39 Z" fill="#000000" opacity="0.15" />
      <Ellipse cx="32" cy="27" rx="10.5" ry="12.5" fill={skin} />
      <Ellipse cx="21.3" cy="28.5" rx="1.8" ry="2.8" fill={skin} />
      <Ellipse cx="42.7" cy="28.5" rx="1.8" ry="2.8" fill={skin} />
      {/* Peinados */}
      {style === 0 ? <Path d="M21.5 25 C20.5 13 43.5 13 42.5 25 C40 19 24 19 21.5 25 Z" fill={hair} /> : null}
      {style === 1 ? <Path d="M21 27 C19 10 45 10 43 27 C42 21 38 18 32 19 C27 18 22 21 21 27 Z" fill={hair} /> : null}
      {style === 2 ? <Path d="M21.5 24 C21 14 30 11 36 13 C41 12 44 18 42.5 24 C40 18 35 17 30 19 C26 19 23 21 21.5 24 Z" fill={hair} /> : null}
      {style === 3 ? (
        <G fill={hair}>
          <Circle cx="24" cy="18" r="5" />
          <Circle cx="30" cy="14.5" r="5.5" />
          <Circle cx="37" cy="15.5" r="5.5" />
          <Circle cx="41" cy="20" r="4.5" />
          <Circle cx="22" cy="23" r="3.5" />
        </G>
      ) : null}
      {style === 4 ? <Path d="M22 22 C24 15 40 15 42 22 C38 19.5 26 19.5 22 22 Z" fill={hair} opacity="0.55" /> : null}
      {style === 5 ? <Path d="M21 26 C19 12 45 12 43 26 L43.5 34 C42 30 41.5 24 39 21 C34 22 27 21 24.5 20 C22.5 24 22 30 20.5 34 Z" fill={hair} /> : null}
      {beard ? <Path d="M22.5 30 C23 41 41 41 41.5 30 C39 35 35 36.5 32 36.5 C29 36.5 25 35 22.5 30 Z" fill={hair} opacity="0.8" /> : null}
      {/* Cara */}
      <Circle cx="27.8" cy="27" r="1.25" fill="#1B1B1B" />
      <Circle cx="36.2" cy="27" r="1.25" fill="#1B1B1B" />
      <Path d="M28.5 32.5 Q32 35 35.5 32.5" stroke="#1B1B1B" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚ]{2}$/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || name.slice(0, 2).toUpperCase();

/** Escudo del club con sus iniciales. */
export function Crest({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M20 2 L35 6.5 V19 C35 28.5 28.5 34.5 20 38 C11.5 34.5 5 28.5 5 19 V6.5 Z" fill={color} stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1.6" />
      <Path d="M20 2 L35 6.5 V19 C35 28.5 28.5 34.5 20 38 Z" fill="#000000" opacity="0.16" />
      <Path d="M5 12 H35 V15 H5 Z" fill="#FFFFFF" opacity="0.22" />
      <SvgText x="20" y="27" fontSize="12.5" fontWeight="800" fill="#FFFFFF" textAnchor="middle" fontFamily={SANS}>
        {initials(name)}
      </SvgText>
    </Svg>
    </View>
  );
}

const PIPS: Record<number, [number, number][]> = {
  1: [[20, 20]],
  2: [[11, 11], [29, 29]],
  3: [[11, 11], [20, 20], [29, 29]],
  4: [[11, 11], [29, 11], [11, 29], [29, 29]],
  5: [[11, 11], [29, 11], [20, 20], [11, 29], [29, 29]],
  6: [[11, 10], [29, 10], [11, 20], [29, 20], [11, 30], [29, 30]],
};

export function Die({ value, size = 44, tone = 'light' }: { value: number; size?: number; tone?: 'light' | 'var' | 'ghost' }) {
  const face = tone === 'var' ? '#FFE3E3' : tone === 'ghost' ? '#123222' : '#FBF6E4';
  const pip = tone === 'var' ? C.hot : tone === 'ghost' ? '#24503A' : '#14261B';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect x="2" y="4" width="36" height="35" rx="8" fill="#000000" opacity="0.35" />
      <Rect x="2" y="1.5" width="36" height="35" rx="8" fill={face} />
      <G transform="translate(0 -1)">
        {(PIPS[value] ?? []).map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r="3.4" fill={pip} />
        ))}
      </G>
    </Svg>
  );
}

/** Balón: marca de gol. */
export function Ball({ size = 18, dim = false }: { size?: number; dim?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={dim ? 0.25 : 1}>
      <Circle cx="12" cy="12" r="11" fill="#FFFFFF" stroke="#14261B" strokeWidth="1.4" />
      <Path d="M12 7.2 L16.5 10.5 L14.8 15.8 H9.2 L7.5 10.5 Z" fill="#14261B" />
      <Path d="M12 7.2 V2 M16.5 10.5 L21.5 8.6 M14.8 15.8 L18 20.3 M9.2 15.8 L6 20.3 M7.5 10.5 L2.5 8.6" stroke="#14261B" strokeWidth="1.3" />
    </Svg>
  );
}

/** Estadio que crece con el nivel (1-5): más gradas, focos y banderas. */
export function StadiumArt({ level, color, width = 220 }: { level: number; color: string; width?: number }) {
  const tiers = Array.from({ length: level }, (_, i) => i);
  return (
    <Svg width={width} height={width * 0.5} viewBox="0 0 220 110">
      <Ellipse cx="110" cy="100" rx="104" ry="8" fill="#000000" opacity="0.35" />
      {level >= 3
        ? [26, 194].map((x) => (
            <G key={x}>
              <Rect x={x - 1.5} y={22 - level * 3} width="3" height={70} fill="#6C8577" />
              <Rect x={x - 9} y={14 - level * 3} width="18" height="10" rx="2" fill="#FBF6E4" />
              <Path d={`M${x - 9} ${24 - level * 3} L${x - 26} 92 L${x + 26} 92 L${x + 9} ${24 - level * 3} Z`} fill="#FBF6E4" opacity="0.06" />
            </G>
          ))
        : null}
      {tiers.map((i) => {
        const y = 82 - i * 13;
        const half = 58 + i * 9;
        return (
          <G key={i}>
            <Path d={`M${110 - half} ${y} L${110 - half + 7} ${y - 12} H${110 + half - 7} L${110 + half} ${y} Z`} fill={i % 2 ? '#DDE6DF' : color} />
            <Path d={`M${110 - half} ${y} L${110 - half + 7} ${y - 12} H${110 + half - 7} L${110 + half} ${y} Z`} fill="#000000" opacity={0.08 * i} />
            {Array.from({ length: Math.floor(half / 6) }, (_, k) => (
              <Circle key={k} cx={110 - half + 12 + k * 12} cy={y - 6} r="1.6" fill="#0C2417" opacity="0.45" />
            ))}
          </G>
        );
      })}
      <Path d="M44 98 L52 82 H168 L176 98 Z" fill="#2E9E5B" />
      <Path d="M62 98 L66 82 H82 L80 98 Z M98 98 L99 82 H121 L122 98 Z M140 98 L138 82 H154 L158 98 Z" fill="#FFFFFF" opacity="0.1" />
      <Path d="M110 82 V98" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="1" />
      <Ellipse cx="110" cy="90" rx="9" ry="4" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="1" fill="none" />
      {level >= 5
        ? [70, 110, 150].map((x) => (
            <G key={x}>
              <Rect x={x} y="6" width="1.5" height="14" fill="#DDE6DF" />
              <Path d={`M${x + 1.5} 6 L${x + 12} 9 L${x + 1.5} 12 Z`} fill={C.accent} />
            </G>
          ))
        : null}
    </Svg>
  );
}

/** Logotipo: abanico de cartas con balón. */
export function Logo({ size = 120 }: { size?: number }) {
  const card = (rot: number, fill: string, dx: number) => (
    <G transform={`rotate(${rot} 60 96) translate(${dx} 0)`}>
      <Rect x="38" y="22" width="44" height="62" rx="7" fill={fill} stroke="#07160F" strokeWidth="2.5" />
      <Rect x="44" y="28" width="32" height="26" rx="4" fill="#07160F" opacity="0.22" />
      <Rect x="44" y="60" width="20" height="4" rx="2" fill="#07160F" opacity="0.3" />
      <Rect x="44" y="68" width="28" height="4" rx="2" fill="#07160F" opacity="0.3" />
    </G>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {card(-22, '#3E8BFF', -6)}
      {card(0, '#F5C542', 0)}
      {card(22, '#E5484D', 6)}
      <G transform="translate(42 62) scale(1.5)">
        <Circle cx="12" cy="12" r="11" fill="#FFFFFF" stroke="#07160F" strokeWidth="1.8" />
        <Path d="M12 7.2 L16.5 10.5 L14.8 15.8 H9.2 L7.5 10.5 Z" fill="#07160F" />
        <Path d="M12 7.2 V2 M16.5 10.5 L21.5 8.6 M14.8 15.8 L18 20.3 M9.2 15.8 L6 20.3 M7.5 10.5 L2.5 8.6" stroke="#07160F" strokeWidth="1.4" />
      </G>
    </Svg>
  );
}

export function Trophy({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Path d="M28 14 H68 V34 C68 48 59 56 48 58 C37 56 28 48 28 34 Z" fill={C.accent} />
      <Path d="M48 14 H68 V34 C68 48 59 56 48 58 Z" fill="#000000" opacity="0.14" />
      <Path d="M28 20 H16 C16 34 22 40 30 41 M68 20 H80 C80 34 74 40 66 41" stroke={C.accent} strokeWidth="5" fill="none" strokeLinecap="round" />
      <Rect x="43" y="57" width="10" height="14" fill={C.accent} />
      <Rect x="30" y="70" width="36" height="8" rx="3" fill={C.accent} />
      <Rect x="24" y="78" width="48" height="9" rx="3" fill="#8A6A12" />
      <Path d="M48 24 L51.5 31.5 L59.5 32.5 L53.5 38 L55 46 L48 42 L41 46 L42.5 38 L36.5 32.5 L44.5 31.5 Z" fill="#FFFFFF" opacity="0.85" />
    </Svg>
  );
}
