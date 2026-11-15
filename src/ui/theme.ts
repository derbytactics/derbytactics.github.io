import { Platform, StatusBar } from 'react-native';

export const C = {
  bg: '#07160F',
  panel: '#0F2A1C',
  panelAlt: '#163726',
  line: '#24503A',
  text: '#F4F7F2',
  dim: '#9DB8A7',
  faint: '#5F7F6D',
  accent: '#F5C542',
  accentText: '#231B00',
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

/** Colores de club, por orden de asiento. */
export const CLUB_COLORS = ['#E5484D', '#3E8BFF', '#F5C542', '#35C98A', '#A07CF5', '#FF8A3D', '#2CC7D8', '#F06CA8'];
export const clubColor = (playerId: number) => CLUB_COLORS[playerId % CLUB_COLORS.length];

export const TOP_INSET = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : Platform.OS === 'ios' ? 50 : 0;
/** Las animaciones nativas no existen en web. */
export const NATIVE_DRIVER = Platform.OS !== 'web';
