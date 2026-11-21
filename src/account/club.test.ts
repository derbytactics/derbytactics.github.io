import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Servidor de mentira: lo que guardaría Supabase para cada cuenta. */
const server: Record<string, { club: { name: string; crest: unknown } | null; seasons: { id: string; date: string }[] }> = {};
let user: string | null = null;

vi.mock('./api', () => ({
  backendEnabled: () => true,
  getAccount: () => ({ session: user ? { user: { id: user } } : null }),
  refreshProfile: async () => (user ? { id: user, club: server[user].club } : null),
  rpc: async (fn: string, args: Record<string, unknown>) => {
    const me = server[user!];
    if (fn === 'set_my_club') me.club = { name: args.p_name as string, crest: args.p_crest };
    if (fn === 'save_seasons') for (const e of args.p_entries as { id: string; date: string }[]) if (!me.seasons.some((x) => x.id === e.id)) me.seasons.push(e);
    if (fn === 'my_seasons') return [...me.seasons].sort((a, b) => (a.date < b.date ? 1 : -1));
    return null;
  },
}));

const { forgetLocalClub, getHistory, getMyClub, reloadClub, setMyClub, syncClub } = await import('./club');
const { save, remove } = await import('../net/storage');

const crest = (primary: string) => ({ shape: 1, pattern: 2, emblem: 3, primary, secondary: '#FFFFFF' });
const season = (id: string, date: string) => ({ id, date, position: 1 });

beforeEach(() => {
  for (const k of ['futcards.club.v1', 'futcards.history.v1', 'futcards.club.owner', 'futcards.club.dirty']) remove(k);
  for (const k of Object.keys(server)) delete server[k];
  server.ana = { club: null, seasons: [] };
  server.luis = { club: { name: 'Luis City', crest: crest('#1C6DD0') }, seasons: [season('l1', '2026-03-01')] };
  user = null;
  reloadClub();
});

describe('club e historial con la cuenta', () => {
  it('lo creado como invitado sube a una cuenta nueva', async () => {
    setMyClub({ name: 'Atlético Ribera', crest: crest('#C8102E') });
    save('futcards.history.v1', [season('g1', '2026-01-01')]);
    reloadClub();
    user = 'ana';
    await syncClub();
    expect(server.ana.club?.name).toBe('Atlético Ribera');
    expect(server.ana.seasons.map((x) => x.id)).toEqual(['g1']);
  });

  it('en otro dispositivo se recupera el club de la cuenta y se juntan los historiales', async () => {
    setMyClub({ name: 'Club De Prueba', crest: crest('#C8102E') });
    save('futcards.history.v1', [season('g9', '2026-04-01')]);
    reloadClub();
    user = 'luis';
    await syncClub();
    // El club de invitado no pisa el que ya tenía la cuenta.
    expect(getMyClub()?.name).toBe('Luis City');
    expect(getHistory().map((h) => h.id)).toEqual(['g9', 'l1']);
    expect(server.luis.seasons.map((x) => x.id).sort()).toEqual(['g9', 'l1']);
  });

  it('un cambio hecho con la cuenta se sube aunque fallara al guardarse', async () => {
    user = 'luis';
    await syncClub();
    user = null; // sin conexión con la cuenta al editar
    setMyClub({ name: 'Luis United', crest: crest('#111418') });
    user = 'luis';
    await syncClub();
    expect(server.luis.club?.name).toBe('Luis United');
  });

  it('lo guardado por otra cuenta en el dispositivo no se mezcla', async () => {
    user = 'luis';
    await syncClub();
    user = 'ana';
    await syncClub();
    expect(getMyClub()).toBeNull();
    expect(getHistory()).toEqual([]);
    expect(server.ana.seasons).toEqual([]);
  });

  it('al cerrar sesión no queda nada de la cuenta en el dispositivo, pero la cuenta lo conserva', async () => {
    user = 'luis';
    await syncClub();
    forgetLocalClub();
    reloadClub();
    expect(getMyClub()).toBeNull();
    expect(getHistory()).toEqual([]);
    expect(server.luis.club?.name).toBe('Luis City');
    // Al volver a entrar, se recupera.
    await syncClub();
    expect(getMyClub()?.name).toBe('Luis City');
  });
});
