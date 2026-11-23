/**
 * Modo carrera: tu club recorre las divisiones temporada a temporada.
 * Ligas de 4 clubes y 8 jornadas: el campeón sube, el último baja.
 * Tu plantilla, tu estadio y parte de tu dinero pasan de una temporada a otra;
 * los rivales de cada división son siempre los mismos en esa carrera y tienen su estilo.
 */
import { BotStyle } from './bots';
import { CONFIG } from './config';
import { FOOTBALLERS, Position, basePrice } from './cards';
import { GameState, SquadEntry, createGame, standings } from './engine';
import { CrestDesign, Identity, League, makeRand, randomClubName, randomCrest } from './identity';

/**
 * `budget`: dinero de los rivales (tú recibes una parte). `squad`: futbolistas con los que ya
 * empiezan los rivales, y `level` (0 a 1), lo buenos que son: cuanto más arriba, mejores.
 */
export const DIVISIONS = [
  { key: 'tercera', name: 'Tercera División', budget: 60, squad: 2, level: 0.15 },
  { key: 'segunda', name: 'Segunda División', budget: 60, squad: 5, level: 0.4 },
  { key: 'primera', name: 'Primera División', budget: 70, squad: 6, level: 0.55 },
  { key: 'campeones', name: 'Liga de Campeones', budget: 80, squad: 6, level: 0.8 },
] as const;

/** Orden en que un rival completa su plantilla de partida (táctica 1-2-2-2). */
const RIVAL_SHAPE: Position[] = ['POR', 'DEL', 'DEF', 'MED', 'DEL', 'DEF', 'MED'];

export const CAREER = {
  clubs: 4,
  jornadas: 8,
  /** De tu caja al acabar, la parte que pasa a la temporada siguiente. */
  carryShare: 0.25,
  /** Parte del presupuesto de la división que recibes (los rivales reciben el presupuesto entero). */
  ownBudgetShare: 0.5,
};

/** Estilo de juego de cada rival, contado como su seña de identidad. */
export const STYLE_MOTTO: Record<BotStyle, string> = {
  equilibrado: 'Bloque compensado',
  ofensivo: 'Todo al ataque',
  defensivo: 'Defensa de hierro',
  cerrojo: 'El cerrojo',
  sinPortero: 'Sin portero y a lo loco',
  sinDefensa: 'Sin defensas',
};

export interface CareerRival {
  name: string;
  crest: CrestDesign;
  style: BotStyle;
  /** Futbolistas con los que empieza la temporada. */
  squad: string[];
}

export type SeasonOutcome = 'ascenso' | 'descenso' | 'permanencia' | 'campeon';

export interface CareerSeason {
  season: number;
  division: number;
  position: number;
  points: number;
  goals: number;
  against: number;
  outcome: SeasonOutcome;
}

export interface CareerState {
  v: 1;
  seed: number;
  /** Temporada que toca jugar (empieza en 1). */
  season: number;
  division: number;
  club: { name: string; crest?: CrestDesign };
  squad: SquadEntry[];
  /** Nombres y caras de tus futbolistas, para que no cambien entre temporadas. */
  roster: Record<string, Identity>;
  /** Dinero que pasa de la temporada anterior. */
  money: number;
  stadium: number;
  history: CareerSeason[];
  /** Ligas de Campeones ganadas. */
  titles: number;
  /** Liga de toda la carrera (las carreras antiguas no la tienen: masculina). */
  league?: League;
}

const STYLES: BotStyle[] = ['equilibrado', 'ofensivo', 'defensivo', 'cerrojo'];

export function newCareer(club: { name: string; crest?: CrestDesign }, seed = Math.floor(Math.random() * 2 ** 31), league: League = 'masculina'): CareerState {
  return { v: 1, seed: seed | 0, season: 1, division: 0, club, squad: [], roster: {}, money: 0, stadium: 1, history: [], titles: 0, league };
}

/** Los rivales de una división en esta carrera: siempre los mismos, con nombre, escudo y estilo. */
export function careerRivals(c: CareerState, division = c.division): CareerRival[] {
  const r = makeRand((c.seed ^ Math.imul(division + 1, 0x9e3779b1)) | 0);
  const taken = [c.club.name];
  // Cada división mezcla estilos distintos, para que cada rival se juegue diferente.
  const styles = [...STYLES].sort(() => r() - 0.5);
  const used = new Set(c.squad.map((e) => e.cardId));
  const d = DIVISIONS[division];
  return Array.from({ length: CAREER.clubs - 1 }, (_, i) => {
    const name = randomClubName(r, taken);
    taken.push(name);
    // Plantilla de partida: por puestos, del nivel de la división (con algo de variedad).
    const squad: string[] = [];
    for (const pos of RIVAL_SHAPE.slice(0, d.squad)) {
      const pool = FOOTBALLERS.filter((f) => f.position === pos && !used.has(f.id)).sort((a, b) => basePrice(a.id) - basePrice(b.id));
      if (!pool.length) continue;
      const q = Math.min(1, Math.max(0, d.level + (r() - 0.5) * 0.3));
      const pick = pool[Math.min(pool.length - 1, Math.floor(q * pool.length))];
      used.add(pick.id);
      squad.push(pick.id);
    }
    return { name, crest: randomCrest(r), style: styles[i % styles.length], squad };
  });
}

/** Presupuesto con el que empiezas la temporada: parte del de la división más lo que traes. */
export const careerBudget = (c: CareerState) => Math.round(DIVISIONS[c.division].budget * CAREER.ownBudgetShare) + c.money;

/** La partida de la temporada que toca. */
export function createCareerSeason(c: CareerState): GameState {
  const division = DIVISIONS[c.division];
  const rivals = careerRivals(c);
  return createGame({
    seed: (c.seed ^ Math.imul(c.season, 0x85ebca6b)) | 0,
    jornadas: CAREER.jornadas,
    career: { division: c.division, season: c.season },
    league: c.league,
    roster: c.roster,
    players: [
      { name: c.club.name, isBot: false, crest: c.club.crest, money: careerBudget(c), stadium: c.stadium, squad: c.squad },
      ...rivals.map((rv) => ({
        name: rv.name,
        isBot: true,
        crest: rv.crest,
        style: rv.style,
        money: division.budget,
        squad: rv.squad.map((cardId) => ({ cardId, shielded: false, noClauseUntil: 0, streakUntil: 0, outUntil: 0, extra: null })),
      })),
    ],
  });
}

/** Cierra una temporada terminada: apunta el resultado, sube o baja de división y guarda tu club. */
export function finishCareerSeason(c: CareerState, game: GameState): CareerState {
  if (game.phase !== 'finished' || !game.career || game.career.season !== c.season) return c;
  const me = game.players[0];
  const position = standings(game).findIndex((p) => p.id === me.id) + 1;
  const top = c.division === DIVISIONS.length - 1;
  const outcome: SeasonOutcome =
    position === 1 ? (top ? 'campeon' : 'ascenso') : position === game.players.length && c.division > 0 ? 'descenso' : 'permanencia';
  const division = outcome === 'ascenso' ? c.division + 1 : outcome === 'descenso' ? c.division - 1 : c.division;
  // Lo temporal (lesiones, rachas, protecciones) no pasa a la temporada siguiente.
  const squad = me.squad.map((e) => ({ cardId: e.cardId, shielded: false, noClauseUntil: 0, streakUntil: 0, outUntil: 0, extra: null }));
  const roster = Object.fromEntries(squad.filter((e) => game.roster?.[e.cardId]).map((e) => [e.cardId, game.roster![e.cardId]]));
  return {
    ...c,
    season: c.season + 1,
    division,
    squad,
    roster,
    money: Math.max(0, Math.floor(me.money * CAREER.carryShare)),
    stadium: me.stadium,
    titles: c.titles + (outcome === 'campeon' ? 1 : 0),
    history: [...c.history, { season: c.season, division: c.division, position, points: me.points, goals: me.goals, against: me.against, outcome }],
  };
}

export const OUTCOME_TEXT: Record<SeasonOutcome, string> = {
  campeon: '¡Campeón de la Liga de Campeones!',
  ascenso: '¡Ascenso!',
  descenso: 'Descenso',
  permanencia: 'Permanencia',
};

/** Máximo de futbolistas: el mismo que en cualquier partida. */
export const CAREER_SQUAD = CONFIG.squadSize;
