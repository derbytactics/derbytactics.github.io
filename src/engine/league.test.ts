import { describe, expect, it } from 'vitest';
import { FOOTBALLERS } from './cards';
import { createGame } from './engine';
import { generateRoster, words } from './identity';
import { newCareer, createCareerSeason } from './career';

const ids = FOOTBALLERS.map((f) => f.id);
const players = [{ name: 'Ana FC', isBot: false }, { name: 'B', isBot: true }];

describe('ligas masculina, femenina y mixta', () => {
  it('masculina: todos jugadores; femenina: todas jugadoras', () => {
    expect(Object.values(generateRoster(ids, 5, 'masculina')).some((x) => x.fem)).toBe(false);
    expect(Object.values(generateRoster(ids, 5, 'femenina')).every((x) => x.fem)).toBe(true);
  });
  it('mixta: hay de los dos, más o menos a partes iguales', () => {
    const fem = Object.values(generateRoster(ids, 5, 'mixta')).filter((x) => x.fem).length;
    expect(fem).toBeGreaterThan(ids.length * 0.3);
    expect(fem).toBeLessThan(ids.length * 0.7);
  });
  it('la masculina no cambia respecto a antes (mismos nombres con la misma semilla)', () => {
    expect(generateRoster(ids, 9)).toEqual(generateRoster(ids, 9, 'masculina'));
  });
  it('la partida guarda la liga (salvo la masculina, que es la de siempre)', () => {
    expect(createGame({ players, seed: 1 }).league).toBeUndefined();
    expect(createGame({ players, seed: 1, league: 'mixta' }).league).toBe('mixta');
  });
  it('en la mixta, las palabras concuerdan con cada futbolista', () => {
    const g = createGame({ players, seed: 3, league: 'mixta' });
    const her = ids.find((id) => g.roster![id].fem)!;
    const him = ids.find((id) => !g.roster![id].fem)!;
    expect(words(g, her).sentOff).toBe('expulsada');
    expect(words(g, him).sentOff).toBe('expulsado');
    expect(words(g).keeper).toBe('portero');
  });
  it('la carrera mantiene su liga en cada temporada', () => {
    const c = newCareer({ name: 'Ana FC' }, 11, 'femenina');
    const g = createCareerSeason(c);
    expect(g.league).toBe('femenina');
    expect(Object.values(g.roster!).every((x) => x.fem)).toBe(true);
  });
});
