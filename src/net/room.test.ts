import { describe, expect, it } from 'vitest';
import { RoomState, botStep, finalSeats, hostAct, hostReady, hostReduce, newRoom, pendingReady, playTurnForAbsent, setLobby, startGame } from './room';

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
    while (r.game!.phase === 'market') r = botStep(r, true);
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
