import { describe, expect, it } from 'vitest';
import { createGame } from './engine';

const players = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `Club ${i}`, isBot: true }));
const sum = (r: [number, number]) => r[0] + r[1];

describe('sorteo de la pretemporada con dados', () => {
  it('el orden sale de las tiradas: más alto, antes; los empates se deshacen volviendo a tirar', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const g = createGame({ seed, players: players(2 + (seed % 7)) });
      const n = g.players.length;
      const order = g.turnOrder.slice(0, n);
      expect(new Set(order).size).toBe(n);
      expect(g.turnOrder.slice(n)).toEqual([...order].reverse());
      const rolls = new Map(g.draw!.map((d) => [d.playerId, d.rolls]));
      for (let i = 0; i + 1 < n; i++) {
        const a = rolls.get(order[i])!;
        const b = rolls.get(order[i + 1])!;
        // Compara tirada a tirada mientras empaten: la primera diferencia decide.
        let k = 0;
        while (k < Math.min(a.length, b.length) && sum(a[k]) === sum(b[k])) k++;
        expect(k < a.length && k < b.length).toBe(true);
        expect(sum(a[k])).toBeGreaterThan(sum(b[k]));
      }
    }
  });
  it('con la misma semilla, el mismo sorteo', () => {
    expect(createGame({ seed: 9, players: players(4) }).draw).toEqual(createGame({ seed: 9, players: players(4) }).draw);
  });
});
