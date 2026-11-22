import { describe, expect, it } from 'vitest';
import { RoomState, botStep, finalSeats, hostAct, hostReady, hostReduce, kickSeat, newRoom, pendingReady, playTurnForAbsent, setLobby, startGame } from './room';
import { FOOTBALLERS, isOffensive } from '../engine';

const lobby = () => {
  let r = newRoom('AKXRT', 'host', 'Anfitrión FC');
  r = hostReduce(r, { t: 'join', clientId: 'ana', name: 'Ana United' });
  r = hostReduce(r, { t: 'join', clientId: 'luis', name: 'Luis City' });
  return r;
};
const started = () => startGame(setLobby(lobby(), { clubs: 4, season: 'corta' }), 5);
/** Avanza con la IA hasta que le toque al asiento indicado o cambie la fase. */
const until = (r: RoomState, seat: number) => {
  for (let i = 0; i < 500 && r.game!.phase === 'market' && r.game!.turnOrder[r.game!.turnIndex] !== seat; i++) r = botStep(r, true);
  return r;
};

describe('sala de espera', () => {
  it('asigna asientos, no duplica al reconectar y respeta el aforo', () => {
    let r = lobby();
    expect(r.seats.map((s) => s.name)).toEqual(['Anfitrión FC', 'Ana United', 'Luis City']);
    expect(hostReduce(r, { t: 'join', clientId: 'ana', name: 'Ana United' })).toBe(r);
    r = setLobby(r, { clubs: 3 });
    expect(hostReduce(r, { t: 'join', clientId: 'eva', name: 'Eva' })).toBe(r);
    r = hostReduce(r, { t: 'leave', clientId: 'ana' });
    expect(r.seats).toHaveLength(2);
    expect(setLobby(r, { clubs: 1 }).clubs).toBe(2);
  });
  it('cambia por uno al azar el nombre ofensivo de un invitado', () => {
    const r = hostReduce(lobby(), { t: 'join', clientId: 'troll', name: 'Real Mierda' });
    const name = r.seats[3].name;
    expect(isOffensive(name)).toBe(false);
    expect(name).not.toBe('Real Mierda');
    // Y tampoco puede ponérselo al reconectar.
    const again = hostReduce(r, { t: 'join', clientId: 'ana', name: 'Gilipollas FC' });
    expect(isOffensive(again.seats[1].name)).toBe(false);
  });
  it('el anfitrión expulsa a un invitado y ya no puede volver a entrar', () => {
    let r = kickSeat(lobby(), 1);
    expect(r.seats.map((s) => s.name)).toEqual(['Anfitrión FC', 'Luis City']);
    expect(hostReduce(r, { t: 'join', clientId: 'ana', name: 'Ana United' })).toBe(r);
    expect(kickSeat(r, 0)).toBe(r); // al anfitrión no se le expulsa
    r = started();
    expect(kickSeat(r, 1)).toBe(r); // con la partida empezada, no
  });
  it('al empezar, la IA ocupa los asientos libres', () => {
    const r = started();
    expect(r.game!.players.map((p) => p.isBot)).toEqual([false, false, false, true]);
    expect(hostReduce(r, { t: 'join', clientId: 'eva', name: 'Eva' })).toBe(r);
  });
});

describe('partida en línea', () => {
  it('solo acepta acciones del club al que le toca y con el número de secuencia actual', () => {
    let r = until(started(), 1);
    const end = { type: 'endTurn' } as const;
    expect(hostReduce(r, { t: 'act', clientId: 'luis', seq: r.seq, action: end })).toBe(r);
    expect(hostReduce(r, { t: 'act', clientId: 'ana', seq: r.seq - 1, action: end })).toBe(r);
    expect(hostAct(r, end).error).toBe('No es tu turno.');
    const next = hostReduce(r, { t: 'act', clientId: 'ana', seq: r.seq, action: end });
    expect(next.seq).toBe(r.seq + 1);
    expect(next.game!.turnIndex).not.toBe(r.game!.turnIndex);
    // Reenviar el mismo mensaje no lo aplica dos veces.
    expect(hostReduce(next, { t: 'act', clientId: 'ana', seq: r.seq, action: end })).toBe(next);
    // Un invitado no puede saltarse el reparto.
    expect(hostReduce(next, { t: 'act', clientId: 'ana', seq: next.seq, action: { type: 'nextJornada' } })).toBe(next);
  });
  it('la jornada avanza cuando todas las personas están listas', () => {
    let r = started();
    // Plantillas de 6 para que haya que elegir 5 titulares.
    const meds = FOOTBALLERS.filter((f) => f.position === 'MED');
    const game = structuredClone(r.game!);
    game.players.forEach((p, i) => (p.squad = meds.slice(i * 6, i * 6 + 6).map((f) => ({ cardId: f.id, shielded: false, noClauseUntil: 99, streakUntil: 0, outUntil: 0, extra: null }))));
    game.market = game.market.filter((id) => !game.players.some((p) => p.squad.some((e) => e.cardId === id)));
    r = { ...r, game };
    while (r.game!.phase === 'market') r = botStep(r, true);
    // Convocatoria: cada persona elige la suya, sin turnos; la IA ya ha elegido.
    expect(r.game!.phase).toBe('lineup');
    expect(r.game!.players[3].starters).toBeTruthy();
    const pick = (seat: number) => r.game!.players[seat].squad.slice(0, Math.min(5, r.game!.players[seat].squad.length)).map((e) => e.cardId);
    // Nadie elige por otro.
    expect(hostReduce(r, { t: 'act', clientId: 'ana', seq: r.seq, action: { type: 'setLineup', playerId: 2, cardIds: pick(2) } })).toBe(r);
    r = hostReduce(r, { t: 'act', clientId: 'luis', seq: r.seq, action: { type: 'setLineup', playerId: 2, cardIds: pick(2) } });
    r = hostAct(r, { type: 'setLineup', playerId: 0, cardIds: pick(0) }).room;
    expect(r.game!.phase).toBe('lineup');
    r = hostReduce(r, { t: 'act', clientId: 'ana', seq: r.seq, action: { type: 'setLineup', playerId: 1, cardIds: pick(1) } });
    expect(r.game!.phase).toBe('match');
    // Solo tira los dados el club al que le toca.
    const first = r.game!.match!.rollers[0];
    const wrong = ['host', 'ana', 'luis'][(first + 1) % 3];
    expect(hostReduce(r, { t: 'act', clientId: wrong, seq: r.seq, action: { type: 'roll' } })).toBe(r);
    expect(hostReduce(r, { t: 'act', clientId: 'ana', seq: r.seq, action: { type: 'playMatch' } })).toBe(r);
    while (r.game!.phase === 'match') r = botStep(r, true);
    expect(r.game!.phase).toBe('summary');
    r = hostReady(r);
    r = hostReduce(r, { t: 'ready', clientId: 'ana', seq: r.seq });
    expect(r.game!.phase).toBe('summary');
    expect(pendingReady(r)).toEqual([2]);
    r = hostReduce(r, { t: 'ready', clientId: 'luis', seq: r.seq });
    expect(r.game!.phase).toBe('market');
    expect(r.game!.jornada).toBe(2);
    expect(r.ready).toEqual([]);
  });
  it('si alguien se va, su club pasa a la IA y no bloquea la partida', () => {
    let r = until(started(), 2);
    const turn = r.game!.turnIndex;
    r = playTurnForAbsent(r);
    expect(r.game!.phase !== 'market' || r.game!.turnIndex !== turn).toBe(true);
    r = hostReduce(r, { t: 'leave', clientId: 'luis' });
    expect(r.game!.players[2].isBot).toBe(true);
    expect(r.seats[2].clientId).toBeNull();
  });
  it('el estado de la sala viaja como JSON sin perder nada', () => {
    const r = until(started(), 0);
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
});

describe('clubes y escudos en la sala', () => {
  const crest = { shape: 1, pattern: 2, emblem: 3, primary: '#1C6DD0', secondary: '#F4F1E8' };
  it('cada persona entra con su escudo y llega a la partida', () => {
    let r = newRoom('BQWER', 'host', 'Anfitrión FC', null, crest);
    r = hostReduce(r, { t: 'join', clientId: 'ana', name: 'Ana United', crest: { ...crest, primary: '#C8102E' } });
    r = startGame(setLobby(r, { clubs: 4 }), 3);
    expect(r.game!.players[0].crest).toEqual(crest);
    expect(r.game!.players[1].crest!.primary).toBe('#C8102E');
    // La IA recibe nombre y escudo, distintos de los de las personas.
    expect(r.game!.players[2].crest).toBeDefined();
    expect(new Set(r.game!.players.map((p) => p.name)).size).toBe(4);
  });
  it('descarta escudos mal formados que llegan por la red', () => {
    const r = hostReduce(newRoom('BQWER', 'host', 'Anfitrión FC'), { t: 'join', clientId: 'eva', name: 'Eva', crest: { primary: 'javascript:' } as never });
    expect(r.seats[1].crest).toBeUndefined();
  });
  it('los nombres de la IA son fijos para una sala', () => {
    const r = setLobby(newRoom('ZXCVB', 'host', 'Anfitrión FC'), { clubs: 5 });
    expect(finalSeats(r)).toEqual(finalSeats(r));
  });
});

describe('liga de la sala', () => {
  it('el anfitrión elige la liga y la partida la usa', () => {
    const r = startGame(setLobby(newRoom('LIGAF', 'host', 'Anfitrión FC'), { league: 'femenina' }), 2);
    expect(r.game!.league).toBe('femenina');
    expect(Object.values(r.game!.roster!).every((x) => x.fem)).toBe(true);
  });
});
