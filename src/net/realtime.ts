/**
 * Cliente mínimo de Supabase Realtime (canales de difusión), con la misma forma que `MqttClient`
 * para que las salas funcionen igual con cualquiera de los dos.
 *
 * Protocolo Phoenix, versión 1.0.0 (mensajes JSON {topic, event, payload, ref, join_ref}):
 * - Conexión: wss://<proyecto>.supabase.co/realtime/v1/websocket?apikey=<clave pública>&vsn=1.0.0
 * - Unirse a un canal: event "phx_join" con la configuración de difusión.
 * - Difundir: event "broadcast" con {type: "broadcast", event, payload}.
 * - Latido: topic "phoenix", event "heartbeat", cada 25 s.
 *
 * Un tema `a/b/c/hoja` se traduce al canal `realtime:a:b:c` y al evento `hoja`. A diferencia de MQTT, no hay
 * mensajes retenidos: quien llega tarde pide el estado y el anfitrión lo vuelve a enviar.
 */
import type { MqttHandlers } from './mqtt';

const HEARTBEAT_MS = 25000;

interface Frame {
  topic: string;
  event: string;
  payload: Record<string, unknown>;
  ref: string | null;
  join_ref?: string | null;
}

const split = (topic: string) => {
  const i = topic.lastIndexOf('/');
  const prefix = topic.slice(0, i);
  return { prefix, channel: `realtime:${prefix.replace(/\//g, ':')}`, event: topic.slice(i + 1) };
};

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private ref = 0;
  /** Canal → ref de la petición de unión, y si ya está dentro. */
  private channels = new Map<string, { joinRef: string; joined: boolean; prefix: string }>();
  private topics = new Set<string>();
  private ping: ReturnType<typeof setInterval> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  /** Última respuesta del servidor: si pasa mucho sin ninguna, la conexión está muerta aunque parezca abierta. */
  private lastReply = 0;
  connected = false;

  /** `url`: dirección del proyecto (https://xxxx.supabase.co); `key`: clave pública. */
  constructor(private url: string, private key: string, private h: MqttHandlers) {}

  connect() {
    this.closed = false;
    const base = this.url.replace(/^http/, 'ws').replace(/\/$/, '');
    const ws = new WebSocket(`${base}/realtime/v1/websocket?apikey=${encodeURIComponent(this.key)}&vsn=1.0.0`);
    this.ws = ws;
    ws.onopen = () => {
      this.channels.clear();
      this.lastReply = Date.now();
      for (const t of this.topics) this.join(split(t));
      this.ping = setInterval(() => {
        if (Date.now() - this.lastReply > 2.5 * HEARTBEAT_MS) return this.ws?.close();
        this.send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: this.nextRef() });
      }, HEARTBEAT_MS);
    };
    ws.onmessage = (e) => {
      this.lastReply = Date.now();
      try {
        this.handle(JSON.parse(String(e.data)) as Frame);
      } catch {}
    };
    ws.onclose = () => this.dropped(ws);
    ws.onerror = () => {};
  }

  private nextRef() {
    return String(++this.ref);
  }

  private send(f: Frame): boolean {
    if (this.ws?.readyState !== 1) return false;
    this.ws.send(JSON.stringify(f));
    return true;
  }

  private join({ channel, prefix }: { channel: string; prefix: string }) {
    if (this.channels.has(channel)) return;
    const joinRef = this.nextRef();
    this.channels.set(channel, { joinRef, joined: false, prefix });
    this.send({
      topic: channel,
      event: 'phx_join',
      payload: { config: { broadcast: { ack: false, self: false }, presence: { key: '', enabled: false }, postgres_changes: [], private: false } },
      ref: joinRef,
      join_ref: joinRef,
    });
  }

  private handle(f: Frame) {
    const ch = this.channels.get(f.topic);
    if (f.event === 'phx_reply' && ch && f.ref === ch.joinRef) {
      if ((f.payload as { status?: string }).status !== 'ok') return this.ws?.close();
      ch.joined = true;
      // Conectado cuando todos los canales pedidos están dentro.
      if (!this.connected && [...this.channels.values()].every((c) => c.joined)) {
        this.connected = true;
        this.h.onStatus(true);
      }
    } else if (f.event === 'broadcast' && ch) {
      const p = f.payload as { event?: string; payload?: { d?: unknown } };
      const topic = `${ch.prefix}/${p.event}`;
      // En un canal viajan todos los eventos de la sala: solo se entregan los temas suscritos.
      if (typeof p.event === 'string' && typeof p.payload?.d === 'string' && this.topics.has(topic)) {
        this.h.onMessage(topic, p.payload.d);
      }
    } else if ((f.event === 'phx_error' || f.event === 'phx_close') && ch) {
      // El servidor ha cerrado el canal: se reconecta todo.
      this.ws?.close();
    }
  }

  private dropped(ws: WebSocket) {
    if (this.ws !== ws) return;
    if (this.ping) clearInterval(this.ping);
    this.ping = null;
    if (this.connected) {
      this.connected = false;
      this.h.onStatus(false);
    }
    if (!this.closed) this.retry = setTimeout(() => this.connect(), 2000);
  }

  /** Comprueba la conexión al volver a primer plano: si lleva rato sin respuesta, reconecta ya. */
  nudge() {
    if (this.closed) return;
    if (!this.ws || this.ws.readyState > 1 || Date.now() - this.lastReply > HEARTBEAT_MS) {
      this.ws?.close();
      if (!this.ws || this.ws.readyState === 3) {
        if (this.retry) clearTimeout(this.retry);
        this.connect();
      }
    }
  }

  subscribe(topic: string) {
    this.topics.add(topic);
    if (this.ws?.readyState === 1) this.join(split(topic));
  }

  /** Devuelve false si no hay conexión (el mensaje no se envía). `retain` no existe aquí y se ignora. */
  publish(topic: string, payload: string, _retain = false): boolean {
    const { channel, event } = split(topic);
    const ch = this.channels.get(channel);
    if (!this.connected || !ch?.joined) return false;
    return this.send({ topic: channel, event: 'broadcast', payload: { type: 'broadcast', event, payload: { d: payload } }, ref: this.nextRef(), join_ref: ch.joinRef });
  }

  close() {
    this.closed = true;
    if (this.retry) clearTimeout(this.retry);
    if (this.ping) clearInterval(this.ping);
    try {
      for (const [channel, ch] of this.channels) this.send({ topic: channel, event: 'phx_leave', payload: {}, ref: this.nextRef(), join_ref: ch.joinRef });
      this.ws?.close();
    } catch {}
    this.ws = null;
    this.connected = false;
  }
}
