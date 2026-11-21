/** Colores de club de la partida en curso, para los componentes. */
import React from 'react';
import { CLUB_COLORS } from './palette';

export { clubPalette } from './palette';

export const ClubColorsContext = React.createContext<string[]>(CLUB_COLORS);
/** Color de un club de la partida en curso, por su número de asiento. */
export function useClubColor(): (id: number) => string {
  const palette = React.useContext(ClubColorsContext);
  return (id: number) => palette[id] ?? CLUB_COLORS[id % CLUB_COLORS.length];
}
