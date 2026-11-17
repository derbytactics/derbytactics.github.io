import { Position, SPECIAL_INFO, basePrice, footballer, specialCard, totalPips } from './cards';
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
  lineup,
  onStreak,
  sellValue,
  shieldCost,
  signPrice,
  standings,
  ticketPerGoal,
  upgradeCost,
} from './engine';

/**
 * Tácticas de la IA: cuántos futbolistas quiere de cada posición (portero-defensas-medios-delanteros).
 * Sirven para jugar y para medir en el simulador que ninguna alineación domina.
 */
export type BotStyle = 'equilibrado' | 'ofensivo' | 'defensivo' | 'medios' | 'delanteros' | 'sinPortero';
export const TACTICS: Record<BotStyle, Record<Position, number>> = {
  equilibrado: { POR: 1, DEF: 2, MED: 2, DEL: 2 },
  ofensivo: { POR: 1, DEF: 1, MED: 1, DEL: 4 },
  defensivo: { POR: 1, DEF: 3, MED: 2, DEL: 1 },
  medios: { POR: 1, DEF: 1, MED: 4, DEL: 1 },
  // Extremos, solo para el simulador: todo al ataque, y jugar sin portero.
  delanteros: { POR: 0, DEF: 0, MED: 1, DEL: 6 },
  sinPortero: { POR: 0, DEF: 2, MED: 2, DEL: 3 },
};
/** Estilos con los que juega la IA en las partidas. */
export const BOT_STYLES: BotStyle[] = ['equilibrado', 'ofensivo', 'defensivo', 'medios'];
export const SIM_STYLES: BotStyle[] = [...BOT_STYLES, 'delanteros', 'sinPortero'];

const pips = (cardId: string) => totalPips(footballer(cardId).numbers);
const posOf = (cardId: string) => footballer(cardId).position;
const entryPower = (e: SquadEntry, J: number) =>
  isOut(e, J) ? 0 : totalPips(activeNumbers(e, J)) * (onStreak(e, J) ? 2 : 1);

/** Devuelve la siguiente acción del bot al que le toca. Llamar en bucle hasta que devuelva endTurn. */
export function botAction(state: GameState, style: BotStyle = 'equilibrado'): Action {
  if (state.phase === 'match') return { type: 'roll' };
  if (state.phase === 'summary') return { type: 'nextJornada' };
  const me = currentPlayer(state);
  if (!me) return { type: 'endTurn' };
  const remaining = state.totalJornadas - state.jornada + 1;
  const ok = (a: Action) => check(state, a) === null;

  const card = pickCardToPlay(state, me, style, remaining);
  if (card && ok(card)) return card;

  for (const step of [transfer, stadium]) {
    const a = step(state, me, style, remaining);
    if (a && ok(a)) return a;
  }

  const buy: Action = { type: 'buySpecial' };
  if (remaining >= 2 && me.squad.length >= 4 && me.money - CONFIG.special.cost >= 8 && ok(buy)) return buy;

  for (const e of me.squad) {
    const a: Action = { type: 'shield', cardId: e.cardId };
    if (basePrice(e.cardId) >= 38 && remaining >= 4 && me.money - shieldCost(e.cardId) >= 12 && ok(a)) return a;
  }
  return { type: 'endTurn' };
}

function transfer(state: GameState, me: Player, style: BotStyle, remaining: number): Action | null {
  if (state.turn.signed) return null;
  const J = state.jornada;
  const want = TACTICS[style];
  const have = lineup(me);
  const full = me.squad.length >= CONFIG.squadSize;
  const needs = (pos: Position) => have[pos] < want[pos];
  const anyNeed = (['POR', 'DEF', 'MED', 'DEL'] as Position[]).some(needs);

  if (!full) {
    // Hueco libre: primero las posiciones que pide la táctica; si ya están, refuerza la más usada.
    const allowed = (id: string) => {
      const pos = posOf(id);
      if (pos === 'POR') return want.POR > 0 && have.POR === 0;
      return anyNeed ? needs(pos) : want[pos] > 0;
    };
    const market = state.market.filter((id) => allowed(id) && signPrice(state, id) <= me.money).sort((a, b) => pips(b) - pips(a));
    // No se gasta todo en el primer fichaje: reserva para completar la plantilla.
    const slotsLeft = CONFIG.squadSize - me.squad.length;
    const budget = remaining <= 2 ? me.money : Math.max(me.money / Math.min(slotsLeft, 3), 10);
    const pick = market.find((id) => signPrice(state, id) <= budget) ?? (state.jornada >= 3 ? market[market.length - 1] : undefined);

    let target: { ownerId: number; entry: SquadEntry } | null = null;
    if (remaining >= 3) {
      for (const rival of state.players) {
        if (rival.id === me.id) continue;
        for (const e of rival.squad) {
          const pos = posOf(e.cardId);
          if (isProtected(e, J) || clauseOf(e) > me.money || !allowed(e.cardId)) continue;
          if (pips(e.cardId) < (pick ? pips(pick) : 0) + 4 || basePrice(e.cardId) < 24) continue;
          if (pos === 'POR' && have.POR > 0) continue;
          if (!target || pips(e.cardId) > pips(target.entry.cardId)) target = { ownerId: rival.id, entry: e };
        }
      }
    }
    if (target) return { type: 'clause', ownerId: target.ownerId, cardId: target.entry.cardId };
    return pick ? { type: 'sign', cardId: pick } : null;
  }

  // Plantilla completa: cambia al peor de una posición por uno claramente mejor de esa misma posición.
  for (const id of [...state.market].sort((a, b) => pips(b) - pips(a))) {
    const pos = posOf(id);
    const worst = me.squad.filter((e) => posOf(e.cardId) === pos).sort((a, b) => pips(a.cardId) - pips(b.cardId))[0];
    if (!worst || pips(id) < pips(worst.cardId) + 3) continue;
    if (signPrice(state, id) <= me.money + sellValue(worst.cardId)) return { type: 'sell', cardId: worst.cardId };
  }
  return null;
}

function stadium(state: GameState, me: Player, style: BotStyle, remaining: number): Action | null {
  const cost = upgradeCost(me);
  if (cost === null || state.turn.upgraded || cost > me.money) return null;
  const minSquad = 4;
  if (me.squad.length < minSquad) return null;
  // Rentabilidad: +1M por gol durante las jornadas que quedan (el partido de esta jornada cuenta).
  const gain = expectedGoals(me, state.jornada) * remaining;
  const margin = 1.25;
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
        const e = myBest((x) => !isProtected(x, J) && basePrice(x.cardId) >= 24);
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
        const hasBargain = state.market.some(
          (id) => pips(id) >= 6 && basePrice(id) * (1 - CONFIG.special.scoutDiscount) <= me.money && (posOf(id) !== 'POR' || lineup(me).POR === 0),
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
