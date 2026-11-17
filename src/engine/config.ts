/**
 * Todos los valores de equilibrio del juego viven aquí.
 * Están afinados con `npm run simulate` (ver docs/BALANCE.md).
 * Las cantidades de dinero están en millones (M).
 */
export const CONFIG = {
  minPlayers: 2,
  maxPlayers: 8,

  /** Caja inicial de cada club. */
  startingMoney: 80,
  /** Máximo de futbolistas en plantilla (fútbol 7). */
  squadSize: 7,
  /** Como mucho un portero por club. */
  maxKeepers: 1,
  /** Fuerza de ataque y defensa de cada posición cuando sale uno de sus números. */
  roles: {
    POR: { attack: 0, defense: 2 },
    DEF: { attack: 0, defense: 1 },
    MED: { attack: 1, defense: 0 },
    DEL: { attack: 2, defense: 0 },
  } as Record<'POR' | 'DEF' | 'MED' | 'DEL', { attack: number; defense: number }>,
  /** Contragolpe: si paras una jugada con un defensa en ese número, marcas un gol a quien atacó. */
  counterAttack: true,
  /** Si en tu ataque participa un medio, cubre la espalda: no te pueden hacer contragolpe. */
  midfieldCoversCounter: true,
  /** Prima por cada jugada rival que para tu portero. */
  saveBonus: 1,
  /** Paradas del portero en una jornada que dan una carta especial. */
  savesForCard: 3,
  /** Mínimo de tiradas por jornada. Se tira por turnos: cada club lanza los dados al menos una vez. */
  minRollsPerMatchday: 6,
  /** Duración de la temporada en jornadas. */
  seasonLengths: { corta: 8, estandar: 12, larga: 16 } as Record<SeasonLength, number>,

  /**
   * Precio = factor de posición × (perPip·pips + quad·pips²).
   * Los pips son la frecuencia de sus números; el factor refleja cuánto pesa su papel.
   */
  price: { perPip: 1.8, quad: 0.1, factor: { POR: 0.5, DEF: 0.7, MED: 0.6, DEL: 1.05 } as Record<'POR' | 'DEF' | 'MED' | 'DEL', number> },
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
    /** Taquilla por cada jugada propia que acaba en gol, según el nivel del estadio (1..5). */
    ticketPerGoal: [2, 3, 4, 6, 8],
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
