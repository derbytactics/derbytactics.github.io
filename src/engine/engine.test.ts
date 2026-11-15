import { describe, expect, it } from 'vitest';
import {
  Action,
  BOT_STYLES,
  CONFIG,
  FOOTBALLERS,
  GameState,
  SPECIAL_CARDS,
  apply,
  basePrice,
  botAction,
  check,
  clauseOf,
  createGame,
  currentPlayer,
  pipsOf,
  pointsForRank,
  priceForPips,
  prizeForRank,
  totalPips,
} from './index';

const newGame = (n = 4, seed = 42) =>
  createGame({ players: Array.from({ length: n }, (_, i) => ({ name: `Club ${i + 1}`, isBot: false })), seed });

/** Coloca una carta concreta en el mercado para no depender del barajado. */
function withInMarket(s: GameState, cardId: string): GameState {
  const c = structuredClone(s);
  c.footballDeck = c.footballDeck.filter((id) => id !== cardId);
  if (!c.market.includes(cardId)) c.market[0] = cardId;
  return c;
}
const give = (s: GameState, playerId: number, special: string): GameState => {
  const c = structuredClone(s);
  c.players[playerId].hand.push(special);
  return c;
};

describe('cartas y precios', () => {
  it('los pips siguen la frecuencia de 2 dados', () => {
    expect([2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map(pipsOf)).toEqual([1, 2, 3, 4, 5, 5, 4, 3, 2, 1]);
    expect(totalPips([6, 8, 9])).toBe(14);
  });
  it('ningún futbolista marca con el 7 y los nombres son únicos', () => {
    expect(FOOTBALLERS.every((f) => !f.numbers.includes(7))).toBe(true);
    expect(new Set(FOOTBALLERS.map((f) => f.name)).size).toBe(FOOTBALLERS.length);
    expect(FOOTBALLERS.length).toBeGreaterThanOrEqual(CONFIG.maxPlayers * CONFIG.squadSize + 8);
  });
  it('el precio crece más que proporcionalmente con los pips', () => {
    expect(priceForPips(14) / 14).toBeGreaterThan(priceForPips(5) / 5);
    expect(priceForPips(14)).toBeLessThanOrEqual(CONFIG.startingMoney);
  });
  it('premios y puntos decrecen con la posición', () => {
    for (const n of [2, 4, 8]) {
      expect(prizeForRank(1, n)).toBe(CONFIG.prize.first);
      expect(prizeForRank(n, n)).toBe(CONFIG.prize.last);
      expect(pointsForRank(1, n)).toBe(n + 1);
      expect(pointsForRank(n, n)).toBe(1);
    }
  });
});

describe('mercado', () => {
  it('rechaza menos de 2 o más de 8 jugadores', () => {
    expect(() => newGame(1)).toThrow();
    expect(() => newGame(9)).toThrow();
  });
  it('fichar cobra el precio, repone el mercado y solo permite un fichaje por turno', () => {
    let s = newGame();
    const me = currentPlayer(s)!.id;
    const [a, b] = [...s.market].sort((x, y) => basePrice(x) - basePrice(y));
    const size = s.market.length;
    s = apply(s, { type: 'sign', cardId: a });
    expect(s.players[me].money).toBe(CONFIG.startingMoney - basePrice(a));
    expect(s.market).toHaveLength(size);
    expect(s.market).not.toContain(a);
    expect(check(s, { type: 'sign', cardId: b })).toMatch(/un fichaje/);
  });
  it('vender devuelve la mitad y amplía estadio sube la taquilla', () => {
    let s = newGame();
    const me = currentPlayer(s)!.id;
    const card = [...s.market].sort((x, y) => basePrice(x) - basePrice(y))[0];
    s = apply(s, { type: 'sign', cardId: card });
    s = apply(s, { type: 'sell', cardId: card });
    expect(s.players[me].money).toBe(CONFIG.startingMoney - basePrice(card) + Math.round(basePrice(card) * CONFIG.sellRatio));
    s = apply(s, { type: 'upgradeStadium' });
    expect(s.players[me].stadium).toBe(2);
    expect(check(s, { type: 'upgradeStadium' })).not.toBeNull();
  });
  it('la cláusula paga al dueño, respeta la protección y el blindaje la encarece', () => {
    let s = withInMarket(newGame(2), 'f47'); // un canterano barato
    const [first, second] = s.turnOrder;
    s = apply(s, { type: 'sign', cardId: 'f47' });
    s = apply(s, { type: 'endTurn' });
    expect(check(s, { type: 'clause', ownerId: first, cardId: 'f47' })).toMatch(/protegido/);
    s.players[first].squad[0].noClauseUntil = 0;
    const clause = clauseOf(s.players[first].squad[0]);
    const before = s.players[first].money;
    const after = apply(s, { type: 'clause', ownerId: first, cardId: 'f47' });
    expect(after.players[first].money).toBe(before + clause);
    expect(after.players[second].money).toBe(CONFIG.startingMoney - clause);
    expect(after.players[first].squad).toHaveLength(0);
    expect(after.players[second].squad[0].cardId).toBe('f47');
    s.players[first].squad[0].shielded = true;
    expect(clauseOf(s.players[first].squad[0])).toBeGreaterThan(clause);
  });
});

describe('cartas especiales', () => {
  it('hay copias de todas y la multa se cobra', () => {
    expect(SPECIAL_CARDS.length).toBeGreaterThan(30);
    let s = give(newGame(2), 0, 'incidentes-1');
    s.turnOrder = [0, 1];
    s = apply(s, { type: 'playCard', handIndex: 0, targetPlayerId: 1 });
    expect(s.players[1].money).toBe(CONFIG.startingMoney - CONFIG.special.fine);
    expect(s.players[0].hand).toHaveLength(0);
  });
  it('el gabinete jurídico anula una sanción y se gasta', () => {
    let s = give(give(newGame(2), 0, 'puertaCerrada-1'), 1, 'abogados-1');
    s.turnOrder = [0, 1];
    s = apply(s, { type: 'playCard', handIndex: 0, targetPlayerId: 1 });
    expect(s.players[1].closedDoorsUntil).toBe(0);
    expect(s.players[1].hand).toHaveLength(0);
  });
  it('la cantera impide pagar la cláusula', () => {
    let s = give(withInMarket(newGame(2), 'f47'), 0, 'cantera-1');
    s.turnOrder = [0, 1];
    s = apply(s, { type: 'sign', cardId: 'f47' });
    s = apply(s, { type: 'playCard', handIndex: 0, targetCardId: 'f47' });
    expect(s.players[0].squad[0].noClauseUntil).toBe(1 + CONFIG.special.academyRounds);
  });
});

describe('partido', () => {
  it('reparte taquilla, premio y puntos; racha dobla, lesión anula y puerta cerrada deja sin taquilla', () => {
    let s = newGame(2, 7);
    const entry = (cardId: string) => ({ cardId, shielded: false, noClauseUntil: 0, streakUntil: 0, outUntil: 0, extra: null });
    // f9 y f10 marcan ambos con 6 y 8.
    s.players[0].squad = [{ ...entry('f9'), streakUntil: 1 }];
    s.players[1].squad = [entry('f10'), { ...entry('f1'), outUntil: 1 }];
    s.players[1].closedDoorsUntil = 1;
    s.phase = 'match';
    s = apply(s, { type: 'playMatch' });
    const m = s.lastMatch!;
    expect(m.rolls).toHaveLength(CONFIG.rollsPerMatchday);
    const hits = m.rolls.filter((r) => r.sum === 6 || r.sum === 8).length;
    const [r0, r1] = [0, 1].map((id) => m.results.find((r) => r.playerId === id)!);
    expect(r0.goals).toBe(hits * 2);
    expect(r1.goals).toBe(hits);
    expect(r1.ticket).toBe(0);
    expect(r0.ticket).toBe(r0.goals * CONFIG.stadium.ticketPerGoal[0]);
    expect(s.players[0].money).toBe(CONFIG.startingMoney + r0.prize + r0.ticket);
    expect(s.players[0].points).toBe(r0.points);
    expect(m.rolls.every((r) => r.sum !== 7 || r.goals.length === 0)).toBe(true);
  });
  it('tras la jornada el colista abre el mercado', () => {
    let s = newGame(3, 3);
    s.phase = 'summary';
    s.players[0].points = 9;
    s.players[1].points = 2;
    s.players[2].points = 5;
    s = apply(s, { type: 'nextJornada' });
    expect(s.jornada).toBe(2);
    expect(s.turnOrder).toEqual([1, 2, 0]);
  });
});

describe('partidas completas de bots', () => {
  it.each([2, 3, 5, 8])('%i jugadores: termina, nadie queda en negativo y las reglas se respetan', (n) => {
    for (let seed = 1; seed <= 15; seed++) {
      let s = createGame({ players: Array.from({ length: n }, (_, i) => ({ name: `Bot ${i}`, isBot: true })), seed, season: 'corta' });
      let steps = 0;
      while (s.phase !== 'finished') {
        const cur = s.phase === 'market' ? s.turnOrder[s.turnIndex] : 0;
        const a: Action = botAction(s, BOT_STYLES[(cur + seed) % BOT_STYLES.length]);
        s = apply(s, a);
        expect(++steps).toBeLessThan(5000);
        for (const p of s.players) {
          expect(p.money).toBeGreaterThanOrEqual(0);
          expect(p.squad.length).toBeLessThanOrEqual(CONFIG.squadSize);
          expect(p.hand.length).toBeLessThanOrEqual(CONFIG.special.handLimit);
        }
      }
      // Ninguna carta se duplica ni se pierde.
      const all = [...s.market, ...s.footballDeck, ...s.players.flatMap((p) => p.squad.map((e) => e.cardId))];
      expect(new Set(all).size).toBe(FOOTBALLERS.length);
      expect(all).toHaveLength(FOOTBALLERS.length);
      const specials = [...s.specialDeck, ...s.specialDiscard, ...s.players.flatMap((p) => p.hand)];
      expect(specials.sort()).toEqual(SPECIAL_CARDS.map((c) => c.id).sort());
    }
  });
  it('misma semilla, misma partida', () => {
    const run = () => {
      let s = createGame({ players: [1, 2, 3].map((i) => ({ name: `B${i}`, isBot: true })), seed: 99, season: 'corta' });
      while (s.phase !== 'finished') s = apply(s, botAction(s));
      return s.players.map((p) => [p.points, p.goals, p.money]);
    };
    expect(run()).toEqual(run());
  });
});
