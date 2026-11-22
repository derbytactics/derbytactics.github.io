import { beforeEach, describe, expect, it } from 'vitest';
import { FOOTBALLERS, createGame } from '../engine';
import { remove } from '../net/storage';
import { checkGame, collect, dismissUnlock, getAlbum, getUnlocked, resetAchievementsCache, unlock } from './achievements';

const entry = (cardId: string) => ({ cardId, shielded: false, noClauseUntil: 0, streakUntil: 0, outUntil: 0, extra: null });

describe('logros y álbum en el dispositivo', () => {
  beforeEach(() => {
    remove('futcards.album.v1');
    remove('futcards.achievements.v1');
    resetAchievementsCache();
  });
  it('desbloquea cada logro una sola vez', () => {
    expect(unlock(['reto'])).toEqual(['reto']);
    expect(unlock(['reto', 'racha7'])).toEqual(['racha7']);
    expect(Object.keys(getUnlocked()).sort()).toEqual(['racha7', 'reto']);
    resetAchievementsCache();
    expect(Object.keys(getUnlocked()).sort()).toEqual(['racha7', 'reto']); // guardado
  });
  it('el álbum guarda la primera identidad y no la cambia', () => {
    const g = createGame({ seed: 3, players: [{ name: 'Ana', isBot: false }, { name: 'B', isBot: true }] });
    const id = FOOTBALLERS[0].id;
    g.players[0].squad = [entry(id)];
    const first = g.roster?.[id];
    expect(collect(g, 0)).toEqual([id]);
    expect(getAlbum()[id].identity).toEqual(first);
    const other = createGame({ seed: 99, players: [{ name: 'Ana', isBot: false }, { name: 'B', isBot: true }] });
    other.players[0].squad = [entry(id)];
    expect(collect(other, 0)).toEqual([]);
    expect(getAlbum()[id].identity).toEqual(first);
    expect(collect(g, 1)).toEqual([]); // los bots no llenan tu álbum
  });
  it('25 futbolistas desbloquean «Coleccionista»; terminar en línea, «De tú a tú»', () => {
    const g = createGame({ seed: 3, players: [{ name: 'Ana', isBot: false }, { name: 'B', isBot: true }] });
    g.players[0].squad = FOOTBALLERS.slice(0, 25).map((f) => entry(f.id));
    collect(g, 0);
    expect(getUnlocked().album25).toBeTruthy();
    g.phase = 'finished';
    expect(checkGame(g, 0, true)).toContain('enLinea');
    dismissUnlock();
  });
});
