import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { apply, botAction, createGame, levelOf } from './index';

const players = [{ name: 'Tú', isBot: false }, { name: 'IA 1', isBot: true }, { name: 'IA 2', isBot: true }];

describe('niveles de la IA', () => {
  it('el nivel va solo a los clubes de la IA; normal no se guarda', () => {
    const g = createGame({ seed: 3, players, level: 'dificil' });
    expect(levelOf(g.players[0])).toBe('normal');
    expect(g.players.slice(1).map(levelOf)).toEqual(['dificil', 'dificil']);
    expect(createGame({ seed: 3, players, level: 'normal' }).players[1].level).toBeUndefined();
  });
  it('en difícil, cada rival de la IA empieza con cartas de más y roba una más por jornada', () => {
    const normal = createGame({ seed: 5, players, level: 'normal' });
    const hard = createGame({ seed: 5, players, level: 'dificil' });
    expect(hard.players[0].hand.length).toBe(normal.players[0].hand.length);
    expect(hard.players[1].hand.length).toBe(CONFIG.special.initialHand + CONFIG.hardBonus.cards);
  });
  it('en fácil, la IA nunca paga cláusulas', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let g = createGame({ seed, season: 'corta', players: players.map((p) => ({ ...p, isBot: true })), level: 'facil' });
      for (let i = 0; i < 6000 && g.phase !== 'finished'; i++) {
        const a = botAction(g);
        expect(a.type).not.toBe('clause');
        g = apply(g, a);
      }
    }
  });
});
