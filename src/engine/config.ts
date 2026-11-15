/**
 * Todos los valores de equilibrio del juego viven aquí.
 * Están afinados con `npm run simulate` (ver docs/BALANCE.md).
 * Las cantidades de dinero están en millones (M).
 */
export const CONFIG = {
  minPlayers: 2,
  maxPlayers: 8,

  /** Caja inicial de cada club. */
  startingMoney: 60,
  /** Máximo de futbolistas en plantilla. */
  squadSize: 6,
  /** Tiradas de 2 dados por jornada (ocasiones de gol). */
  rollsPerMatchday: 6,
  /** Duración de la temporada en jornadas. */
  seasonLengths: { corta: 8, estandar: 12, larga: 16 } as Record<SeasonLength, number>,

  /** Precio = perPip·pips + quad·pips² (los cracks pagan prima por concentrar goles en una sola ficha). */
  price: { perPip: 2.2, quad: 0.12 },
  /** Al vender al banco se recupera este porcentaje del precio. */
  sellRatio: 0.5,
  /** Cláusula = precio × multiplicador. */
  clauseMult: 1.3,
  shieldedClauseMult: 2,
  /** Coste de blindar a un jugador (porcentaje de su precio). */
  shieldCostRatio: 0.25,
  /** Jornadas de protección anti-cláusula tras un fichaje (además de la actual). */
  transferProtection: 1,

  stadium: {
    /** Taquilla por gol según el nivel del estadio (nivel 1..5). */
    ticketPerGoal: [1, 2, 3, 5, 7],
    /** Coste de ampliar del nivel i al i+1. */
    upgradeCost: [10, 18, 28, 40],
  },

  /** Premio de jornada: interpolación lineal entre el primero y el último. */
  prize: { first: 8, last: 3 },
  /** Punto extra de liga para quien gana la jornada. */
  winBonusPoints: 1,
  /** Balance final: al acabar la temporada, 1 punto de liga por cada X millones en caja. */
  moneyPerPoint: 20,
  /** Pretemporada en serpiente (el último en elegir repite turno) o en el mismo orden las dos vueltas. */
  preseasonSnake: true,

  special: {
    cost: 5,
    handLimit: 3,
    maxPlayedPerTurn: 2,
    fine: 6,
    closedDoorsRounds: 2,
    injuryRounds: 2,
    redCardRounds: 1,
    streakRounds: 2,
    extraNumberRounds: 3,
    academyRounds: 3,
    sponsor: 8,
    scoutDiscount: 0.3,
    subsidyDiscount: 0.5,
  },
};

export type SeasonLength = 'corta' | 'estandar' | 'larga';

/** Tamaño del mercado visible según el número de clubes. */
export function marketSize(players: number): number {
  return 4 + Math.ceil(players / 2);
}
