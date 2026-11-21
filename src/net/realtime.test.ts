import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocketServer, WebSocket as WsSocket } from 'ws';
import { GuestSession, HostSession } from './session';
import { RoomState } from './room';

/**
 * Servidor falso con el protocolo de Supabase Realtime (Phoenix 1.0.0): responde a las uniones,
 * contesta al latido y reenvía cada difusión a los demás miembros del canal (self: false).
 */
let server: WebSocketServer;
let port = 0;
const frames: { topic: string; event: string }[] = [];
let failJoins = false;

beforeAll(async () => {
  server = new WebSocketServer({ port: 0 });
  await new Promise<void>((r) => server.on('listening', () => r()));
  port = (server.address() as { port: number }).port;
  const members = new Map<WsSocket, Set<string>>();
  server.on('connection', (ws, req) => {
    expect(req.url).toContain('/realtime/v1/websocket?apikey=clave&vsn=1.0.0');
    members.set(ws, new Set());
    ws.on('message', (raw) => {
      const f = JSON.parse(String(raw));
      frames.push({ topic: f.topic, event: f.event });
      if (f.event === 'phx_join') {
        if (failJoins) return ws.send(JSON.stringify({ topic: f.topic, event: 'phx_reply', payload: { status: 'error', response: {} }, ref: f.ref }));
        members.get(ws)!.add(f.topic);
        ws.send(JSON.stringify({ topic: f.topic, event: 'phx_reply', payload: { status: 'ok', response: {} }, ref: f.ref }));
      } else if (f.event === 'heartbeat') {
        ws.send(JSON.stringify({ topic: 'phoenix', event: 'phx_reply', payload: { status: 'ok', response: {} }, ref: f.ref }));
      } else if (f.event === 'broadcast') {
        for (const [other, topics] of members) {
          if (other !== ws && topics.has(f.topic)) other.send(JSON.stringify({ topic: f.topic, event: 'broadcast', payload: f.payload, ref: null }));
        }
      }
    });
    ws.on('close', () => members.delete(ws));
  });
  const g = globalThis as Record<string, unknown>;
  g.__FUTCARDS_BACKEND__ = { url: `http://localhost:${port}`, key: 'clave' };
  g.__FUTCARDS_BROKERS__ = [];
});
afterAll(() => {
  const g = globalThis as Record<string, unknown>;
  delete g.__FUTCARDS_BACKEND__;
  delete g.__FUTCARDS_BROKERS__;
  server.close();
});

const waitFor = async (cond: () => boolean, ms = 4000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error('tiempo agotado');
    await new Promise((r) => setTimeout(r, 20));
  }
};

describe('salas por Supabase Realtime', () => {
  it('el anfitrión crea la sala, un invitado entra y ambos ven el mismo estado', async () => {
    let hostRoom: RoomState | null = null;
    const host = await HostSession.create('host', 'Anfitrión FC', null, { onChange: (r) => (hostRoom = r), onStatus: () => {} });
    expect('ABC').not.toContain(host.room.code[0]); // código de Supabase, no de servidor público
    expect(frames.some((f) => f.event === 'phx_join' && f.topic === `realtime:futcards:2:${host.room.code}`)).toBe(true);

    // El invitado llega después de que el anfitrión publicara: sin mensajes retenidos, debe recibir el estado igualmente.
    let guestRoom: RoomState | null = null;
    // Los mensajes de los demás invitados al anfitrión viajan por el mismo canal: no deben llegar como si fueran la sala.
    let notARoom = 0;
    const guest = GuestSession.join(host.room.code, 'ana', 'Ana United', {
      onChange: (r) => {
        if (r && !Array.isArray(r.seats)) notARoom++;
        guestRoom = r;
      },
      onStatus: () => {},
    })!;
    await waitFor(() => !!guestRoom && guestRoom.seats.length === 2);
    expect(guestRoom!.seats.map((s) => s.name)).toEqual(['Anfitrión FC', 'Ana United']);
    expect(hostRoom!.seats).toHaveLength(2);
    expect(guest.seat).toBe(1);

    // Un segundo invitado que entra tarde también recibe el estado completo.
    let lateRoom: RoomState | null = null;
    const late = GuestSession.join(host.room.code, 'luis', 'Luis City', { onChange: (r) => (lateRoom = r), onStatus: () => {} })!;
    await waitFor(() => !!lateRoom && lateRoom.seats.length === 3);
    await waitFor(() => guestRoom!.seats.length === 3);
    expect(notARoom).toBe(0);

    // Al cerrar la sala, los invitados se enteran.
    let closed = false;
    const watcher = GuestSession.join(host.room.code, 'eva', 'Eva', { onChange: (r) => r === null && (closed = true), onStatus: () => {} })!;
    await waitFor(() => late.room !== null && watcher.room !== null);
    host.close(true);
    await waitFor(() => closed);
    for (const s of [guest, late, watcher]) s.close(false);
  });

  it('si Supabase rechaza la sala y no hay servidores públicos, avisa del error', async () => {
    failJoins = true;
    await expect(HostSession.create('host', 'Anfitrión FC', null, { onChange: () => {}, onStatus: () => {} })).rejects.toThrow(/No se ha podido conectar/);
    failJoins = false;
  }, 15000);
});
