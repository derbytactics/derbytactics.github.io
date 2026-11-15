import {
  FOOTBALLERS,
  SPECIAL_CARDS,
  SPECIAL_INFO,
  basePrice,
  footballer,
  specialCard,
  totalPips,
} from './cards';
import { CONFIG, SeasonLength, marketSize } from './config';
import { nextRandom } from './rng';

// ---------------------------------------------------------------- Tipos

export interface SquadEntry {
  cardId: string;
  /** Blindado: cláusula más alta. */
  shielded: boolean;
  /** No se puede pagar su cláusula hasta pasada esta jornada (fichaje reciente o cantera). */
  noClauseUntil: number;
  /** Goles dobles hasta esta jornada incluida. */
  streakUntil: number;
  /** Lesionado/sancionado hasta esta jornada incluida. */
  outUntil: number;
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
  goals: number;
  closedDoorsUntil: number;
  clubDayJornada: number;
  subsidy: boolean;
  /** Última entrada de la crónica que este club ya había visto al acabar su turno. */
  lastSeen: number;
}

export interface RollReport {
  dice: [number, number];
  sum: number;
  goals: { playerId: number; cardId: string; goals: number }[];
  /** En un 7: clubes que roban carta especial, y cuál. */
  varDraws: { playerId: number; cardId: string }[];
}

export interface MatchResult {
  playerId: number;
  goals: number;
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
  lastMatch: MatchReport | null;
  log: LogEntry[];
  /** Contador de entradas de crónica escritas en toda la partida. */
  logSeq: number;
}

export interface NewGameOptions {
  players: { name: string; isBot: boolean }[];
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
    (a, b) => b.points - a.points || b.goals - a.goals || b.money - a.money || a.id - b.id,
  );
}

/** Goles esperados por jornada de una plantilla (sin contar rachas). */
export function expectedGoals(player: Player, jornada: number): number {
  let pips = 0;
  for (const e of player.squad) {
    if (isOut(e, jornada)) continue;
    pips += totalPips(activeNumbers(e, jornada)) * (onStreak(e, jornada) ? 2 : 1);
  }
  return (pips * CONFIG.rollsPerMatchday) / 36;
}

// ---------------------------------------------------------------- Crear partida

export function createGame(opts: NewGameOptions): GameState {
  const n = opts.players.length;
  if (n < CONFIG.minPlayers || n > CONFIG.maxPlayers) {
    throw new Error(`Futcards es para ${CONFIG.minPlayers}-${CONFIG.maxPlayers} jugadores.`);
  }
  const state: GameState = {
    seed: (opts.seed ?? Math.floor(Math.random() * 2 ** 31)) | 0,
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
      closedDoorsUntil: 0,
      clubDayJornada: 0,
      subsidy: false,
      lastSeen: 0,
    })),
    turnOrder: [],
    turnIndex: 0,
    turn: freshTurn(),
    market: [],
    footballDeck: [],
    specialDeck: [],
    specialDiscard: [],
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
  if (action.type === 'playMatch') return state.phase === 'match' ? null : 'No es momento de jugar el partido.';
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
      say(state, `${me.name} ficha a ${footballer(action.cardId).name} por ${price}M.`);
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
      say(state, `¡Bombazo! ${me.name} paga la cláusula de ${footballer(action.cardId).name} (${cost}M) a ${owner.name}.`, [owner.id]);
      break;
    }
    case 'sell': {
      const value = sellValue(action.cardId);
      me.squad = me.squad.filter((e) => e.cardId !== action.cardId);
      me.money += value;
      state.footballDeck.push(action.cardId);
      say(state, `${me.name} traspasa a ${footballer(action.cardId).name} por ${value}M.`);
      break;
    }
    case 'shield': {
      const cost = shieldCost(action.cardId);
      me.money -= cost;
      findEntry(me, action.cardId)!.shielded = true;
      say(state, `${me.name} blinda a ${footballer(action.cardId).name} (${cost}M).`);
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
      say(state, `${footballer(theirs!.cardId).name} (${rival!.name}) se lesiona: ${S.injuryRounds} jornadas de baja.`, [rival!.id]);
      break;
    case 'roja':
      theirs!.outUntil = J + S.redCardRounds - 1;
      say(state, `Roja a ${footballer(theirs!.cardId).name} (${rival!.name}): se pierde esta jornada.`, [rival!.id]);
      break;
    case 'racha':
      own!.streakUntil = J + S.streakRounds - 1;
      say(state, `${footballer(own!.cardId).name} (${me.name}) está en racha: goles dobles ${S.streakRounds} jornadas.`);
      break;
    case 'olfato':
      own!.extra = { number: card.value!, until: J + S.extraNumberRounds - 1 };
      say(state, `${footballer(own!.cardId).name} (${me.name}) también marca con el ${card.value} durante ${S.extraNumberRounds} jornadas.`);
      break;
    case 'cantera':
      own!.noClauseUntil = Math.max(own!.noClauseUntil, J + S.academyRounds);
      say(state, `${footballer(own!.cardId).name} es de la cantera de ${me.name}: intransferible ${S.academyRounds} jornadas.`);
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

function playMatch(state: GameState): GameState {
  const J = state.jornada;
  const n = state.players.length;
  const goals = new Map<number, number>(state.players.map((p) => [p.id, 0]));
  // En un 7 (VAR) roba carta la mitad baja de la clasificación previa a la jornada.
  const bottom = standings(state)
    .slice(n - Math.max(1, Math.floor(n / 2)))
    .map((p) => p.id);
  const rolls: RollReport[] = [];
  for (let r = 0; r < CONFIG.rollsPerMatchday; r++) {
    const d1 = 1 + Math.floor(rand(state) * 6);
    const d2 = 1 + Math.floor(rand(state) * 6);
    const roll: RollReport = { dice: [d1, d2], sum: d1 + d2, goals: [], varDraws: [] };
    if (roll.sum === 7) {
      for (const id of bottom) {
        const cardId = drawSpecial(state, state.players[id]);
        if (cardId) roll.varDraws.push({ playerId: id, cardId });
      }
      if (roll.varDraws.length) {
        const ids = roll.varDraws.map((d) => d.playerId);
        say(state, `VAR en la jornada ${J}: ${ids.map((id) => state.players[id].name).join(', ')} ${ids.length > 1 ? 'roban' : 'roba'} carta especial.`);
      }
    } else {
      for (const p of state.players) {
        for (const e of p.squad) {
          if (isOut(e, J) || !activeNumbers(e, J).includes(roll.sum)) continue;
          const g = onStreak(e, J) ? 2 : 1;
          roll.goals.push({ playerId: p.id, cardId: e.cardId, goals: g });
          goals.set(p.id, goals.get(p.id)! + g);
        }
      }
    }
    rolls.push(roll);
  }
  const results: MatchResult[] = state.players.map((p) => {
    const g = goals.get(p.id)!;
    const rank = 1 + state.players.filter((o) => goals.get(o.id)! > g).length;
    const closedDoors = p.closedDoorsUntil >= J;
    const clubDay = p.clubDayJornada === J;
    const ticket = closedDoors ? 0 : g * ticketPerGoal(p.stadium) * (clubDay ? 2 : 1);
    return { playerId: p.id, goals: g, rank, points: pointsForRank(rank, n), prize: prizeForRank(rank, n), ticket, closedDoors, clubDay };
  });
  for (const r of results) {
    const p = state.players[r.playerId];
    p.goals += r.goals;
    p.points += r.points;
    p.money += r.prize + r.ticket;
  }
  results.sort((a, b) => a.rank - b.rank || a.playerId - b.playerId);
  state.lastMatch = { jornada: J, rolls, results };
  const winners = results.filter((r) => r.rank === 1).map((r) => state.players[r.playerId].name);
  say(state, `Jornada ${J}: gana ${winners.join(' y ')} con ${results[0].goals} goles.`);
  state.phase = 'summary';
  return state;
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
  // El mercado se mueve: sale el futbolista que más tiempo lleva expuesto.
  const fresh = state.footballDeck.shift();
  if (fresh && state.market.length > 0) {
    state.footballDeck.push(state.market.shift()!);
    state.market.push(fresh);
  }
  return state;
}
