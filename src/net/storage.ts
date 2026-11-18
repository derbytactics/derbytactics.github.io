/**
 * Almacenamiento local. En web usa localStorage directamente. En la app nativa no existe,
 * así que se trabaja sobre una copia en memoria que se carga al arrancar (`hydrateStorage`)
 * y se va guardando en el almacenamiento del dispositivo.
 */
const ls = (): Storage | null => {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
};

/** Lo mínimo que se necesita del almacenamiento nativo (AsyncStorage lo cumple). */
export interface NativeStorage {
  getAllKeys(): Promise<readonly string[]>;
  multiGet(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
let native: NativeStorage | null = null;
const memory = new Map<string, string>();

/** En nativo: carga lo guardado antes de pintar la app. En web no hace nada. */
export async function hydrateStorage(adapter: NativeStorage | null): Promise<void> {
  if (ls() || !adapter) return;
  native = adapter;
  try {
    const keys = (await adapter.getAllKeys()).filter((k) => k.startsWith('futcards.'));
    for (const [k, v] of await adapter.multiGet(keys)) if (v !== null) memory.set(k, v);
  } catch {}
}

export function load<T>(key: string): T | null {
  try {
    const raw = ls() ? ls()!.getItem(key) : memory.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function save(key: string, value: unknown) {
  try {
    const raw = JSON.stringify(value);
    if (ls()) return ls()!.setItem(key, raw);
    memory.set(key, raw);
    native?.setItem(key, raw).catch(() => {});
  } catch {}
}
export function remove(key: string) {
  try {
    if (ls()) return ls()!.removeItem(key);
    memory.delete(key);
    native?.removeItem(key).catch(() => {});
  } catch {}
}

/** Identificador estable de este dispositivo, para recuperar el asiento al reconectar. */
export function deviceId(): string {
  let id = load<string>('futcards.cid');
  if (!id) {
    id = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    save('futcards.cid', id);
  }
  return id;
}
