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
  /** Titulares que salen en cada partido; el resto se queda en el banquillo. */
  starters: 5,
  /** Como mucho un portero por club. */
  maxKeepers: 1,
  /** Como mucho dos delanteros por club: el resto del ataque lo ponen los medios. */
  maxForwards: 2,
  /** Con pocos clubes hay pocas tiradas: hasta este número de clubes, cada uno tira dos veces por jornada. */
  doubleRollsUpTo: 3,
  /** Ventaja de la IA en difícil: dinero, niveles de estadio y cartas especiales de más (al empezar y en cada jornada). La carta extra es lo que de verdad la hace más fuerte (ver BALANCE.md). */
  hardBonus: { money: 0, stadium: 0, cards: 1 },
  /** Fuerza de ataque y defensa de cada posición cuando sale uno de sus números. */
  roles: {
    POR: { attack: 0, defense: 2 },
    DEF: { attack: 0, defense: 1 },
    MED: { attack: 1, defense: 0 },
    DEL: { attack: 2, defense: 0 },
  } as Record<'POR' | 'DEF' | 'MED' | 'DEL', { attack: number; defense: number }>,
  /** Prima por cada jugada rival que para tu portero. */
  saveBonus: 1,
  /** Paradas del portero en una jornada que dan una carta especial. */
  savesForCard: 3,
  /** Duración de la temporada en jornadas. */
  seasonLengths: { corta: 8, estandar: 12, larga: 16 } as Record<SeasonLength, number>,

  /**
   * Precio = factor de posición × (perPip·pips + quad·pips²).
   * Los pips son la frecuencia de sus números; el factor refleja cuánto pesa su papel.
   */
  price: { perPip: 1.8, quad: 0.1, factor: { POR: 0.45, DEF: 0.38, MED: 0.75, DEL: 1.05 } as Record<'POR' | 'DEF' | 'MED' | 'DEL', number> },
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

  /**
   * Mesas pequeñas: al empezar cada jornada (desde la 2) cada club cobra derechos de TV
   * y roba una carta especial, para compensar que hay pocas tiradas.
   */
  tvRights: { maxPlayers: 2, money: 5, card: false },

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
    handLimit: 5,
    /** Cartas que recibe cada club al empezar la temporada y al empezar cada jornada. */
    initialHand: 3,
    perJornada: 1,
    maxPlayedPerTurn: 2,
    /** Cartas de árbitro y de jugada que cada club puede jugar en un mismo partido. */
    maxPlayedPerMatch: 2,
    fine: 6,
    /** «Prima por ganar»: lo que cobras de más si ganas la jornada. */
    winBonus: 10,
    closedDoorsRounds: 2,
    injuryRounds: 3,
    redCardRounds: 2,
    /** Fuerza que pierde un futbolista amonestado durante la jornada. */
    yellowPenalty: 1,
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
