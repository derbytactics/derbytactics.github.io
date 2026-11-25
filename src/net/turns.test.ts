import { describe, expect, it } from 'vitest';
import { apply, botAction, createGame } from '../engine';
import { turnFor } from './turns';

const game = () => createGame({ seed: 4, players: [{ name: 'Ana', isBot: false }, { name: 'Luis', isBot: false }, { name: 'IA', isBot: true }] });

describe('a quién le toca', () => {
  it('en el mercado, solo al club del turno, y la clave cambia de un turno a otro', () => {
    const g = game();
    const seat = g.turnOrder[g.turnIndex];
    const t = turnFor(g, seat)!;
    expect(t.kind).toBe('market');
    expect(turnFor(g, g.turnOrder.find((x) => x !== seat)!)).toBeNull();
    const next = apply(g, { type: 'endTurn' });
    expect(turnFor(next, next.turnOrder[next.turnIndex])!.key).not.toBe(t.key);
  });
  it('convocatoria: a quien aún no la ha elegido; partido: a quien tira', () => {
    let g = game();
    const lineup = { ...g, phase: 'lineup' as const, players: g.players.map((p, i) => ({ ...p, starters: i === 1 ? ['f1'] : null })) };
    expect(turnFor(lineup, 0)?.kind).toBe('lineup');
    expect(turnFor(lineup, 1)).toBeNull();
    for (let i = 0; i < 400 && g.phase !== 'match'; i++) g = apply(g, botAction(g));
    expect(g.phase).toBe('match');
    const roller = g.match!.rollers[g.match!.rolls.length];
    expect(turnFor(g, roller)?.kind).toBe('roll');
    expect(turnFor(g, null)).toBeNull();
  });
});
