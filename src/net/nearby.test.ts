import { describe, expect, it } from 'vitest';
import { NearbyFound, NearbyNative, browseNearby, isNearbyCode, setNearbyNative } from './nearby';
import { GuestSession, HostSession } from './session';
import { RoomState, setLobby, startGame } from './room';

/**
 * «El aire»: varios móviles falsos con el mismo comportamiento que el módulo nativo
 * (el anfitrión anuncia, el invitado busca su código, se conectan y se mandan texto).
 */
class Air {
  phones: FakePhone[] = [];
  phone(id: string) {
    const p = new FakePhone(id, this);
    this.phones.push(p);
    return p;
  }
}
type Ev = 'onFound' | 'onLost' | 'onPeer' | 'onMessage' | 'onError';
class FakePhone implements NearbyNative {
  ads: { code: string; name: string } | null = null;
  target: string | null = null;
  browsing = false;
  peers = new Set<FakePhone>();
  private ls = new Map<Ev, Set<(e: never) => void>>();
  constructor(public id: string, private air: Air) {}
  private emit(ev: Ev, e: unknown) {
    for (const f of this.ls.get(ev) ?? []) (f as (x: unknown) => void)(e);
  }
  addListener(ev: Ev, fn: (e: never) => void) {
    if (!this.ls.has(ev)) this.ls.set(ev, new Set());
    this.ls.get(ev)!.add(fn);
    return { remove: () => this.ls.get(ev)!.delete(fn) };
  }
  private link(host: FakePhone) {
    this.peers.add(host);
    host.peers.add(this);
    this.emit('onPeer', { id: host.id, state: 'connected', count: this.peers.size });
    host.emit('onPeer', { id: this.id, state: 'connected', count: host.peers.size });
  }
  private scan() {
    for (const p of this.air.phones) {
      if (!p.ads) continue;
      this.emit('onFound', { id: p.id, code: p.ads.code, name: p.ads.name } satisfies NearbyFound);
      if (this.target === p.ads.code && !this.peers.has(p)) this.link(p);
    }
  }
  async host(code: string, name: string) {
    await this.stop();
    this.ads = { code, name };
    for (const p of this.air.phones) if (p.browsing) p.scan();
  }
  async browse() {
    await this.stop();
    this.browsing = true;
    this.scan();
  }
  async join(code: string) {
    await this.stop();
    this.browsing = true;
    this.target = code;
    this.scan();
  }
  async restart() {}
  async send(text: string) {
    for (const p of this.peers) queueMicrotask(() => p.emit('onMessage', { id: this.id, data: text }));
    return this.peers.size > 0;
  }
  async stop() {
    for (const p of this.peers) {
      p.peers.delete(this);
      p.emit('onPeer', { id: this.id, state: 'disconnected', count: p.peers.size });
    }
    this.peers.clear();
    this.ads = null;
    this.target = null;
    this.browsing = false;
  }
}

const tick = () => new Promise((r) => setTimeout(r, 5));

describe('salas cercanas sin internet', () => {
  it('sin módulo nativo no hay salas cercanas', async () => {
    setNearbyNative(null);
    await expect(HostSession.createNearby('h', 'Anfitrión FC', { onChange: () => {}, onStatus: () => {} })).rejects.toThrow();
  });

  it('el anfitrión anuncia, el invitado la ve, entra y juegan', async () => {
    const air = new Air();
    const a = air.phone('A');
    const b = air.phone('B');

    setNearbyNative(a);
    const host = await HostSession.createNearby('host', 'Anfitrión FC', { onChange: () => {}, onStatus: () => {} });
    expect(isNearbyCode(host.room.code)).toBe(true);

    // En el otro móvil, la lista de salas cercanas la muestra.
    setNearbyNative(b);
    let seen: NearbyFound[] = [];
    const stopBrowsing = browseNearby((r) => (seen = r));
    await tick();
    expect(seen.map((r) => [r.code, r.name])).toEqual([[host.room.code, 'Anfitrión FC']]);
    stopBrowsing();

    let guestRoom: RoomState | null = null;
    let guestOnline = false;
    const guest = GuestSession.join(host.room.code, 'ana', 'Ana United', { onChange: (r) => (guestRoom = r), onStatus: (ok) => (guestOnline = ok) })!;
    for (let i = 0; i < 20 && !guestRoom; i++) await tick();
    expect(guestOnline).toBe(true);
    expect(host.room.seats.map((s) => s.name)).toEqual(['Anfitrión FC', 'Ana United']);
    expect(guest.seat).toBe(1);

    // La partida empieza y el estado llega al invitado.
    host.update((r) => startGame(setLobby(r, { clubs: 2 }), 7));
    await tick();
    expect(guestRoom!.game?.phase).toBe('market');
    expect(guest.room?.seq).toBe(host.room.seq);

    // El anfitrión cierra la sala: el invitado se entera antes de que se corte la conexión.
    host.close(true);
    await tick();
    expect(guestRoom).toBeNull();
    guest.close(false);
  });
});
