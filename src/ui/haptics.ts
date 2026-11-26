/**
 * Vibraciones del juego (Taptic Engine en iPhone). Cada efecto de sonido tiene la suya, y además
 * hay un «clic» suave para elegir opciones. No dependen del botón de silencio: en iOS se controlan
 * desde Ajustes → Sonidos y vibraciones. En el navegador no hacen nada.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import type { Sfx } from './sfx';

const on = Platform.OS !== 'web';
const run = (f: () => Promise<void>) => {
  if (on) f().catch(() => {});
};

/** Elegir una opción: pestañas, selectores, liga, IA o persona. */
export const selectHaptic = () => run(() => Haptics.selectionAsync());
/** Acción hecha: fichar, vender, jugar una carta. */
export const doneHaptic = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
/** Acción rechazada (no hay dinero, plantilla llena…). */
export const refusedHaptic = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
/** Logro, jornada ganada: celebración. */
export const successHaptic = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** La vibración que acompaña a cada efecto de sonido. */
export function hapticFor(sfx: Sfx) {
  switch (sfx) {
    case 'dice':
      return run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
    case 'goal':
      return run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    case 'concede':
      return run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    case 'save':
      return run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    case 'stopped':
      return run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
    case 'whistle':
      return run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
    case 'card':
      return run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    case 'tap':
      return run(() => Haptics.selectionAsync());
  }
}
