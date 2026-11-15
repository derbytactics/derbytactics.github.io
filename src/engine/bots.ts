import { SPECIAL_INFO, basePrice, footballer, specialCard, totalPips } from './cards';
import { CONFIG } from './config';
import {
  Action,
  GameState,
  Player,
  SquadEntry,
  activeNumbers,
  check,
  clauseOf,
  currentPlayer,
  expectedGoals,
  isOut,
  isProtected,
  onStreak,
  sellValue,
  shieldCost,
  signPrice,
  standings,
  ticketPerGoal,
  upgradeCost,
} from './engine';

/** Personalidades de la IA. Sirven tanto para jugar como para medir el equilibrio entre estrategias. */
export type BotStyle = 'equilibrado' | 'estrellas' | 'cantidad' | 'ladrillo' | 'tiburon';
export const BOT_STYLES: BotStyle[] = ['equilibrado', 'estrellas', 'cantidad', 'ladrillo', 'tiburon'];

const pips = (cardId: string) => totalPips(footballer(cardId).numbers);
const entryPower = (e: SquadEntry, J: number) =>
  isOut(e, J) ? 0 : totalPips(activeNumbers(e, J)) * (onStreak(e, J) ? 2 : 1);

function minPipsWanted(style: BotStyle, squadLen: number, remaining: number, jornada: number): number {
  if (remaining <= 2) return 1;
  switch (style) {
    case 'estrellas':
      // Prefiere esperar a un buen jugador, pero no deja huecos vacíos toda la temporada.
      return squadLen < 2 ? 5 : jornada <= 3 ? 8 : 6;
    case 'cantidad':
      return 1;
    case 'ladrillo':
      return squadLen < 3 ? 3 : 5;
    default:
      return squadLen < 4 ? 4 : 5;
  }
}

/** Cuántos pips de mejora justifican vender al peor de la plantilla. */
const UPGRADE_STEP: Record<BotStyle, number> = { equilibrado: 3, estrellas: 2, cantidad: 4, ladrillo: 4, tiburon: 3 };
/** Pips mínimos para plantearse pagar una cláusula. */
const CLAUSE_FLOOR: Record<BotStyle, number> = { equilibrado: 10, estrellas: 9, cantidad: 12, ladrillo: 12, tiburon: 8 };

/** Devuelve la siguiente acción del bot al que le toca. Llamar en bucle hasta que devuelva endTurn. */
export function botAction(state: GameState, style: BotStyle = 'equilibrado'): Action {
  if (state.phase === 'match') return { type: 'playMatch' };
  if (state.phase === 'summary') return { type: 'nextJornada' };
  const me = currentPlayer(state);
  if (!me) return { type: 'endTurn' };
  const J = state.jornada;
  const remaining = state.totalJornadas - J + 1;
  const ok = (a: Action) => check(state, a) === null;

  const card = pickCardToPlay(state, me, style, remaining);
  if (card && ok(card)) return card;

  const steps = style === 'ladrillo' ? [stadium, transfer] : [transfer, stadium];
  for (const step of steps) {
    const a = step(state, me, style, remaining);
    if (a && ok(a)) return a;
  }

  const buy: Action = { type: 'buySpecial' };
  const cardBudget = style === 'tiburon' ? 0 : 6;
  if (remaining >= 2 && me.squad.length >= 2 && me.money - CONFIG.special.cost >= cardBudget && ok(buy)) return buy;

  for (const e of me.squad) {
    const a: Action = { type: 'shield', cardId: e.cardId };
    if (pips(e.cardId) >= 12 && remaining >= 4 && me.money - shieldCost(e.cardId) >= 10 && ok(a)) return a;
  }
  return { type: 'endTurn' };
}

function transfer(state: GameState, me: Player, style: BotStyle, remaining: number): Action | null {
  if (state.turn.signed) return null;
  const J = state.jornada;
  const full = me.squad.length >= CONFIG.squadSize;
  const weakest = full ? [...me.squad].sort((a, b) => pips(a.cardId) - pips(b.cardId))[0] : null;
  const budget = me.money + (weakest ? sellValue(weakest.cardId) : 0);
  const floor = weakest ? pips(weakest.cardId) + UPGRADE_STEP[style] : minPipsWanted(style, me.squad.length, remaining, J);

  const marketBest = state.market
    .filter((id) => pips(id) >= floor && signPrice(state, id) <= budget)
    .sort((a, b) => pips(b) - pips(a))[0];

  // Cláusulas: solo por futbolistas claramente mejores que lo que ofrece el mercado.
  const clauseFloor = Math.max(CLAUSE_FLOOR[style], (marketBest ? pips(marketBest) : 0) + 1, floor);
  let target: { ownerId: number; entry: SquadEntry } | null = null;
  if (remaining >= 3) {
    for (const rival of state.players) {
      if (rival.id === me.id) continue;
      for (const e of rival.squad) {
        if (isProtected(e, J) || pips(e.cardId) < clauseFloor || clauseOf(e) > budget) continue;
        if (!target || pips(e.cardId) > pips(target.entry.cardId)) target = { ownerId: rival.id, entry: e };
      }
    }
  }
  if (!target && !marketBest) return null;
  if (weakest) return { type: 'sell', cardId: weakest.cardId };
  if (target) return { type: 'clause', ownerId: target.ownerId, cardId: target.entry.cardId };
  return { type: 'sign', cardId: marketBest };
}

function stadium(state: GameState, me: Player, style: BotStyle, remaining: number): Action | null {
  const cost = upgradeCost(me);
  if (cost === null || state.turn.upgraded || cost > me.money) return null;
  const minSquad = style === 'ladrillo' ? 2 : 3;
  if (me.squad.length < minSquad) return null;
  // Rentabilidad: +1M por gol durante las jornadas que quedan (el partido de esta jornada cuenta).
  const gain = expectedGoals(me, state.jornada) * remaining;
  const margin = style === 'ladrillo' ? 0.9 : 1.25;
  return gain >= cost * margin ? { type: 'upgradeStadium' } : null;
}

function pickCardToPlay(state: GameState, me: Player, style: BotStyle, remaining: number): Action | null {
  const J = state.jornada;
  const rivals = standings(state).filter((p) => p.id !== me.id);
  const leader = rivals[0];
  const myBest = (filter: (e: SquadEntry) => boolean) =>
    me.squad.filter(filter).sort((a, b) => entryPower(b, J) - entryPower(a, J))[0];

  for (let handIndex = 0; handIndex < me.hand.length; handIndex++) {
    const c = specialCard(me.hand[handIndex]);
    let a: Action | null = null;
    switch (c.kind) {
      case 'patrocinador':
        a = { type: 'playCard', handIndex };
        break;
      case 'racha': {
        const e = myBest((x) => !onStreak(x, J) && !isOut(x, J));
        if (e && (pips(e.cardId) >= 5 || remaining <= 2)) a = { type: 'playCard', handIndex, targetCardId: e.cardId };
        break;
      }
      case 'olfato': {
        const e = myBest((x) => !isOut(x, J) && !(x.extra && x.extra.until >= J) && !activeNumbers(x, J).includes(c.value!));
        if (e) a = { type: 'playCard', handIndex, targetCardId: e.cardId };
        break;
      }
      case 'cantera': {
        const e = myBest((x) => !isProtected(x, J) && pips(x.cardId) >= 10);
        if (e && remaining >= 2) a = { type: 'playCard', handIndex, targetCardId: e.cardId };
        break;
      }
      case 'incidentes':
        if (leader && leader.money >= 3) a = { type: 'playCard', handIndex, targetPlayerId: leader.id };
        break;
      case 'puertaCerrada': {
        const t = rivals
          .filter((r) => r.closedDoorsUntil < J)
          .sort((x, y) => expectedGoals(y, J) * ticketPerGoal(y.stadium) - expectedGoals(x, J) * ticketPerGoal(x.stadium))[0];
        if (t && expectedGoals(t, J) * ticketPerGoal(t.stadium) >= 5) a = { type: 'playCard', handIndex, targetPlayerId: t.id };
        break;
      }
      case 'lesion':
      case 'roja': {
        let best: { r: Player; e: SquadEntry } | null = null;
        for (const r of rivals.slice(0, 2)) {
          for (const e of r.squad) {
            if (isOut(e, J)) continue;
            if (!best || entryPower(e, J) > entryPower(best.e, J)) best = { r, e };
          }
        }
        if (best && entryPower(best.e, J) >= 5) {
          a = { type: 'playCard', handIndex, targetPlayerId: best.r.id, targetCardId: best.e.cardId };
        }
        break;
      }
      case 'diaDelClub':
        if (me.closedDoorsUntil < J && (expectedGoals(me, J) * ticketPerGoal(me.stadium) >= 8 || remaining <= 2)) {
          a = { type: 'playCard', handIndex };
        }
        break;
      case 'subvencion': {
        const base = CONFIG.stadium.upgradeCost[me.stadium - 1];
        if (base !== undefined && !state.turn.upgraded && me.money >= base * (1 - CONFIG.special.subsidyDiscount)) {
          a = { type: 'playCard', handIndex };
        }
        break;
      }
      case 'ojeador': {
        const want = minPipsWanted(style, me.squad.length, remaining, J);
        const hasBargain = state.market.some(
          (id) => pips(id) >= Math.max(want, 6) && basePrice(id) * (1 - CONFIG.special.scoutDiscount) <= me.money,
        );
        if (!state.turn.signed && me.squad.length < CONFIG.squadSize && hasBargain) a = { type: 'playCard', handIndex };
        break;
      }
      default:
        break;
    }
    if (a && check(state, a) === null) return a;
  }
  // Mano llena de cartas que no puede usar: descarta la más antigua para seguir robando.
  if (me.hand.length >= CONFIG.special.handLimit && me.hand.every((id) => SPECIAL_INFO[specialCard(id).kind].target !== 'passive')) {
    return { type: 'discardCard', handIndex: 0 };
  }
  return null;
}
