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
  currentRoller,
  rollsFor,
  hasKeeper,
  lineup,
  pipsOf,
  pointsForRank,
  priceFor,
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
/** Busca una carta por posición y números exactos. */
const card = (position: string, numbers: number[]) =>
  FOOTBALLERS.find((f) => f.position === position && f.numbers.join() === numbers.join())!.id;
const CHEAP = card('DEL', [5]);
const entry = (cardId: string, extra: object = {}) => ({ cardId, shielded: false, noClauseUntil: 0, streakUntil: 0, outUntil: 0, extra: null, ...extra });
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
  it('ningún futbolista usa el 7, los nombres son únicos y hay porteros para todos', () => {
    expect(FOOTBALLERS.every((f) => !f.numbers.includes(7))).toBe(true);
    expect(new Set(FOOTBALLERS.map((f) => f.name)).size).toBe(FOOTBALLERS.length);
    expect(FOOTBALLERS.length).toBeGreaterThanOrEqual(CONFIG.maxPlayers * CONFIG.squadSize + 8);
    const keepers = FOOTBALLERS.filter((f) => f.position === 'POR');
    expect(keepers.length).toBeGreaterThanOrEqual(CONFIG.maxPlayers + 4);
    expect(keepers.every((k) => k.numbers.length >= 3)).toBe(true);
  });
  it('el precio crece más que proporcionalmente con los pips y depende de la posición', () => {
    expect(priceFor('DEL', 14) / 14).toBeGreaterThan(priceFor('DEL', 5) / 5);
    expect(priceFor('DEL', 10)).toBeGreaterThan(priceFor('POR', 10));
    expect(Math.max(...FOOTBALLERS.map((f) => basePrice(f.id)))).toBeLessThanOrEqual(CONFIG.startingMoney);
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
  it('solo cabe un portero por club', () => {
    const [k1, k2] = FOOTBALLERS.filter((f) => f.position === 'POR').sort((a, b) => basePrice(a.id) - basePrice(b.id));
    let s = withInMarket(newGame(2), k1.id);
    const me = currentPlayer(s)!.id;
    s = apply(s, { type: 'sign', cardId: k1.id });
    expect(hasKeeper(s.players[me])).toBe(true);
    s.turn.signed = false;
    s = withInMarket(s, k2.id);
    expect(check(s, { type: 'sign', cardId: k2.id })).toMatch(/portero/);
  });
  it('como mucho dos delanteros por club', () => {
    const fwds = FOOTBALLERS.filter((f) => f.position === 'DEL').sort((a, b) => basePrice(a.id) - basePrice(b.id));
    let s = newGame(2);
    const me = currentPlayer(s)!.id;
    s.players[me].squad = [entry(fwds[0].id), entry(fwds[1].id)];
    s = withInMarket(s, fwds[2].id);
    expect(check(s, { type: 'sign', cardId: fwds[2].id })).toMatch(/delanteros/);
  });
  it('la cláusula paga al dueño, respeta la protección y el blindaje la encarece', () => {
    let s = withInMarket(newGame(2), CHEAP);
    const [first, second] = s.turnOrder;
    s = apply(s, { type: 'sign', cardId: CHEAP });
    s = apply(s, { type: 'endTurn' });
    expect(check(s, { type: 'clause', ownerId: first, cardId: CHEAP })).toMatch(/protegido/);
    s.players[first].squad[0].noClauseUntil = 0;
    const clause = clauseOf(s.players[first].squad[0]);
    const before = s.players[first].money;
    const after = apply(s, { type: 'clause', ownerId: first, cardId: CHEAP });
    expect(after.players[first].money).toBe(before + clause);
    expect(after.players[second].money).toBe(CONFIG.startingMoney - clause);
    expect(after.players[first].squad).toHaveLength(0);
    expect(after.players[second].squad[0].cardId).toBe(CHEAP);
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
  it('las sanciones quedan apuntadas como novedad para quien las sufre', () => {
    let s = give(newGame(2), 0, 'incidentes-1');
    s.turnOrder = [0, 1];
    s = apply(s, { type: 'playCard', handIndex: 0, targetPlayerId: 1 });
    s = apply(s, { type: 'endTurn' });
    const news = s.log.filter((l) => l.n > s.players[1].lastSeen && l.affects?.includes(1));
    expect(news).toHaveLength(1);
    expect(news[0].text).toMatch(/multa/);
    expect(s.players[0].lastSeen).toBe(s.logSeq);
  });
  it('la cantera impide pagar la cláusula', () => {
    let s = give(withInMarket(newGame(2), CHEAP), 0, 'cantera-1');
    s.turnOrder = [0, 1];
    s = apply(s, { type: 'sign', cardId: CHEAP });
    s = apply(s, { type: 'playCard', handIndex: 0, targetCardId: CHEAP });
    expect(s.players[0].squad[0].noClauseUntil).toBe(1 + CONFIG.special.academyRounds);
  });
});

describe('partido', () => {
  const DEL68 = card('DEL', [6, 8]);
  const MED68 = card('MED', [6, 8]);
  const DEF68 = card('DEF', [4, 6, 8]);
  const POR = card('POR', [5, 6, 8, 9]);
  /** Juega una jornada entre dos plantillas y devuelve lo que pasó con el 6 y el 8. */
  function play(a: ReturnType<typeof entry>[], b: ReturnType<typeof entry>[], tweak?: (s: GameState) => void) {
    const s = newGame(2, 7);
    s.players[0].squad = a;
    s.players[1].squad = b;
    s.phase = 'match';
    // Partido de prueba a 12 tiradas para que salgan el 6 y el 8 con seguridad.
    s.match = { jornada: 1, rolls: [], rollers: Array.from({ length: 12 }, (_, i) => i % 2) };
    tweak?.(s);
    const after = apply(s, { type: 'playMatch' });
    const m = after.lastMatch!;
    const hits = m.rolls.filter((r) => r.sum === 6 || r.sum === 8).length;
    const [r0, r1] = [0, 1].map((id) => m.results.find((r) => r.playerId === id)!);
    return { after, m, hits, r0, r1 };
  }

  it('un delantero marca a quien no tiene portero en ese número, y cobra taquilla y premio', () => {
    const { after, m, hits, r0, r1 } = play([entry(DEL68)], []);
    expect(hits).toBeGreaterThan(0);
    const cardsWon = m.rolls.flatMap((r) => r.varDraws).length;
    expect(m.rolls).toHaveLength(12);
    expect([r0.goals, r0.against, r1.goals, r1.against]).toEqual([hits, 0, 0, hits]);
    expect(r0.rank).toBe(1);
    expect(r0.ticket).toBe(hits * CONFIG.stadium.ticketPerGoal[0]);
    expect(after.players[0].money).toBe(CONFIG.startingMoney + r0.prize + r0.ticket);
    expect(after.players[0].points).toBe(r0.points);
    expect(after.players[1].against).toBe(hits);
    expect(m.rolls.every((r) => r.sum !== 7 || r.plays.length === 0)).toBe(true);
    for (const d of m.rolls.flatMap((r) => r.varDraws)) expect(after.players[d.playerId].hand).toContain(d.cardId);
  });
  it('el portero para el remate de un delantero y cobra prima por parada', () => {
    const { after, hits, r0, r1 } = play([entry(DEL68)], [entry(POR)]);
    expect([r0.goals, r1.against, r1.saves]).toEqual([0, 0, hits]);
    expect(r1.saveBonus).toBe(hits * CONFIG.saveBonus);
    expect(after.players[1].money).toBe(CONFIG.startingMoney + r1.prize + r1.saveBonus);
  });
  it('la jugada combinada de medio y delantero supera a un portero solo', () => {
    const { hits, r0, r1 } = play([entry(DEL68), entry(MED68)], [entry(POR)]);
    expect([r0.goals, r1.against]).toEqual([hits, hits]);
  });
  it('portero y defensa paran la combinada; un defensa solo no para a un delantero', () => {
    const combo = play([entry(DEL68), entry(MED68)], [entry(POR), entry(DEF68)]);
    expect([combo.r0.goals, combo.r1.goals]).toEqual([0, 0]);
    const alone = play([entry(DEL68)], [entry(DEF68)]);
    expect(alone.r0.goals).toBe(alone.hits);
    const mid = play([entry(MED68)], [entry(DEF68)]);
    expect(mid.r0.goals).toBe(0);
  });
  it('el medio no defiende: un medio rival no para nada', () => {
    const { hits, r0 } = play([entry(MED68)], [entry(card('MED', [5, 6, 9])), entry(card('MED', [4, 6, 8]))]);
    expect(r0.goals).toBe(hits);
  });
  it('cada club tira los dados una vez por jornada, y con un 7 roba carta quien tiró', () => {
    expect([2, 4, 5, 8].map(rollsFor)).toEqual([2, 4, 5, 8]);
    let sevens = 0;
    for (let seed = 1; seed <= 60; seed++) {
      let s = newGame(3, seed);
      s.phase = 'match';
      s.match = null;
      s = apply(s, { type: 'roll' });
      expect(s.match!.rollers).toEqual([0, 1, 2]);
      expect(currentRoller(s)).toBe(1);
      const first = s.match!.rolls[0];
      if (first.sum === 7) {
        sevens++;
        expect(first.plays).toHaveLength(0);
        expect(first.varDraws.map((d) => d.playerId)).toEqual([0]);
        expect(s.players.map((p) => p.hand.length)).toEqual([1, 0, 0]);
      } else {
        expect(first.varDraws).toHaveLength(0);
      }
      s = apply(apply(s, { type: 'roll' }), { type: 'roll' });
      expect(s.phase).toBe('summary');
      expect(s.match).toBeNull();
      expect(s.lastMatch!.rolls).toHaveLength(3);
    }
    expect(sevens).toBeGreaterThan(0);
  });
  it('la amarilla resta 1 de fuerza y la segunda amarilla expulsa', () => {
    // Delantero amonestado: ataque 1, lo para hasta un medio... no: lo para el portero y también marcaría a quien no defienda.
    const booked = play([entry(DEL68, { yellowUntil: 1 }), entry(MED68)], [entry(POR)]);
    expect(booked.r0.goals).toBe(0); // 1 + 1 = 2 no supera al portero (2)
    const keeperBooked = play([entry(DEL68)], [entry(POR, { yellowUntil: 1 })]);
    expect(keeperBooked.r0.goals).toBe(keeperBooked.hits); // portero amonestado defiende 1
    let s = give(give(newGame(2), 0, 'amarilla-1'), 0, 'amarilla-2');
    s.turnOrder = [0, 1];
    s.players[1].squad = [entry(DEL68)];
    s = apply(s, { type: 'playCard', handIndex: 0, targetPlayerId: 1, targetCardId: DEL68 });
    expect(s.players[1].squad[0].yellowUntil).toBe(1);
    expect(s.players[1].squad[0].outUntil).toBe(0);
    s = apply(s, { type: 'playCard', handIndex: 0, targetPlayerId: 1, targetCardId: DEL68 });
    expect(s.players[1].squad[0].outUntil).toBe(1);
  });
  it('la roja expulsa esta jornada y la siguiente', () => {
    let s = give(newGame(2), 0, 'roja-1');
    s.turnOrder = [0, 1];
    s.players[1].squad = [entry(DEL68)];
    s = apply(s, { type: 'playCard', handIndex: 0, targetPlayerId: 1, targetCardId: DEL68 });
    expect(s.players[1].squad[0].outUntil).toBe(2);
  });
  it('la racha dobla la fuerza, la baja la anula y a puerta cerrada no hay taquilla', () => {
    const streak = play([entry(DEL68, { streakUntil: 1 })], [entry(POR)]);
    expect(streak.r0.goals).toBe(streak.hits);
    const injured = play([entry(DEL68)], [entry(POR, { outUntil: 1 })]);
    expect(injured.r0.goals).toBe(injured.hits);
    const closed = play([entry(DEL68)], [], (s) => { s.players[0].closedDoorsUntil = 1; });
    expect(closed.r0.ticket).toBe(0);
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
          expect(lineup(p).POR).toBeLessThanOrEqual(CONFIG.maxKeepers);
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
      return s.players.map((p) => [p.points, p.goals, p.against, p.money]);
    };
    expect(run()).toEqual(run());
  });
});
