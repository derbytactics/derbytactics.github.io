import {
  FOOTBALLERS,
  SPECIAL_CARDS,
  SPECIAL_INFO,
  basePrice,
  footballer,
  roleOf,
  specialCard,
  totalPips,
} from './cards';
import { CONFIG, SeasonLength, marketSize } from './config';
import { CrestDesign, Identity, generateRoster, makeRand, randomCrest, sanitizeCrest } from './identity';
import { nextRandom } from './rng';

// ---------------------------------------------------------------- Tipos

export interface SquadEntry {
  cardId: string;
  /** Blindado: cláusula más alta. */
  shielded: boolean;
  /** No se puede pagar su cláusula hasta pasada esta jornada (fichaje reciente o cantera). */
  noClauseUntil: number;
  /** Doble fuerza (en racha) hasta esta jornada incluida. */
  streakUntil: number;
  /** Lesionado/sancionado hasta esta jornada incluida. */
  outUntil: number;
  /** Amonestado (juega con menos fuerza) hasta esta jornada incluida. */
  yellowUntil?: number;
  /** Número extra temporal. */
  extra: { number: number; until: number } | null;
}

export interface Player {
  id: number;
  name: string;
  isBot: boolean;
  money: number;
  squad: SquadEntry[];
  hand: string[];
  /** Nivel de estadio 1..5. */
  stadium: number;
  points: number;
  /** Goles a favor y en contra en toda la temporada. */
  goals: number;
  against: number;
  closedDoorsUntil: number;
  clubDayJornada: number;
  subsidy: boolean;
  /** Última entrada de la crónica que este club ya había visto al acabar su turno. */
  lastSeen: number;
  /** Penaltis a favor conseguidos con cartas: jornada en la que se lanzan y rival que los encaja. */
  penalties?: { jornada: number; rival: number }[];
  /** Escudo del club (las partidas antiguas no lo tienen). */
  crest?: CrestDesign;
}

/** Una jugada de ataque: un club con atacantes en el número que ha salido. */
export interface Play {
  playerId: number;
  /** Fuerza de ataque sumada. */
  power: number;
  /** Futbolistas que participan en el ataque. */
  cards: string[];
  /** Rivales que encajan gol. */
  scored: number[];
  /** Rivales que la paran; `keeper` indica si intervino su portero. */
  stopped: { playerId: number; keeper: boolean }[];
}

export interface RollReport {
  dice: [number, number];
  sum: number;
  plays: Play[];
  /** En un 7: quien tiró los dados roba una carta especial (vacío si tenía la mano llena). */
  varDraws: { playerId: number; cardId: string }[];
}

export interface MatchResult {
  playerId: number;
  /** Goles a favor (uno por cada rival batido), en contra y diferencia en esta jornada. */
  goals: number;
  against: number;
  diff: number;
  /** Jugadas propias que acabaron en gol: son las que llenan la taquilla. */
  scoringPlays: number;
  /** Jugadas rivales paradas con intervención del portero. */
  saves: number;
  saveBonus: number;
  /** Carta especial ganada por el portero, si la hubo. */
  keeperCard: string | null;
  rank: number;
  points: number;
  prize: number;
  ticket: number;
  closedDoors: boolean;
  clubDay: boolean;
}

export interface MatchReport {
  jornada: number;
  rolls: RollReport[];
  /** Quién tiró los dados en cada tirada. */
  rollers: number[];
  /** Penaltis lanzados en la jornada (cartas especiales). */
  penalties?: { playerId: number; rival: number }[];
  results: MatchResult[];
}

export interface LogEntry {
  /** Número de orden en la partida (la crónica se recorta, este número no cambia). */
  n: number;
  jornada: number;
  text: string;
  /** Clubes a los que les ha pasado algo que no han hecho ellos. */
  affects?: number[];
}

/** Partido en curso: se juega tirada a tirada, y cada una la lanza un club. */
export interface MatchProgress {
  jornada: number;
  rolls: RollReport[];
  /** A quién le toca tirar los dados en cada tirada. */
  rollers: number[];
}

export type Phase = 'market' | 'match' | 'summary' | 'finished';

export interface TurnFlags {
  signed: boolean;
  upgraded: boolean;
  boughtCard: boolean;
  cardsPlayed: number;
  scout: boolean;
}

export interface GameState {
  seed: number;
  totalJornadas: number;
  jornada: number;
  phase: Phase;
  players: Player[];
  turnOrder: number[];
  turnIndex: number;
  turn: TurnFlags;
  market: string[];
  footballDeck: string[];
  specialDeck: string[];
  specialDiscard: string[];
  /** Partido que se está jugando (solo en fase 'match'). */
  match: MatchProgress | null;
  lastMatch: MatchReport | null;
  log: LogEntry[];
  /** Contador de entradas de crónica escritas en toda la partida. */
  logSeq: number;
  /** Identificador de la partida (para el historial). */
  gameId?: string;
  /** Nombre y rasgos de cada futbolista en esta partida: cambian en cada una. */
  roster?: Record<string, Identity>;
}

export interface NewGameOptions {
  players: { name: string; isBot: boolean; crest?: CrestDesign }[];
  season?: SeasonLength;
  seed?: number;
}

export type Action =
  | { type: 'sign'; cardId: string }
  | { type: 'clause'; ownerId: number; cardId: string }
  | { type: 'sell'; cardId: string }
  | { type: 'shield'; cardId: string }
  | { type: 'upgradeStadium' }
  | { type: 'buySpecial' }
  | { type: 'playCard'; handIndex: number; targetPlayerId?: number; targetCardId?: string }
  | { type: 'discardCard'; handIndex: number }
  | { type: 'endTurn' }
  /** Una tirada de dados del partido. */
  | { type: 'roll' }
  /** Juega de golpe todas las tiradas que queden (simulador y pruebas). */
  | { type: 'playMatch' }
  | { type: 'nextJornada' };

// ---------------------------------------------------------------- Utilidades

function rand(state: GameState): number {
  const r = nextRandom(state.seed);
  state.seed = r.seed;
  return r.value;
}

function shuffle<T>(state: GameState, items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(state) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function say(state: GameState, text: string, affects?: number[]) {
  state.logSeq = (state.logSeq ?? 0) + 1;
  state.log.push({ n: state.logSeq, jornada: state.jornada, text, ...(affects?.length ? { affects } : {}) });
  // La crónica viaja con el estado en las partidas en línea: se limita su tamaño.
  if (state.log.length > 150) state.log.splice(0, state.log.length - 150);
}

/** Nombre del futbolista en esta partida. */
export function cardName(state: GameState, cardId: string): string {
  return state.roster?.[cardId]?.name ?? footballer(cardId).name;
}

const freshTurn = (): TurnFlags => ({ signed: false, upgraded: false, boughtCard: false, cardsPlayed: 0, scout: false });

export function currentPlayer(state: GameState): Player | null {
  if (state.phase !== 'market') return null;
  return state.players[state.turnOrder[state.turnIndex]];
}

/** Números con los que marca ahora mismo (incluye el número extra temporal). */
export function activeNumbers(entry: SquadEntry, jornada: number): number[] {
  const nums = [...footballer(entry.cardId).numbers];
  if (entry.extra && entry.extra.until >= jornada && !nums.includes(entry.extra.number)) nums.push(entry.extra.number);
  return nums.sort((a, b) => a - b);
}
export const isOut = (e: SquadEntry, jornada: number) => e.outUntil >= jornada;
export const onStreak = (e: SquadEntry, jornada: number) => e.streakUntil >= jornada;
export const isBooked = (e: SquadEntry, jornada: number) => (e.yellowUntil ?? 0) >= jornada;
export const isProtected = (e: SquadEntry, jornada: number) => e.noClauseUntil >= jornada;

export function sellValue(cardId: string): number {
  return Math.round(basePrice(cardId) * CONFIG.sellRatio);
}
export function clauseOf(entry: SquadEntry): number {
  return Math.round(basePrice(entry.cardId) * (entry.shielded ? CONFIG.shieldedClauseMult : CONFIG.clauseMult));
}
export function shieldCost(cardId: string): number {
  return Math.round(basePrice(cardId) * CONFIG.shieldCostRatio);
}
export function signPrice(state: GameState, cardId: string): number {
  const p = basePrice(cardId);
  return state.turn.scout ? Math.round(p * (1 - CONFIG.special.scoutDiscount)) : p;
}
export function upgradeCost(player: Player): number | null {
  const base = CONFIG.stadium.upgradeCost[player.stadium - 1];
  if (base === undefined) return null;
  return player.subsidy ? Math.round(base * (1 - CONFIG.special.subsidyDiscount)) : base;
}
export function ticketPerGoal(level: number): number {
  return CONFIG.stadium.ticketPerGoal[level - 1];
}
export function prizeForRank(rank: number, players: number): number {
  const { first, last } = CONFIG.prize;
  if (players <= 1) return first;
  return Math.round(first - ((first - last) * (rank - 1)) / (players - 1));
}
export function pointsForRank(rank: number, players: number): number {
  return players - rank + 1 + (rank === 1 ? CONFIG.winBonusPoints : 0);
}

/** Puntos extra al final de la temporada por el dinero en caja. */
export function financeBonus(money: number): number {
  return Math.floor(money / CONFIG.moneyPerPoint);
}

/** Clasificación: puntos, goles totales, dinero. */
export function standings(state: GameState): Player[] {
  return [...state.players].sort(
    (a, b) => b.points - a.points || b.goals - b.against - (a.goals - a.against) || b.goals - a.goals || b.money - a.money || a.id - b.id,
  );
}

/** Fuerza de un futbolista ahora mismo: su posición, doblada si está en racha, cero si está de baja. */
export function powerOf(entry: SquadEntry, jornada: number): { attack: number; defense: number } {
  if (isOut(entry, jornada)) return { attack: 0, defense: 0 };
  const role = roleOf(footballer(entry.cardId).position);
  const k = onStreak(entry, jornada) ? 2 : 1;
  // La amarilla resta fuerza a lo que el futbolista haga (atacar o defender), sin bajar de cero.
  const minus = isBooked(entry, jornada) ? CONFIG.special.yellowPenalty : 0;
  return { attack: Math.max(0, role.attack * k - minus), defense: Math.max(0, role.defense * k - minus) };
}

/** Ataque y defensa de un club con un número concreto. */
export function strengthOn(player: Player, n: number, jornada: number) {
  let attack = 0;
  let defense = 0;
  let keeper = false;
  let defender = false;
  let midfield = false;
  const attackers: string[] = [];
  for (const e of player.squad) {
    if (!activeNumbers(e, jornada).includes(n)) continue;
    const pw = powerOf(e, jornada);
    if (pw.attack > 0) attackers.push(e.cardId);
    if (pw.attack > 0 && footballer(e.cardId).position === 'MED') midfield = true;
    if (pw.defense > 0 && footballer(e.cardId).position === 'POR') keeper = true;
    if (pw.defense > 0 && footballer(e.cardId).position === 'DEF') defender = true;
    attack += pw.attack;
    defense += pw.defense;
  }
  return { attack, defense, keeper, defender, midfield, attackers };
}

/** Jugadas de ataque esperadas por jornada (antes de que los rivales intenten pararlas). */
export function expectedGoals(player: Player, jornada: number): number {
  let pips = 0;
  for (const n of [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]) {
    if (strengthOn(player, n, jornada).attack > 0) pips += 6 - Math.abs(7 - n);
  }
  return (pips * 4) / 36;
}

/** Penaltis que se lanzan en una jornada: quién marca y a quién. */
export function penaltiesOf(state: GameState, jornada: number): { playerId: number; rival: number }[] {
  return state.players.flatMap((p) => (p.penalties ?? []).filter((x) => x.jornada === jornada).map((x) => ({ playerId: p.id, rival: x.rival })));
}

export const hasKeeper = (player: Player) => player.squad.some((e) => footballer(e.cardId).position === 'POR');
export function lineup(player: Player): Record<'POR' | 'DEF' | 'MED' | 'DEL', number> {
  const out = { POR: 0, DEF: 0, MED: 0, DEL: 0 };
  for (const e of player.squad) out[footballer(e.cardId).position] += 1;
  return out;
}

// ---------------------------------------------------------------- Crear partida

export function createGame(opts: NewGameOptions): GameState {
  const n = opts.players.length;
  if (n < CONFIG.minPlayers || n > CONFIG.maxPlayers) {
    throw new Error(`Futcards es para ${CONFIG.minPlayers}-${CONFIG.maxPlayers} jugadores.`);
  }
  const seed = (opts.seed ?? Math.floor(Math.random() * 2 ** 31)) | 0;
  // Identidades con un generador aparte: no cambian la secuencia aleatoria de las reglas.
  const looks = makeRand(seed ^ 0x51ed270b);
  const state: GameState = {
    seed,
    gameId: `g${(seed >>> 0).toString(36)}${n}`,
    roster: generateRoster(FOOTBALLERS.map((f) => f.id), seed),
    totalJornadas: CONFIG.seasonLengths[opts.season ?? 'estandar'],
    jornada: 1,
    phase: 'market',
    players: opts.players.map((p, id) => ({
      id,
      name: p.name.trim() || `Club ${id + 1}`,
      isBot: p.isBot,
      money: CONFIG.startingMoney,
      squad: [],
      hand: [],
      stadium: 1,
      points: 0,
      goals: 0,
      against: 0,
      closedDoorsUntil: 0,
      clubDayJornada: 0,
      subsidy: false,
      lastSeen: 0,
      crest: sanitizeCrest(p.crest) ?? randomCrest(looks),
    })),
    turnOrder: [],
    turnIndex: 0,
    turn: freshTurn(),
    market: [],
    footballDeck: [],
    specialDeck: [],
    specialDiscard: [],
    match: null,
    lastMatch: null,
    log: [],
    logSeq: 0,
  };
  state.footballDeck = shuffle(state, FOOTBALLERS.map((f) => f.id));
  state.specialDeck = shuffle(state, SPECIAL_CARDS.map((c) => c.id));
  state.market = state.footballDeck.splice(0, marketSize(n));
  // Pretemporada: orden aleatorio en serpiente, dos turnos de mercado por club.
  const order = shuffle(state, state.players.map((p) => p.id));
  state.turnOrder = [...order, ...(CONFIG.preseasonSnake ? [...order].reverse() : order)];
  say(state, 'Pretemporada: cada club tiene dos turnos de mercado antes de la jornada 1.');
  return state;
}

// ---------------------------------------------------------------- Validación

function findEntry(player: Player, cardId: string): SquadEntry | undefined {
  return player.squad.find((e) => e.cardId === cardId);
}

/** Devuelve null si la acción es legal, o el motivo por el que no lo es. */
export function check(state: GameState, action: Action): string | null {
  if (action.type === 'playMatch' || action.type === 'roll') return state.phase === 'match' ? null : 'No es momento de jugar el partido.';
  if (action.type === 'nextJornada') return state.phase === 'summary' ? null : 'La jornada no ha terminado.';
  const me = currentPlayer(state);
  if (!me) return 'No es fase de mercado.';
  const J = state.jornada;
  switch (action.type) {
    case 'endTurn':
      return null;
    case 'sign': {
      if (!state.market.includes(action.cardId)) return 'Ese futbolista no está en el mercado.';
      if (state.turn.signed) return 'Solo un fichaje por turno.';
      if (me.squad.length >= CONFIG.squadSize) return 'Plantilla completa: vende antes a alguien.';
      if (footballer(action.cardId).position === 'POR' && hasKeeper(me)) return 'Ya tienes portero: véndelo antes de fichar otro.';
      if (footballer(action.cardId).position === 'DEL' && lineup(me).DEL >= CONFIG.maxForwards) return `Ya tienes ${CONFIG.maxForwards} delanteros: vende uno antes de fichar otro.`;
      if (me.money < signPrice(state, action.cardId)) return 'No tienes dinero suficiente.';
      return null;
    }
    case 'clause': {
      const owner = state.players[action.ownerId];
      if (!owner || owner.id === me.id) return 'Elige un club rival.';
      const entry = findEntry(owner, action.cardId);
      if (!entry) return 'Ese club no tiene a ese futbolista.';
      if (state.turn.signed) return 'Solo un fichaje por turno.';
      if (me.squad.length >= CONFIG.squadSize) return 'Plantilla completa: vende antes a alguien.';
      if (footballer(action.cardId).position === 'POR' && hasKeeper(me)) return 'Ya tienes portero: véndelo antes de fichar otro.';
      if (footballer(action.cardId).position === 'DEL' && lineup(me).DEL >= CONFIG.maxForwards) return `Ya tienes ${CONFIG.maxForwards} delanteros: vende uno antes de fichar otro.`;
      if (isProtected(entry, J)) return 'Ese futbolista está protegido y no se puede fichar ahora.';
      if (me.money < clauseOf(entry)) return 'No te llega para pagar la cláusula.';
      return null;
    }
    case 'sell':
      return findEntry(me, action.cardId) ? null : 'Ese futbolista no es tuyo.';
    case 'shield': {
      const entry = findEntry(me, action.cardId);
      if (!entry) return 'Ese futbolista no es tuyo.';
      if (entry.shielded) return 'Ya está blindado.';
      if (me.money < shieldCost(action.cardId)) return 'No tienes dinero suficiente.';
      return null;
    }
    case 'upgradeStadium': {
      const cost = upgradeCost(me);
      if (cost === null) return 'Tu estadio ya está al máximo.';
      if (state.turn.upgraded) return 'Solo una ampliación por turno.';
      if (me.money < cost) return 'No tienes dinero suficiente.';
      return null;
    }
    case 'buySpecial': {
      if (state.turn.boughtCard) return 'Solo una carta especial comprada por turno.';
      if (me.hand.length >= CONFIG.special.handLimit) return 'Tienes la mano llena.';
      if (me.money < CONFIG.special.cost) return 'No tienes dinero suficiente.';
      if (state.specialDeck.length + state.specialDiscard.length === 0) return 'No quedan cartas especiales.';
      return null;
    }
    case 'discardCard':
      return me.hand[action.handIndex] ? null : 'No tienes esa carta.';
    case 'playCard': {
      const id = me.hand[action.handIndex];
      if (!id) return 'No tienes esa carta.';
      const card = specialCard(id);
      const info = SPECIAL_INFO[card.kind];
      if (info.target === 'passive') return 'Esta carta no se juega: actúa sola desde tu mano.';
      if (state.turn.cardsPlayed >= CONFIG.special.maxPlayedPerTurn) {
        return `Máximo ${CONFIG.special.maxPlayedPerTurn} cartas especiales por turno.`;
      }
      if (info.target === 'rival' || info.target === 'rivalFootballer') {
        const rival = action.targetPlayerId === undefined ? undefined : state.players[action.targetPlayerId];
        if (!rival || rival.id === me.id) return 'Elige un club rival.';
        if (info.target === 'rivalFootballer') {
          const e = action.targetCardId ? findEntry(rival, action.targetCardId) : undefined;
          if (!e) return 'Elige un futbolista de ese club.';
          if (isOut(e, J)) return 'Ese futbolista ya está de baja.';
        }
        if (card.kind === 'puertaCerrada' && rival.closedDoorsUntil >= J) return 'Ese club ya juega a puerta cerrada.';
      }
      if (info.target === 'ownFootballer') {
        const e = action.targetCardId ? findEntry(me, action.targetCardId) : undefined;
        if (!e) return 'Elige uno de tus futbolistas.';
        if (card.kind === 'racha' && onStreak(e, J)) return 'Ese futbolista ya está en racha.';
        if (card.kind === 'olfato') {
          if (activeNumbers(e, J).includes(card.value!)) return `Ese futbolista ya marca con el ${card.value}.`;
          if (e.extra && e.extra.until >= J) return 'Ese futbolista ya tiene un número extra.';
        }
      }
      if (card.kind === 'subvencion' && me.subsidy) return 'Ya tienes una subvención pendiente.';
      if (card.kind === 'subvencion' && upgradeCost(me) === null) return 'Tu estadio ya está al máximo.';
      if (card.kind === 'ojeador' && state.turn.scout) return 'Ya tienes al ojeador trabajando.';
      if (card.kind === 'diaDelClub' && me.clubDayJornada === J) return 'Ya has declarado el Día del club.';
      return null;
    }
  }
}

// ---------------------------------------------------------------- Aplicar acciones

/** Aplica una acción y devuelve un estado nuevo. Lanza Error si la acción es ilegal. */
export function apply(prev: GameState, action: Action): GameState {
  const why = check(prev, action);
  if (why) throw new Error(why);
  const state: GameState = structuredClone(prev);
  if (action.type === 'roll') return rollOnce(state);
  if (action.type === 'playMatch') return playMatch(state);
  if (action.type === 'nextJornada') return startNextJornada(state);

  const me = currentPlayer(state)!;
  const J = state.jornada;
  switch (action.type) {
    case 'sign': {
      const price = signPrice(state, action.cardId);
      me.money -= price;
      state.turn.signed = true;
      state.turn.scout = false;
      me.squad.push(newEntry(action.cardId, J));
      const i = state.market.indexOf(action.cardId);
      const refill = state.footballDeck.shift();
      if (refill) state.market[i] = refill;
      else state.market.splice(i, 1);
      say(state, `${me.name} ficha a ${cardName(state, action.cardId)} por ${price}M.`);
      break;
    }
    case 'clause': {
      const owner = state.players[action.ownerId];
      const entry = findEntry(owner, action.cardId)!;
      const cost = clauseOf(entry);
      me.money -= cost;
      owner.money += cost;
      owner.squad = owner.squad.filter((e) => e !== entry);
      state.turn.signed = true;
      me.squad.push({ ...entry, shielded: false, noClauseUntil: J + CONFIG.transferProtection });
      say(state, `¡Bombazo! ${me.name} paga la cláusula de ${cardName(state, action.cardId)} (${cost}M) a ${owner.name}.`, [owner.id]);
      break;
    }
    case 'sell': {
      const value = sellValue(action.cardId);
      me.squad = me.squad.filter((e) => e.cardId !== action.cardId);
      me.money += value;
      state.footballDeck.push(action.cardId);
      say(state, `${me.name} traspasa a ${cardName(state, action.cardId)} por ${value}M.`);
      break;
    }
    case 'shield': {
      const cost = shieldCost(action.cardId);
      me.money -= cost;
      findEntry(me, action.cardId)!.shielded = true;
      say(state, `${me.name} blinda a ${cardName(state, action.cardId)} (${cost}M).`);
      break;
    }
    case 'upgradeStadium': {
      const cost = upgradeCost(me)!;
      me.money -= cost;
      me.stadium += 1;
      me.subsidy = false;
      state.turn.upgraded = true;
      say(state, `${me.name} amplía su estadio a nivel ${me.stadium} (${cost}M): ${ticketPerGoal(me.stadium)}M por gol.`);
      break;
    }
    case 'buySpecial': {
      me.money -= CONFIG.special.cost;
      state.turn.boughtCard = true;
      drawSpecial(state, me);
      say(state, `${me.name} compra una carta especial.`);
      break;
    }
    case 'discardCard': {
      const [id] = me.hand.splice(action.handIndex, 1);
      state.specialDiscard.push(id);
      break;
    }
    case 'playCard':
      playCard(state, me, action);
      break;
    case 'endTurn': {
      me.lastSeen = state.logSeq;
      state.turn = freshTurn();
      state.turnIndex += 1;
      if (state.turnIndex >= state.turnOrder.length) {
        state.phase = 'match';
        startMatch(state);
        state.turnIndex = 0;
      }
      break;
    }
  }
  return state;
}

function newEntry(cardId: string, jornada: number): SquadEntry {
  return {
    cardId,
    shielded: false,
    noClauseUntil: jornada + CONFIG.transferProtection,
    streakUntil: 0,
    outUntil: 0,
    extra: null,
  };
}

function drawSpecial(state: GameState, player: Player): string | null {
  if (player.hand.length >= CONFIG.special.handLimit) return null;
  if (state.specialDeck.length === 0) {
    state.specialDeck = shuffle(state, state.specialDiscard);
    state.specialDiscard = [];
  }
  const id = state.specialDeck.shift();
  if (!id) return null;
  player.hand.push(id);
  return id;
}

function playCard(state: GameState, me: Player, action: Extract<Action, { type: 'playCard' }>) {
  const S = CONFIG.special;
  const J = state.jornada;
  const [id] = me.hand.splice(action.handIndex, 1);
  state.specialDiscard.push(id);
  state.turn.cardsPlayed += 1;
  const card = specialCard(id);
  const info = SPECIAL_INFO[card.kind];
  const rival = action.targetPlayerId === undefined ? undefined : state.players[action.targetPlayerId];

  if (info.sanction && rival) {
    const shieldIdx = rival.hand.findIndex((h) => specialCard(h).kind === 'abogados');
    if (shieldIdx >= 0) {
      state.specialDiscard.push(...rival.hand.splice(shieldIdx, 1));
      say(state, `${me.name} juega «${info.title}» contra ${rival.name}, ¡pero su gabinete jurídico la anula!`, [rival.id]);
      return;
    }
  }
  const own = action.targetCardId ? findEntry(me, action.targetCardId) : undefined;
  const theirs = rival && action.targetCardId ? findEntry(rival, action.targetCardId) : undefined;
  switch (card.kind) {
    case 'incidentes': {
      const paid = Math.min(S.fine, rival!.money);
      rival!.money -= paid;
      say(state, `Incidentes en la grada de ${rival!.name}: paga ${paid}M de multa.`, [rival!.id]);
      break;
    }
    case 'puertaCerrada':
      rival!.closedDoorsUntil = J + S.closedDoorsRounds - 1;
      say(state, `${rival!.name} jugará ${S.closedDoorsRounds} jornadas a puerta cerrada.`, [rival!.id]);
      break;
    case 'lesion':
      theirs!.outUntil = J + S.injuryRounds - 1;
      say(state, `${cardName(state, theirs!.cardId)} (${rival!.name}) se lesiona: ${S.injuryRounds} jornadas de baja.`, [rival!.id]);
      break;
    case 'amarilla':
      if (isBooked(theirs!, J)) {
        theirs!.outUntil = Math.max(theirs!.outUntil, J);
        say(state, `Segunda amarilla a ${cardName(state, theirs!.cardId)} (${rival!.name}): expulsado esta jornada.`, [rival!.id]);
      } else {
        theirs!.yellowUntil = J;
        say(state, `Amarilla a ${cardName(state, theirs!.cardId)} (${rival!.name}): juega esta jornada con menos fuerza.`, [rival!.id]);
      }
      break;
    case 'roja':
      theirs!.outUntil = J + S.redCardRounds - 1;
      say(state, `Roja a ${cardName(state, theirs!.cardId)} (${rival!.name}): expulsado esta jornada y la siguiente.`, [rival!.id]);
      break;
    case 'penalti':
      me.penalties = [...(me.penalties ?? []).filter((x) => x.jornada >= J), { jornada: J, rival: rival!.id }];
      say(state, `¡Penalti a favor de ${me.name}! Lo lanzará contra ${rival!.name} en el partido de esta jornada.`, [rival!.id]);
      break;
    case 'racha':
      own!.streakUntil = J + S.streakRounds - 1;
      say(state, `${cardName(state, own!.cardId)} (${me.name}) está en racha: doble fuerza ${S.streakRounds} jornadas.`);
      break;
    case 'olfato':
      own!.extra = { number: card.value!, until: J + S.extraNumberRounds - 1 };
      say(state, `${cardName(state, own!.cardId)} (${me.name}) también actúa con el ${card.value} durante ${S.extraNumberRounds} jornadas.`);
      break;
    case 'cantera':
      own!.noClauseUntil = Math.max(own!.noClauseUntil, J + S.academyRounds);
      say(state, `${cardName(state, own!.cardId)} es de la cantera de ${me.name}: intransferible ${S.academyRounds} jornadas.`);
      break;
    case 'patrocinador':
      me.money += S.sponsor;
      say(state, `${me.name} firma un patrocinio de ${S.sponsor}M.`);
      break;
    case 'diaDelClub':
      me.clubDayJornada = J;
      say(state, `${me.name} declara el Día del club: taquilla doble esta jornada.`);
      break;
    case 'subvencion':
      me.subsidy = true;
      say(state, `${me.name} consigue una subvención para ampliar el estadio.`);
      break;
    case 'ojeador':
      state.turn.scout = true;
      say(state, `El ojeador de ${me.name} encuentra una ganga en el mercado.`);
      break;
  }
}

// ---------------------------------------------------------------- Partido

/** Tiradas por jornada: una por club. */
export function rollsFor(players: number): number {
  return players;
}

/** Club al que le toca tirar los dados, o null si no hay partido en juego. */
export function currentRoller(state: GameState): number | null {
  const m = state.match;
  return state.phase === 'match' && m ? m.rollers[m.rolls.length] ?? null : null;
}

function startMatch(state: GameState) {
  const n = state.players.length;
  // Empieza a tirar un club distinto cada jornada.
  const rollers = Array.from({ length: rollsFor(n) }, (_, i) => (state.jornada - 1 + i) % n);
  state.match = { jornada: state.jornada, rolls: [], rollers };
}

function rollOnce(state: GameState): GameState {
  if (!state.match) startMatch(state);
  const m = state.match!;
  const J = state.jornada;
  const d1 = 1 + Math.floor(rand(state) * 6);
  const d2 = 1 + Math.floor(rand(state) * 6);
  const roll: RollReport = { dice: [d1, d2], sum: d1 + d2, plays: [], varDraws: [] };
  if (roll.sum === 7) {
    // Con un 7 no hay jugada: quien ha tirado los dados se lleva una carta especial.
    const roller = m.rollers[m.rolls.length];
    const cardId = drawSpecial(state, state.players[roller]);
    if (cardId) {
      roll.varDraws.push({ playerId: roller, cardId });
      say(state, `VAR en la jornada ${J}: ${state.players[roller].name} roba una carta especial.`);
    }
  } else {
    // Todos contra todos: cada ataque se enfrenta a la defensa de cada rival por separado.
    const strength = state.players.map((p) => strengthOn(p, roll.sum, J));
    for (const p of state.players) {
      const mine = strength[p.id];
      if (mine.attack <= 0) continue;
      const play: Play = { playerId: p.id, power: mine.attack, cards: mine.attackers, scored: [], stopped: [] };
      for (const rival of state.players) {
        if (rival.id === p.id) continue;
        const theirs = strength[rival.id];
        if (theirs.defense >= mine.attack) {
          play.stopped.push({ playerId: rival.id, keeper: theirs.keeper });
        } else {
          play.scored.push(rival.id);
        }
      }
      roll.plays.push(play);
    }
  }
  m.rolls.push(roll);
  if (m.rolls.length >= m.rollers.length) finishMatch(state);
  return state;
}

function playMatch(state: GameState): GameState {
  while (state.phase === 'match') rollOnce(state);
  return state;
}

/** Recuento de la jornada a partir de las tiradas jugadas. */
function finishMatch(state: GameState) {
  const J = state.jornada;
  const n = state.players.length;
  const rolls = state.match!.rolls;
  const tally = new Map(state.players.map((p) => [p.id, { goals: 0, against: 0, scoringPlays: 0, saves: 0 }]));
  for (const roll of rolls) {
    for (const play of roll.plays) {
      const t = tally.get(play.playerId)!;
      t.goals += play.scored.length;
      if (play.scored.length) t.scoringPlays += 1;
      for (const id of play.scored) tally.get(id)!.against += 1;
      for (const st of play.stopped) {
        const r = tally.get(st.playerId)!;
        if (st.keeper) r.saves += 1;
      }
    }
  }
  // Los penaltis conseguidos con cartas son goles seguros.
  const penalties = penaltiesOf(state, J);
  for (const pen of penalties) {
    tally.get(pen.playerId)!.goals += 1;
    tally.get(pen.playerId)!.scoringPlays += 1;
    tally.get(pen.rival)!.against += 1;
  }
  const diff = (id: number) => tally.get(id)!.goals - tally.get(id)!.against;
  const better = (a: number, b: number) => diff(a) > diff(b) || (diff(a) === diff(b) && tally.get(a)!.goals > tally.get(b)!.goals);
  const results: MatchResult[] = state.players.map((p) => {
    const t = tally.get(p.id)!;
    const rank = 1 + state.players.filter((o) => better(o.id, p.id)).length;
    const closedDoors = p.closedDoorsUntil >= J;
    const clubDay = p.clubDayJornada === J;
    const ticket = closedDoors ? 0 : t.scoringPlays * ticketPerGoal(p.stadium) * (clubDay ? 2 : 1);
    const keeperCard = t.saves >= CONFIG.savesForCard ? drawSpecial(state, p) : null;
    return {
      playerId: p.id,
      goals: t.goals,
      against: t.against,
      diff: t.goals - t.against,
      scoringPlays: t.scoringPlays,
      saves: t.saves,
      saveBonus: t.saves * CONFIG.saveBonus,
      keeperCard,
      rank,
      points: pointsForRank(rank, n),
      prize: prizeForRank(rank, n),
      ticket,
      closedDoors,
      clubDay,
    };
  });
  for (const r of results) {
    const p = state.players[r.playerId];
    p.goals += r.goals;
    p.against += r.against;
    p.points += r.points;
    p.money += r.prize + r.ticket + r.saveBonus;
  }
  results.sort((a, b) => a.rank - b.rank || a.playerId - b.playerId);
  state.lastMatch = { jornada: J, rolls, rollers: state.match!.rollers, penalties, results };
  state.match = null;
  const winners = results.filter((r) => r.rank === 1).map((r) => state.players[r.playerId].name);
  const top = results[0];
  say(state, `Jornada ${J}: gana ${winners.join(' y ')} (${top.goals} a favor, ${top.against} en contra).`);
  state.phase = 'summary';
}

function startNextJornada(state: GameState): GameState {
  if (state.jornada >= state.totalJornadas) {
    state.phase = 'finished';
    for (const p of state.players) {
      const bonus = financeBonus(p.money);
      p.points += bonus;
      if (bonus > 0) say(state, `Balance final: ${p.name} suma ${bonus} punto(s) por sus ${p.money}M en caja.`);
    }
    say(state, `¡${standings(state)[0].name} es campeón de liga!`);
    return state;
  }
  state.jornada += 1;
  state.phase = 'market';
  state.turn = freshTurn();
  state.turnIndex = 0;
  // El colista abre el mercado; el líder elige el último.
  state.turnOrder = standings(state)
    .reverse()
    .map((p) => p.id);
  // Con pocos clubes hay pocas tiradas: derechos de TV y una carta para cada uno.
  if (state.players.length <= CONFIG.tvRights.maxPlayers) {
    for (const p of state.players) {
      p.money += CONFIG.tvRights.money;
      if (CONFIG.tvRights.card) drawSpecial(state, p);
    }
    say(state, `Derechos de televisión: cada club cobra ${CONFIG.tvRights.money}M${CONFIG.tvRights.card ? ' y roba una carta especial' : ''}.`);
  }
  // El mercado se mueve: sale el futbolista que más tiempo lleva expuesto.
  const fresh = state.footballDeck.shift();
  if (fresh && state.market.length > 0) {
    state.footballDeck.push(state.market.shift()!);
    state.market.push(fresh);
  }
  return state;
}
