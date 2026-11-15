/**
 * Cliente MQTT 3.1.1 mínimo sobre WebSocket (solo QoS 0).
 * Sin dependencias: funciona igual en navegador y en React Native.
 */

const enc = (s: string): number[] => {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
};

const dec = (b: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < b.length; ) {
    const c = b[i++];
    let cp = c;
    if (c >= 0xf0) cp = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else if (c >= 0xe0) cp = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else if (c >= 0xc0) cp = ((c & 31) << 6) | (b[i++] & 63);
    s += String.fromCodePoint(cp);
  }
  return s;
};

const str = (s: string): number[] => {
  const b = enc(s);
  return [b.length >> 8, b.length & 255, ...b];
};

function packet(header: number, body: number[]): Uint8Array {
  const len: number[] = [];
  let n = body.length;
  do {
    let d = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) d |= 128;
    len.push(d);
  } while (n > 0);
  const out = new Uint8Array(1 + len.length + body.length);
  out[0] = header;
  out.set(len, 1);
  out.set(body, 1 + len.length);
  return out;
}

export interface MqttHandlers {
  onMessage: (topic: string, payload: string) => void;
  onStatus: (connected: boolean) => void;
}

export class MqttClient {
  private ws: WebSocket | null = null;
  private buf = new Uint8Array(0);
  private topics = new Set<string>();
  private ping: ReturnType<typeof setInterval> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  connected = false;

  constructor(private url: string, private h: MqttHandlers) {}

  connect() {
    this.closed = false;
    const ws = new WebSocket(this.url, 'mqtt');
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    this.buf = new Uint8Array(0);
    ws.onopen = () => {
      const id = 'fc' + Math.random().toString(36).slice(2, 12);
      // Sesión limpia, keepalive de 30 s.
      ws.send(packet(0x10, [...str('MQTT'), 4, 2, 0, 30, ...str(id)]));
    };
    ws.onmessage = (e) => this.feed(new Uint8Array(e.data as ArrayBuffer));
    ws.onclose = () => this.dropped(ws);
    ws.onerror = () => {};
  }

  private dropped(ws: WebSocket) {
    if (this.ws !== ws) return;
    if (this.ping) clearInterval(this.ping);
    if (this.connected) {
      this.connected = false;
      this.h.onStatus(false);
    }
    if (!this.closed) this.retry = setTimeout(() => this.connect(), 2000);
  }

  private feed(chunk: Uint8Array) {
    const merged = new Uint8Array(this.buf.length + chunk.length);
    merged.set(this.buf);
    merged.set(chunk, this.buf.length);
    this.buf = merged;
    for (;;) {
      const b = this.buf;
      if (b.length < 2) return;
      let len = 0;
      let mult = 1;
      let i = 1;
      for (;;) {
        if (i >= b.length) return;
        const d = b[i++];
        len += (d & 127) * mult;
        mult *= 128;
        if (!(d & 128)) break;
      }
      if (b.length < i + len) return;
      this.handle(b[0], b.subarray(i, i + len));
      this.buf = b.slice(i + len);
    }
  }

  private handle(header: number, body: Uint8Array) {
    const type = header >> 4;
    if (type === 2) {
      if (body[1] !== 0) return this.ws?.close();
      this.connected = true;
      for (const t of this.topics) this.sendSubscribe(t);
      this.ping = setInterval(() => this.ws?.readyState === 1 && this.ws.send(packet(0xc0, [])), 20000);
      this.h.onStatus(true);
    } else if (type === 3) {
      const tl = (body[0] << 8) | body[1];
      const topic = dec(body.subarray(2, 2 + tl));
      const qos = (header >> 1) & 3;
      this.h.onMessage(topic, dec(body.subarray(2 + tl + (qos ? 2 : 0))));
    }
  }

  private sendSubscribe(topic: string) {
    this.ws?.send(packet(0x82, [0, 1, ...str(topic), 0]));
  }

  subscribe(topic: string) {
    this.topics.add(topic);
    if (this.connected) this.sendSubscribe(topic);
  }

  /** Devuelve false si no hay conexión (el mensaje no se envía). */
  publish(topic: string, payload: string, retain = false): boolean {
    if (!this.connected || this.ws?.readyState !== 1) return false;
    this.ws.send(packet(0x30 | (retain ? 1 : 0), [...str(topic), ...enc(payload)]));
    return true;
  }

  close() {
    this.closed = true;
    if (this.retry) clearTimeout(this.retry);
    if (this.ping) clearInterval(this.ping);
    try {
      if (this.connected) this.ws?.send(packet(0xe0, []));
      this.ws?.close();
    } catch {}
    this.ws = null;
    this.connected = false;
  }
}
