/**
 * Protocolo de sala, puro y sin red: el anfitrión es la única autoridad.
 * Los invitados mandan mensajes; el anfitrión los valida, aplica la acción
 * con el motor y difunde el estado completo de la sala.
 */
import { Action, CONFIG, GameState, SeasonLength, apply, botAction, check, createGame, BOT_STYLES } from '../engine';

export interface Seat {
  name: string;
  /** Dispositivo que ocupa el asiento; null si lo lleva la IA. */
  clientId: string | null;
}

export interface RoomState {
  v: 1;
  code: string;
  /** Crece con cada cambio: sirve para descartar mensajes atrasados. */
  seq: number;
  clubs: number;
  season: SeasonLength;
  seats: Seat[];
  game: GameState | null;
  /** Asientos que ya han visto el reparto de la jornada en curso. */
  ready: number[];
}

export type ClientMsg =
  | { t: 'join'; clientId: string; name: string }
  | { t: 'leave'; clientId: string }
  | { t: 'act'; clientId: string; seq: number; action: Action }
  | { t: 'ready'; clientId: string; seq: number };

const BOT_NAMES = ['Deportivo Norte', 'Racing Meseta', 'CF Bahía', 'Rayo Sur', 'Sporting Ribera', 'Unión Levante', 'Real Chamartín'];

export function newRoom(code: string, hostId: string, hostName: string): RoomState {
  return { v: 1, code, seq: 1, clubs: 4, season: 'estandar', seats: [{ name: hostName, clientId: hostId }], game: null, ready: [] };
}

export const seatOf = (room: RoomState, clientId: string) => room.seats.findIndex((s) => s.clientId === clientId);
const bump = (room: RoomState, patch: Partial<RoomState>): RoomState => ({ ...room, ...patch, seq: room.seq + 1 });
const cleanName = (name: string, fallback: string) => name.trim().slice(0, 20) || fallback;

/** Asientos humanos que aún no han pulsado «Listo» tras el reparto. */
export function pendingReady(room: RoomState): number[] {
  return room.seats.map((s, i) => (s.clientId && !room.ready.includes(i) ? i : -1)).filter((i) => i >= 0);
}

function advanceIfAllReady(room: RoomState): RoomState {
  if (room.game?.phase !== 'summary' || pendingReady(room).length > 0) return room;
  return bump(room, { game: apply(room.game, { type: 'nextJornada' }), ready: [] });
}

/** Aplica un mensaje de un invitado. Devuelve la misma referencia si no cambia nada. */
export function hostReduce(room: RoomState, msg: ClientMsg): RoomState {
  const seat = seatOf(room, msg.clientId);
  switch (msg.t) {
    case 'join': {
      if (seat >= 0) {
        // Reconexión: en la sala de espera puede corregir el nombre.
        if (room.game || room.seats[seat].name === cleanName(msg.name, room.seats[seat].name)) return room;
        return bump(room, { seats: room.seats.map((s, i) => (i === seat ? { ...s, name: cleanName(msg.name, s.name) } : s)) });
      }
      if (room.game || room.seats.length >= room.clubs) return room;
      return bump(room, { seats: [...room.seats, { name: cleanName(msg.name, `Club ${room.seats.length + 1}`), clientId: msg.clientId }] });
    }
    case 'leave': {
      if (seat <= 0) return room;
      if (!room.game) return bump(room, { seats: room.seats.filter((_, i) => i !== seat) });
      // Con la partida empezada, su club pasa a la IA.
      const game = structuredClone(room.game);
      game.players[seat].isBot = true;
      return advanceIfAllReady(bump(room, { game, seats: room.seats.map((s, i) => (i === seat ? { ...s, clientId: null } : s)) }));
    }
    case 'act': {
      const g = room.game;
      if (!g || seat < 0 || msg.seq !== room.seq) return room;
      const a = msg.action;
      if (a.type === 'nextJornada') return room;
      if (a.type !== 'playMatch' && (g.phase !== 'market' || g.turnOrder[g.turnIndex] !== seat)) return room;
      if (check(g, a)) return room;
      return bump(room, { game: apply(g, a) });
    }
    case 'ready': {
      if (room.game?.phase !== 'summary' || seat < 0 || room.ready.includes(seat)) return room;
      return advanceIfAllReady(bump(room, { ready: [...room.ready, seat] }));
    }
  }
}

// ---------------------------------------------------------------- Acciones del anfitrión

export function setLobby(room: RoomState, patch: { clubs?: number; season?: SeasonLength; hostName?: string }): RoomState {
  if (room.game) return room;
  const clubs = Math.max(Math.max(CONFIG.minPlayers, room.seats.length), Math.min(CONFIG.maxPlayers, patch.clubs ?? room.clubs));
  const seats = patch.hostName === undefined ? room.seats : room.seats.map((s, i) => (i === 0 ? { ...s, name: cleanName(patch.hostName!, s.name) } : s));
  return bump(room, { clubs, season: patch.season ?? room.season, seats });
}

/** Empieza la partida: los asientos libres los ocupa la IA. */
export function startGame(room: RoomState, seed?: number): RoomState {
  if (room.game) return room;
  const used = new Set(room.seats.map((s) => s.name));
  const bots = BOT_NAMES.filter((n) => !used.has(n));
  const seats = [...room.seats];
  while (seats.length < room.clubs) seats.push({ name: bots.shift() ?? `Club ${seats.length + 1}`, clientId: null });
  const game = createGame({ players: seats.map((s) => ({ name: s.name, isBot: !s.clientId })), season: room.season, seed });
  return bump(room, { seats, game, ready: [] });
}

/** Acción del propio anfitrión (asiento 0). Devuelve el motivo si no es legal. */
export function hostAct(room: RoomState, action: Action): { room: RoomState; error: string | null } {
  const g = room.game;
  if (!g) return { room, error: 'La partida no ha empezado.' };
  if (action.type !== 'playMatch' && action.type !== 'nextJornada' && (g.phase !== 'market' || g.turnOrder[g.turnIndex] !== 0)) {
    return { room, error: 'No es tu turno.' };
  }
  const error = check(g, action);
  if (error) return { room, error };
  return { room: bump(room, { game: apply(g, action), ready: action.type === 'nextJornada' ? [] : room.ready }), error: null };
}

export function hostReady(room: RoomState): RoomState {
  if (room.game?.phase !== 'summary' || room.ready.includes(0)) return room;
  return advanceIfAllReady(bump(room, { ready: [...room.ready, 0] }));
}

/** Un paso de IA para el club al que le toca (bots, o un amigo ausente si `force`). */
export function botStep(room: RoomState, force = false): RoomState {
  const g = room.game;
  if (!g || g.phase !== 'market') return room;
  const cur = g.turnOrder[g.turnIndex];
  if (!g.players[cur].isBot && !force) return room;
  return bump(room, { game: apply(g, botAction(g, BOT_STYLES[cur % BOT_STYLES.length])) });
}

/** La IA termina el turno entero del club al que le toca (para cuando alguien se ha ido). */
export function playTurnForAbsent(room: RoomState): RoomState {
  const g = room.game;
  if (!g || g.phase !== 'market') return room;
  const turn = g.turnIndex;
  let r = room;
  for (let i = 0; i < 40 && r.game!.phase === 'market' && r.game!.turnIndex === turn; i++) r = botStep(r, true);
  return r;
}
