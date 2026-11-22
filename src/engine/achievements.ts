/**
 * Logros: hitos que se desbloquean jugando y se quedan para siempre. Aquí solo está la lista
 * y cómo se detectan a partir de la partida; guardarlos y avisar es cosa de la app.
 */
import { FOOTBALLERS, footballer, specialCard } from './cards';
import { GameState, standings } from './engine';

export type AchievementId =
  | 'primerGol'
  | 'goleada'
  | 'muro'
  | 'paradon'
  | 'salvada'
  | 'cantada'
  | 'roja'
  | 'penalti'
  | 'clausula'
  | 'estadio'
  | 'millonario'
  | 'campeon'
  | 'sinPortero'
  | 'cerrojo'
  | 'enLinea'
  | 'reto'
  | 'racha7'
  | 'ascenso'
  | 'campeones'
  | 'album25'
  | 'album50'
  | 'albumCompleto';

export interface Achievement {
  id: AchievementId;
  title: string;
  text: string;
  /** Icono (MaterialCommunityIcons). */
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primerGol', title: 'Se abre la lata', text: 'Marca tu primer gol.', icon: 'soccer' },
  { id: 'goleada', title: 'Goleada', text: 'Gana una jornada por 4 goles de diferencia o más.', icon: 'fire' },
  { id: 'muro', title: 'El muro', text: 'Acaba una jornada sin encajar contra 3 rivales o más.', icon: 'wall' },
  { id: 'paradon', title: 'Manos de seda', text: 'Tu portero para 3 jugadas en una misma jornada.', icon: 'hand-back-left' },
  { id: 'salvada', title: 'In extremis', text: 'Salva un gol con una carta de giro.', icon: 'shield-check' },
  { id: 'cantada', title: '¡Qué cantada!', text: 'Provoca una cantada del portero rival.', icon: 'emoticon-cry-outline' },
  { id: 'roja', title: 'A la calle', text: 'Consigue que expulsen a un rival.', icon: 'card' },
  { id: 'penalti', title: 'Desde los once metros', text: 'Lanza un penalti a tu favor.', icon: 'target' },
  { id: 'clausula', title: 'Bombazo', text: 'Paga la cláusula de un futbolista rival.', icon: 'cash-fast' },
  { id: 'estadio', title: 'Templo del fútbol', text: 'Amplía tu estadio al nivel máximo.', icon: 'stadium' },
  { id: 'millonario', title: 'Club millonario', text: 'Junta 150M en caja.', icon: 'safe' },
  { id: 'campeon', title: 'Campeón de liga', text: 'Gana una liga.', icon: 'trophy' },
  { id: 'sinPortero', title: 'A puerta vacía', text: 'Gana una liga sin portero en la plantilla.', icon: 'door-open' },
  { id: 'cerrojo', title: 'El cerrojo', text: 'Gana una liga con 4 defensas o más.', icon: 'lock' },
  { id: 'enLinea', title: 'De tú a tú', text: 'Termina una partida en línea.', icon: 'earth' },
  { id: 'reto', title: 'Reto superado', text: 'Termina un reto diario.', icon: 'calendar-check' },
  { id: 'racha7', title: 'Una semana entera', text: 'Juega el reto diario 7 días seguidos.', icon: 'calendar-star' },
  { id: 'ascenso', title: '¡Ascenso!', text: 'Sube de división en el modo carrera.', icon: 'stairs-up' },
  { id: 'campeones', title: 'Rey de Europa', text: 'Gana la Liga de Campeones en el modo carrera.', icon: 'crown' },
  { id: 'album25', title: 'Coleccionista', text: `Ten 25 futbolistas en el álbum.`, icon: 'book-open-variant' },
  { id: 'album50', title: 'Ojeador', text: `Ten 50 futbolistas en el álbum.`, icon: 'binoculars' },
  { id: 'albumCompleto', title: 'Álbum completo', text: `Ficha a los ${FOOTBALLERS.length} futbolistas.`, icon: 'star-circle' },
];

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
export const achievement = (id: AchievementId) => BY_ID.get(id)!;

const kindOf = (cardId: string) => {
  try {
    return specialCard(cardId).kind;
  } catch {
    return null;
  }
};

/**
 * Logros conseguidos en la última jornada jugada por el club `seat` (y, si la temporada ha
 * terminado, los de final de liga). Se puede llamar varias veces: devuelve lo mismo.
 */
export function jornadaAchievements(state: GameState, seat: number): AchievementId[] {
  const me = state.players[seat];
  if (!me || me.isBot) return [];
  const out = new Set<AchievementId>();
  const m = state.lastMatch;
  const r = m?.results.find((x) => x.playerId === seat);
  if (m && r) {
    if (r.goals > 0) out.add('primerGol');
    if (r.diff >= 4) out.add('goleada');
    if (r.against === 0 && state.players.length >= 4) out.add('muro');
    if (r.saves >= 3) out.add('paradon');
    for (const roll of m.rolls) for (const t of roll.twists ?? []) if (t.playerId === seat) out.add(t.kind);
    if (m.penalties?.some((p) => p.playerId === seat)) out.add('penalti');
    for (const e of m.events ?? []) {
      if (e.playerId !== seat || e.blocked) continue;
      if (kindOf(e.cardId) === 'roja' || e.secondYellow) out.add('roja');
    }
  }
  if ((me.clauses ?? 0) > 0) out.add('clausula');
  if (me.stadium >= 5) out.add('estadio');
  if (me.money >= 150) out.add('millonario');
  if (state.phase === 'finished' && standings(state)[0]?.id === seat) {
    out.add('campeon');
    const pos = me.squad.map((e) => footballer(e.cardId).position);
    if (!pos.includes('POR')) out.add('sinPortero');
    if (pos.filter((p) => p === 'DEF').length >= 4) out.add('cerrojo');
  }
  return [...out];
}

/** Logros del álbum según cuántos futbolistas distintos tengas. */
export function albumAchievements(count: number): AchievementId[] {
  const out: AchievementId[] = [];
  if (count >= 25) out.push('album25');
  if (count >= 50) out.push('album50');
  if (count >= FOOTBALLERS.length) out.push('albumCompleto');
  return out;
}
