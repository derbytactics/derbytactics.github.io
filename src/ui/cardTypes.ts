import { CardTiming } from '../engine';
import { IconName } from './icons';

/** Aspecto de cada tipo de carta especial: se distingue a primera vista cuándo se juega. */
export const CARD_TYPE: Record<CardTiming, { label: string; when: string; color: string; icon: IconName }> = {
  despacho: { label: 'DESPACHO', when: 'En tu turno de mercado', color: '#3FB37F', icon: 'briefcase' },
  arbitro: { label: 'ÁRBITRO', when: 'En el partido, cuando quieras', color: '#F5A524', icon: 'whistle' },
  jugada: { label: 'JUGADA', when: 'En el partido, cuando quieras', color: '#F5C542', icon: 'soccer' },
  giro: { label: 'GIRO', when: 'Cuando una jugada te afecta', color: '#A970FF', icon: 'swap-horizontal-bold' },
};
