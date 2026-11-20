/**
 * Protocolo de sala, puro y sin red: el anfitrión es la única autoridad.
 * Los invitados mandan mensajes; el anfitrión los valida, aplica la acción
 * con el motor y difunde el estado completo de la sala.
 */
import { Action, BOT_STYLES, CONFIG, CrestDesign, GameState, SeasonLength, apply, botAction, check, createGame, currentRoller, makeRand, randomClubName, sanitizeCrest } from '../engine';

export interface Seat {
  name: string;
  /** Dispositivo que ocupa el asiento; null si lo lleva la IA. */
  clientId: string | null;
  /** Escudo del club; los de la IA se eligen al empezar. */
  crest?: CrestDesign;
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
  /** Cuenta del anfitrión e identificador de la partida en el servidor, si hay cuentas. */
  hostUserId?: string | null;
  gameId?: string | null;
}

export type ClientMsg =
  | { t: 'join'; clientId: string; name: string; crest?: CrestDesign }
  | { t: 'leave'; clientId: string }
  | { t: 'act'; clientId: string; seq: number; action: Action }
  | { t: 'ready'; clientId: string; seq: number };

export function newRoom(code: string, hostId: string, hostName: string, hostUserId: string | null = null, hostCrest?: CrestDesign): RoomState {
  const host: Seat = { name: hostName, clientId: hostId, ...(sanitizeCrest(hostCrest) ? { crest: sanitizeCrest(hostCrest) } : {}) };
  return { v: 1, code, seq: 1, clubs: 4, season: 'estandar', seats: [host], game: null, ready: [], hostUserId, gameId: null };
}

/** Semilla estable para una sala (los nombres de la IA no cambian entre llamadas). */
function codeSeed(code: string): number {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) h = Math.imul(h ^ code.charCodeAt(i), 16777619);
  return h | 0;
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
      const crest = sanitizeCrest(msg.crest);
      if (seat >= 0) {
        // Reconexión: en la sala de espera puede corregir el nombre y el escudo.
        const cur = room.seats[seat];
        const name = cleanName(msg.name, cur.name);
        if (room.game || (cur.name === name && JSON.stringify(cur.crest) === JSON.stringify(crest ?? cur.crest))) return room;
        return bump(room, { seats: room.seats.map((s, i) => (i === seat ? { ...s, name, ...(crest ? { crest } : {}) } : s)) });
      }
      if (room.game || room.seats.length >= room.clubs) return room;
      return bump(room, { seats: [...room.seats, { name: cleanName(msg.name, `Club ${room.seats.length + 1}`), clientId: msg.clientId, ...(crest ? { crest } : {}) }] });
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
      if (a.type === 'nextJornada' || a.type === 'playMatch') return room;
      // En el partido solo tira los dados el club al que le toca; en el mercado, solo juega el del turno.
      if (a.type === 'roll' ? currentRoller(g) !== seat : g.phase !== 'market' || g.turnOrder[g.turnIndex] !== seat) return room;
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

/** Asientos definitivos al empezar: los libres los ocupa la IA. */
export function finalSeats(room: RoomState): Seat[] {
  // Nombres de la IA al azar, pero fijos para esta sala.
  const r = makeRand(codeSeed(room.code));
  const seats = [...room.seats];
  while (seats.length < room.clubs) seats.push({ name: randomClubName(r, seats.map((s) => s.name)), clientId: null });
  return seats;
}

/** Empieza la partida. `gameId` es el identificador con el que quedó registrada en el servidor. */
export function startGame(room: RoomState, seed?: number, gameId: string | null = null): RoomState {
  if (room.game) return room;
  const seats = finalSeats(room);
  const game = createGame({ players: seats.map((s) => ({ name: s.name, isBot: !s.clientId, crest: s.crest })), season: room.season, seed });
  return bump(room, { seats, game, ready: [], gameId });
}

/** Acción del propio anfitrión (asiento 0). Devuelve el motivo si no es legal. */
export function hostAct(room: RoomState, action: Action): { room: RoomState; error: string | null } {
  const g = room.game;
  if (!g) return { room, error: 'La partida no ha empezado.' };
  if (action.type === 'roll') {
    // El anfitrión tira por su club y por los que lleva la IA.
    const roller = currentRoller(g);
    if (roller === null || (roller !== 0 && !g.players[roller].isBot)) return { room, error: 'No te toca tirar los dados.' };
  } else if (action.type !== 'nextJornada' && (g.phase !== 'market' || g.turnOrder[g.turnIndex] !== 0)) {
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
  if (!g) return room;
  if (g.phase === 'match') {
    // En el partido, la IA solo tira los dados cuando le toca.
    const roller = currentRoller(g);
    if (roller === null || (!g.players[roller].isBot && !force)) return room;
    return bump(room, { game: apply(g, { type: 'roll' }) });
  }
  if (g.phase !== 'market') return room;
  const cur = g.turnOrder[g.turnIndex];
  if (!g.players[cur].isBot && !force) return room;
  return bump(room, { game: apply(g, botAction(g, BOT_STYLES[cur % BOT_STYLES.length])) });
}

/** La IA termina el turno entero del club al que le toca (para cuando alguien se ha ido). */
export function playTurnForAbsent(room: RoomState): RoomState {
  const g = room.game;
  if (g?.phase === 'match') return botStep(room, true);
  if (!g || g.phase !== 'market') return room;
  const turn = g.turnIndex;
  let r = room;
  for (let i = 0; i < 40 && r.game!.phase === 'market' && r.game!.turnIndex === turn; i++) r = botStep(r, true);
  return r;
}
