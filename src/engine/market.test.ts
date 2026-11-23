import { describe, expect, it } from 'vitest';
import { SIM_STYLES, apply, botAction, createGame, footballer, hasKeeper } from './index';

describe('mercado y porteros', () => {
  it('mientras algún club no tenga portero y queden en el mazo, el mercado enseña al menos uno', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const styles = ['sinPortero', 'sinPortero', 'equilibrado', 'ofensivo'] as const;
      let s = createGame({ seed, season: 'corta', players: styles.map((st, i) => ({ name: st + i, isBot: true })) });
      for (let i = 0; i < 4000 && s.phase !== 'finished'; i++) {
        if (s.phase === 'market') {
          const someoneNeeds = !s.players.every(hasKeeper);
          const deckHas = s.footballDeck.some((id) => footballer(id).position === 'POR');
          if (someoneNeeds && deckHas) expect(s.market.some((id) => footballer(id).position === 'POR')).toBe(true);
        }
        const cur = s.phase === 'market' ? s.turnOrder[s.turnIndex] : 0;
        s = apply(s, botAction(s, s.phase === 'market' ? styles[cur] : SIM_STYLES[0]));
      }
    }
  });
});
