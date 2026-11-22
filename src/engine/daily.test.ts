import { describe, expect, it } from 'vitest';
import { DAILY, createDailyGame, dailyKey, dailyNumber, previousDay } from './daily';

describe('reto diario', () => {
  it('cada día tiene su número y su día anterior', () => {
    expect(dailyNumber('2026-11-22')).toBe(1);
    expect(dailyNumber('2026-12-01')).toBe(10);
    expect(previousDay('2026-12-01')).toBe('2026-11-30');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
    expect(dailyKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('el mismo día sale la misma partida para todo el mundo, y otro día una distinta', () => {
    const a = createDailyGame('2026-11-22', { name: 'Ana FC' });
    const b = createDailyGame('2026-11-22', { name: 'Luis City' });
    const c = createDailyGame('2026-11-23', { name: 'Ana FC' });
    expect(a.market).toEqual(b.market);
    expect(a.players.slice(1).map((p) => p.name)).toEqual(b.players.slice(1).map((p) => p.name));
    expect(a.players.map((p) => p.hand)).toEqual(b.players.map((p) => p.hand));
    expect(a.market).not.toEqual(c.market);
    expect(a.totalJornadas).toBe(DAILY.jornadas);
    expect(a.players).toHaveLength(DAILY.clubs);
    expect(a.players.filter((p) => p.isBot)).toHaveLength(DAILY.clubs - 1);
    expect(a.daily).toBe('2026-11-22');
  });
});
