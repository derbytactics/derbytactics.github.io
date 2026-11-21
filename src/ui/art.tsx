/** Ilustraciones vectoriales del juego. Todo se dibuja por código: no hay imágenes que cargar. */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { Face, Portrait, faceFromSeed } from './portrait';
import { C } from './theme';

export { Crest, defaultCrest } from './crest';

/** Retrato de futbolista. Con `who` usa su identidad de la partida; sin ella, rasgos estables según `seed`. */
export function Avatar({ seed, size = 60, jersey = '#7C8F84', ring = C.line, who }: { seed: string; size?: number; jersey?: string; ring?: string; who?: Face }) {
  return <Portrait who={who ?? faceFromSeed(seed)} size={size} jersey={jersey} ring={ring} />;
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

/** Avatares de usuario para elegir. Para usar imágenes propias, basta con cambiar este componente. */
export const USER_AVATARS: { id: string; who: Face; jersey: string }[] = [
  { id: 'a1', who: { eth: 'mediterraneo', face: 11 }, jersey: '#E5484D' },
  { id: 'a2', who: { eth: 'africano', face: 7 }, jersey: '#3E8BFF' },
  { id: 'a3', who: { eth: 'europeo', face: 23 }, jersey: '#F5C542' },
  { id: 'a4', who: { eth: 'asiaEste', face: 5 }, jersey: '#35C98A' },
  { id: 'a5', who: { eth: 'magrebi', face: 31 }, jersey: '#A07CF5' },
  { id: 'a6', who: { eth: 'asiaSur', face: 17 }, jersey: '#FF8A3D' },
  { id: 'a7', who: { eth: 'mestizo', face: 41 }, jersey: '#2CC7D8' },
  { id: 'a8', who: { eth: 'africano', face: 58 }, jersey: '#F06CA8' },
  { id: 'a9', who: { eth: 'europeo', face: 64 }, jersey: '#FBF6E4' },
  { id: 'a10', who: { eth: 'asiaEste', face: 77 }, jersey: '#F5C542' },
  { id: 'a11', who: { eth: 'mediterraneo', face: 89 }, jersey: '#3E8BFF' },
  { id: 'a12', who: { eth: 'mestizo', face: 93 }, jersey: '#E5484D' },
  { id: 'a13', who: { eth: 'magrebi', face: 101 }, jersey: '#35C98A' },
  { id: 'a14', who: { eth: 'africano', face: 113 }, jersey: '#A07CF5' },
  { id: 'a15', who: { eth: 'asiaSur', face: 127 }, jersey: '#2CC7D8' },
  { id: 'a16', who: { eth: 'europeo', face: 139 }, jersey: '#FF8A3D' },
  { id: 'a17', who: { eth: 'mediterraneo', face: 151, fem: true }, jersey: '#E5484D' },
  { id: 'a18', who: { eth: 'africano', face: 163, fem: true }, jersey: '#F5C542' },
  { id: 'a19', who: { eth: 'europeo', face: 173, fem: true }, jersey: '#3E8BFF' },
  { id: 'a20', who: { eth: 'mestizo', face: 181, fem: true }, jersey: '#35C98A' },
  { id: 'a21', who: { eth: 'asiaEste', face: 191, fem: true }, jersey: '#A07CF5' },
  { id: 'a22', who: { eth: 'magrebi', face: 197, fem: true }, jersey: '#2CC7D8' },
  { id: 'a23', who: { eth: 'africano', face: 211, fem: true }, jersey: '#F06CA8' },
  { id: 'a24', who: { eth: 'europeo', face: 223, fem: true }, jersey: '#FF8A3D' },
];

export function UserAvatar({ id, size = 40, ring = C.accent }: { id: string; size?: number; ring?: string }) {
  const a = USER_AVATARS.find((x) => x.id === id) ?? USER_AVATARS[0];
  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
      <Avatar seed={`user-${a.id}`} size={size} jersey={a.jersey} ring={ring} who={a.who} />
    </View>
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

const LOGO_SHIELD = 'M50 10 L84 19.5 V47 C84 70 69 84 50 91 C31 84 16 70 16 47 V19.5 Z';

/** Logotipo: escudo partido por los colores de dos rivales (el derbi) con un dado en el centro. */
export function Logo({ size = 120 }: { size?: number }) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="DerbyTactics">
      <Defs>
        <ClipPath id={`${id}s`}>
          <Path d={LOGO_SHIELD} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id}s)`}>
        <Rect width="100" height="100" fill="#2E9E5B" />
        <Path d="M0 0 H100 L0 100 Z" fill="#F5C542" />
        <Path d="M0 0 H100 L0 100 Z" fill="#FFFFFF" opacity="0.12" />
        <Path d="M100 100 L0 100 L100 0 Z" fill="#000000" opacity="0.12" />
      </G>
      <Path d={LOGO_SHIELD} fill="none" stroke="#07160F" strokeWidth="7" strokeLinejoin="round" opacity="0.55" />
      <Path d={LOGO_SHIELD} fill="none" stroke="#F4F7F2" strokeWidth="3.5" strokeLinejoin="round" />
      <G transform="rotate(-12 50 50)">
        <Rect x="35.5" y="36.5" width="32" height="32" rx="7" fill="#07160F" opacity="0.35" />
        <Rect x="34" y="34" width="32" height="32" rx="7" fill="#FBF6E4" stroke="#07160F" strokeWidth="2.5" />
        <Circle cx="42" cy="42" r="3.4" fill="#0B1F15" />
        <Circle cx="58" cy="42" r="3.4" fill="#0B1F15" />
        <Circle cx="50" cy="50" r="3.4" fill="#C8102E" />
        <Circle cx="42" cy="58" r="3.4" fill="#0B1F15" />
        <Circle cx="58" cy="58" r="3.4" fill="#0B1F15" />
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
