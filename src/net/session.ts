/**
 * Conexión de una sala con el servidor de mensajería.
 * El anfitrión publica el estado completo (retenido, para quien llegue tarde o se reconecte)
 * y escucha los mensajes de los invitados.
 */
import { Action, check } from '../engine';
import { MqttClient } from './mqtt';
import { ClientMsg, RoomState, hostReduce, newRoom, seatOf } from './room';
import { remove, save } from './storage';

/** Servidores públicos y gratuitos. La primera letra del código de sala indica cuál se usa. */
const DEFAULT_BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
const brokers = (): string[] => (globalThis as { __FUTCARDS_BROKERS__?: string[] }).__FUTCARDS_BROKERS__ ?? DEFAULT_BROKERS;

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const topic = (code: string, leaf: 's' | 'c') => `futcards/2/${code}/${leaf}`;
export const HOST_KEY = 'futcards.host.v2';
export const GUEST_KEY = 'futcards.guest';

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
}
function brokerFor(code: string): string | null {
  return code.length === 5 ? brokers()[ALPHABET.indexOf(code[0])] ?? null : null;
}

export interface Listener<T> {
  onChange: (room: T) => void;
  onStatus: (connected: boolean) => void;
}

export class HostSession {
  private client: MqttClient;
  private closed = false;

  private constructor(public room: RoomState, url: string, private l: Listener<RoomState>, onFirstConnect?: (ok: boolean) => void) {
    let first = onFirstConnect;
    this.client = new MqttClient(url, {
      onStatus: (ok) => {
        if (ok) this.publish();
        if (first && ok) {
          first(true);
          first = undefined;
        }
        this.l.onStatus(ok);
      },
      onMessage: (_t, payload) => {
        try {
          this.update((r) => hostReduce(r, JSON.parse(payload) as ClientMsg));
        } catch {}
      },
    });
    this.client.subscribe(topic(room.code, 'c'));
    this.client.connect();
  }

  /** Crea una sala nueva en el primer servidor que responda. */
  static create(hostId: string, hostName: string, hostUserId: string | null, l: Listener<RoomState>): Promise<HostSession> {
    const list = brokers();
    const attempt = (i: number): Promise<HostSession> =>
      new Promise((resolve, reject) => {
        if (i >= list.length) return reject(new Error('No se ha podido conectar con ningún servidor. Revisa tu conexión.'));
        let code = ALPHABET[i];
        for (let k = 0; k < 4; k++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
        let settled = false;
        const s = new HostSession(newRoom(code, hostId, hostName, hostUserId), list[i], l, () => {
          settled = true;
          clearTimeout(timer);
          save(HOST_KEY, s.room);
          resolve(s);
        });
        const timer = setTimeout(() => {
          if (settled) return;
          s.close(false);
          attempt(i + 1).then(resolve, reject);
        }, 6000);
      });
    return attempt(0);
  }

  /** Reanuda una sala guardada en este dispositivo. */
  static resume(room: RoomState, l: Listener<RoomState>): HostSession | null {
    const url = brokerFor(room.code);
    return url ? new HostSession(room, url, l) : null;
  }

  private publish() {
    this.client.publish(topic(this.room.code, 's'), JSON.stringify(this.room), true);
  }

  update(fn: (r: RoomState) => RoomState) {
    if (this.closed) return;
    const next = fn(this.room);
    if (next === this.room) return;
    this.room = next;
    save(HOST_KEY, next);
    this.publish();
    this.l.onChange(next);
  }

  /** Con `end`, borra la sala del servidor y de este dispositivo. */
  close(end: boolean) {
    this.closed = true;
    if (end) {
      this.client.publish(topic(this.room.code, 's'), '', true);
      remove(HOST_KEY);
    }
    this.client.close();
  }
}

export class GuestSession {
  room: RoomState | null = null;
  private client: MqttClient;
  private pending: { msg: ClientMsg; seq: number; timer: ReturnType<typeof setInterval> } | null = null;

  private constructor(public code: string, private clientId: string, private name: string, url: string, private l: Listener<RoomState | null>) {
    this.client = new MqttClient(url, {
      onStatus: (ok) => {
        if (ok) this.send({ t: 'join', clientId, name });
        this.l.onStatus(ok);
      },
      onMessage: (_t, payload) => {
        if (!payload) {
          this.room = null;
          return this.l.onChange(null);
        }
        try {
          const room = JSON.parse(payload) as RoomState;
          if (this.room && room.seq < this.room.seq) return;
          const firstSight = !this.room;
          this.room = room;
          if (this.pending && room.seq !== this.pending.seq) this.clearPending();
          // El estado retenido puede ser anterior a nuestra petición de entrada: se repite.
          if (firstSight && seatOf(room, clientId) < 0) this.send({ t: 'join', clientId, name });
          this.l.onChange(room);
        } catch {}
      },
    });
    this.client.subscribe(topic(code, 's'));
    this.client.connect();
  }

  static join(rawCode: string, clientId: string, name: string, l: Listener<RoomState | null>): GuestSession | null {
    const code = normalizeCode(rawCode);
    const url = brokerFor(code);
    if (!url) return null;
    save(GUEST_KEY, { code, name });
    return new GuestSession(code, clientId, name, url, l);
  }

  get seat(): number {
    return this.room ? seatOf(this.room, this.clientId) : -1;
  }

  private send(msg: ClientMsg) {
    this.client.publish(topic(this.code, 'c'), JSON.stringify(msg));
  }
  private clearPending() {
    if (this.pending) clearInterval(this.pending.timer);
    this.pending = null;
  }
  /** Envía y reintenta hasta que el anfitrión responda con un estado nuevo. */
  private sendReliable(msg: ClientMsg, seq: number) {
    this.clearPending();
    this.send(msg);
    this.pending = { msg, seq, timer: setInterval(() => this.send(msg), 2500) };
  }

  /** Valida en local y manda la jugada al anfitrión. Devuelve el motivo si no se puede. */
  act(action: Action): string | null {
    const room = this.room;
    if (!room?.game) return 'La partida no ha empezado.';
    if (this.pending) return 'Enviando tu jugada anterior… espera un momento.';
    const g = room.game;
    if (action.type !== 'playMatch' && (g.phase !== 'market' || g.turnOrder[g.turnIndex] !== this.seat)) return 'No es tu turno.';
    const error = check(g, action);
    if (!error) this.sendReliable({ t: 'act', clientId: this.clientId, seq: room.seq, action }, room.seq);
    return error;
  }

  ready() {
    if (this.room) this.sendReliable({ t: 'ready', clientId: this.clientId, seq: this.room.seq }, this.room.seq);
  }

  close(leave: boolean) {
    this.clearPending();
    if (leave) {
      this.send({ t: 'leave', clientId: this.clientId });
      remove(GUEST_KEY);
    }
    this.client.close();
  }
}
