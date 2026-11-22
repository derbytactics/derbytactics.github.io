import { describe, expect, it, beforeEach } from 'vitest';
import { apply, botAction, createDailyGame } from '../engine';
import { remove, save } from '../net/storage';
import { DailyResult, dailyResults, dailyStreak, recordDaily, shareText } from './daily';

const KEY = 'futcards.daily.results.v1';
const r = (day: string): DailyResult => ({ day, number: 1, position: 1, clubs: 4, points: 9, goals: 7, against: 3 });

describe('reto diario en el dispositivo', () => {
  beforeEach(() => remove(KEY));
  it('la racha cuenta días seguidos hasta hoy o, si hoy no se ha jugado, hasta ayer', () => {
    save(KEY, { '2026-11-20': r('2026-11-20'), '2026-11-21': r('2026-11-21'), '2026-11-22': r('2026-11-22') });
    expect(dailyStreak('2026-11-22')).toBe(3);
    expect(dailyStreak('2026-11-23')).toBe(3);
    expect(dailyStreak('2026-11-24')).toBe(0);
  });
  it('apunta el resultado al terminar, y solo el primer intento del día', () => {
    let g = createDailyGame('2026-11-22', { name: 'Ana FC' });
    g.players[0].isBot = true; // que lo juegue la IA para llegar al final
    for (let i = 0; i < 5000 && g.phase !== 'finished'; i++) {
      if (g.phase === 'market') g = apply(g, botAction(g));
      else if (g.phase === 'match') g = apply(g, { type: 'playMatch' });
      else if (g.phase === 'summary') g = apply(g, { type: 'nextJornada' });
    }
    const first = recordDaily(g)!;
    expect(first.number).toBe(1);
    expect(first.position).toBeGreaterThanOrEqual(1);
    const fake = { ...g, players: g.players.map((p, i) => (i === 0 ? { ...p, points: 99 } : p)) };
    expect(recordDaily(fake)!.points).toBe(first.points);
    expect(Object.keys(dailyResults())).toEqual(['2026-11-22']);
  });
  it('el texto para compartir lleva número, puesto, puntos, goles y racha', () => {
    expect(shareText(r('2026-11-22'), 3)).toBe('DerbyTactics · Reto #1 · 22/11/2026\n🥇 1.º de 4 · 9 pts · ⚽ 7-3\n🔥 3 días seguidos');
  });
});
