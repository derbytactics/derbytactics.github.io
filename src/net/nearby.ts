/**
 * Salas sin internet entre móviles cercanos (Bluetooth y wifi directo, sin servidor).
 * Se comporta como un transporte más de la sala: el anfitrión publica el estado y los invitados
 * le mandan sus mensajes; la lógica de la partida es la misma que en línea.
 *
 * El módulo nativo se registra al arrancar la app (`setNearbyNative`); así este archivo no
 * depende de código nativo y se puede probar.
 */
export interface NearbySubscription {
  remove(): void;
}
export interface NearbyFound {
  id: string;
  code: string;
  name: string;
}
export interface NearbyNative {
  host(code: string, name: string): Promise<void>;
  browse(): Promise<void>;
  join(code: string): Promise<void>;
  restart(): Promise<void>;
  send(text: string): Promise<boolean>;
  stop(): Promise<void>;
  addListener(event: 'onFound', fn: (e: NearbyFound) => void): NearbySubscription;
  addListener(event: 'onLost', fn: (e: { id: string }) => void): NearbySubscription;
  addListener(event: 'onPeer', fn: (e: { id: string; state: 'connected' | 'connecting' | 'disconnected'; count: number }) => void): NearbySubscription;
  addListener(event: 'onMessage', fn: (e: { id: string; data: string }) => void): NearbySubscription;
  addListener(event: 'onError', fn: (e: { message: string }) => void): NearbySubscription;
}

let native: NearbyNative | null = null;
export const setNearbyNative = (n: NearbyNative | null) => {
  native = n;
};
/** Si este dispositivo puede jugar sin internet. */
export const nearbyAvailable = () => !!native;

/** Las salas cercanas empiezan por esta letra (las de los servidores en línea nunca). */
export const NEARBY_LETTER = 'Z';
export const isNearbyCode = (code: string) => code.length === 5 && code[0] === NEARBY_LETTER;

/** Cuenta los usos del módulo: un cierre tardío no debe parar una sala abierta después. */
let generation = 0;

export interface NearbyHandlers {
  onMessage: (topic: string, payload: string) => void;
  onStatus: (connected: boolean) => void;
}

export class NearbyTransport {
  connected = false;
  private topic = '';
  private subs: NearbySubscription[] = [];
  /** El módulo nativo con el que se creó (fijo: así se puede probar con dos «móviles» falsos). */
  private n: NearbyNative;
  private gen = 0;

  constructor(
    private role: 'host' | 'guest',
    private code: string,
    private name: string,
    private h: NearbyHandlers,
  ) {
    if (!native) throw new Error('Este dispositivo no puede jugar sin internet.');
    this.n = native;
  }

  private setStatus(ok: boolean) {
    if (ok === this.connected) return;
    this.connected = ok;
    this.h.onStatus(ok);
  }

  connect() {
    const n = this.n;
    this.gen = ++generation;
    this.subs.push(n.addListener('onMessage', (e) => this.h.onMessage(this.topic, e.data)));
    if (this.role === 'host') {
      // El anfitrión está «conectado» en cuanto anuncia la sala, aunque aún no haya entrado nadie.
      n.host(this.code, this.name).then(
        () => this.setStatus(true),
        () => this.setStatus(false),
      );
    } else {
      // El invitado solo habla con el anfitrión: está conectado mientras tenga esa conexión.
      this.subs.push(n.addListener('onPeer', (e) => this.setStatus(e.count > 0)));
      void n.join(this.code);
    }
  }

  /** Cada lado recibe un solo tipo de mensaje (el anfitrión, de los invitados; y al revés). */
  subscribe(topic: string) {
    this.topic = topic;
  }

  publish(_topic: string, payload: string): boolean {
    if (this.role === 'guest' && !this.connected) return false;
    this.n.send(payload).catch(() => {});
    return true;
  }

  nudge() {
    void this.n.restart();
  }

  close() {
    for (const s of this.subs) s.remove();
    this.subs = [];
    this.connected = false;
    // Se deja un momento para que salga el último mensaje (p. ej. «sala cerrada») antes de desconectar.
    const n = this.n;
    const gen = this.gen;
    setTimeout(() => {
      if (generation === gen) void n.stop();
    }, 400);
  }
}

/** Busca salas cercanas mientras haya alguien escuchando. Devuelve la función para dejar de buscar. */
export function browseNearby(onChange: (rooms: NearbyFound[]) => void): () => void {
  const n = native;
  if (!n) return () => {};
  const rooms = new Map<string, NearbyFound>();
  const emit = () => onChange([...rooms.values()]);
  const subs = [
    n.addListener('onFound', (e) => {
      if (!isNearbyCode(e.code)) return;
      rooms.set(e.id, e);
      emit();
    }),
    n.addListener('onLost', (e) => {
      rooms.delete(e.id);
      emit();
    }),
  ];
  void n.browse();
  const gen = ++generation;
  return () => {
    for (const s of subs) s.remove();
    if (generation === gen) void n.stop();
  };
}
