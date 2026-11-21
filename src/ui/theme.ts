import { Platform, StatusBar } from 'react-native';
import { CLUB_COLORS } from './palette';

export const C = {
  bg: '#07160F',
  panel: '#12301F',
  panelAlt: '#1A3D2A',
  line: '#2B5A42',
  text: '#F4F7F2',
  dim: '#9DB8A7',
  // Texto secundario: contraste de al menos 4,5:1 sobre todos los fondos de panel.
  faint: '#8FAE9C',
  accent: '#F5C542',
  accentText: '#231B00',
  /** Opción elegida en selectores y pestañas (el dorado queda para la acción principal). */
  sel: '#2F6148',
  selLine: '#5E9278',
  danger: '#F0585D',
  good: '#4CC38A',
  hot: '#D93A3F',
  chip: '#FBF6E4',
  chipText: '#14261B',
};

export const TIER_COLOR: Record<string, string> = {
  Cantera: '#8FA89A',
  Plata: '#C9D3DC',
  Oro: '#F5C542',
  Crack: '#FF7A4D',
};

/** Color de cada posición en el campo. */
export const POS_COLOR: Record<string, string> = { POR: '#F5A742', DEF: '#5B9BFF', MED: '#4CC38A', DEL: '#F0585D' };

/** Colores de club, por orden de asiento. */
export { CLUB_COLORS } from './palette';
export const clubColor = (playerId: number) => CLUB_COLORS[playerId % CLUB_COLORS.length];

export const TOP_INSET = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : Platform.OS === 'ios' ? 50 : 0;
/** Fuente de títulos, marcadores y cifras (Barlow Condensed): aire de marcador de estadio. */
export const FONTS = { display: 'BarlowCondensed_800ExtraBold', displayBold: 'BarlowCondensed_700Bold' };
/** Estilo de texto de marcador; las cifras con ancho fijo para que no bailen al cambiar. */
export const DISPLAY = { fontFamily: FONTS.display, fontWeight: 'normal', fontVariant: ['tabular-nums'] } as const;
export const DISPLAY_BOLD = { fontFamily: FONTS.displayBold, fontWeight: 'normal', fontVariant: ['tabular-nums'] } as const;

/** Sombra suave que despega paneles y cartas del fondo. */
export const SHADOW = { boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.35)' } as const;

/** Las animaciones nativas no existen en web. */
export const NATIVE_DRIVER = Platform.OS !== 'web';
