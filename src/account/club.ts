/**
 * El club del jugador (uno por persona) y su historial de temporadas.
 * Se guardan en el dispositivo y, con cuenta, también en Supabase: así se recuperan en otro móvil.
 */
import { useSyncExternalStore } from 'react';
import { CrestDesign, GameState, sanitizeCrest, standings } from '../engine';
import { load, remove, save } from '../net/storage';
import { backendEnabled, getAccount, refreshProfile, rpc } from './api';

export interface MyClub {
  name: string;
  crest: CrestDesign;
}

export interface HistoryEntry {
  id: string;
  /** Fecha ISO de cuando terminó. */
  date: string;
  online: boolean;
  /** Liga en la que se jugó (sin indicar, masculina). */
  league?: 'masculina' | 'femenina';
  club: string;
  crest?: CrestDesign;
  position: number;
  clubs: number;
  points: number;
  goals: number;
  against: number;
  jornadas: number;
  champion: string;
  table: { name: string; points: number; goals: number; against: number; mine: boolean; bot: boolean; crest?: CrestDesign }[];
}

const CLUB_KEY = 'futcards.club.v1';
const HISTORY_KEY = 'futcards.history.v1';
/** Cuenta con la que se sincronizó por última vez lo guardado en este dispositivo. */
const OWNER_KEY = 'futcards.club.owner';
/** Hay cambios del club en el dispositivo que la cuenta aún no tiene. */
const DIRTY_KEY = 'futcards.club.dirty';
const MAX_HISTORY = 100;

type Store = { club: MyClub | null; history: HistoryEntry[]; syncing: boolean };
let store: Store | null = null;
const listeners = new Set<() => void>();

function cleanClub(raw: unknown): MyClub | null {
  const o = raw as { name?: unknown; crest?: unknown } | null;
  const crest = sanitizeCrest(o?.crest);
  const name = typeof o?.name === 'string' ? o.name.trim().slice(0, 20) : '';
  return name.length >= 3 && crest ? { name, crest } : null;
}
function read(): Store {
  if (store) return store;
  const history = load<HistoryEntry[]>(HISTORY_KEY);
  store = { club: cleanClub(load(CLUB_KEY)), history: Array.isArray(history) ? history : [], syncing: false };
  return store;
}
function set(patch: Partial<Store>) {
  store = { ...read(), ...patch };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function storeClub(club: MyClub | null) {
  if (club) save(CLUB_KEY, club);
  else remove(CLUB_KEY);
  set({ club });
}
function storeHistory(history: HistoryEntry[]) {
  save(HISTORY_KEY, history);
  set({ history });
}
const signedIn = () => backendEnabled() && !!getAccount().session;

/** Lee de nuevo lo guardado (tras cargar el almacenamiento nativo). */
export function reloadClub() {
  store = null;
  listeners.forEach((l) => l());
}

export const getMyClub = () => read().club;
export function setMyClub(club: MyClub) {
  const next = { name: club.name.trim().slice(0, 20), crest: club.crest };
  storeClub(next);
  save(DIRTY_KEY, true);
  if (signedIn()) {
    rpc('set_my_club', { p_name: next.name, p_crest: next.crest }).then(
      () => remove(DIRTY_KEY),
      () => {},
    );
  }
}
export const useMyClub = () => useSyncExternalStore(subscribe, () => read().club, () => read().club);
/** Se está trayendo el club de la cuenta. */
export const useClubSyncing = () => useSyncExternalStore(subscribe, () => read().syncing, () => read().syncing);

export const getHistory = () => read().history;
export const useHistory = () => useSyncExternalStore(subscribe, () => read().history, () => read().history);

const byDate = (a: HistoryEntry, b: HistoryEntry) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

/** Apunta una partida terminada en el historial, vista desde el club `seat`. No la repite. */
export function recordGame(game: GameState, seat: number, online: boolean) {
  if (game.phase !== 'finished' || !game.players[seat]) return;
  const id = game.gameId ?? `${game.players.map((p) => p.name).join('|')}#${game.players.map((p) => p.points).join(',')}`;
  const history = read().history;
  if (history.some((h) => h.id === id)) return;
  const table = standings(game);
  const me = game.players[seat];
  const entry: HistoryEntry = {
    id,
    date: new Date().toISOString(),
    online,
    ...(game.league === 'femenina' ? { league: 'femenina' as const } : {}),
    club: me.name,
    crest: me.crest,
    position: table.findIndex((p) => p.id === seat) + 1,
    clubs: game.players.length,
    points: me.points,
    goals: me.goals,
    against: me.against,
    jornadas: game.totalJornadas,
    champion: table[0].name,
    table: table.map((p) => ({ name: p.name, points: p.points, goals: p.goals, against: p.against, mine: p.id === seat, bot: p.isBot, crest: p.crest })),
  };
  storeHistory([entry, ...history].slice(0, MAX_HISTORY));
  // Si falla, se sube en la próxima sincronización.
  if (signedIn()) rpc('save_seasons', { p_entries: [entry] }).catch(() => {});
}

let syncing: Promise<void> | null = null;
/**
 * Junta lo del dispositivo con lo de la cuenta:
 *  · Club: si se editó aquí con esta cuenta y no llegó a subirse, se sube; si la cuenta aún no tiene club,
 *    se sube el del dispositivo; en otro caso, se adopta el de la cuenta.
 *  · Historial: se unen las dos listas y se sube lo que falte.
 * Si lo guardado aquí era de otra cuenta, se descarta y se usa solo lo de esta.
 */
export function syncClub(): Promise<void> {
  if (!signedIn()) return Promise.resolve();
  syncing ??= (async () => {
    const uid = getAccount().session!.user.id;
    const owner = load<string>(OWNER_KEY);
    const foreign = !!owner && owner !== uid;
    set({ syncing: true });
    try {
      const profile = await refreshProfile();
      if (!profile || getAccount().session?.user.id !== uid) return;
      const remote = cleanClub(profile.club);
      const local = foreign ? null : read().club;
      // Un club creado como invitado no pisa el que ya tenga la cuenta; un cambio hecho con esta cuenta, sí.
      const editedHere = owner === uid && !!load<boolean>(DIRTY_KEY);
      if (local && (editedHere || !remote)) {
        await rpc('set_my_club', { p_name: local.name, p_crest: local.crest });
        remove(DIRTY_KEY);
      } else {
        storeClub(remote);
        remove(DIRTY_KEY);
      }

      const remoteHistory = (await rpc<HistoryEntry[]>('my_seasons')) ?? [];
      const localHistory = foreign ? [] : read().history;
      const known = new Set(remoteHistory.map((h) => h.id));
      const missing = localHistory.filter((h) => !known.has(h.id));
      if (missing.length) await rpc('save_seasons', { p_entries: missing.slice(0, MAX_HISTORY) });
      storeHistory([...remoteHistory, ...missing].sort(byDate).slice(0, MAX_HISTORY));
      save(OWNER_KEY, uid);
    } catch {
      // Sin conexión: se reintenta en la próxima sincronización.
    } finally {
      set({ syncing: false });
      syncing = null;
    }
  })();
  return syncing;
}
