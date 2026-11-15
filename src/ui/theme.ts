import { Platform, StatusBar } from 'react-native';

export const C = {
  bg: '#0B1F17',
  panel: '#12301F',
  panelAlt: '#183D29',
  line: '#27543A',
  text: '#F2F6F0',
  dim: '#A9C0B0',
  accent: '#F5C542',
  accentText: '#231B00',
  danger: '#E5484D',
  good: '#4CC38A',
  hot: '#E5484D',
  chip: '#F2F6F0',
  chipText: '#10241A',
};

export const TIER_COLOR: Record<string, string> = {
  Cantera: '#8FA89A',
  Plata: '#C9D3DC',
  Oro: '#F5C542',
  Crack: '#FF8A5B',
};

export const TOP_INSET = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : Platform.OS === 'ios' ? 50 : 0;
