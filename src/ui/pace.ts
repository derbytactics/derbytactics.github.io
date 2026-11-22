/**
 * Ritmo de la crónica del partido, a elegir por cada persona (se guarda en el dispositivo).
 * En línea cada uno lee a su ritmo: no afecta a los demás.
 */
import { useSyncExternalStore } from 'react';
import { load, save } from '../net/storage';

export type Pace = 'pausado' | 'normal' | 'rapido';
export const PACES: { key: Pace; label: string }[] = [
  { key: 'pausado', label: 'Pausado' },
  { key: 'normal', label: 'Normal' },
  { key: 'rapido', label: 'Rápido' },
];
/** Cuánto se alarga (o acorta) cada pausa de la crónica. */
export const PACE_FACTOR: Record<Pace, number> = { pausado: 1.6, normal: 1.25, rapido: 0.7 };

const KEY = 'futcards.pace';
let pace: Pace = load<Pace>(KEY) ?? 'normal';
const listeners = new Set<() => void>();

export const getPace = () => pace;
export function setPace(p: Pace) {
  pace = p;
  save(KEY, p);
  listeners.forEach((l) => l());
}
export function usePace(): Pace {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    getPace,
    getPace,
  );
}
