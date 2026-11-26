import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { FOOTBALLERS } from './cards';
import { GameState, apply, check, createGame, strengthOn } from './engine';

const entry = (cardId: string) => ({ cardId, shielded: false, noClauseUntil: 0, streakUntil: 0, outUntil: 0, extra: null });
const keeper = FOOTBALLERS.find((f) => f.position === 'POR' && f.numbers.includes(6))!;
const forward = FOOTBALLERS.find((f) => f.position === 'DEL' && f.numbers.includes(6))!;

/** Partida de 2 clubes ya en el partido de la jornada 1, con la mano que se diga. */
function inMatch(hand: string[]): GameState {
  const g = createGame({ seed: 11, players: [{ name: 'Ana', isBot: false }, { name: 'Luis', isBot: false }] });
  g.players[0].squad = [entry(keeper.id)];
  g.players[1].squad = [entry(forward.id)];
  g.players.forEach((p) => (p.starters = p.squad.map((e) => e.cardId)));
  g.players[0].hand = hand;
  g.phase = 'match';
  g.match = { jornada: 1, rolls: [], rollers: [0, 1, 0, 1] };
  return g;
}

describe('cartas nuevas', () => {
  it('Muralla: donde ya defiendes, defiendes 1 más el resto del partido; una por partido', () => {
    let g = inMatch(['muralla-1', 'muralla-2']);
    const before = strengthOn(g.players[0], 6, 1).defense;
    g = apply(g, { type: 'matchCard', playerId: 0, handIndex: 0 });
    expect(strengthOn(g.players[0], 6, 1).defense).toBe(before + 1);
    expect(strengthOn(g.players[0], 7, 1).defense).toBe(0);
    expect(check(g, { type: 'matchCard', playerId: 0, handIndex: 0 })).toMatch(/muralla/);
  });
  it('Tiro libre: con 4, 5 o 6 es gol (cuenta como un penalti); si no, nada', () => {
    let goals = 0;
    for (let seed = 1; seed <= 40; seed++) {
      let g = inMatch(['tiroLibre-1']);
      g.seed = seed;
      g = apply(g, { type: 'matchCard', playerId: 0, handIndex: 0, targetPlayerId: 1 });
      const ev = g.match!.events!.at(-1)!;
      expect(ev.die).toBeGreaterThanOrEqual(1);
      expect(ev.scored).toBe(ev.die! >= 4);
      expect((g.players[0].penalties ?? []).length).toBe(ev.scored ? 1 : 0);
      if (ev.scored) goals++;
    }
    expect(goals).toBeGreaterThan(5);
    expect(goals).toBeLessThan(35);
  });
  it('Prima por ganar: si ganas la jornada cobras de más; si no, nada', () => {
    const g = createGame({ seed: 2, players: [{ name: 'Ana', isBot: false }, { name: 'Luis', isBot: true }] });
    g.players[g.turnOrder[g.turnIndex]].hand = ['prima-1'];
    const me = g.turnOrder[g.turnIndex];
    const after = apply(g, { type: 'playCard', handIndex: 0 });
    expect(after.players[me].bonusJornada).toBe(1);
    expect(check(after, { type: 'playCard', handIndex: 0 })).not.toBeNull();
    expect(CONFIG.special.winBonus).toBeGreaterThan(0);
  });
});
