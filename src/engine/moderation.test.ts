import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createGame } from './engine';
import { makeRand, randomClubName } from './identity';
import { BLOCKED_ANYWHERE, BLOCKED_EXACT, BLOCKED_PREFIX, BLOCKED_REPEATED, isOffensive } from './moderation';

describe('filtro de nombres', () => {
  it('bloquea insultos, también disfrazados', () => {
    for (const n of ['Culo FC', 'ElCulo', 'Real Mierdas', 'Puuuta Madre', 'GILIPOLLAS', 'gili pollas united', 'H1j0put4', 'C@br0n FC', 'Atlético Maricón', 'Hitler 88', 'Fuck You', 'Polla', 'KKK Club', 'Real XXX']) {
      expect(isOffensive(n), n).toBe(true);
    }
  });
  it('no bloquea nombres normales que se parecen', () => {
    for (const n of ['Penedès FC', 'Vergara', 'Conocidos', 'Calculo', 'Disputa', 'Computadora', 'Dickens', 'Pollos Hermanos', 'Culombio', 'Atlético Ribera', 'Nazareno', 'Rapidos', 'Kofi Traoré', 'Club X']) {
      expect(isOffensive(n), n).toBe(false);
    }
  });
  it('ningún nombre que genera el juego queda bloqueado', () => {
    const r = makeRand(1);
    for (let i = 0; i < 2000; i++) expect(isOffensive(randomClubName(r))).toBe(false);
    for (const league of ['masculina', 'femenina'] as const) {
      for (let seed = 0; seed < 30; seed++) {
        const g = createGame({ seed, league, players: Array.from({ length: 8 }, (_, i) => ({ name: `Club ${i}`, isBot: true })) });
        for (const p of g.players) expect(isOffensive(p.name), p.name).toBe(false);
        for (const id of Object.values(g.roster ?? {})) expect(isOffensive(id.name), id.name).toBe(false);
      }
    }
  });
  it('la lista del servidor coincide con la de la app', () => {
    const sql = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
    const list = (name: string) => {
      const m = sql.match(new RegExp(`${name} text\\[\\] := array\\[([^\\]]*)\\]`));
      return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : null;
    };
    expect(list('blocked_exact')).toEqual(BLOCKED_EXACT);
    expect(list('blocked_prefix')).toEqual(BLOCKED_PREFIX);
    expect(list('blocked_anywhere')).toEqual(BLOCKED_ANYWHERE);
    expect(list('blocked_repeated')).toEqual(BLOCKED_REPEATED);
  });
});
