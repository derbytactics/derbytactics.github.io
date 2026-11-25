import { GameState, currentRoller } from '../engine';

/** Qué le toca hacer a un club: fichar, elegir la convocatoria, tirar los dados o decidir un giro. */
export type TurnKind = 'market' | 'lineup' | 'roll' | 'react';

/**
 * Si al club `seat` le toca actuar, devuelve qué y una clave que cambia en cada turno nuevo
 * (para avisar una sola vez por turno); si no le toca nada, null.
 */
export function turnFor(g: GameState, seat: number | null): { key: string; kind: TurnKind } | null {
  if (seat === null || !g.players[seat]) return null;
  if (g.phase === 'market' && g.turnOrder[g.turnIndex] === seat) return { key: `m${g.jornada}-${g.turnIndex}`, kind: 'market' };
  if (g.phase === 'lineup' && !g.players[seat].starters) return { key: `l${g.jornada}`, kind: 'lineup' };
  if (g.phase === 'match' && g.match) {
    if (g.match.pending?.[0]?.playerId === seat) return { key: `g${g.jornada}-${g.match.rolls.length}`, kind: 'react' };
    if (currentRoller(g) === seat) return { key: `r${g.jornada}-${g.match.rolls.length}`, kind: 'roll' };
  }
  return null;
}
