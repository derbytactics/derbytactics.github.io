/**
 * Logros y álbum en este dispositivo.
 * - Álbum: cada futbolista que has fichado alguna vez, con el nombre y la cara de la primera vez.
 * - Logros: los desbloqueados, con la fecha. Los nuevos se ponen en cola para avisar en pantalla.
 */
import { useSyncExternalStore } from 'react';
import { AchievementId, GameState, Identity, albumAchievements, jornadaAchievements } from '../engine';
import { load, save } from '../net/storage';

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

/** Solo para pruebas: olvida lo cargado en memoria. */
export function resetAchievementsCache() {
  album = null;
  unlocked = null;
  queue = [];
}
