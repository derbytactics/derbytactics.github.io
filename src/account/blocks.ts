/**
 * Jugadores bloqueados en este dispositivo y denuncias de nombres de club en las salas.
 * Bloquear a alguien: no puede entrar en tus salas y, si entras en una suya, sales.
 */
import { useSyncExternalStore } from 'react';
import { load, save } from '../net/storage';
import { backendEnabled, rpc } from './api';

export interface Blocked {
  clientId: string;
  name: string;
}
const KEY = 'futcards.blocked';
let list: Blocked[] | null = null;
const listeners = new Set<() => void>();
const get = () => (list ??= load<Blocked[]>(KEY) ?? []);
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getBlocked = get;
export const useBlocked = () => useSyncExternalStore(subscribe, get, get);
export const isBlocked = (clientId: string | null | undefined) => !!clientId && get().some((b) => b.clientId === clientId);

export function block(clientId: string, name: string) {
  if (isBlocked(clientId)) return;
  list = [...get(), { clientId, name }].slice(-100);
  save(KEY, list);
  listeners.forEach((l) => l());
}
export function unblock(clientId: string) {
  list = get().filter((b) => b.clientId !== clientId);
  save(KEY, list);
  listeners.forEach((l) => l());
}

/** Denuncia el nombre de club de otro jugador en una sala (se revisa a mano). */
export async function reportName(name: string, room: string): Promise<boolean> {
  if (!backendEnabled()) return false;
  try {
    await rpc('report_content', { p_name: name, p_room: room, p_reason: 'nombre de club en una sala' }, false);
    return true;
  } catch {
    return false;
  }
}
