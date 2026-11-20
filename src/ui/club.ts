/**
 * El club del jugador (uno por persona) y su historial de partidas.
 * Se guardan en el dispositivo y sobreviven entre partidas.
 */
import { useSyncExternalStore } from 'react';
import { CrestDesign, GameState, sanitizeCrest, standings } from '../engine';
import { load, save } from '../net/storage';

export interface MyClub {
  name: string;
  crest: CrestDesign;
}

export interface HistoryEntry {
  id: string;
  /** Fecha ISO de cuando terminó. */
  date: string;
  online: boolean;
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
const MAX_HISTORY = 100;

type Store = { club: MyClub | null; history: HistoryEntry[] };
let store: Store | null = null;
const listeners = new Set<() => void>();

function read(): Store {
  if (store) return store;
  const raw = load<MyClub>(CLUB_KEY);
  const crest = sanitizeCrest(raw?.crest);
  const club = raw && typeof raw.name === 'string' && raw.name.trim() && crest ? { name: raw.name.trim().slice(0, 20), crest } : null;
  const history = load<HistoryEntry[]>(HISTORY_KEY);
  store = { club, history: Array.isArray(history) ? history : [] };
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

/** Lee de nuevo lo guardado (tras cargar el almacenamiento nativo). */
export function reloadClub() {
  store = null;
  listeners.forEach((l) => l());
}

export const getMyClub = () => read().club;
export function setMyClub(club: MyClub) {
  const next = { name: club.name.trim().slice(0, 20), crest: club.crest };
  save(CLUB_KEY, next);
  set({ club: next });
}
export const useMyClub = () => useSyncExternalStore(subscribe, () => read().club, () => read().club);

export const getHistory = () => read().history;
export const useHistory = () => useSyncExternalStore(subscribe, () => read().history, () => read().history);

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
  const next = [entry, ...history].slice(0, MAX_HISTORY);
  save(HISTORY_KEY, next);
  set({ history: next });
}
