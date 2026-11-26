/**
 * «Reducir movimiento» del sistema (iOS: Ajustes → Accesibilidad → Movimiento; en la web,
 * prefers-reduced-motion). Con él activo, nada rebota ni rueda: las cosas aparecen sin animación.
 */
import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let reduce = false;
const listeners = new Set<() => void>();
const set = (v: boolean) => {
  if (v === reduce) return;
  reduce = v;
  listeners.forEach((l) => l());
};
AccessibilityInfo.isReduceMotionEnabled()
  .then(set)
  .catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', set);

/** Para código que no es un componente. */
export const reduceMotion = () => reduce;
/** Para componentes: se actualiza si se cambia el ajuste con la app abierta. */
export const useReduceMotion = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => reduce,
    () => reduce,
  );
