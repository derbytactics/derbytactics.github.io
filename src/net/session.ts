/**
 * Conexión de una sala con el servidor de mensajería.
 * El anfitrión publica el estado completo y escucha los mensajes de los invitados.
 *
 * Transporte, según la primera letra del código de sala:
 * - A, B, C: servidores MQTT públicos (sin cuentas configuradas, o si Supabase no responde).
 *   Ahí el estado queda retenido para quien llegue tarde.
 * - Resto: Supabase Realtime, del mismo proyecto que las cuentas. No retiene mensajes: el anfitrión
 *   reenvía el estado cada vez que un invitado escribe (al entrar o reconectarse) y cada 20 s.
 */
import { backend } from '../account/api';
import { Action, CrestDesign, check, currentRoller } from '../engine';
import { MqttClient, MqttHandlers } from './mqtt';
import { RealtimeClient } from './realtime';
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
/** Lo común a los dos transportes. */
interface Transport {
  connected: boolean;
  connect(): void;
  subscribe(topic: string): void;
  publish(topic: string, payload: string, retain?: boolean): boolean;
  close(): void;
}

/** El transporte que corresponde a un código de sala, o null si no hay ninguno disponible. */
function transportFor(code: string, h: MqttHandlers): { client: Transport; retains: boolean } | null {
  if (code.length !== 5) return null;
  const i = ALPHABET.indexOf(code[0]);
  const list = brokers();
  if (i < 0) return null;
  if (i < list.length) return { client: new MqttClient(list[i], h), retains: true };
  const b = backend();
  return b ? { client: new RealtimeClient(b.url, b.key, h), retains: false } : null;
}

/** Código nuevo: con Supabase, una letra a partir de la cuarta; con el servidor público `i`, su letra. */
function newCode(broker: number | 'realtime'): string {
  const first = broker === 'realtime' ? 3 + Math.floor(Math.random() * (ALPHABET.length - 3)) : broker;
  let code = ALPHABET[first];
  for (let k = 0; k < 4; k++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return code;
}

export interface Listener<T> {
  onChange: (room: T) => void;
  onStatus: (connected: boolean) => void;
}

export class HostSession {
  private client: Transport;
  private retains: boolean;
  private closed = false;
  private refresh: ReturnType<typeof setInterval> | null = null;

  private constructor(public room: RoomState, private l: Listener<RoomState>, onFirstConnect?: (ok: boolean) => void) {
    let first = onFirstConnect;
    const t = transportFor(room.code, {
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
          const before = this.room;
          this.update((r) => hostReduce(r, JSON.parse(payload) as ClientMsg));
          // Sin mensajes retenidos, quien escribe (al entrar o reconectarse) necesita el estado aunque no cambie.
          if (!this.retains && this.room === before) this.publish();
        } catch {}
      },
    });
    if (!t) throw new Error('No hay servidor para esta sala.');
    this.client = t.client;
    this.retains = t.retains;
    if (!this.retains) this.refresh = setInterval(() => this.publish(), 20000);
    this.client.subscribe(topic(room.code, 'c'));
    this.client.connect();
  }

  /** Crea una sala nueva: primero en Supabase (si hay cuentas configuradas) y si no, en el primer servidor público que responda. */
  static create(hostId: string, hostName: string, hostUserId: string | null, l: Listener<RoomState>, hostCrest?: CrestDesign): Promise<HostSession> {
    const options: (number | 'realtime')[] = [...(backend() ? ['realtime' as const] : []), ...brokers().map((_, i) => i)];
    const attempt = (i: number): Promise<HostSession> =>
      new Promise((resolve, reject) => {
        if (i >= options.length) return reject(new Error('No se ha podido conectar con ningún servidor. Revisa tu conexión.'));
        const code = newCode(options[i]);
        let settled = false;
        const s = new HostSession(newRoom(code, hostId, hostName, hostUserId, hostCrest), l, () => {
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
    try {
      return new HostSession(room, l);
    } catch {
      return null;
    }
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
    if (this.refresh) clearInterval(this.refresh);
    if (end) {
      this.client.publish(topic(this.room.code, 's'), '', true);
      remove(HOST_KEY);
    }
    this.client.close();
  }
}

export class GuestSession {
  room: RoomState | null = null;
  private client: Transport;
  private pending: { msg: ClientMsg; seq: number; timer: ReturnType<typeof setInterval> } | null = null;

  private constructor(public code: string, private clientId: string, private name: string, private l: Listener<RoomState | null>, private crest?: CrestDesign) {
    const t = transportFor(code, {
      onStatus: (ok) => {
        if (ok) this.send({ t: 'join', clientId, name, crest: this.crest });
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
          if (firstSight && seatOf(room, clientId) < 0) this.send({ t: 'join', clientId, name, crest: this.crest });
          this.l.onChange(room);
        } catch {}
      },
    });
    if (!t) throw new Error('No hay servidor para esta sala.');
    this.client = t.client;
    this.client.subscribe(topic(code, 's'));
    this.client.connect();
  }

  static join(rawCode: string, clientId: string, name: string, l: Listener<RoomState | null>, crest?: CrestDesign): GuestSession | null {
    const code = normalizeCode(rawCode);
    let s: GuestSession;
    try {
      s = new GuestSession(code, clientId, name, l, crest);
    } catch {
      return null;
    }
    save(GUEST_KEY, { code, name });
    return s;
  }

  get seat(): number {
    return this.room ? seatOf(this.room, this.clientId) : -1;
  }

  /** El anfitrión ha expulsado a este dispositivo de la sala. */
  get kicked(): boolean {
    return !!this.room?.kicked?.includes(this.clientId);
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
    if (action.type === 'roll' ? currentRoller(g) !== this.seat : g.phase !== 'market' || g.turnOrder[g.turnIndex] !== this.seat) return 'No es tu turno.';
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
