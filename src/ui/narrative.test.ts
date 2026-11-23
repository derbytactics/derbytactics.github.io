import { describe, expect, it } from 'vitest';
import { GameState, League, apply, botAction, createGame } from '../engine';
import { rollNews } from './narrative';

/** Juega una temporada entera con la IA y devuelve todas las noticias, vistas desde cada club. */
function chronicle(league: League, seed: number): { state: GameState; text: string }[] {
  let g = createGame({ seed, league, season: 'corta', players: ['A', 'B', 'C', 'D'].map((name) => ({ name, isBot: true })) });
  const out: { state: GameState; text: string }[] = [];
  for (let i = 0; i < 20000 && g.phase !== 'finished'; i++) {
    if (g.phase === 'summary' && g.lastMatch) {
      g.lastMatch.rolls.forEach((roll, k) => {
        for (const viewer of [null, 0, 1, 2, 3]) for (const n of rollNews(g, roll, k, viewer)) out.push({ state: g, text: `${n.title} ${n.text}` });
      });
    }
    g = g.phase === 'market' ? apply(g, botAction(g)) : g.phase === 'match' ? apply(g, { type: 'playMatch' }) : g.phase === 'summary' ? apply(g, { type: 'nextJornada' }) : apply(g, botAction(g));
  }
  return out;
}

const MASC = /\b(el|al|tu|su|del) portero\b|\bse planta solo\b|\blesionado\b|\bexpulsado\b|\bun defensa\b|\bmuy seguro\b/;
const FEM = /\b(la|tu|su) portera\b|\bse planta sola\b|\blesionada\b|\bexpulsada\b|\buna defensa\b/;

describe('género en la crónica del partido', () => {
  it('masculina: nada en femenino', () => {
    for (const seed of [1, 2]) for (const n of chronicle('masculina', seed)) expect(n.text).not.toMatch(FEM);
  });
  it('femenina: nada en masculino', () => {
    for (const seed of [1, 2]) for (const n of chronicle('femenina', seed)) expect(n.text).not.toMatch(MASC);
  });
  it('mixta: «solo/sola» y «tu portero/portera» concuerdan con quien protagoniza', () => {
    let checked = 0;
    for (const seed of [1, 2, 3]) {
      for (const { state, text } of chronicle('mixta', seed)) {
        const roster = state.roster!;
        const byName = (name: string) => Object.values(roster).find((x) => x.name === name);
        const m = text.match(/para (.+?), que se planta (solo|sola) y define/);
        if (m) {
          checked++;
          expect(m[2] === 'sola').toBe(!!byName(m[1])?.fem);
        }
        // Nunca un genérico de género fijo para alguien sin nombre.
        expect(text).not.toMatch(/\b(un|una) defensa de\b|\b(El portero|La portera) de\b/);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
