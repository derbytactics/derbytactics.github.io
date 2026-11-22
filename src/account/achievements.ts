/**
 * Logros y álbum en este dispositivo.
 * - Álbum: cada futbolista que has fichado alguna vez, con el nombre y la cara de la primera vez.
 * - Logros: los desbloqueados, con la fecha. Los nuevos se ponen en cola para avisar en pantalla.
 * Con cuenta se guardan también en el servidor: al entrar se juntan los dos lados (no se pierde nada)
 * y cada novedad se sube al momento.
 */
import { useSyncExternalStore } from 'react';
import { AchievementId, GameState, Identity, albumAchievements, jornadaAchievements } from '../engine';
import { load, remove, save } from '../net/storage';
import { backendEnabled, getAccount, rpc } from './api';

export interface AlbumEntry {
  /** Nombre y cara la primera vez que lo fichaste (en cada partida cambian). */
  identity?: Identity;
  /** Fecha (AAAA-MM-DD) del primer fichaje. */
  date: string;
}
export type Album = Record<string, AlbumEntry>;
export type Unlocked = Partial<Record<AchievementId, string>>;

const ALBUM_KEY = 'futcards.album.v1';
const ACHIEVEMENTS_KEY = 'futcards.achievements.v1';
/** Cuenta a la que pertenece lo guardado aquí (sin ella, es de invitado y se suma a la cuenta al entrar). */
const OWNER_KEY = 'futcards.collection.owner';

const signedIn = () => backendEnabled() && !!getAccount().session;

const today = () => new Date().toISOString().slice(0, 10);

let album: Album | null = null;
let unlocked: Unlocked | null = null;
/** Logros recién desbloqueados que aún no se han enseñado. */
let queue: AchievementId[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getAlbum = (): Album => (album ??= load<Album>(ALBUM_KEY) ?? {});
export const getUnlocked = (): Unlocked => (unlocked ??= load<Unlocked>(ACHIEVEMENTS_KEY) ?? {});
export const useAlbum = () => useSyncExternalStore(subscribe, getAlbum, getAlbum);
export const useUnlocked = () => useSyncExternalStore(subscribe, getUnlocked, getUnlocked);
const getQueue = () => queue;
/** Primer logro pendiente de enseñar (o null). */
export const useNextUnlock = () => useSyncExternalStore(subscribe, getQueue, getQueue)[0] ?? null;
export function dismissUnlock() {
  queue = queue.slice(1);
  emit();
}

/** Desbloquea logros; devuelve los que eran nuevos y los pone en cola para avisar. */
export function unlock(ids: AchievementId[]): AchievementId[] {
  const current = getUnlocked();
  const fresh = [...new Set(ids)].filter((id) => !current[id]);
  if (!fresh.length) return [];
  unlocked = { ...current, ...Object.fromEntries(fresh.map((id) => [id, today()])) };
  save(ACHIEVEMENTS_KEY, unlocked);
  queue = [...queue, ...fresh];
  emit();
  upload();
  return fresh;
}

/** Mete en el álbum los futbolistas que tenga ahora el club `seat` (los ya conocidos no cambian). */
export function collect(game: GameState, seat: number): string[] {
  const me = game.players[seat];
  if (!me || me.isBot) return [];
  const current = getAlbum();
  const fresh = me.squad.map((e) => e.cardId).filter((id) => !current[id]);
  if (!fresh.length) return [];
  const next: Album = { ...current };
  for (const id of fresh) next[id] = { identity: game.roster?.[id], date: today() };
  album = next;
  save(ALBUM_KEY, album);
  emit();
  upload();
  unlock(albumAchievements(Object.keys(album).length));
  return fresh;
}

/** Tras cada jornada (y al acabar la temporada): álbum y logros del club de este dispositivo. */
export function checkGame(game: GameState, seat: number, online = false): AchievementId[] {
  collect(game, seat);
  const ids = jornadaAchievements(game, seat);
  if (online && game.phase === 'finished' && game.players[seat] && !game.players[seat].isBot) ids.push('enLinea');
  return unlock(ids);
}

/** Junta dos colecciones: de cada logro, la fecha más antigua; del álbum, la primera entrada de `first`. */
export function mergeCollection(first: { achievements: Unlocked; album: Album }, second: { achievements: Unlocked; album: Album }) {
  const achievements: Unlocked = { ...second.achievements };
  for (const [id, date] of Object.entries(first.achievements) as [AchievementId, string][]) {
    const other = achievements[id];
    achievements[id] = other && other < date ? other : date;
  }
  return { achievements, album: { ...second.album, ...first.album } };
}

/** Sube la colección entera (el servidor la junta con lo que tenga). Se agrupan los cambios seguidos. */
let uploadTimer: ReturnType<typeof setTimeout> | null = null;
function upload() {
  if (!signedIn()) return;
  if (uploadTimer) clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => {
    uploadTimer = null;
    pushNow().catch(() => {});
  }, 1500);
}
async function pushNow() {
  if (!signedIn()) return;
  await rpc('save_collection', { p_achievements: getUnlocked(), p_album: getAlbum() });
  save(OWNER_KEY, getAccount().session!.user.id);
}

/**
 * Al entrar con la cuenta: trae su colección, la junta con la del dispositivo y sube lo que falte.
 * Lo guardado aquí con otra cuenta se descarta; lo de invitado se suma.
 */
export async function syncCollection(): Promise<void> {
  if (!signedIn()) return;
  const uid = getAccount().session!.user.id;
  try {
    const remote = (await rpc<{ achievements: Unlocked; album: Album }>('my_collection')) ?? { achievements: {}, album: {} };
    if (getAccount().session?.user.id !== uid) return;
    const owner = load<string>(OWNER_KEY);
    const local = owner && owner !== uid ? { achievements: {}, album: {} } : { achievements: getUnlocked(), album: getAlbum() };
    const merged = mergeCollection(remote, local);
    unlocked = merged.achievements;
    album = merged.album;
    save(ACHIEVEMENTS_KEY, unlocked);
    save(ALBUM_KEY, album);
    save(OWNER_KEY, uid);
    emit();
    const missing =
      Object.keys(merged.achievements).length > Object.keys(remote.achievements ?? {}).length ||
      Object.keys(merged.album).length > Object.keys(remote.album ?? {}).length;
    if (missing) await pushNow();
  } catch {
    // Sin conexión: se reintenta en la próxima sincronización.
  }
}

/** Al cerrar sesión: la colección es de la cuenta, así que no se queda en el dispositivo. */
export function forgetLocalCollection() {
  for (const k of [ALBUM_KEY, ACHIEVEMENTS_KEY, OWNER_KEY]) remove(k);
  album = {};
  unlocked = {};
  queue = [];
  emit();
}

/** Solo para pruebas: olvida lo cargado en memoria. */
export function resetAchievementsCache() {
  album = null;
  unlocked = null;
  queue = [];
}
