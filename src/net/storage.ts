/** Almacenamiento local del navegador; en otras plataformas no guarda nada. */
const ls = (): Storage | null => {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
};

export function load<T>(key: string): T | null {
  try {
    const raw = ls()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function save(key: string, value: unknown) {
  try {
    ls()?.setItem(key, JSON.stringify(value));
  } catch {}
}
export function remove(key: string) {
  try {
    ls()?.removeItem(key);
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
