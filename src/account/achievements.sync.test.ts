import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Servidor de mentira: la colección de cada cuenta, juntada como lo hace save_collection. */
type Col = { achievements: Record<string, string>; album: Record<string, { date: string; identity?: { name: string } }> };
const server: Record<string, Col> = {};
let user: string | null = null;
let calls: string[] = [];

vi.mock('./api', () => ({
  backendEnabled: () => true,
  getAccount: () => ({ session: user ? { user: { id: user } } : null }),
  rpc: async (fn: string, args: Record<string, unknown>) => {
    calls.push(fn);
    const me = (server[user!] ??= { achievements: {}, album: {} });
    if (fn === 'my_collection') return structuredClone(me);
    if (fn === 'save_collection') {
      for (const [k, d] of Object.entries(args.p_achievements as Record<string, string>)) if (!me.achievements[k] || d < me.achievements[k]) me.achievements[k] = d;
      me.album = { ...(args.p_album as Col['album']), ...me.album };
    }
    return null;
  },
}));

const mod = await import('./achievements');
const { remove } = await import('../net/storage');

beforeEach(() => {
  for (const k of ['futcards.album.v1', 'futcards.achievements.v1', 'futcards.collection.owner']) remove(k);
  for (const k of Object.keys(server)) delete server[k];
  mod.resetAchievementsCache();
  user = null;
  calls = [];
});

describe('logros y álbum con la cuenta', () => {
  it('juntar: de cada logro, la fecha más antigua; del álbum, lo primero que había', () => {
    const m = mod.mergeCollection(
      { achievements: { reto: '2026-11-20', campeon: '2026-11-22' }, album: { f1: { date: '2026-11-01', identity: { name: 'Leo', eth: 'europeo', face: 1 } } } },
      { achievements: { reto: '2026-11-25', goleada: '2026-11-02' }, album: { f1: { date: '2026-11-30' }, f2: { date: '2026-11-30' } } },
    );
    expect(m.achievements).toEqual({ reto: '2026-11-20', campeon: '2026-11-22', goleada: '2026-11-02' });
    expect(m.album.f1.identity?.name).toBe('Leo');
    expect(Object.keys(m.album).sort()).toEqual(['f1', 'f2']);
  });
  it('lo conseguido como invitado se suma a la cuenta al entrar, y lo de la cuenta llega al dispositivo', async () => {
    mod.unlock(['reto']);
    server.ana = { achievements: { campeon: '2026-11-01' }, album: { f9: { date: '2026-11-01' } } };
    user = 'ana';
    await mod.syncCollection();
    expect(Object.keys(mod.getUnlocked()).sort()).toEqual(['campeon', 'reto']);
    expect(mod.getAlbum().f9).toBeTruthy();
    expect(Object.keys(server.ana.achievements).sort()).toEqual(['campeon', 'reto']);
  });
  it('si no falta nada en el servidor, no se sube', async () => {
    server.ana = { achievements: { campeon: '2026-11-01' }, album: {} };
    user = 'ana';
    await mod.syncCollection();
    expect(calls).toEqual(['my_collection']);
  });
  it('lo guardado aquí con otra cuenta no se mezcla', async () => {
    server.luis = { achievements: { goleada: '2026-11-01' }, album: {} };
    user = 'luis';
    await mod.syncCollection();
    server.ana = { achievements: {}, album: {} };
    user = 'ana';
    await mod.syncCollection();
    expect(mod.getUnlocked()).toEqual({});
    expect(server.ana.achievements).toEqual({});
  });
  it('con sesión, cada logro nuevo se sube solo', async () => {
    vi.useFakeTimers();
    user = 'ana';
    mod.unlock(['penalti']);
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    expect(server.ana.achievements.penalti).toBeTruthy();
  });
  it('al cerrar sesión se borra del dispositivo', () => {
    mod.unlock(['reto']);
    mod.forgetLocalCollection();
    mod.resetAchievementsCache();
    expect(mod.getUnlocked()).toEqual({});
  });
});
